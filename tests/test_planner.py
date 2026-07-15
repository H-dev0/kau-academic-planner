from __future__ import annotations

import unittest

from kau_programs.planner import normalize_course_code, plan_courses
from kau_programs.schema import Program


def build_program() -> Program:
    return Program.from_dict(
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
                    "course_code": "ISLS 101",
                    "official_course_name": "Islamic Studies I",
                    "credit_hours": None,
                    "prerequisites": [],
                    "official_source_url": "https://kau.edu.sa/en/programs/example",
                    "source_title": "Official study plan",
                    "last_checked_date": "2026-07-05",
                },
                {
                    "semester_or_level": "level 3",
                    "course_code": "ISLS 201",
                    "official_course_name": "Islamic Studies II",
                    "credit_hours": None,
                    "prerequisites": ["ISLS 101"],
                    "official_source_url": "https://kau.edu.sa/en/programs/example",
                    "source_title": "Official study plan",
                    "last_checked_date": "2026-07-05",
                },
                {
                    "semester_or_level": "level 5",
                    "course_code": "ISLS 301",
                    "official_course_name": "Islamic Studies III",
                    "credit_hours": None,
                    "prerequisites": ["ISLS 201"],
                    "official_source_url": "https://kau.edu.sa/en/programs/example",
                    "source_title": "Official study plan",
                    "last_checked_date": "2026-07-05",
                },
            ],
        }
    )


class PlannerTests(unittest.TestCase):
    def test_normalize_course_code_accepts_spaces_and_case(self) -> None:
        self.assertEqual(normalize_course_code(" isls 101 "), "ISLS101")
        self.assertEqual(normalize_course_code("ISLS101"), "ISLS101")

    def test_plan_courses_splits_available_and_blocked(self) -> None:
        result = plan_courses(build_program(), ["isls101"])

        available_codes = {
            course["normalized_course_code"] for course in result["available_courses"]
        }
        blocked_codes = {
            item["course"]["normalized_course_code"] for item in result["blocked_courses"]
        }

        self.assertEqual(result["completed_count"], 1)
        self.assertIn("ISLS201", available_codes)
        self.assertIn("ISLS301", blocked_codes)
        self.assertEqual(result["blocked_courses"][0]["missing_prerequisites"], ["ISLS 201"])

    def test_unknown_completed_codes_are_reported(self) -> None:
        result = plan_courses(build_program(), ["FAKE 999"])

        self.assertEqual(result["completed_count"], 0)
        self.assertEqual(result["unknown_completed_codes"], ["FAKE999"])


if __name__ == "__main__":
    unittest.main()
