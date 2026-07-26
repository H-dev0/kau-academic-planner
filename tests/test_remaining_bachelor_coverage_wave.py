from __future__ import annotations

import json
import subprocess
import unittest
from collections import Counter
from pathlib import Path
from urllib.parse import urlparse


ROOT = Path(__file__).resolve().parents[1]
BASE_COMMIT = "d19d5926d74f4f2ff5b8a88da04378bf88234542"
CATALOG = json.loads((ROOT / "web/data/faculty_catalog.json").read_text(encoding="utf-8"))
REPORT = json.loads((ROOT / "reports/plan_extraction/bachelor_remaining_coverage_wave.json").read_text(encoding="utf-8"))
PLANNERS = json.loads((ROOT / "web/data/additional_programs.json").read_text(encoding="utf-8"))["programs"]

EXPECTED_VIEWS = {
    "catalog-law": (51, 149),
    "catalog-markting": (74, 215),
    "catalog-bachelor-of-fashion-industry-for-individuals-with-severe-hearing-disabilities": (54, 139),
}


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

    def test_exact_three_read_only_promotions(self) -> None:
        by_id = {program["id"]: program for program in CATALOG["programs"]}
        planner_ids = {program["id"] for program in PLANNERS}
        self.assertEqual(set(REPORT["programs_added_as_OFFICIAL_PLAN_VIEW"]), set(EXPECTED_VIEWS))
        for program_id, expected in EXPECTED_VIEWS.items():
            with self.subTest(program_id=program_id):
                program = by_id[program_id]
                self.assertEqual(program["coverage_state"], "OFFICIAL_PLAN_VIEW")
                self.assertFalse(program["planner_available"])
                self.assertIsNone(program["planner_data_key"])
                self.assertEqual(program["catalog_status"], "catalog-only")
                self.assertNotIn(program_id, planner_ids)
                view = program["official_plan_view"]
                rows = [row for section in view["sections"] for row in section["rows"]]
                self.assertEqual((len(rows), sum(row["credits"] for row in rows)), expected)
                self.assertTrue(any(section["placement"] == "scheduled" for section in view["sections"]))
                self.assertTrue(any(section["placement"] == "unplaced" for section in view["sections"]))
                self.assertTrue(all(row["course_name_ar"] and row["course_name_en"] for row in rows))
                self.assertTrue(all(isinstance(row["credits"], int) and row["credits"] >= 0 for row in rows))
                self.assertTrue(all(row["raw_course_code"] for row in rows))
                self.assertIn("display sum", " ".join(view["display_notes"]).casefold())

    def test_source_hashes_and_normalization_are_traceable(self) -> None:
        by_id = {program["id"]: program for program in CATALOG["programs"]}
        reported = {item["program_id"]: item for item in REPORT["programs"]}
        for program_id in EXPECTED_VIEWS:
            with self.subTest(program_id=program_id):
                item = reported[program_id]
                view = by_id[program_id]["official_plan_view"]
                self.assertTrue(item["retained_raw_evidence_exists"])
                self.assertEqual(len(view["source"]["sha256_ar"]), 64)
                self.assertEqual(len(view["source"]["sha256_en"]), 64)
                for suffix in ("ar", "en"):
                    host = (urlparse(view["source"][f"url_{suffix}"]).hostname or "").lower()
                    self.assertTrue(host == "kau.edu.sa" or host.endswith(".kau.edu.sa"))
                normalization = view["normalization"]
                self.assertIn("source-section preservation", normalization["rule"])
                self.assertEqual(
                    normalization["removed_exact_duplicate_count"],
                    len(normalization["removed_duplicate_mappings"]),
                )
                self.assertEqual(
                    normalization["removed_source_orders"],
                    [entry["removed_source_order"] for entry in normalization["removed_duplicate_mappings"]],
                )

    def test_program_specific_unresolved_information_is_preserved(self) -> None:
        by_id = {program["id"]: program for program in CATALOG["programs"]}

        law = by_id["catalog-law"]["official_plan_view"]
        law_rows = [row for section in law["sections"] for row in section["rows"]]
        self.assertEqual(sum(row["flags"]["placeholder"] for row in law_rows), 5)
        law_electives = next(section for section in law["sections"] if section["title_en"] == "Elective Courses")
        self.assertEqual(len(law_electives["rows"]), 7)

        marketing = by_id["catalog-markting"]["official_plan_view"]
        marketing_unplaced = [section for section in marketing["sections"] if section["placement"] == "unplaced"]
        self.assertEqual({section["title_en"] for section in marketing_unplaced}, {
            "Elective Courses", "University Requirements", "Faculty Requirements",
        })
        self.assertEqual(sum(len(section["rows"]) for section in marketing_unplaced), 30)

        hearing = by_id[
            "catalog-bachelor-of-fashion-industry-for-individuals-with-severe-hearing-disabilities"
        ]["official_plan_view"]
        hearing_rows = [row for section in hearing["sections"] for row in section["rows"]]
        self.assertEqual(sum(row["flags"]["zero_credit"] for row in hearing_rows), 6)
        occurrences = [
            (section["title_en"], row)
            for section in hearing["sections"]
            for row in section["rows"]
            if row["display_course_code"] == "أ ن 473"
        ]
        self.assertEqual({title for title, _ in occurrences}, {"Compulsory Courses", "Elective Courses"})
        self.assertTrue(all(row["flags"]["unplaced_requirement"] for _, row in occurrences))

    def test_unsafe_programs_remain_catalog_only_with_exact_blockers(self) -> None:
        by_id = {program["id"]: program for program in CATALOG["programs"]}
        skipped = set(REPORT["programs_still_CATALOG_ONLY"])
        self.assertEqual(len(skipped), 16)
        for item in REPORT["programs"]:
            if item["program_id"] not in skipped:
                continue
            with self.subTest(program_id=item["program_id"]):
                program = by_id[item["program_id"]]
                self.assertEqual(program["coverage_state"], "CATALOG_ONLY")
                self.assertFalse(program["planner_available"])
                self.assertIsNone(program["planner_data_key"])
                self.assertNotIn("official_plan_view", program)
                self.assertTrue(item["blocker_or_read_only_limit"])

    def test_only_three_catalog_records_changed_and_existing_behavior_is_untouched(self) -> None:
        original_catalog = json.loads(subprocess.check_output(
            ["git", "show", f"{BASE_COMMIT}:web/data/faculty_catalog.json"], cwd=ROOT, text=True,
        ))
        original_by_id = {program["id"]: program for program in original_catalog["programs"]}
        current_by_id = {program["id"]: program for program in CATALOG["programs"]}
        changed = {program_id for program_id in current_by_id if current_by_id[program_id] != original_by_id[program_id]}
        self.assertEqual(changed, set(EXPECTED_VIEWS))
        for program_id in changed:
            old = original_by_id[program_id]
            new = current_by_id[program_id]
            self.assertEqual(
                {key: value for key, value in new.items() if key not in {"coverage_state", "official_plan_view"}},
                {key: value for key, value in old.items() if key != "coverage_state"},
            )

        original_planners = json.loads(subprocess.check_output(
            ["git", "show", f"{BASE_COMMIT}:web/data/additional_programs.json"], cwd=ROOT, text=True,
        ))
        self.assertEqual({program["id"]: program for program in PLANNERS}, {
            program["id"]: program for program in original_planners["programs"]
        })
        self.assertEqual(current_by_id["accounting"], original_by_id["accounting"])
        self.assertEqual(current_by_id["finance"], original_by_id["finance"])
        existing_views = {
            program_id for program_id, program in original_by_id.items()
            if program.get("coverage_state") == "OFFICIAL_PLAN_VIEW"
        }
        self.assertEqual(len(existing_views), 23)
        self.assertTrue(all(current_by_id[program_id] == original_by_id[program_id] for program_id in existing_views))


if __name__ == "__main__":
    unittest.main()
