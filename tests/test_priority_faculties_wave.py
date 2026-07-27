from __future__ import annotations

import json
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
CATALOG = json.loads((ROOT / "web/data/faculty_catalog.json").read_text(encoding="utf-8"))
REPORT = json.loads((ROOT / "reports/plan_extraction/bachelor_priority_faculties_wave.json").read_text(encoding="utf-8"))
LEVELS_REPORT = json.loads((ROOT / "reports/plan_extraction/official_levels_completion.json").read_text(encoding="utf-8"))
PLANNER_IDS = {
    program["id"]
    for program in json.loads((ROOT / "web/data/additional_programs.json").read_text(encoding="utf-8"))["programs"]
}

EXPECTED_NEW_VIEWS = {
    "catalog-engineering-bachelor-of-science-in-civil-engineering": (66, 196),
    "catalog-engineering-bachelor-of-science-in-electrical-engineering-biomedical": (67, 200),
    "catalog-engineering-bachelor-of-science-in-electrical-engineering-computer": (67, 200),
    "catalog-engineering-bachelor-of-science-in-electrical-engineering-electronics-and-communic": (63, 187),
    "catalog-engineering-bachelor-of-science-in-electrical-engineering-power-and-machines": (68, 195),
    "catalog-engineering-bachelor-of-science-in-mechanical-engineering-aeronautical": (66, 183),
    "catalog-engineering-bachelor-of-science-in-mechanical-engineering-thermal-engineering-and-": (75, 218),
    "catalog-engineering-bachelor-of-science-in-mining-engineering": (64, 185),
}


class PriorityFacultiesWaveTests(unittest.TestCase):
    def test_complete_exact_faculty_inventory_and_decisions(self) -> None:
        programs = REPORT["programs"]
        self.assertEqual(len(programs), 36)
        self.assertEqual({program["faculty_id"] for program in programs}, {"EA", "AH", "SC", "IT", "EN"})
        self.assertTrue(all(program["degree_level"] == "bachelor" for program in programs))
        self.assertEqual(REPORT["summary"]["classification_counts"], {
            "B. OFFICIAL_PLAN_VIEW_READY": 8,
            "C. NEEDS_DETERMINISTIC_DISPLAY_NORMALIZATION": 1,
            "E. UNRESOLVED_ACADEMIC_RULES": 1,
            "F. ALREADY_SUPPORTED": 26,
        })
        self.assertTrue(REPORT["inventory_complete_before_academic_changes"])
        for program in programs:
            self.assertTrue(program["retained_raw_evidence_exists"])
            self.assertEqual(set(program["current_official_page_content"]), {"ar", "en"})
            self.assertEqual(set(program["source_captures"]), {"ar", "en"})
            for evidence in program["source_captures"].values():
                self.assertGreater(evidence["size_bytes"], 0)
                self.assertEqual(len(evidence["sha256"]), 64)

    def test_new_views_are_exactly_the_eight_safe_engineering_programs(self) -> None:
        by_id = {program["id"]: program for program in CATALOG["programs"]}
        reported = set(REPORT["programs_added_as_OFFICIAL_PLAN_VIEW"])
        self.assertEqual(reported, set(EXPECTED_NEW_VIEWS))
        for program_id, expected in EXPECTED_NEW_VIEWS.items():
            with self.subTest(program_id=program_id):
                program = by_id[program_id]
                self.assertEqual(program["coverage_state"], "OFFICIAL_PLAN_VIEW")
                self.assertFalse(program["planner_available"])
                self.assertIsNone(program["planner_data_key"])
                self.assertNotIn(program_id, PLANNER_IDS)
                view = program["official_plan_view"]
                rows = [row for section in view["sections"] for row in section["rows"]]
                self.assertEqual((len(rows), sum(row["credits"] for row in rows)), expected)
                self.assertTrue(any(section["placement"] == "scheduled" for section in view["sections"]))
                self.assertTrue(any(section["placement"] == "unplaced" for section in view["sections"]))
                self.assertTrue(all(row["course_name_ar"] and row["course_name_en"] for row in rows))
                self.assertTrue(all(row["credits"] is not None for row in rows))
                self.assertTrue(any(row["flags"]["placeholder"] for row in rows))
                self.assertTrue(any(row["raw_prerequisite_corequisite_text"] for row in rows))

    def test_display_normalization_is_exact_only_and_traceable(self) -> None:
        for item in REPORT["programs"]:
            if item["program_id"] not in EXPECTED_NEW_VIEWS:
                continue
            view = next(program for program in CATALOG["programs"] if program["id"] == item["program_id"])["official_plan_view"]
            self.assertIn("exact bilingual code/name/credit", view["normalization"]["rule"])
            self.assertEqual(
                view["normalization"]["removed_exact_duplicate_count"],
                item["official_plan_view_result"]["normalization_count"],
            )
            self.assertEqual(
                len(view["normalization"]["removed_source_orders"]),
                view["normalization"]["removed_exact_duplicate_count"],
            )
            self.assertEqual(
                [item["removed_source_order"] for item in view["normalization"]["removed_duplicate_mappings"]],
                view["normalization"]["removed_source_orders"],
            )
            self.assertTrue(all(
                item["kept_source_order"] != item["removed_source_order"]
                for item in view["normalization"]["removed_duplicate_mappings"]
            ))
            self.assertTrue(view["source"]["url_ar"].startswith("https://www.kau.edu.sa/ar/programs/"))
            self.assertTrue(view["source"]["url_en"].startswith("https://www.kau.edu.sa/en/programs/"))

    def test_previously_unsafe_candidates_are_now_levels_only_views(self) -> None:
        by_id = {program["id"]: program for program in CATALOG["programs"]}
        completed = {item["program_id"]: item for item in LEVELS_REPORT["completed_programs"]}
        decisions = {program["program_id"]: program["final_classification"] for program in REPORT["programs"]}
        expected = {
            "catalog-geography-and-geographic-information-systems": "C. NEEDS_DETERMINISTIC_DISPLAY_NORMALIZATION",
            "catalog-bachelor-of-sharia": "E. UNRESOLVED_ACADEMIC_RULES",
        }
        for program_id, classification in expected.items():
            self.assertEqual(decisions[program_id], classification)
            self.assertEqual(by_id[program_id]["coverage_state"], "OFFICIAL_PLAN_VIEW")
            self.assertFalse(by_id[program_id]["planner_available"])
            self.assertIsNone(by_id[program_id]["planner_data_key"])
            self.assertIn(program_id, completed)
            self.assertTrue(all(
                section["placement"] == "scheduled"
                for section in by_id[program_id]["official_plan_view"]["sections"]
            ))


if __name__ == "__main__":
    unittest.main()
