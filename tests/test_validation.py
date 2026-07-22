from __future__ import annotations

import unittest

from kau_programs.schema import Program
from kau_programs.validation import validate_program
from tests.elective_fixtures import fixture_copy


class ValidationTests(unittest.TestCase):
    def test_valid_elective_group_variants(self) -> None:
        report = validate_program(Program.from_dict(fixture_copy()))
        self.assertTrue(report["ok"], report["errors"])

    def test_duplicate_group_ids_fail(self) -> None:
        raw = fixture_copy()
        raw["elective_groups"][1]["id"] = raw["elective_groups"][0]["id"]
        report = validate_program(Program.from_dict(raw))
        self.assertIn("duplicate elective group id: choose-one", report["errors"])

    def test_unknown_option_and_duplicate_required_membership_fail(self) -> None:
        raw = fixture_copy()
        raw["elective_groups"][0]["option_course_codes"].append("SYN 999")
        raw["elective_groups"][1]["option_course_codes"].append("SYN 101")
        report = validate_program(Program.from_dict(raw))
        self.assertTrue(any("unknown course code: SYN 999" in error for error in report["errors"]))
        self.assertTrue(any("multiple elective groups" in error for error in report["errors"]))

    def test_invalid_constraints_and_classification_fail(self) -> None:
        cases = []
        raw = fixture_copy(); raw["elective_groups"][0]["classification"] = "department"; cases.append(raw)
        raw = fixture_copy(); raw["elective_groups"][0]["required_course_count"] = 2; raw["elective_groups"][0]["maximum_course_count"] = 1; cases.append(raw)
        raw = fixture_copy(); raw["elective_groups"][0]["required_course_count"] = None; raw["elective_groups"][0]["required_credit_hours"] = None; cases.append(raw)
        raw = fixture_copy(); raw["elective_groups"][-1]["maximum_course_count"] = None; cases.append(raw)
        for candidate in cases:
            with self.subTest(candidate=candidate["elective_groups"]):
                self.assertFalse(validate_program(Program.from_dict(candidate))["ok"])
    def test_valid_minimal_program(self) -> None:
        program = Program.from_dict(
            {
                "university_name": "King Abdulaziz University",
                "college_name": "Example College",
                "program_name": "Accounting",
                "degree_level": "Bachelor's degree",
                "total_program_credit_hours": 3,
                "official_source_url": "https://example.edu/official-study-plan",
                "source_title": "Official study plan",
                "last_checked_date": "2026-07-04",
                "courses": [
                    {
                        "semester_or_level": "Level 1",
                        "course_code": "ACCT 101",
                        "official_course_name": "Accounting Principles",
                        "credit_hours": 3,
                        "prerequisites": [],
                        "official_source_url": "https://example.edu/official-study-plan",
                        "source_title": "Official study plan",
                        "last_checked_date": "2026-07-04",
                    }
                ],
            }
        )

        report = validate_program(program)

        self.assertTrue(report["ok"])
        self.assertEqual(report["course_count"], 1)
        self.assertEqual(report["sum_course_credit_hours"], 3)

    def test_duplicate_course_code_fails(self) -> None:
        base_course = {
            "semester_or_level": "Level 1",
            "course_code": "ACCT 101",
            "official_course_name": "Accounting Principles",
            "credit_hours": 3,
            "prerequisites": [],
            "official_source_url": "https://example.edu/official-study-plan",
            "source_title": "Official study plan",
            "last_checked_date": "2026-07-04",
        }
        program = Program.from_dict(
            {
                "university_name": "King Abdulaziz University",
                "college_name": "Example College",
                "program_name": "Accounting",
                "degree_level": "Bachelor's degree",
                "total_program_credit_hours": 6,
                "official_source_url": "https://example.edu/official-study-plan",
                "source_title": "Official study plan",
                "last_checked_date": "2026-07-04",
                "courses": [base_course, dict(base_course)],
            }
        )

        report = validate_program(program)

        self.assertFalse(report["ok"])
        self.assertIn("duplicate course code: ACCT 101", report["errors"])

    def test_placeholder_course_codes_can_repeat(self) -> None:
        base_course = {
            "semester_or_level": "Level 6",
            "course_code": "ELECTIVE",
            "official_course_name": "Elective",
            "credit_hours": None,
            "prerequisites": [],
            "official_source_url": "https://example.edu/official-study-plan",
            "source_title": "Official study plan",
            "last_checked_date": "2026-07-05",
        }
        program = Program.from_dict(
            {
                "university_name": "King Abdulaziz University",
                "college_name": "Faculty of Economics and Administration",
                "program_name": "Accounting",
                "degree_level": "Bachelor's degree",
                "total_program_credit_hours": 125,
                "official_source_url": "https://example.edu/official-study-plan",
                "source_title": "Official study plan",
                "last_checked_date": "2026-07-05",
                "courses": [base_course, dict(base_course)],
            }
        )

        report = validate_program(program)

        self.assertTrue(report["ok"])
        self.assertEqual(report["duplicate_course_codes"], [])

    def test_missing_course_credit_hours_warns_but_allows_validation(self) -> None:
        program = Program.from_dict(
            {
                "university_name": "King Abdulaziz University",
                "college_name": "Faculty of Economics and Administration",
                "program_name": "Accounting",
                "degree_level": "Bachelor's degree",
                "total_program_credit_hours": 125,
                "official_source_url": "https://kau.edu.sa/en/programs/example",
                "source_title": "Official study plan",
                "last_checked_date": "2026-07-05",
                "courses": [
                    {
                        "semester_or_level": "level 1",
                        "course_code": "ACCT 117",
                        "official_course_name": "Accounting Principles",
                        "credit_hours": None,
                        "prerequisites": [],
                        "official_source_url": "https://kau.edu.sa/en/programs/example",
                        "source_title": "Official study plan",
                        "last_checked_date": "2026-07-05",
                    }
                ],
            }
        )

        report = validate_program(program)

        self.assertTrue(report["ok"])
        self.assertEqual(report["missing_course_credit_hours_count"], 1)
        self.assertTrue(report["warnings"])


if __name__ == "__main__":
    unittest.main()
