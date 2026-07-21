from __future__ import annotations

import json
import os
import re
import socket
import subprocess
import time
import unittest
from pathlib import Path
from urllib.error import URLError
from urllib.request import Request, urlopen

from kau_programs.planner import plan_courses
from kau_programs.schema import Program
from kau_programs.validation import validate_program


ROOT = Path(__file__).resolve().parents[1]
PILOTS = {
    "catalog-associate-diploma-in-applications-development": {
        "count": 10, "credits": 31,
        "levels": {"1st Semester/Level", "2nd Semester/Level"},
        "available": 6, "blocked": 4, "completed": ["ACIT 113"],
        "unlocked": {"ACIT 114", "ACIT 115"},
        "blocked_example": ("ACIT 192", ["ACIT 113", "ACIT 124", "ACIT 156"]),
    },
    "catalog-executive-master-in-public-policy": {
        "count": 13, "credits": 39,
        "levels": {"level 1", "level 2", "level 3", "level 4"},
        "available": 5, "blocked": 8, "completed": ["PSE 604", "PSE 694"],
        "unlocked": {"PSE 614", "PSE 617"},
        "blocked_example": ("PSE 614", ["PSE 604", "PSE 694"]),
    },
    "catalog-information-systems-management-and-digitalization": {
        "count": 14, "credits": 42,
        "levels": {"level 1", "level 2", "level 3", "level4"},
        "available": 5, "blocked": 9, "completed": ["MISE 602"],
        "unlocked": {"EMIS 671", "EMIS 672"},
        "blocked_example": ("MISE 610", ["MISE 608"]),
    },
    "catalog-executive-master-of-health-administration-emha": {
        "count": 15, "credits": 45,
        "levels": {"level 1", "level 2", "level 3", "level 4"},
        "available": 15, "blocked": 0, "completed": [],
        "unlocked": set(), "blocked_example": None,
        "no_prerequisites": True,
        "special_course": ("HSAE 698", "Applied Research Project", 3),
    },
    "catalog-master-of-science-in-engineering-management": {
        "count": 14, "credits": 42,
        "levels": {"1st Semester", "2nd Semester", "3rd Semester", "4th Semester"},
        "available": 14, "blocked": 0, "completed": [],
        "unlocked": set(), "blocked_example": None,
        "no_prerequisites": True,
        "special_course": ("IEEM 698", "Research Project", 3),
    },
    "catalog-masters-in-marine-geology": {
        "count": 9, "credits": 34,
        "levels": {"Level 1", "Level 2", "Level 3", "Level 4"},
        "available": 9, "blocked": 0, "completed": [],
        "unlocked": set(), "blocked_example": None,
        "no_prerequisites": True,
        "special_course": ("MG 699", "Master's Thesis", 10),
    },
}


def displayed_credits(program: dict, language: str = "en") -> dict:
    script = """
const { programCreditDisplay } = require('./web/credit-display.js');
const program = JSON.parse(process.argv[1]);
process.stdout.write(JSON.stringify(programCreditDisplay(program, process.argv[2])));
"""
    return json.loads(subprocess.check_output(
        ["node", "-e", script, json.dumps(program), language], cwd=ROOT, text=True,
    ))


def progress_metrics(program: dict, completed: list[dict]) -> dict:
    script = """
const { plannerProgressMetrics } = require('./web/credit-display.js');
const program = JSON.parse(process.argv[1]);
const completed = JSON.parse(process.argv[2]);
process.stdout.write(JSON.stringify(plannerProgressMetrics(program, completed)));
"""
    return json.loads(subprocess.check_output(
        ["node", "-e", script, json.dumps(program), json.dumps(completed)], cwd=ROOT, text=True,
    ))


def load(path: str) -> dict:
    return json.loads((ROOT / path).read_text(encoding="utf-8"))


def normalize(code: str) -> str:
    return re.sub(r"[^A-Z0-9]", "", code.upper())


class PilotImportDataTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.data = {p["id"]: p for p in load("web/data/additional_programs.json")["programs"]}
        cls.catalog = load("web/data/faculty_catalog.json")["programs"]
        cls.audit = {
            p["program_id"]: p
            for p in load("reports/plan_extraction/ready_candidate_reconciliation.json")["programs"]
        }

    def test_exactly_six_verified_candidates_are_promoted(self) -> None:
        candidate_ids = set(self.audit)
        promoted = {p["id"] for p in self.catalog if p.get("planner_available")} & candidate_ids
        self.assertEqual(promoted, set(PILOTS))
        self.assertTrue(all(self.audit[p]["new_classification"] == "VERIFIED_IMPORT_READY" for p in PILOTS))

    def test_catalog_counts_and_selected_statuses(self) -> None:
        self.assertEqual(sum(bool(p.get("planner_available")) for p in self.catalog), 58)
        self.assertEqual(sum(p.get("catalog_status") == "catalog-only" for p in self.catalog), 165)
        by_id = {p["id"]: p for p in self.catalog}
        for program_id in PILOTS:
            self.assertTrue(by_id[program_id]["planner_available"])
            self.assertEqual(by_id[program_id]["planner_data_key"], program_id)
            self.assertEqual(by_id[program_id]["catalog_status"], "active")

    def test_plan_data_matches_reconciled_source(self) -> None:
        for program_id, expected in PILOTS.items():
            with self.subTest(program_id=program_id):
                program = self.data[program_id]
                source = self.audit[program_id]
                courses = program["courses"]
                identities = [normalize(c["course_code"]) for c in courses]
                self.assertEqual(len(courses), expected["count"])
                self.assertEqual(sum(c["credit_hours"] for c in courses), expected["credits"])
                self.assertEqual(program["calculated_plan_credit_hours"], expected["credits"])
                self.assertIsNone(program["total_program_credit_hours"])
                self.assertEqual({c["semester_or_level"] for c in courses}, expected["levels"])
                self.assertEqual(len(identities), len(set(identities)))
                self.assertEqual(program["program_name_ar"], source["program_name_ar"])
                self.assertEqual(program["program_name_en"], source["program_name_en"])
                source_urls = source["source_url_or_document"]
                self.assertEqual(program["source_url_ar"], next(u for u in source_urls if "/ar/" in u))
                self.assertEqual(program["source_url_en"], next(u for u in source_urls if "/en/" in u))
                self.assertEqual(program["official_source_url"], program["source_url_en"])
                self.assertEqual(program["last_checked_date"], "2026-07-18")
                self.assertEqual(
                    [c["course_code"] for c in courses],
                    [c["canonical_course_code"] for c in source["courses"]],
                )
                source_courses = {c["canonical_course_code"]: c for c in source["courses"]}
                for course in courses:
                    original = source_courses[course["course_code"]]
                    self.assertEqual(course["semester_or_level"], original["level_or_semester"])
                    self.assertEqual(course["course_name_ar"], original["course_name_ar"])
                    self.assertEqual(course["course_name_en"], original["course_name_en"])
                    self.assertEqual(course["official_course_name"], original["course_name_ar"])
                    self.assertEqual(course["credit_hours"], original["credit_hours"])
                    self.assertEqual(course["official_source_url"], program["source_url_en"])
                    self.assertEqual(course["last_checked_date"], "2026-07-18")
                if expected.get("no_prerequisites"):
                    self.assertTrue(all(not c["prerequisites"] for c in courses))
                    self.assertTrue(all(not c["corequisites"] for c in courses))

    def test_all_six_pilots_display_their_calculated_credits(self) -> None:
        for program_id, expected in PILOTS.items():
            with self.subTest(program_id=program_id):
                program = self.data[program_id]
                display = displayed_credits(program)
                self.assertEqual(display["value"], str(expected["credits"]))
                self.assertEqual(display["label"], "Calculated credits")
                self.assertTrue(display["calculated"])
                self.assertIsNone(program["total_program_credit_hours"])

    def test_all_six_pilot_progress_metrics_check_and_uncheck(self) -> None:
        for program_id, expected in PILOTS.items():
            with self.subTest(program_id=program_id):
                program = self.data[program_id]
                course = next(
                    (item for item in program["courses"] if item["course_code"] == "MG 699"),
                    program["courses"][0],
                )
                initial = progress_metrics(program, [])
                checked = progress_metrics(program, [course])
                unchecked = progress_metrics(program, [])
                self.assertEqual(initial["effectiveTotalCredits"], expected["credits"])
                self.assertEqual(initial["completedCredits"], 0)
                self.assertEqual(initial["remainingCredits"], expected["credits"])
                self.assertEqual(checked["completedCredits"], course["credit_hours"])
                self.assertEqual(
                    checked["remainingCredits"], expected["credits"] - course["credit_hours"]
                )
                self.assertEqual(
                    checked["completionPercentage"], round(100 / expected["count"])
                )
                self.assertEqual(checked["remainingCourseCount"], expected["count"] - 1)
                self.assertEqual(unchecked, initial)
                self.assertNotIn("NaN", json.dumps([initial, checked, unchecked]))

    def test_engineering_and_marine_examples(self) -> None:
        examples = {
            "catalog-master-of-science-in-engineering-management": ("IEEM 698", 42, 39),
            "catalog-masters-in-marine-geology": ("MG 699", 34, 24),
        }
        for program_id, (course_code, total, remaining) in examples.items():
            with self.subTest(program_id=program_id):
                program = self.data[program_id]
                course = next(c for c in program["courses"] if c["course_code"] == course_code)
                self.assertEqual(progress_metrics(program, [])["remainingCredits"], total)
                self.assertEqual(progress_metrics(program, [course])["remainingCredits"], remaining)
                self.assertEqual(progress_metrics(program, [])["remainingCredits"], total)

    def test_requisites_resolve_and_python_planner_behaves(self) -> None:
        for program_id, expected in PILOTS.items():
            with self.subTest(program_id=program_id):
                raw = self.data[program_id]
                codes = {normalize(c["course_code"]) for c in raw["courses"]}
                for course in raw["courses"]:
                    for requisite in course["prerequisites"] + course["corequisites"]:
                        self.assertIn(normalize(requisite), codes)
                program = Program.from_dict(raw)
                self.assertTrue(validate_program(program)["ok"])
                initial = plan_courses(program, [])
                self.assertEqual(len(initial["available_courses"]), expected["available"])
                self.assertEqual(len(initial["blocked_courses"]), expected["blocked"])
                blocked = {
                    item["course"]["course_code"]: item["missing_prerequisites"]
                    for item in initial["blocked_courses"]
                }
                if expected["blocked_example"] is not None:
                    code, missing = expected["blocked_example"]
                    self.assertEqual(blocked[code], missing)
                after = plan_courses(program, expected["completed"])
                available = {c["course_code"] for c in after["available_courses"]}
                self.assertTrue(expected["unlocked"] <= available)

    def test_special_courses_and_marine_credit_narrative(self) -> None:
        for program_id, expected in PILOTS.items():
            if "special_course" not in expected:
                continue
            with self.subTest(program_id=program_id):
                code, name_en, credits = expected["special_course"]
                course = next(c for c in self.data[program_id]["courses"] if c["course_code"] == code)
                self.assertEqual(course["course_name_en"], name_en)
                self.assertEqual(course["credit_hours"], credits)

        marine_id = "catalog-masters-in-marine-geology"
        self.assertIsNone(self.data[marine_id]["total_program_credit_hours"])
        descriptions = [
            group.get("description") or ""
            for group in self.audit[marine_id]["plan_groups_ar"]
        ]
        self.assertTrue(any("ما لا يقل عن (34) وحدة دراسية معتمدة" in text for text in descriptions))

    def test_only_six_catalog_entries_differ_from_head(self) -> None:
        original = json.loads(subprocess.check_output(
            ["git", "show", "HEAD:web/data/faculty_catalog.json"],
            cwd=ROOT, text=True,
        ))
        original_by_id = {p["id"]: p for p in original["programs"]}
        current_by_id = {p["id"]: p for p in self.catalog}
        self.assertEqual(set(original_by_id), set(current_by_id))
        changed = {
            program_id
            for program_id in current_by_id
            if current_by_id[program_id] != original_by_id[program_id]
        }
        self.assertEqual(changed, set(PILOTS))


class PilotImportApiTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        with socket.socket() as listener:
            listener.bind(("127.0.0.1", 0))
            cls.port = listener.getsockname()[1]
        env = os.environ.copy()
        env["PORT"] = str(cls.port)
        cls.server = subprocess.Popen(
            ["node", "server.js"], cwd=ROOT, env=env,
            stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True,
        )
        cls.base = f"http://127.0.0.1:{cls.port}"
        for _ in range(60):
            try:
                cls.get("/api/programs")
                return
            except URLError:
                if cls.server.poll() is not None:
                    output = cls.server.stdout.read() if cls.server.stdout else ""
                    raise RuntimeError(f"Node server exited: {output}")
                time.sleep(0.1)
        raise RuntimeError("Node server did not become ready")

    @classmethod
    def tearDownClass(cls) -> None:
        cls.server.terminate()
        try:
            cls.server.wait(timeout=5)
        except subprocess.TimeoutExpired:
            cls.server.kill()
            cls.server.wait(timeout=5)

    @classmethod
    def get(cls, path: str) -> dict:
        with urlopen(cls.base + path, timeout=5) as response:
            if response.status != 200:
                raise AssertionError(f"GET {path} returned HTTP {response.status}")
            return json.loads(response.read().decode())

    @classmethod
    def post(cls, path: str, payload: dict) -> dict:
        request = Request(
            cls.base + path, data=json.dumps(payload).encode(),
            headers={"Content-Type": "application/json"}, method="POST",
        )
        with urlopen(request, timeout=5) as response:
            if response.status != 200:
                raise AssertionError(f"POST {path} returned HTTP {response.status}")
            return json.loads(response.read().decode())

    def test_existing_api_loads_and_plans_all_six_programs(self) -> None:
        summaries = {p["id"]: p for p in self.get("/api/programs")["programs"]}
        for program_id, expected in PILOTS.items():
            with self.subTest(program_id=program_id):
                self.assertTrue(summaries[program_id]["planner_available"])
                self.assertEqual(summaries[program_id]["course_count"], expected["count"])
                program = self.get(f"/api/program?major={program_id}")
                self.assertEqual(len(program["courses"]), expected["count"])
                plan = self.post(f"/api/plan?major={program_id}", {"completed_codes": []})
                self.assertEqual(len(plan["available_courses"]), expected["available"])
                self.assertEqual(len(plan["blocked_courses"]), expected["blocked"])
                after = self.post(
                    f"/api/plan?major={program_id}",
                    {"completed_codes": expected["completed"]},
                )
                available = {c["course_code"] for c in after["available_courses"]}
                self.assertTrue(expected["unlocked"] <= available)


if __name__ == "__main__":
    unittest.main()
