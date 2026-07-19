from __future__ import annotations

import unittest

from kau_programs.ready_reconciliation import (
    classify_program,
    is_placeholder_or_unstable_code,
    normalized_code,
    parse_requisite_references,
)


class ReadyReconciliationTests(unittest.TestCase):
    def test_normalizes_spacing_case_punctuation_and_arabic_digits(self) -> None:
        self.assertEqual(normalized_code(" cs. ٣٥١ "), "CS351")
        self.assertEqual(normalized_code("x xx"), normalized_code("x.xx"))

    def test_accepts_stable_unicode_letter_prefixes(self) -> None:
        arabic_code = "\u0645\u0639\u0631\u0628 151"
        self.assertFalse(is_placeholder_or_unstable_code(arabic_code))

    def test_rejects_placeholders_and_codes_without_numeric_identity(self) -> None:
        self.assertTrue(is_placeholder_or_unstable_code("xxx"))
        self.assertTrue(is_placeholder_or_unstable_code("x xx"))
        self.assertTrue(is_placeholder_or_unstable_code("TBA"))
        self.assertFalse(is_placeholder_or_unstable_code("IT 211"))

    def test_accepts_arabic_prerequisite_punctuation(self) -> None:
        references, ambiguities = parse_requisite_references("EHRM 601" + chr(0x060C) + " EHRM 694")
        self.assertEqual([item["normalized_code"] for item in references], ["EHRM601", "EHRM694"])
        self.assertEqual(ambiguities, [])

    def test_extracts_requisites_without_guessing_from_order(self) -> None:
        references, ambiguities = parse_requisite_references("IT 211, CS 121")
        self.assertEqual([item["normalized_code"] for item in references], ["IT211", "CS121"])
        self.assertEqual(ambiguities, [])

    def test_flags_unparsed_requisite_notation(self) -> None:
        references, ambiguities = parse_requisite_references("see footnote *")
        self.assertEqual(references, [])
        self.assertTrue(ambiguities)

    def test_classification_priority_preserves_known_blockers(self) -> None:
        result = classify_program(
            source_issues=[],
            placeholders=[{"course_code": "xxx"}],
            collisions=[],
            missing=[{"course_code": "JCOM 121"}],
            structural=[],
            production_conflicts=[],
            mechanical=[],
        )
        self.assertEqual(result, "BLOCKED_PLACEHOLDER_OR_COLLIDING_CODES")

    def test_clean_program_is_verified(self) -> None:
        result = classify_program(
            source_issues=[], placeholders=[], collisions=[], missing=[], structural=[],
            production_conflicts=[], mechanical=[],
        )
        self.assertEqual(result, "VERIFIED_IMPORT_READY")


if __name__ == "__main__":
    unittest.main()
