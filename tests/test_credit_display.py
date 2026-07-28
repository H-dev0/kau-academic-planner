from __future__ import annotations

import json
import subprocess
import unittest
from pathlib import Path

from tests.elective_fixtures import fixture_copy


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


def metrics(program: dict, completed: list[dict], selections: dict | None = None) -> dict:
    return call_helper("plannerProgressMetrics", program, completed, selections or {})


def course_display(
    program: dict, progress: dict, completed_count: int, total_count: int, language: str
) -> str:
    return call_helper(
        "courseCompletionDisplay", program, progress, completed_count, total_count, language
    )


class CreditDisplayTests(unittest.TestCase):
    def test_elective_course_ratio_uses_only_required_counts(self) -> None:
        program = fixture_copy()
        program["elective_groups"] = [
            group for group in program["elective_groups"] if group["id"] != "credit-based"
        ]
        program["courses"] = [
            course for course in program["courses"]
            if course["course_code"] not in {"SYN 301", "SYN 302", "SYN 303"}
        ]
        by_code = {course["course_code"]: course for course in program["courses"]}
        completed_codes = ["SYN 100", "SYN 101", "SYN 201", "SYN 202"]
        progress = metrics(
            program,
            [by_code[code] for code in completed_codes],
            {"choose-one": ["SYN 101"], "choose-two": ["SYN 201", "SYN 202"]},
        )

        self.assertEqual(progress["completedCourseCount"], 4)
        self.assertEqual(progress["remainingCourseCount"], 3)
        self.assertEqual(course_display(program, progress, 4, len(program["courses"]), "en"), "4 / 7 courses")
        self.assertEqual(course_display(program, progress, 4, len(program["courses"]), "ar"), "4 / 7 مقررات")
        self.assertLess(7, len(program["courses"]))

    def test_credit_based_group_uses_bilingual_completed_only_label(self) -> None:
        program = fixture_copy()
        progress = metrics(program, program["courses"][:8])

        self.assertIsNone(progress["completedCourseCount"])
        self.assertIsNone(progress["remainingCourseCount"])
        self.assertEqual(course_display(program, progress, 8, 17, "en"), "8 completed courses")
        self.assertEqual(course_display(program, progress, 8, 17, "ar"), "8 مقررات مكتملة")

    def test_optional_and_unselected_options_do_not_expand_required_denominator(self) -> None:
        program = fixture_copy()
        program["elective_groups"] = [
            group for group in program["elective_groups"] if group["id"] != "credit-based"
        ]
        program["courses"] = [
            course for course in program["courses"]
            if course["course_code"] not in {"SYN 301", "SYN 302", "SYN 303"}
        ]
        progress = metrics(program, [])

        required_total = progress["completedCourseCount"] + progress["remainingCourseCount"]
        self.assertEqual(required_total, 7)
        self.assertEqual(len(program["courses"]), 14)
        optional = next(group for group in program["elective_groups"] if group["id"] == "optional")
        self.assertFalse(optional["required"])

    def test_legacy_course_ratio_is_unchanged(self) -> None:
        program = {"courses": [{"course_code": "A"}, {"course_code": "B"}]}
        progress = metrics(program, [program["courses"][0]])
        self.assertEqual(course_display(program, progress, 1, 2, "en"), "1 / 2 courses")
        self.assertEqual(course_display(program, progress, 1, 2, "ar"), "1 / 2 مقررات")

    def test_elective_metrics_do_not_count_unselected_or_incomplete_options(self) -> None:
        program = fixture_copy()
        by_code = {course["course_code"]: course for course in program["courses"]}
        incomplete = metrics(program, [], {"choose-one": ["SYN 101"]})
        self.assertEqual(incomplete["completedCredits"], 0)
        self.assertFalse(incomplete["graduationComplete"])
        unselected = metrics(program, [by_code["SYN 101"]], {})
        self.assertEqual(unselected["completedCredits"], 0)
        selected = metrics(
            program, [by_code["SYN 101"]], {"choose-one": ["SYN 101"]},
        )
        self.assertEqual(selected["completedCredits"], 3)
        self.assertGreaterEqual(selected["remainingCredits"], 0)
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
            "value": "42", "label": "Calculated from the published plan", "calculated": True,
        })
        self.assertEqual(arabic, {
            "value": "42", "label": "محسوبة من الخطة المنشورة", "calculated": True,
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
