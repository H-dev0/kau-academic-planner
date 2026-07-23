from __future__ import annotations

import json
import unittest

from kau_programs.plan_audit import (
    embedded_plan,
    language_audit,
    plausible_plan_size,
    reconcile_languages,
    valid_credit_hours,
)


def page_with_plan(levels: list[dict]) -> str:
    value = [1, "a:" + json.dumps(["$", "component", None, {
        "studyPlan": [{"name": "Levels", "has_levels": True, "levels": levels}],
        "studyPlanLink": None,
    }])]
    return f"<html><script>self.__next_f.push({json.dumps(value)})</script></html>"


class PlanAuditTests(unittest.TestCase):
    def test_extracts_rendered_study_plan(self) -> None:
        source = page_with_plan([{
            "name": "Level 1",
            "courses": [{"code": "TEST 101", "name": "Test Course", "credit_hours": 3, "prerequisites": None}],
        }])
        payload = embedded_plan(source)
        self.assertIsNotNone(payload)
        audit = language_audit(source, "https://kau.edu.sa/en/programs/test")
        self.assertTrue(audit["plan_found"])
        self.assertEqual(audit["levels_found"], 1)
        self.assertEqual(audit["course_rows_found"], 1)
        self.assertTrue(audit["course_codes_available"])
        self.assertTrue(audit["credit_hours_available"])
        self.assertFalse(audit["prerequisites_available"])

    def test_bilingual_matching_plan_is_ready(self) -> None:
        language = {
            "plan_found": True,
            "levels_found": 1,
            "course_rows_found": 1,
            "course_codes_available": True,
            "credit_hours_available": True,
            "course_names_available": True,
            "prerequisites_available": False,
            "electives_identified": False,
            "course_codes": ["TEST 101"],
            "duplicate_course_codes": [],
        }
        result = reconcile_languages(dict(language), dict(language))
        self.assertEqual(result["recommended_status"], "ready_to_import")
        self.assertEqual(result["extraction_confidence"], "high")

    def test_zero_credit_hours_are_not_usable(self) -> None:
        self.assertFalse(valid_credit_hours(0))
        self.assertFalse(valid_credit_hours(None))
        self.assertTrue(valid_credit_hours(3))

    def test_conservative_plan_size_ranges(self) -> None:
        self.assertTrue(plausible_plan_size("bachelor", 8, 44))
        self.assertFalse(plausible_plan_size("bachelor", 18, 206))
        self.assertFalse(plausible_plan_size("other", 8, 44))


if __name__ == "__main__":
    unittest.main()
