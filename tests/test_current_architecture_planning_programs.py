import json
import unittest
import unicodedata
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
CATALOG = json.loads((ROOT / "web/data/faculty_catalog.json").read_text(encoding="utf-8"))
PLANNERS = json.loads((ROOT / "web/data/additional_programs.json").read_text(encoding="utf-8"))
CATALOG_BY_ID = {program["id"]: program for program in CATALOG["programs"]}
PLANNER_BY_ID = {program["id"]: program for program in PLANNERS["programs"]}

URBAN = "catalog-architecture-and-planning-bachelor-of-urban-and-regional-planning"
GEOMATICS = "catalog-architecture-and-planning-bachelor-of-geomatics"


def normalize(value):
    return "".join(
        character for character in unicodedata.normalize("NFKC", value or "").upper()
        if character.isalnum()
    )


class CurrentArchitecturePlanningProgramsTests(unittest.TestCase):
    def test_bilingual_catalog_entries_are_full_planners(self):
        expected = {
            URBAN: ("بكالوريوس التخطيط الحضري والإقليمي", "Bachelor of Urban and Regional Planning"),
            GEOMATICS: ("بكالوريوس الجيوماتكس", "Bachelor of Geomatics"),
        }
        for program_id, names in expected.items():
            with self.subTest(program_id=program_id):
                catalog = CATALOG_BY_ID[program_id]
                self.assertEqual((catalog["name_ar"], catalog["name_en"]), names)
                self.assertEqual(catalog["coverage_state"], "FULL_PLANNER")
                self.assertTrue(catalog["planner_available"])
                self.assertEqual(catalog["planner_data_key"], program_id)
                self.assertEqual(catalog["official_plan_view"]["official_level_count"], 10)

    def test_exact_current_level_rows_and_credit_disclosures(self):
        urban = PLANNER_BY_ID[URBAN]
        geomatics = PLANNER_BY_ID[GEOMATICS]
        self.assertEqual((len(urban["courses"]), urban["official_plan_level_count"]), (52, 10))
        self.assertEqual((len(geomatics["courses"]), geomatics["official_plan_level_count"]), (51, 10))
        self.assertEqual(urban["official_total_credits"], 165)
        self.assertEqual(urban["published_level_rows_credit_sum"], 167)
        self.assertEqual(urban["calculated_plan_credits"], 146)
        self.assertIsNone(geomatics["official_total_credits"])
        self.assertEqual(geomatics["published_level_rows_credit_sum"], 168)
        self.assertEqual(geomatics["calculated_plan_credits"], 144)
        self.assertEqual(
            [course["credit_hours"] for course in geomatics["courses"] if course["course_code"] in {"GEOM 250", "GEOM 351"}],
            [None, None],
        )

    def test_unresolved_source_prerequisites_warn_and_do_not_block(self):
        expected = {URBAN: 4, GEOMATICS: 2}
        for program_id, count in expected.items():
            with self.subTest(program_id=program_id):
                planner = PLANNER_BY_ID[program_id]
                unresolved = [course for course in planner["courses"] if course["prerequisite_verification_required"]]
                self.assertEqual(len(unresolved), count)
                self.assertTrue(all(course["prerequisites"] == [] for course in unresolved))
                self.assertTrue(all(course["prerequisite_text_original"] for course in unresolved))
                self.assertTrue(all(any(warning["code"] == "unresolved_prerequisite" for warning in course["academic_data_warnings"]) for course in unresolved))

    def test_resolved_prerequisites_exist_and_progress_identities_are_unique(self):
        for program_id in (URBAN, GEOMATICS):
            with self.subTest(program_id=program_id):
                courses = PLANNER_BY_ID[program_id]["courses"]
                identities = [normalize(course.get("planner_course_id") or course["course_code"]) for course in courses]
                self.assertEqual(len(identities), len(set(identities)))
                identity_set = {normalize(course["course_code"]) for course in courses}
                for course in courses:
                    self.assertTrue(all(normalize(code) in identity_set for code in course["prerequisites"]))

    def test_existing_architecture_planners_remain_present(self):
        self.assertEqual(len(PLANNER_BY_ID["catalog-architecture-and-planning-bachelor-of-architecture"]["courses"]), 59)
        self.assertEqual(len(PLANNER_BY_ID["catalog-architecture-and-planning-bachelor-of-landscape-architecture"]["courses"]), 56)


if __name__ == "__main__":
    unittest.main()
