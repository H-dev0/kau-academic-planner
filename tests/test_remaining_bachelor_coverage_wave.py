from __future__ import annotations

import json
import subprocess
import unittest
from collections import Counter
from pathlib import Path
from urllib.parse import urlparse


ROOT = Path(__file__).resolve().parents[1]
BASE_COMMIT = "3e7bcacfe129cdbdb712258042d898b245ed2be5"
CATALOG = json.loads((ROOT / "web/data/faculty_catalog.json").read_text(encoding="utf-8"))
REPORT = json.loads((ROOT / "reports/plan_extraction/bachelor_remaining_coverage_wave.json").read_text(encoding="utf-8"))
LEVELS_REPORT = json.loads((ROOT / "reports/plan_extraction/official_levels_completion.json").read_text(encoding="utf-8"))
PLANNERS = json.loads((ROOT / "web/data/additional_programs.json").read_text(encoding="utf-8"))["programs"]

EXPECTED_VIEWS = set(REPORT["programs_added_as_OFFICIAL_PLAN_VIEW"])
LEVEL_RESULTS = {item["program_id"]: item for item in LEVELS_REPORT["completed_programs"]}


class RemainingBachelorCoverageWaveTests(unittest.TestCase):
    def test_complete_remaining_bachelor_inventory_and_classifications(self) -> None:
        programs = REPORT["programs"]
        self.assertEqual(len(programs), 19)
        self.assertEqual(len({item["program_id"] for item in programs}), 19)
        self.assertTrue(all(item["degree_level"] == "bachelor" for item in programs))
        self.assertEqual(Counter(item["final_classification"] for item in programs), {
            "MISSING_OFFICIAL_SOURCE": 11,
            "NEEDS_SAFE_DISPLAY_NORMALIZATION": 3,
            "OFFICIAL_PLAN_VIEW_READY": 1,
            "SOURCE_CONFLICT": 3,
            "UNRESOLVED_ACADEMIC_RULES": 1,
        })
        self.assertTrue(REPORT["inventory_complete_before_academic_changes"])

    def test_historical_promotions_are_refreshed_into_interactive_planners(self) -> None:
        by_id = {program["id"]: program for program in CATALOG["programs"]}
        planner_ids = {program["id"] for program in PLANNERS}
        self.assertEqual(set(REPORT["programs_added_as_OFFICIAL_PLAN_VIEW"]), EXPECTED_VIEWS)
        for program_id in EXPECTED_VIEWS:
            with self.subTest(program_id=program_id):
                program = by_id[program_id]
                expected = LEVEL_RESULTS[program_id]
                self.assertEqual(program["coverage_state"], "FULL_PLANNER")
                self.assertTrue(program["planner_available"])
                self.assertEqual(program["planner_data_key"], program_id)
                self.assertEqual(program["catalog_status"], "active")
                self.assertIn(program_id, planner_ids)
                view = program["official_plan_view"]
                rows = [row for section in view["sections"] for row in section["rows"]]
                self.assertEqual(len(rows), expected["visible_course_count"])
                self.assertEqual(sum(row["credits"] for row in rows if row["credits"] is not None), expected["visible_credit_sum"])
                self.assertTrue(all(section["placement"] == "scheduled" for section in view["sections"]))
                self.assertTrue(all(row["course_name_ar"] and row["course_name_en"] for row in rows))
                self.assertTrue(all(row["credits"] is None or isinstance(row["credits"], int) and row["credits"] >= 0 for row in rows))
                self.assertTrue(all(row["raw_course_code"] for row in rows))
                self.assertIn("levels tab", " ".join(view["display_notes"]).casefold())

    def test_source_hashes_and_normalization_are_traceable(self) -> None:
        by_id = {program["id"]: program for program in CATALOG["programs"]}
        for program_id in EXPECTED_VIEWS:
            with self.subTest(program_id=program_id):
                view = by_id[program_id]["official_plan_view"]
                self.assertEqual(len(view["source"]["sha256_ar"]), 64)
                self.assertEqual(len(view["source"]["sha256_en"]), 64)
                for suffix in ("ar", "en"):
                    host = (urlparse(view["source"][f"url_{suffix}"]).hostname or "").lower()
                    self.assertTrue(host == "kau.edu.sa" or host.endswith(".kau.edu.sa"))
                normalization = view["normalization"]
                self.assertIn("official level", normalization["rule"])
                self.assertEqual(
                    normalization["removed_exact_duplicate_count"],
                    len(normalization["removed_duplicate_mappings"]),
                )
                self.assertEqual(
                    normalization["removed_source_orders"],
                    [entry["removed_source_order"] for entry in normalization["removed_duplicate_mappings"]],
                )

    def test_program_specific_levels_are_preserved_without_other_tabs(self) -> None:
        by_id = {program["id"]: program for program in CATALOG["programs"]}

        law = by_id["catalog-law"]["official_plan_view"]
        law_rows = [row for section in law["sections"] for row in section["rows"]]
        self.assertEqual((len(law["sections"]), len(law_rows)), (8, 44))
        self.assertTrue(all(section["placement"] == "scheduled" for section in law["sections"]))

        marketing = by_id["catalog-markting"]["official_plan_view"]
        self.assertEqual((len(marketing["sections"]), marketing["visible_course_count"]), (8, 44))
        self.assertTrue(all(section["placement"] == "scheduled" for section in marketing["sections"]))

        hearing = by_id[
            "catalog-bachelor-of-fashion-industry-for-individuals-with-severe-hearing-disabilities"
        ]["official_plan_view"]
        hearing_rows = [row for section in hearing["sections"] for row in section["rows"]]
        self.assertEqual((len(hearing["sections"]), len(hearing_rows)), (8, 44))
        self.assertEqual(sum(row["credits"] is None for row in hearing_rows), 6)
        self.assertTrue(all(not row["flags"]["unplaced_requirement"] for row in hearing_rows))

    def test_historical_blockers_are_superseded_only_by_complete_levels(self) -> None:
        by_id = {program["id"]: program for program in CATALOG["programs"]}
        skipped = set(REPORT["programs_still_CATALOG_ONLY"])
        self.assertEqual(len(skipped), 16)
        for item in REPORT["programs"]:
            if item["program_id"] not in skipped:
                continue
            with self.subTest(program_id=item["program_id"]):
                program = by_id[item["program_id"]]
                if program["coverage_state"] == "FULL_PLANNER":
                    self.assertTrue(program["planner_available"])
                    self.assertEqual(program["planner_data_key"], item["program_id"])
                    self.assertIn("official_plan_view", program)
                else:
                    self.assertFalse(program["planner_available"])
                    self.assertIsNone(program["planner_data_key"])
                    self.assertEqual(program["coverage_state"], "CATALOG_ONLY")
                    self.assertNotIn("official_plan_view", program)
                self.assertTrue(item["blocker_or_read_only_limit"])

    def test_planner_records_and_protected_programs_are_untouched(self) -> None:
        original_catalog = json.loads(subprocess.check_output(
            ["git", "show", f"{BASE_COMMIT}:web/data/faculty_catalog.json"], cwd=ROOT, text=True,
        ))
        original_by_id = {program["id"]: program for program in original_catalog["programs"]}
        current_by_id = {program["id"]: program for program in CATALOG["programs"]}
        original_planners = json.loads(subprocess.check_output(
            ["git", "show", f"{BASE_COMMIT}:web/data/additional_programs.json"], cwd=ROOT, text=True,
        ))
        current_planners = {program["id"]: program for program in PLANNERS}
        for program in original_planners["programs"]:
            self.assertEqual(current_planners[program["id"]], program)
        self.assertEqual(current_by_id["accounting"], original_by_id["accounting"])
        self.assertEqual(current_by_id["finance"], original_by_id["finance"])
        full_planners = {
            program_id for program_id, program in original_by_id.items()
            if program.get("coverage_state") == "FULL_PLANNER"
        }
        self.assertEqual(len(full_planners), 72)
        self.assertTrue(all(current_by_id[program_id] == original_by_id[program_id] for program_id in full_planners))


if __name__ == "__main__":
    unittest.main()
