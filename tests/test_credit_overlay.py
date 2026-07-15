from __future__ import annotations

import unittest

from kau_programs.credit_overlay import apply_credit_overlay


class CreditOverlayTests(unittest.TestCase):
    def test_apply_credit_overlay_updates_matching_codes(self) -> None:
        program = {
            "courses": [
                {"course_code": "ACCT 117", "credit_hours": None},
                {"course_code": "ISLS 101", "credit_hours": None},
            ]
        }
        overlay = {
            "source": "test",
            "received_date": "2026-07-06",
            "credits": {"ACCT117": 3},
            "elective_options": {"ACCT 321": 3},
        }

        updated = apply_credit_overlay(program, overlay)

        self.assertEqual(updated["courses"][0]["credit_hours"], 3)
        self.assertIsNone(updated["courses"][1]["credit_hours"])
        self.assertEqual(updated["credit_overlay_source"], "test")
        self.assertEqual(updated["elective_options"], {"ACCT 321": 3})


if __name__ == "__main__":
    unittest.main()
