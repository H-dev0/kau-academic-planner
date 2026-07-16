from __future__ import annotations

import unittest
from unittest.mock import patch

from kau_programs.catalog_sync import (
    LEVEL_LABELS,
    duplicate_values,
    normalized_code,
    normalized_text,
    validate_catalog,
)


class CatalogSyncTests(unittest.TestCase):
    def test_normalization_handles_punctuation_and_degree_prefixes(self) -> None:
        self.assertEqual(normalized_code("ISCED-645 / 041201"), "ISCED645041201")
        self.assertEqual(
            normalized_text("Bachelor of Science in Accounting"),
            normalized_text("Accounting"),
        )

    def test_duplicate_values_ignores_empty_values(self) -> None:
        self.assertEqual(duplicate_values(["EA", "EA", "", None, "IT"]), ["EA"])

    def test_validation_preserves_legacy_course_payload(self) -> None:
        faculty = {
            "id": "EA", "slug": "economics-administration", "name_ar": "كلية الاقتصاد والإدارة",
            "name_en": "Faculty of Economics and Administration",
        }
        program = {
            "id": "accounting", "slug": "accounting", "faculty_id": "EA",
            "name_ar": "بكالوريوس المحاسبة", "name_en": "Bachelor of Accounting",
            "degree_level": "bachelor", "source_url_ar": "https://kau.edu.sa/ar/programs/accounting",
            "source_url_en": "https://kau.edu.sa/en/programs/accounting", "source_kind": "central_catalog",
            "planner_available": True, "planner_data_key": "accounting",
            "courses": [{"course_code": "ACCT 101", "credit_hours": 3}],
        }
        catalog = {"faculties": [faculty], "programs": [program]}
        audit = {
            "official_faculty_option_total": 1, "processed_faculty_option_total": 1,
            "filter_audit": {"EA": {"official_count": 1}}, "unresolved_faculties": {},
        }
        with patch("kau_programs.catalog_sync.load_planner_ids", return_value={"accounting"}):
            report = validate_catalog(catalog, {"faculties": [faculty], "programs": [program]}, audit, [])
        self.assertTrue(report["ok"], report["errors"])
        self.assertEqual(report["checks"]["course_data_changed"], [])
        self.assertIn("bachelor", LEVEL_LABELS)


if __name__ == "__main__":
    unittest.main()
