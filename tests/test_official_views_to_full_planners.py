from __future__ import annotations

import json
import os
import socket
import subprocess
import time
import unittest
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.parse import quote
from urllib.request import Request, urlopen


ROOT = Path(__file__).resolve().parents[1]
BASE_COMMIT = "06f622d22d3efee9ff3c45e4f4b03f20e36d4b65"
PROMOTED_ID = "catalog-professional-master-in-public-relations"
CATALOG = json.loads((ROOT / "web/data/faculty_catalog.json").read_text(encoding="utf-8"))
PLANNERS = json.loads((ROOT / "web/data/additional_programs.json").read_text(encoding="utf-8"))["programs"]
REPORT = json.loads((ROOT / "reports/plan_extraction/official_views_to_full_planners.json").read_text(encoding="utf-8"))
CURRENT_REPORT = json.loads((ROOT / "reports/plan_extraction/all_visible_plans_to_interactive.json").read_text(encoding="utf-8"))
MANUAL_REPORT = json.loads((ROOT / "reports/manual_audit/manual_bachelor_levels_audit.json").read_text(encoding="utf-8"))
MANUAL_BY_ID = {item["resolved_repository_id"]: item for item in MANUAL_REPORT["programs"]}


def normalize(code: str | None) -> str:
    return "".join(character for character in (code or "").upper() if character.isalnum())


class OfficialViewsToFullPlannerTests(unittest.TestCase):
    def test_exact_review_inventory_and_coverage(self) -> None:
        programs = CATALOG["programs"]
        self.assertEqual(REPORT["summary"]["programs_reviewed"], 117)
        self.assertEqual(REPORT["summary"]["programs_promoted"], 1)
        self.assertEqual(REPORT["summary"]["programs_retained"], 116)
        self.assertEqual(REPORT["coverage_before"], {
            "total": 223, "FULL_PLANNER": 72, "OFFICIAL_PLAN_VIEW": 117, "CATALOG_ONLY": 34,
        })
        self.assertEqual(REPORT["coverage_after"], {
            "total": 223, "FULL_PLANNER": 73, "OFFICIAL_PLAN_VIEW": 116, "CATALOG_ONLY": 34,
        })
        self.assertEqual(len(programs), 225)
        self.assertEqual(sum(p["coverage_state"] == "FULL_PLANNER" for p in programs), 180)
        self.assertEqual(sum(p["coverage_state"] == "OFFICIAL_PLAN_VIEW" for p in programs), 2)
        self.assertEqual(sum(p["coverage_state"] == "CATALOG_ONLY" for p in programs), 43)

    def test_only_one_program_is_promoted_and_every_retention_has_exact_blockers(self) -> None:
        promoted = REPORT["promoted_programs"]
        retained = REPORT["retained_programs"]
        self.assertEqual([item["program_id"] for item in promoted], [PROMOTED_ID])
        self.assertEqual(len(retained), 116)
        self.assertEqual(len({item["program_id"] for item in retained}), 116)
        for item in retained:
            with self.subTest(program_id=item["program_id"]):
                self.assertEqual(item["decision"], "retain_OFFICIAL_PLAN_VIEW")
                self.assertTrue(item["blockers"])
                self.assertTrue(all(blocker["code"] and blocker["detail"] for blocker in item["blockers"]))

    def test_promoted_planner_is_exact_and_bilingual(self) -> None:
        catalog_program = next(program for program in CATALOG["programs"] if program["id"] == PROMOTED_ID)
        planner = next(program for program in PLANNERS if program["id"] == PROMOTED_ID)
        self.assertEqual(catalog_program["coverage_state"], "FULL_PLANNER")
        self.assertTrue(catalog_program["planner_available"])
        self.assertEqual(catalog_program["planner_data_key"], PROMOTED_ID)
        self.assertEqual(catalog_program["catalog_status"], "active")
        self.assertEqual(planner["total_program_credit_hours"], None)
        self.assertEqual(planner["calculated_plan_credit_hours"], 39)
        self.assertEqual(planner["level_required_credit_hours"], {
            "Level 1": 12, "Level 2": 12, "Level 3": 12, "Level 4": 3,
        })
        self.assertEqual(len(planner["courses"]), 13)
        self.assertEqual(sum(course["credit_hours"] for course in planner["courses"]), 39)
        self.assertTrue(all(course["course_name_ar"] and course["course_name_en"] for course in planner["courses"]))
        self.assertTrue(all(course["semester_or_level_ar"] and course["semester_or_level_en"] for course in planner["courses"]))
        identities = [normalize(course["course_code"]) for course in planner["courses"]]
        self.assertEqual(len(identities), len(set(identities)))
        self.assertTrue(all(course["credit_hours"] is not None for course in planner["courses"]))
        requisites = {course["course_code"]: course["prerequisites"] for course in planner["courses"]}
        self.assertEqual(requisites["PR 605"], ["PR 601"])
        self.assertEqual(requisites["PR 690"], ["PR 605"])
        self.assertEqual(requisites["PR 698"], ["PR 690"])
        self.assertTrue(all(not course["corequisites"] for course in planner["courses"]))

    def test_original_full_planners_are_byte_for_byte_unchanged(self) -> None:
        original = json.loads(subprocess.check_output(
            ["git", "show", f"{BASE_COMMIT}:web/data/additional_programs.json"], cwd=ROOT, text=True,
        ))["programs"]
        current_by_id = {program["id"]: program for program in PLANNERS}
        self.assertEqual(len(original), 28)
        for program in original:
            self.assertEqual(current_by_id[program["id"]], program)
        self.assertEqual(len(PLANNERS), 181)

    def test_previously_retained_views_are_now_interactive(self) -> None:
        by_id = {program["id"]: program for program in CATALOG["programs"]}
        retained_ids = {item["program_id"] for item in REPORT["retained_programs"]}
        converted_ids = {item["program_id"] for item in CURRENT_REPORT["converted_from_official_plan_view"]}
        self.assertEqual(retained_ids, converted_ids)
        for program_id in retained_ids:
            program = by_id[program_id]
            if program_id in MANUAL_BY_ID:
                self.assertEqual(program["coverage_state"], MANUAL_BY_ID[program_id]["final_coverage_state"])
            else:
                self.assertTrue(program["planner_available"])
                self.assertEqual(program["planner_data_key"], program_id)
                self.assertEqual(program["catalog_status"], "active")
                self.assertIn("official_plan_view", program)

    def test_remaining_bachelor_catalog_only_inventory_is_exact_and_unchanged(self) -> None:
        expected_ids = {
            "ri-bachelor-computer-science",
            "ri-bachelor-information-systems",
            "ri-bachelor-information-technology",
            "catalog-nautical-science",
            "catalog-applied-medica-sciences-bachelor-of-medical-laboratory-sciences",
            "catalog-applied-medica-sciences-bachelor-of-radiologic-sciences",
            "catalog-english",
            "catalog-engineering-rabigh-electrical-engineering",
            "catalog-engineering-rabigh-industrial-engineering",
            "catalog-engineering-rabigh-mechanical-engineering",
        }
        report_ids = {item["program_id"] for item in REPORT["remaining_bachelor_catalog_only"]}
        current = {
            program["id"]: program for program in CATALOG["programs"]
            if program["coverage_state"] == "CATALOG_ONLY" and program["degree_level"] == "bachelor"
        }
        self.assertEqual(report_ids, expected_ids | {"catalog-food-and-nutrition"})
        expected_current = (expected_ids - set(MANUAL_BY_ID)) | {
            program_id for program_id, item in MANUAL_BY_ID.items()
            if item["final_coverage_state"] == "CATALOG_ONLY"
            and next(program for program in CATALOG["programs"] if program["id"] == program_id)["degree_level"] == "bachelor"
        }
        self.assertEqual(set(current), expected_current)
        retained_report_ids = {
            item["program_id"] for item in CURRENT_REPORT["remaining_catalog_only"]
            if next(program for program in CATALOG["programs"] if program["id"] == item["program_id"])["degree_level"] == "bachelor"
        }
        self.assertEqual(retained_report_ids, expected_ids)

    def test_accounting_finance_and_finance_isls_201_are_unchanged(self) -> None:
        original_catalog = json.loads(subprocess.check_output(
            ["git", "show", f"{BASE_COMMIT}:web/data/faculty_catalog.json"], cwd=ROOT, text=True,
        ))
        original_by_id = {program["id"]: program for program in original_catalog["programs"]}
        current_by_id = {program["id"]: program for program in CATALOG["programs"]}
        self.assertEqual(current_by_id["accounting"], original_by_id["accounting"])
        self.assertEqual(current_by_id["finance"], original_by_id["finance"])
        finance = next(program for program in PLANNERS if program["id"] == "finance")
        isls = next(course for course in finance["courses"] if course["course_code"] == "ISLS 201")
        self.assertEqual(isls["prerequisites"], [])


class PromotedPlannerApiTests(unittest.TestCase):
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
                urlopen(cls.base + "/api/programs", timeout=2).close()
                return
            except URLError:
                if cls.server.poll() is not None:
                    raise RuntimeError(cls.server.stdout.read())
                time.sleep(.1)
        raise RuntimeError("Node server did not become ready")

    @classmethod
    def tearDownClass(cls) -> None:
        cls.server.terminate()
        try:
            cls.server.wait(timeout=5)
        except subprocess.TimeoutExpired:
            cls.server.kill()

    def request(self, method: str, path: str, payload: dict | None = None) -> tuple[int, dict]:
        body = json.dumps(payload).encode() if payload is not None else None
        request = Request(
            self.base + path, data=body,
            headers={"Content-Type": "application/json"}, method=method,
        )
        try:
            with urlopen(request, timeout=5) as response:
                return response.status, json.loads(response.read())
        except HTTPError as error:
            return error.code, json.loads(error.read())

    def plan(self, completed: list[str]) -> dict:
        status, payload = self.request(
            "POST", f"/api/plan?major={quote(PROMOTED_ID)}", {"completed_codes": completed},
        )
        self.assertEqual(status, 200)
        return payload

    def test_registry_and_promoted_program_payload(self) -> None:
        status, registry = self.request("GET", "/api/programs")
        self.assertEqual(status, 200)
        summary = next(item for item in registry["programs"] if item["id"] == PROMOTED_ID)
        self.assertTrue(summary["planner_available"])
        self.assertEqual(summary["coverage_state"], "FULL_PLANNER")
        self.assertFalse(summary["official_plan_view_available"])
        status, program = self.request("GET", f"/api/program?major={quote(PROMOTED_ID)}")
        self.assertEqual(status, 200)
        self.assertEqual(len(program["courses"]), 13)
        self.assertEqual(program["calculated_plan_credit_hours"], 39)

    def test_exact_prerequisite_chain_unlocks_and_converges(self) -> None:
        stages = [
            ([], 10, {"PR 605", "PR 690", "PR 698"}),
            (["PR 601"], 10, {"PR 690", "PR 698"}),
            (["PR 601", "PR 605"], 10, {"PR 698"}),
            (["PR 601", "PR 605", "PR 690"], 10, set()),
        ]
        for completed, available_count, blocked_codes in stages:
            with self.subTest(completed=completed):
                plan = self.plan(completed)
                self.assertEqual(len(plan["available_courses"]), available_count)
                self.assertEqual(
                    {item["course"]["course_code"] for item in plan["blocked_courses"]},
                    blocked_codes,
                )


if __name__ == "__main__":
    unittest.main()
