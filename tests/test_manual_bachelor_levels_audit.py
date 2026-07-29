from __future__ import annotations

import json
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
CATALOG = json.loads((ROOT / "web/data/faculty_catalog.json").read_text(encoding="utf-8"))
PLANNERS = json.loads((ROOT / "web/data/additional_programs.json").read_text(encoding="utf-8"))["programs"]
REPORT = json.loads((ROOT / "reports/manual_audit/manual_bachelor_levels_audit.json").read_text(encoding="utf-8"))

ARABIC = [
    None, "المستوى الأول", "المستوى الثاني", "المستوى الثالث", "المستوى الرابع",
    "المستوى الخامس", "المستوى السادس", "المستوى السابع", "المستوى الثامن",
    "المستوى التاسع", "المستوى العاشر", "المستوى الحادي عشر", "المستوى الثاني عشر",
]
ENGLISH = [
    None, "Level One", "Level Two", "Level Three", "Level Four", "Level Five",
    "Level Six", "Level Seven", "Level Eight", "Level Nine", "Level Ten",
    "Level Eleven", "Level Twelve",
]


class ManualBachelorLevelsAuditTests(unittest.TestCase):
    def test_coverage_and_report_are_exact(self) -> None:
        programs = CATALOG["programs"]
        self.assertEqual(len(programs), 225)
        self.assertEqual(REPORT["coverage_before"], {
            "FULL_PLANNER": 195, "OFFICIAL_PLAN_VIEW": 0, "CATALOG_ONLY": 28,
        })
        self.assertEqual(REPORT["coverage_after"], {
            "FULL_PLANNER": 130, "OFFICIAL_PLAN_VIEW": 45, "CATALOG_ONLY": 50,
        })
        self.assertEqual(len(REPORT["programs"]), 75)
        self.assertTrue(all(len(item["source_snapshot_sha256"]["ar"]) == 64 for item in REPORT["programs"]))
        self.assertTrue(all(len(item["source_snapshot_sha256"]["en"]) == 64 for item in REPORT["programs"]))

    def test_all_read_only_views_have_canonical_numeric_levels(self) -> None:
        for program in (item for item in CATALOG["programs"] if item["coverage_state"] == "OFFICIAL_PLAN_VIEW"):
            with self.subTest(program_id=program["id"]):
                self.assertFalse(program["planner_available"])
                self.assertIsNone(program["planner_data_key"])
                view = program["official_plan_view"]
                scheduled = [section for section in view["sections"] if section["placement"] == "scheduled"]
                ids = [section["level_id"] for section in scheduled]
                self.assertEqual(ids, sorted(ids))
                self.assertEqual(len(ids), len(set(ids)))
                self.assertTrue(ids)
                self.assertTrue(all(section["rows"] for section in scheduled))
                for section in scheduled:
                    self.assertEqual(section["title_ar"], ARABIC[section["level_id"]])
                    self.assertEqual(section["title_en"], ENGLISH[section["level_id"]])

    def test_level_one_precedes_two_and_seven_never_follows_two_out_of_order(self) -> None:
        for program in CATALOG["programs"]:
            view = program.get("official_plan_view")
            if not view or (
                program["coverage_state"] != "OFFICIAL_PLAN_VIEW"
                and program["id"] != "catalog-intermediate-diploma-in-cybersecurity"
            ):
                continue
            ids = [section["level_id"] for section in view["sections"] if section["placement"] == "scheduled"]
            with self.subTest(program_id=program["id"]):
                if 1 in ids and 2 in ids:
                    self.assertLess(ids.index(1), ids.index(2))
                if 2 in ids and 7 in ids:
                    self.assertGreater(ids.index(7), ids.index(2))

    def test_missing_or_unsafe_plans_are_not_full_planners(self) -> None:
        by_id = {program["id"]: program for program in CATALOG["programs"]}
        catalog_only = {
            "catalog-medicine-bachelor-s-degree-in-medicine-and-surgery",
            "catalog-geography-and-geographic-information-systems",
            "catalog-arts-and-humanities-bachelor-of-arabic-language",
            "catalog-arts-and-humanities-bachelor-of-information-science",
            "catalog-economics-and-administration-bachelor-of-health-services-and-hospital-administrati",
            "catalog-computing-information-tech-bachelor-of-science-in-information-systems",
            "catalog-computing-information-tech-bachelor-of-science-in-information-technology",
            "catalog-law-bachelor-degree-in-law",
            "catalog-tourism-bachelor-of-hospitality-management",
        }
        for program_id in catalog_only:
            with self.subTest(program_id=program_id):
                program = by_id[program_id]
                self.assertEqual(program["coverage_state"], "CATALOG_ONLY")
                self.assertFalse(program["planner_available"])
                self.assertNotIn("official_plan_view", program)

    def test_only_verified_target_remains_full_and_course_identities_are_preserved(self) -> None:
        program_id = "catalog-intermediate-diploma-in-cybersecurity"
        catalog_program = next(program for program in CATALOG["programs"] if program["id"] == program_id)
        planner = next(program for program in PLANNERS if program["id"] == program_id)
        self.assertEqual(catalog_program["coverage_state"], "FULL_PLANNER")
        self.assertTrue(catalog_program["planner_available"])
        self.assertEqual(len(planner["courses"]), 20)
        self.assertEqual([course["level_id"] for course in planner["courses"]], sorted(course["level_id"] for course in planner["courses"]))
        self.assertEqual({course["semester_or_level_en"] for course in planner["courses"]}, {
            "Level One", "Level Two", "Level Three", "Level Four",
        })

    def test_arts_and_humanities_bachelor_inventory_is_complete(self) -> None:
        inventory = REPORT["arts_and_humanities"]
        self.assertEqual(len(inventory["before"]), 7)
        self.assertEqual(len(inventory["after"]), 10)
        self.assertEqual(
            {item["id"] for item in inventory["missing_programs_added"]},
            {"catalog-bachelor-of-history", "catalog-bachelor-of-social-science-social-work"},
        )
        self.assertEqual(
            {item["id"] for item in inventory["reclassified_programs"]},
            {"catalog-literary-in-english-language"},
        )

    def test_jeddah_and_rabigh_computer_science_identities_remain_distinct(self) -> None:
        by_id = {item["resolved_repository_id"]: item for item in REPORT["programs"]}
        jeddah = by_id["catalog-bachelor-of-science-in-computer-science"]
        rabigh = by_id["ri-bachelor-computer-science"]
        self.assertEqual(jeddah["campus"], "Jeddah")
        self.assertEqual(rabigh["campus"], "Rabigh")
        self.assertNotEqual(jeddah["official_english_url"], rabigh["official_english_url"])
        self.assertTrue(rabigh["official_english_url"].endswith("/page/computer-science"))
        self.assertIn("returns 404", rabigh["unresolved_issue"])


if __name__ == "__main__":
    unittest.main()
