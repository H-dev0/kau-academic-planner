from __future__ import annotations

import json
import os
import socket
import subprocess
import time
import unittest
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen


ROOT = Path(__file__).resolve().parents[1]
CATALOG = json.loads((ROOT / "web/data/faculty_catalog.json").read_text(encoding="utf-8"))
REPORT = json.loads((ROOT / "reports/plan_extraction/official_levels_completion.json").read_text(encoding="utf-8"))
EXPECTED = {item["program_id"]: item for item in REPORT["completed_programs"]}
CURRENT_REPORT = json.loads((ROOT / "reports/plan_extraction/all_visible_plans_to_interactive.json").read_text(encoding="utf-8"))
CONVERTED_IDS = {
    item["program_id"]
    for key in ("converted_from_official_plan_view", "converted_from_catalog_only")
    for item in CURRENT_REPORT[key]
}
MANUAL_REPORT = json.loads((ROOT / "reports/manual_audit/manual_bachelor_levels_audit.json").read_text(encoding="utf-8"))
MANUAL_BY_ID = {item["resolved_repository_id"]: item for item in MANUAL_REPORT["programs"]}
CATALOG_ONLY_IDS = {
    program["id"] for program in CATALOG["programs"]
    if program["coverage_state"] == "CATALOG_ONLY"
}
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


class OfficialPlanViewDataTests(unittest.TestCase):
    def test_coverage_counts_and_status_invariants(self) -> None:
        programs = CATALOG["programs"]
        self.assertEqual(len(programs), 225)
        self.assertEqual(sum(p["coverage_state"] == "FULL_PLANNER" for p in programs), 180)
        self.assertEqual(sum(p["coverage_state"] == "OFFICIAL_PLAN_VIEW" for p in programs), 2)
        self.assertEqual(sum(p["coverage_state"] == "CATALOG_ONLY" for p in programs), 43)
        planner_ids = {p["id"] for p in json.loads((ROOT / "web/data/additional_programs.json").read_text())["programs"]}
        for program in (p for p in programs if p["id"] in CONVERTED_IDS):
            if program["id"] in MANUAL_BY_ID:
                self.assertEqual(program["coverage_state"], MANUAL_BY_ID[program["id"]]["final_coverage_state"])
            else:
                self.assertEqual(program["catalog_status"], "active")
                self.assertTrue(program["planner_available"])
                self.assertEqual(program["planner_data_key"], program["id"])
                self.assertIn(program["id"], planner_ids)

    def test_exact_audited_counts_and_schema(self) -> None:
        by_id = {p["id"]: p for p in CATALOG["programs"]}
        self.assertEqual(len(EXPECTED), 109)
        for program_id, expected in EXPECTED.items():
            with self.subTest(program_id=program_id):
                if program_id in MANUAL_BY_ID:
                    self.assertEqual(by_id[program_id]["coverage_state"], MANUAL_BY_ID[program_id]["final_coverage_state"])
                    continue
                view = by_id[program_id]["official_plan_view"]
                rows = [row for section in view["sections"] for row in section["rows"]]
                self.assertEqual(len(view["sections"]), expected["level_count"])
                self.assertEqual(len(rows), expected["visible_course_count"])
                self.assertEqual(sum(r["credits"] for r in rows if r["credits"] is not None), expected["visible_credit_sum"])
                self.assertEqual(sum(r["credits"] is None for r in rows), expected["missing_credit_count"])
                self.assertEqual(view["source_course_row_count"], expected["source_course_row_count"])
                self.assertEqual(view["schema_version"], 2)
                self.assertEqual(view["extraction_method"], "browser_rendered_levels_tab")
                self.assertTrue(view["source"]["sha256_ar"])
                if expected["bilingual_identity_match"]:
                    self.assertTrue(view["source"]["sha256_en"])
                for row in rows:
                    self.assertIn("raw_course_code", row)
                    self.assertIn("display_course_code", row)
                    self.assertIn("raw_prerequisite_corequisite_text", row)
                    self.assertEqual(set(row["flags"]), {
                        "placeholder", "unresolved_requisite", "training", "project",
                        "practicum", "cooperative_training", "zero_credit", "unplaced_requirement",
                    })

    def test_historical_unresolved_inventory_is_superseded_only_by_evidence(self) -> None:
        by_id = {p["id"]: p for p in CATALOG["programs"]}
        self.assertEqual(len(REPORT["unresolved_programs"]), 42)
        for item in REPORT["unresolved_programs"]:
            program = by_id[item["program_id"]]
            if program["id"] in MANUAL_BY_ID:
                expected_state = MANUAL_BY_ID[program["id"]]["final_coverage_state"]
                self.assertEqual(program["coverage_state"], expected_state)
                self.assertEqual("official_plan_view" in program, expected_state != "CATALOG_ONLY")
            elif program["id"] in CONVERTED_IDS:
                self.assertEqual(program["coverage_state"], "FULL_PLANNER")
                self.assertIn("official_plan_view", program)
            else:
                self.assertEqual(program["coverage_state"], "CATALOG_ONLY")
                self.assertNotIn("official_plan_view", program)

    def test_placeholders_and_missing_values_are_preserved(self) -> None:
        completed = {item["program_id"] for item in REPORT["completed_programs"]}
        rows = [
            row for p in CATALOG["programs"] if p["id"] in completed and p["id"] not in MANUAL_BY_ID
            for section in p["official_plan_view"]["sections"] for row in section["rows"]
        ]
        self.assertTrue(any(r["flags"]["placeholder"] for r in rows))
        self.assertGreater(sum(r["credits"] is None for r in rows), 0)
        self.assertTrue(all(not r["flags"]["unplaced_requirement"] for r in rows))

    def test_bilingual_frontend_and_no_view_progress_access(self) -> None:
        app = (ROOT / "web/app.js").read_text(encoding="utf-8")
        html = (ROOT / "web/index.html").read_text(encoding="utf-8")
        css = (ROOT / "web/styles.css").read_text(encoding="utf-8")
        self.assertIn("Official plan view", app)
        self.assertIn("عرض الخطة الرسمية", app)
        self.assertIn("Interactive planner available", app)
        self.assertIn("المخطط التفاعلي متاح", app)
        self.assertIn("فهرس البرنامج فقط", app)
        self.assertIn('if (!isNoSelection() && !isCatalogOnly() && !isNoPrograms()) await loadProgress();', app)
        self.assertIn("if (toolbarActions) toolbarActions.hidden = catalogOnly;", app)
        self.assertIn("if (privacyNotice) privacyNotice.hidden = catalogOnly;", app)
        self.assertIn('id="officialPlanView"', html)
        self.assertIn("@media (max-width: 760px)", css)
        self.assertIn('[data-theme="dark"]', css)

    def test_chinese_language_and_duplicate_traceability(self) -> None:
        by_id = {p["id"]: p for p in CATALOG["programs"]}
        view = by_id["catalog-chinese-language"]["official_plan_view"]
        self.assertEqual(len(view["sections"]), 8)
        self.assertEqual([len(section["rows"]) for section in view["sections"]], [5, 5, 6, 6, 6, 7, 6, 4])
        self.assertEqual([sum(row["credits"] for row in section["rows"]) for section in view["sections"]], [11, 12, 17, 17, 18, 20, 18, 12])
        self.assertEqual(view["visible_course_count"], 45)
        self.assertEqual(view["source_course_row_count"], 45)
        self.assertEqual(view["normalization"]["removed_exact_duplicate_count"], 0)
        self.assertEqual(view["normalization"]["removed_duplicate_mappings"], [])

        self.assertEqual(REPORT["summary"]["exact_duplicate_rows_removed"], 3)
        for item in REPORT["completed_programs"]:
            if item["program_id"] in MANUAL_BY_ID:
                continue
            view = by_id[item["program_id"]]["official_plan_view"]
            normalization = view["normalization"]
            self.assertEqual(
                normalization["removed_exact_duplicate_count"],
                len(normalization["removed_duplicate_mappings"]),
            )


class OfficialPlanViewApiTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        with socket.socket() as listener:
            listener.bind(("127.0.0.1", 0))
            cls.port = listener.getsockname()[1]
        env = os.environ.copy()
        env["PORT"] = str(cls.port)
        cls.server = subprocess.Popen(["node", "server.js"], cwd=ROOT, env=env, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)
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

    def request_status(self, method: str, path: str) -> tuple[int, dict]:
        request = Request(self.base + path, data=b"{}" if method == "POST" else None, headers={"Content-Type": "application/json"}, method=method)
        try:
            with urlopen(request, timeout=5) as response:
                return response.status, json.loads(response.read())
        except HTTPError as error:
            return error.code, json.loads(error.read())

    def test_registry_and_full_view_payload(self) -> None:
        status, registry = self.request_status("GET", "/api/programs")
        self.assertEqual(status, 200)
        summaries = {p["id"]: p for p in registry["programs"]}
        for program_id in CONVERTED_IDS:
            expected_state = MANUAL_BY_ID.get(program_id, {}).get("final_coverage_state", "FULL_PLANNER")
            summary = summaries[program_id]
            self.assertEqual(summary["coverage_state"], expected_state)
            if expected_state == "FULL_PLANNER":
                self.assertTrue(summary["planner_available"])
                self.assertFalse(summary["official_plan_view_available"])
                status, program = self.request_status("GET", f"/api/program?major={program_id}")
                self.assertEqual(status, 200)
                self.assertTrue(program["courses"])
            else:
                self.assertFalse(summary["planner_available"])
                self.assertEqual(summary["official_plan_view_available"], expected_state == "OFFICIAL_PLAN_VIEW")

    def test_non_planner_endpoints_are_guarded(self) -> None:
        read_only_ids = CATALOG_ONLY_IDS | {
            program["id"] for program in CATALOG["programs"]
            if program["coverage_state"] == "OFFICIAL_PLAN_VIEW"
        }
        for program_id in read_only_ids:
            for method, endpoint in (("POST", "plan"), ("GET", "progress"), ("POST", "progress")):
                with self.subTest(program_id=program_id, endpoint=endpoint, method=method):
                    status, payload = self.request_status(method, f"/api/{endpoint}?major={program_id}")
                    self.assertEqual(status, 409)
                    self.assertEqual(payload["code"], "PLANNER_UNAVAILABLE")

    def test_manual_audit_full_view_and_catalog_api_contracts(self) -> None:
        representatives = {
            "catalog-intermediate-diploma-in-cybersecurity": ("FULL_PLANNER", True, False, 200),
            "catalog-bachelor-of-public-relations-program": ("FULL_PLANNER", True, False, 200),
            "catalog-economics-and-administration-bachelor-of-health-services-and-hospital-administrati": ("OFFICIAL_PLAN_VIEW", False, True, 409),
            "catalog-geography-and-geographic-information-systems": ("CATALOG_ONLY", False, False, 409),
        }
        status, registry = self.request_status("GET", "/api/programs")
        self.assertEqual(status, 200)
        summaries = {program["id"]: program for program in registry["programs"]}
        for program_id, expected in representatives.items():
            with self.subTest(program_id=program_id):
                state, planner_available, view_available, plan_status = expected
                summary = summaries[program_id]
                self.assertEqual(summary["coverage_state"], state)
                self.assertEqual(summary["planner_available"], planner_available)
                self.assertEqual(summary["official_plan_view_available"], view_available)
                status, payload = self.request_status("POST", f"/api/plan?major={program_id}")
                self.assertEqual(status, plan_status)
                if plan_status == 409:
                    self.assertEqual(payload["coverage_state"], state)

    def test_representative_arabic_and_english_api_rendering_fallback(self) -> None:
        status, public_relations = self.request_status(
            "GET", "/api/program?major=catalog-bachelor-of-public-relations-program",
        )
        self.assertEqual(status, 200)
        scheduled = [
            course for course in public_relations["courses"]
            if course.get("official_level_placement") != "unplaced"
        ]
        self.assertEqual(
            list(dict.fromkeys(course["semester_or_level_ar"] for course in scheduled)),
            ARABIC[1:9],
        )
        self.assertEqual(
            list(dict.fromkeys(course["semester_or_level_en"] for course in scheduled)),
            ENGLISH[1:9],
        )

        status, health = self.request_status(
            "GET", "/api/program?major=catalog-economics-and-administration-bachelor-of-health-services-and-hospital-administrati",
        )
        self.assertEqual(status, 200)
        self.assertEqual(health["coverage_state"], "OFFICIAL_PLAN_VIEW")
        self.assertEqual(health["official_plan_view"]["visible_course_count"], 34)
        self.assertEqual(
            [section["title_en"] for section in health["official_plan_view"]["sections"][:8]],
            ENGLISH[1:9],
        )
        self.assertEqual(
            [section["title_ar"] for section in health["official_plan_view"]["sections"][:8]],
            ARABIC[1:9],
        )


if __name__ == "__main__":
    unittest.main()
