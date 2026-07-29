from __future__ import annotations

import json
import math
import subprocess
import unittest
import unicodedata
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
BASE_COMMIT = "06f622d22d3efee9ff3c45e4f4b03f20e36d4b65"
CATALOG = json.loads((ROOT / "web/data/faculty_catalog.json").read_text(encoding="utf-8"))["programs"]
PLANNERS = json.loads((ROOT / "web/data/additional_programs.json").read_text(encoding="utf-8"))["programs"]
REPORT = json.loads((ROOT / "reports/plan_extraction/all_visible_plans_to_interactive.json").read_text(encoding="utf-8"))
MANUAL_REPORT = json.loads((ROOT / "reports/manual_audit/manual_bachelor_levels_audit.json").read_text(encoding="utf-8"))
MANUAL_BY_ID = {item["resolved_repository_id"]: item for item in MANUAL_REPORT["programs"]}


def normalize(value: str | None) -> str:
    return "".join(
        character for character in unicodedata.normalize("NFKC", value or "").upper()
        if character.isalnum()
    )


class AllVisiblePlansInteractiveTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.catalog_by_id = {program["id"]: program for program in CATALOG}
        cls.planner_by_id = {program["id"]: program for program in PLANNERS}
        cls.converted = {
            item["program_id"]: item
            for key in ("converted_from_official_plan_view", "converted_from_catalog_only")
            for item in REPORT[key]
        }

    def test_exact_coverage_and_conversion_inventory(self) -> None:
        self.assertEqual(REPORT["coverage_before"], {
            "total": 223, "FULL_PLANNER": 73,
            "OFFICIAL_PLAN_VIEW": 116, "CATALOG_ONLY": 34,
        })
        self.assertEqual(REPORT["coverage_after"], {
            "total": 223, "FULL_PLANNER": 195,
            "OFFICIAL_PLAN_VIEW": 0, "CATALOG_ONLY": 28,
        })
        self.assertEqual(len(REPORT["converted_from_official_plan_view"]), 116)
        self.assertEqual(
            {item["program_id"] for item in REPORT["converted_from_catalog_only"]},
            {
                "catalog-associate-diploma-in-crisis-and-disaster-management",
                "catalog-associate-diploma-in-graphical-design",
                "catalog-food-and-nutrition",
                "catalog-general-intermediate-diploma-in-applied-computing-and-network-technologies",
                "catalog-general-intermediate-diploma-in-law",
                "catalog-intermediate-diploma-in-cybersecurity",
            },
        )
        self.assertEqual(len(self.converted), 122)
        self.assertEqual(sum(item["course_count"] for item in self.converted.values()), 3023)

    def test_every_converted_program_preserves_visible_official_rows(self) -> None:
        for program_id, expected in self.converted.items():
            with self.subTest(program_id=program_id):
                if program_id in MANUAL_BY_ID:
                    self.assertEqual(
                        self.catalog_by_id[program_id]["coverage_state"],
                        MANUAL_BY_ID[program_id]["final_coverage_state"],
                    )
                    continue
                catalog_program = self.catalog_by_id[program_id]
                planner = self.planner_by_id[program_id]
                official_rows = [
                    row for section in catalog_program["official_plan_view"]["sections"]
                    for row in section["rows"]
                ]
                self.assertEqual(catalog_program["coverage_state"], "FULL_PLANNER")
                self.assertTrue(catalog_program["planner_available"])
                self.assertEqual(catalog_program["planner_data_key"], program_id)
                self.assertEqual(len(planner["courses"]), len(official_rows))
                self.assertEqual(len(planner["courses"]), expected["course_count"])
                self.assertEqual(planner["official_plan_level_count"], expected["level_count"])
                self.assertEqual(
                    [course["course_code"] for course in planner["courses"]],
                    [row["display_course_code"] for row in official_rows],
                )
                self.assertEqual(
                    [course["credit_hours"] for course in planner["courses"]],
                    [row["credits"] for row in official_rows],
                )

    def test_unique_progress_identities_and_prerequisite_convergence(self) -> None:
        for program_id in self.converted:
            with self.subTest(program_id=program_id):
                courses = self.planner_by_id[program_id]["courses"]
                identities = [normalize(course.get("planner_course_id") or course["course_code"]) for course in courses]
                self.assertEqual(len(identities), len(set(identities)))
                identity_set = set(identities)
                for course in courses:
                    self.assertTrue(all(normalize(code) in identity_set for code in course["prerequisites"]))

                completed: set[str] = set()
                for _ in range(len(courses) + 1):
                    newly_available = {
                        normalize(course.get("planner_course_id") or course["course_code"])
                        for course in courses
                        if all(normalize(code) in completed for code in course["prerequisites"])
                    } - completed
                    if not newly_available:
                        break
                    completed.update(newly_available)
                self.assertEqual(completed, identity_set)

    def test_ambiguous_prerequisites_warn_without_blocking(self) -> None:
        ambiguous = []
        historical_expected = 0
        for program_id, report_item in self.converted.items():
            if program_id in MANUAL_BY_ID:
                continue
            historical_expected += len(report_item["unresolved_prerequisite_rows"])
            for course in self.planner_by_id[program_id]["courses"]:
                if not course["prerequisite_verification_required"]:
                    continue
                ambiguous.append(course)
                self.assertEqual(course["prerequisites"], [])
                self.assertTrue(course["prerequisite_text_original"])
                warning = next(
                    item for item in course["academic_data_warnings"]
                    if item["code"] == "unresolved_prerequisite"
                )
                self.assertEqual(warning["message_en"], "Prerequisite information requires verification")
                self.assertEqual(warning["message_ar"], "بيانات المتطلب تحتاج إلى تحقق")
        self.assertEqual(len(ambiguous), historical_expected)

    def test_credit_metadata_is_finite_and_electives_are_conservative(self) -> None:
        for program_id in self.converted:
            with self.subTest(program_id=program_id):
                planner = self.planner_by_id[program_id]
                self.assertIn(planner["credit_total_source"], {
                    "calculated_from_published_plan", "official_published_level_totals",
                })
                for key in ("official_total_credits", "calculated_plan_credits"):
                    value = planner[key]
                    self.assertTrue(value is None or isinstance(value, (int, float)) and math.isfinite(value))
                for course in planner["courses"]:
                    value = course["credit_hours"]
                    self.assertTrue(value is None or isinstance(value, int) and value >= 0)
                    if course["course_type"] in {"elective", "track"}:
                        self.assertFalse(course["counts_toward_program_credit_total"])

    def test_chinese_food_and_protected_regressions(self) -> None:
        chinese = self.planner_by_id["catalog-chinese-language"]
        self.assertEqual(chinese["official_plan_level_count"], 8)
        self.assertEqual(len(chinese["courses"]), 45)
        self.assertEqual(sum(course["credit_hours"] for course in chinese["courses"]), 125)

        food = self.planner_by_id["catalog-food-and-nutrition"]
        self.assertEqual(food["official_plan_level_count"], 8)
        self.assertEqual(len(food["courses"]), 45)
        self.assertEqual(food["conversion_origin"], "CATALOG_ONLY")

        baseline_catalog = json.loads(subprocess.check_output(
            ["git", "show", f"{BASE_COMMIT}:web/data/faculty_catalog.json"], cwd=ROOT, text=True,
        ))["programs"]
        baseline_by_id = {program["id"]: program for program in baseline_catalog}
        for program_id in ("accounting", "finance"):
            self.assertEqual(self.catalog_by_id[program_id], baseline_by_id[program_id])
        finance = self.planner_by_id["finance"]
        self.assertEqual(
            next(course for course in finance["courses"] if course["course_code"] == "ISLS 201")["prerequisites"],
            [],
        )

    def test_remaining_catalog_programs_have_exact_review_reasons(self) -> None:
        remaining = {item["program_id"]: item for item in REPORT["remaining_catalog_only"]}
        self.assertEqual(len(remaining), 28)
        for program_id, item in remaining.items():
            with self.subTest(program_id=program_id):
                self.assertTrue(item["reason_ar"])
                self.assertTrue(item["reason_en"])
                self.assertTrue(item["sources_checked"])
                if program_id in MANUAL_BY_ID:
                    self.assertEqual(
                        self.catalog_by_id[program_id]["coverage_state"],
                        MANUAL_BY_ID[program_id]["final_coverage_state"],
                    )
                else:
                    self.assertFalse(self.catalog_by_id[program_id]["planner_available"])
                    self.assertIsNone(self.catalog_by_id[program_id]["planner_data_key"])
                    self.assertNotIn(program_id, self.planner_by_id)

    def test_bilingual_notices_and_storage_keys(self) -> None:
        app = (ROOT / "web/app.js").read_text(encoding="utf-8")
        self.assertIn(
            "This planner was created from the published official plan. Any unpublished academic rules are identified with notices inside the planner.",
            app,
        )
        self.assertIn(
            "تم إنشاء المخطط من الخطة الرسمية المنشورة. بعض القواعد الأكاديمية غير المنشورة موضحة بتنبيهات داخل المخطط.",
            app,
        )
        self.assertIn('const localProgressPrefix = "kau-planner-local-progress";', app)
        self.assertIn('`${localProgressPrefix}:${major}`', app)
        baseline_migration = subprocess.check_output(
            ["git", "show", f"{BASE_COMMIT}:web/progress-migration.js"], cwd=ROOT, text=True,
        )
        self.assertEqual(
            (ROOT / "web/progress-migration.js").read_text(encoding="utf-8"),
            baseline_migration,
        )


if __name__ == "__main__":
    unittest.main()
