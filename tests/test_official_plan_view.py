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
OFFICIAL_VIEW_IDS = {
    program["id"] for program in CATALOG["programs"]
    if program["coverage_state"] == "OFFICIAL_PLAN_VIEW"
}


class OfficialPlanViewDataTests(unittest.TestCase):
    def test_coverage_counts_and_status_invariants(self) -> None:
        programs = CATALOG["programs"]
        self.assertEqual(len(programs), 223)
        self.assertEqual(sum(p["coverage_state"] == "FULL_PLANNER" for p in programs), 72)
        self.assertEqual(sum(p["coverage_state"] == "OFFICIAL_PLAN_VIEW" for p in programs), 117)
        self.assertEqual(sum(p["coverage_state"] == "CATALOG_ONLY" for p in programs), 34)
        planner_ids = {p["id"] for p in json.loads((ROOT / "web/data/additional_programs.json").read_text())["programs"]}
        for program in (p for p in programs if p["coverage_state"] == "OFFICIAL_PLAN_VIEW"):
            self.assertEqual(program["catalog_status"], "catalog-only")
            self.assertFalse(program["planner_available"])
            self.assertIsNone(program["planner_data_key"])
            self.assertNotIn(program["id"], planner_ids)

    def test_exact_audited_counts_and_schema(self) -> None:
        by_id = {p["id"]: p for p in CATALOG["programs"]}
        self.assertEqual(len(EXPECTED), 109)
        for program_id, expected in EXPECTED.items():
            with self.subTest(program_id=program_id):
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

    def test_unresolved_programs_are_not_forced(self) -> None:
        by_id = {p["id"]: p for p in CATALOG["programs"]}
        self.assertEqual(len(REPORT["unresolved_programs"]), 42)
        for item in REPORT["unresolved_programs"]:
            program = by_id[item["program_id"]]
            if item["existing_official_view_preserved"]:
                self.assertEqual(program["coverage_state"], "OFFICIAL_PLAN_VIEW")
                self.assertIn("official_plan_view", program)
            else:
                self.assertEqual(program["coverage_state"], "CATALOG_ONLY")
                self.assertNotIn("official_plan_view", program)

    def test_placeholders_and_missing_values_are_preserved(self) -> None:
        completed = {item["program_id"] for item in REPORT["completed_programs"]}
        rows = [
            row for p in CATALOG["programs"] if p["id"] in completed
            for section in p["official_plan_view"]["sections"] for row in section["rows"]
        ]
        self.assertTrue(any(r["flags"]["placeholder"] for r in rows))
        self.assertEqual(sum(r["credits"] is None for r in rows), 63)
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
        self.assertEqual([len(section["rows"]) for section in view["sections"]], [5, 5, 6, 6, 6, 6, 6, 4])
        self.assertEqual([sum(row["credits"] for row in section["rows"]) for section in view["sections"]], [11, 12, 17, 17, 18, 17, 18, 12])
        self.assertEqual(view["visible_course_count"], 44)
        self.assertEqual(view["source_course_row_count"], 45)
        self.assertEqual(view["normalization"]["removed_exact_duplicate_count"], 1)
        self.assertEqual(view["normalization"]["removed_duplicate_mappings"][0]["course_code"], "CLAN 352")

        self.assertEqual(REPORT["summary"]["exact_duplicate_rows_removed"], 3)
        for item in REPORT["completed_programs"]:
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
        for program_id in OFFICIAL_VIEW_IDS:
            self.assertTrue(summaries[program_id]["official_plan_view_available"])
            status, program = self.request_status("GET", f"/api/program?major={program_id}")
            self.assertEqual(status, 200)
            self.assertIn("official_plan_view", program)

    def test_non_planner_endpoints_are_guarded(self) -> None:
        for program_id in OFFICIAL_VIEW_IDS:
            for method, endpoint in (("POST", "plan"), ("GET", "progress"), ("POST", "progress")):
                with self.subTest(program_id=program_id, endpoint=endpoint, method=method):
                    status, payload = self.request_status(method, f"/api/{endpoint}?major={program_id}")
                    self.assertEqual(status, 409)
                    self.assertEqual(payload["code"], "PLANNER_UNAVAILABLE")


if __name__ == "__main__":
    unittest.main()
