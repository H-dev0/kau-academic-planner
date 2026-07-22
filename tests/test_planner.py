from __future__ import annotations

import unittest

from kau_programs.planner import normalize_course_code, plan_courses
from kau_programs.schema import Program
from tests.elective_fixtures import fixture_copy


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
    def elective_program(self) -> Program:
        return Program.from_dict(fixture_copy())

    def test_elective_no_partial_and_exact_selections(self) -> None:
        program = self.elective_program()
        empty = plan_courses(program, [], {})
        self.assertFalse(empty["graduation_complete"])
        self.assertIsNone(empty["required_course_count"])
        choose_one = next(s for s in empty["elective_group_statuses"] if s["id"] == "choose-one")
        self.assertEqual(choose_one["remaining_required_count"], 1)
        self.assertEqual(choose_one["remaining_elective_credits"], 3)

        partial = plan_courses(program, ["SYN 201"], {"choose-two": ["SYN 201"]})
        status = next(s for s in partial["elective_group_statuses"] if s["id"] == "choose-two")
        self.assertEqual(status["selected_count"], 1)
        self.assertEqual(status["remaining_required_count"], 1)
        self.assertEqual(status["remaining_elective_credits"], 3)

        exact = plan_courses(program, ["SYN 101"], {"choose-one": ["SYN 101"]})
        status = next(s for s in exact["elective_group_statuses"] if s["id"] == "choose-one")
        self.assertTrue(status["complete"])

    def test_selected_incomplete_and_completed_unselected_do_not_apply(self) -> None:
        program = self.elective_program()
        selected = plan_courses(program, [], {"choose-one": ["SYN 101"]})
        status = next(s for s in selected["elective_group_statuses"] if s["id"] == "choose-one")
        self.assertEqual(status["applied_completed_credits"], 0)
        self.assertFalse(status["complete"])
        unselected = plan_courses(program, ["SYN 101"], {})
        status = next(s for s in unselected["elective_group_statuses"] if s["id"] == "choose-one")
        self.assertEqual(status["applied_completed_credits"], 0)

    def test_credit_group_different_values_and_no_double_count(self) -> None:
        result = plan_courses(
            self.elective_program(), ["SYN 302", "SYN 303"],
            {"credit-based": ["SYN 302", "SYN 303"]},
        )
        status = next(s for s in result["elective_group_statuses"] if s["id"] == "credit-based")
        self.assertEqual(status["applied_completed_credits"], 9)
        self.assertEqual(status["remaining_elective_credits"], 0)
        self.assertTrue(status["complete"])
        self.assertEqual(result["applied_completed_credits"], 9)

    def test_excessive_and_wrong_group_selections_are_errors(self) -> None:
        program = self.elective_program()
        excessive = plan_courses(program, [], {"choose-one": ["SYN 101", "SYN 102"]})
        self.assertTrue(excessive["validation_errors"])
        wrong = plan_courses(program, [], {"choose-one": ["SYN 201"]})
        self.assertTrue(wrong["validation_errors"])

    def test_elective_prerequisite_locking_and_unlocking(self) -> None:
        program = self.elective_program()
        initial = plan_courses(program, [], {"with-prerequisite": ["SYN 501"]})
        blocked = {item["course"]["course_code"] for item in initial["blocked_courses"]}
        self.assertIn("SYN 501", blocked)
        after = plan_courses(program, ["SYN 100"], {"with-prerequisite": ["SYN 501"]})
        available = {item["course_code"] for item in after["available_courses"]}
        self.assertIn("SYN 501", available)

    def test_optional_group_does_not_block_and_remaining_never_negative(self) -> None:
        raw = fixture_copy()
        raw["elective_groups"] = [raw["elective_groups"][-1]]
        raw["total_program_credit_hours"] = 1
        program = Program.from_dict(raw)
        completed = [course["course_code"] for course in raw["courses"] if not course["course_code"].startswith("SYN 60")]
        result = plan_courses(program, completed, {})
        self.assertTrue(result["graduation_complete"])
        self.assertEqual(result["remaining_required_credits"], 0)

    def test_replacing_selection_preserves_completed_history(self) -> None:
        program = self.elective_program()
        result = plan_courses(program, ["SYN 101", "SYN 102"], {"choose-one": ["SYN 102"]})
        self.assertEqual(result["completed_count"], 2)
        status = next(s for s in result["elective_group_statuses"] if s["id"] == "choose-one")
        self.assertEqual(status["completed_selected_course_codes"], ["SYN 102"])
        self.assertEqual(status["applied_completed_credits"], 3)
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
