from __future__ import annotations

import json
import subprocess
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


def call_helper(helper: str, *arguments: object) -> dict:
    script = """
const helpers = require('./web/credit-display.js');
const args = JSON.parse(process.argv[2]);
process.stdout.write(JSON.stringify(helpers[process.argv[1]](...args)));
"""
    output = subprocess.check_output(
        ["node", "-e", script, helper, json.dumps(arguments)], cwd=ROOT, text=True
    )
    return json.loads(output)


def render(program: dict, language: str) -> dict:
    return call_helper("programCreditDisplay", program, language)


def metrics(program: dict, completed: list[dict]) -> dict:
    return call_helper("plannerProgressMetrics", program, completed)


class CreditDisplayTests(unittest.TestCase):
    def test_numeric_official_total_is_preserved_in_both_languages(self) -> None:
        program = {"total_program_credit_hours": 125, "calculated_plan_credit_hours": 999}
        self.assertEqual(render(program, "en"), {
            "value": "125", "label": "Total credits", "calculated": False,
        })
        self.assertEqual(render(program, "ar"), {
            "value": "125", "label": "إجمالي الساعات", "calculated": False,
        })

    def test_null_official_total_uses_calculated_fallback_and_labels(self) -> None:
        program = {"total_program_credit_hours": None, "courses": [{"credit_hours": 39}, {"credit_hours": 3}]}
        english = render(program, "en")
        arabic = render(program, "ar")
        self.assertEqual(english, {
            "value": "42", "label": "Calculated credits", "calculated": True,
        })
        self.assertEqual(arabic, {
            "value": "42", "label": "الساعات المحتسبة", "calculated": True,
        })
        self.assertNotIn("null", json.dumps([english, arabic], ensure_ascii=False).lower())

    def test_missing_official_and_calculated_totals_never_display_null(self) -> None:
        for language, expected in (("en", "Unavailable"), ("ar", "غير متاح")):
            with self.subTest(language=language):
                result = render({"total_program_credit_hours": None}, language)
                self.assertEqual(result["value"], expected)
                self.assertNotIn("null", " ".join(map(str, result.values())).lower())

    def test_numeric_official_total_progress_preserves_existing_behavior(self) -> None:
        program = {
            "total_program_credit_hours": 125,
            "courses": [{"credit_hours": 3}, {"credit_hours": 2}],
        }
        initial = metrics(program, [])
        checked = metrics(program, [program["courses"][0]])
        unchecked = metrics(program, [])
        self.assertEqual(initial["effectiveTotalCredits"], 125)
        self.assertEqual(initial["remainingCredits"], 125)
        self.assertEqual(checked["completedCredits"], 3)
        self.assertEqual(checked["remainingCredits"], 122)
        self.assertEqual(checked["completionPercentage"], 50)
        self.assertEqual(checked["remainingCourseCount"], 1)
        self.assertEqual(unchecked, initial)

    def test_preexisting_accounting_program_keeps_official_total_behavior(self) -> None:
        program = json.loads(
            (ROOT / "data/validated/kau_accounting.json").read_text(encoding="utf-8")
        )
        course = next(item for item in program["courses"] if isinstance(item.get("credit_hours"), int))
        initial = metrics(program, [])
        checked = metrics(program, [course])
        self.assertEqual(initial["effectiveTotalCredits"], 125)
        self.assertFalse(initial["calculatedTotal"])
        self.assertEqual(initial["remainingCredits"], 125)
        self.assertEqual(checked["completedCredits"], course["credit_hours"])
        self.assertEqual(checked["remainingCredits"], 125 - course["credit_hours"])

    def test_null_official_total_uses_course_sum_for_check_and_uncheck(self) -> None:
        program = {
            "total_program_credit_hours": None,
            "courses": [{"credit_hours": 3}, {"credit_hours": 3}, {"credit_hours": 10}],
        }
        initial = metrics(program, [])
        checked = metrics(program, [program["courses"][2]])
        unchecked = metrics(program, [])
        self.assertEqual(initial["effectiveTotalCredits"], 16)
        self.assertTrue(initial["calculatedTotal"])
        self.assertEqual(initial["remainingCredits"], 16)
        self.assertEqual(checked["completedCredits"], 10)
        self.assertEqual(checked["remainingCredits"], 6)
        self.assertEqual(checked["completionPercentage"], 33)
        self.assertEqual(checked["remainingCourseCount"], 2)
        self.assertEqual(unchecked, initial)
        self.assertNotIn("NaN", json.dumps([initial, checked, unchecked]))


if __name__ == "__main__":
    unittest.main()
