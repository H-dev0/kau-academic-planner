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
        self.assertEqual(len(programs), 227)
        self.assertEqual(REPORT["coverage_before"], {
            "FULL_PLANNER": 195, "OFFICIAL_PLAN_VIEW": 0, "CATALOG_ONLY": 28,
        })
        self.assertEqual(REPORT["coverage_after"], {
            "FULL_PLANNER": 182, "OFFICIAL_PLAN_VIEW": 2, "CATALOG_ONLY": 43,
        })
        self.assertEqual(REPORT["coverage_at_pr_review_start"], {
            "FULL_PLANNER": 130, "OFFICIAL_PLAN_VIEW": 45, "CATALOG_ONLY": 50,
        })
        self.assertEqual(len(REPORT["programs_restored_to_full_planner"]), 50)
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

    def test_materially_incomplete_plans_are_not_full_planners(self) -> None:
        by_id = {program["id"]: program for program in CATALOG["programs"]}
        catalog_only = {
            "catalog-medicine-bachelor-s-degree-in-medicine-and-surgery",
            "catalog-geography-and-geographic-information-systems",
            "catalog-applied-medica-sciences-bachelor-of-clinical-psychohlogy",
            "catalog-maritime-studies-bachelor-of-marine-engineering",
        }
        for program_id in catalog_only:
            with self.subTest(program_id=program_id):
                program = by_id[program_id]
                self.assertEqual(program["coverage_state"], "CATALOG_ONLY")
                self.assertFalse(program["planner_available"])
                self.assertNotIn("official_plan_view", program)

        health = by_id["catalog-economics-and-administration-bachelor-of-health-services-and-hospital-administrati"]
        self.assertEqual(health["coverage_state"], "OFFICIAL_PLAN_VIEW")
        self.assertEqual(health["official_plan_view"]["visible_course_count"], 34)
        self.assertEqual(
            sum(section["placement"] == "unplaced" for section in health["official_plan_view"]["sections"]),
            1,
        )

    def test_every_unjustified_downgrade_is_restored_from_exact_rows(self) -> None:
        by_id = {program["id"]: program for program in CATALOG["programs"]}
        planners = {program["id"]: program for program in PLANNERS}
        emphasized = {
            "catalog-bachelor-of-public-relations-program",
            "catalog-bachelor-in-french-language-translation",
            "catalog-counseling-psychology",
            "catalog-bachelor-of-sharia",
            "catalog-general-intermediate-diploma-in-applied-computing-and-network-technologies",
            "catalog-general-intermediate-diploma-in-law",
            "catalog-bachelor-of-science-in-computer-science",
            "catalog-bachelor-of-science-in-cybersecurity",
            "catalog-bachelor-of-science-in-hydrology-and-water-resources-management",
            "catalog-bachelor-of-science-in-meteorology",
            "catalog-engineering-bachelor-of-science-in-electrical-engineering-electronics-and-communic",
            "catalog-engineering-bachelor-of-science-in-electrical-engineering-power-and-machines",
            "catalog-chinese-language",
        }
        restored = set(REPORT["programs_restored_to_full_planner"])
        self.assertTrue(emphasized <= restored)
        for program_id in restored:
            with self.subTest(program_id=program_id):
                program = by_id[program_id]
                planner = planners[program_id]
                report_item = next(item for item in REPORT["programs"] if item["resolved_repository_id"] == program_id)
                self.assertEqual(program["coverage_state"], "FULL_PLANNER")
                self.assertTrue(program["planner_available"])
                self.assertEqual(len(planner["courses"]), report_item["repository_row_count_after"])
                self.assertTrue(all(course["credit_hours"] is not None for course in planner["courses"]))
                official_rows = [
                    row for section in program["official_plan_view"]["sections"]
                    for row in section["rows"]
                ]
                self.assertEqual(
                    [course["course_code"] for course in planner["courses"]],
                    [row["display_course_code"] for row in official_rows],
                )
                self.assertEqual(
                    [course["credit_hours"] for course in planner["courses"]],
                    [row["credits"] for row in official_rows],
                )
                self.assertEqual(
                    [(course["course_name_ar"], course["course_name_en"]) for course in planner["courses"]],
                    [(row["course_name_ar"], row["course_name_en"]) for row in official_rows],
                )
                self.assertEqual(
                    [course["prerequisite_text_ar"] for course in planner["courses"]],
                    [row["prerequisite_text_ar"] for row in official_rows],
                )
                self.assertEqual(
                    [course["prerequisite_text_en"] for course in planner["courses"]],
                    [row["prerequisite_text_en"] for row in official_rows],
                )
                identities = [course.get("planner_course_id") or course["course_code"] for course in planner["courses"]]
                self.assertEqual(len(identities), len(set(identities)))
                scheduled = [course for course in planner["courses"] if course.get("official_level_placement") != "unplaced"]
                self.assertTrue(all(course["semester_or_level_ar"] in ARABIC for course in scheduled))
                self.assertTrue(all(course["semester_or_level_en"] in ENGLISH for course in scheduled))

    def test_product_owner_decisions_have_exact_source_defects_and_completeness_flags(self) -> None:
        decisions = REPORT["product_owner_review"]["decisions"]
        self.assertEqual(len(decisions), 65)
        self.assertTrue(all(item["exact_official_evidence"] for item in decisions))
        self.assertTrue(all(item["exact_official_source_defect"] for item in decisions))
        restored = [item for item in decisions if item["final_recommended_state"] == "FULL_PLANNER"]
        self.assertEqual(len(restored), 50)
        self.assertTrue(all(item["all_official_levels_present"] for item in restored))
        self.assertTrue(all(item["all_verified_course_rows_present"] for item in restored))
        self.assertTrue(all(item["all_published_credits_present"] for item in restored))
        self.assertTrue(all(item["all_published_prerequisite_text_present"] for item in restored))
        retained_catalog = [item for item in decisions if item["final_recommended_state"] == "CATALOG_ONLY"]
        self.assertEqual(len(retained_catalog), 13)
        self.assertTrue(all("KAU" in item["exact_official_evidence"] or "official" in item["exact_official_evidence"] for item in retained_catalog))

    def test_cybersecurity_diploma_remains_full_and_course_identities_are_preserved(self) -> None:
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
        additions = REPORT["product_owner_review"]["arts_and_humanities_additions"]
        self.assertEqual({item["official_code"] for item in additions}, {"BA-HIST-AH", "BA-SOCW-AH"})
        self.assertTrue(all(not item["duplicate"] for item in additions))
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
