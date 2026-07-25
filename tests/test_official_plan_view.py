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
REPORT = json.loads((ROOT / "reports/plan_extraction/official_plan_view_bachelor_wave.json").read_text(encoding="utf-8"))
EXPECTED = {item["program_id"]: (item["visible_course_count"], item["visible_credit_sum"]) for item in REPORT["programs"]}


class OfficialPlanViewDataTests(unittest.TestCase):
    def test_coverage_counts_and_status_invariants(self) -> None:
        programs = CATALOG["programs"]
        self.assertEqual(len(programs), 223)
        self.assertEqual(sum(p["coverage_state"] == "FULL_PLANNER" for p in programs), 72)
        self.assertEqual(sum(p["coverage_state"] == "OFFICIAL_PLAN_VIEW" for p in programs), 15)
        self.assertEqual(sum(p["coverage_state"] == "CATALOG_ONLY" for p in programs), 136)
        planner_ids = {p["id"] for p in json.loads((ROOT / "web/data/additional_programs.json").read_text())["programs"]}
        for program in (p for p in programs if p["coverage_state"] == "OFFICIAL_PLAN_VIEW"):
            self.assertEqual(program["catalog_status"], "catalog-only")
            self.assertFalse(program["planner_available"])
            self.assertIsNone(program["planner_data_key"])
            self.assertNotIn(program["id"], planner_ids)

    def test_exact_audited_counts_and_schema(self) -> None:
        by_id = {p["id"]: p for p in CATALOG["programs"]}
        self.assertEqual(len(EXPECTED), 15)
        for program_id, expected in EXPECTED.items():
            with self.subTest(program_id=program_id):
                view = by_id[program_id]["official_plan_view"]
                rows = [row for section in view["sections"] for row in section["rows"]]
                self.assertEqual((len(rows), sum(r["credits"] for r in rows if r["credits"] is not None)), expected)
                self.assertEqual(view["schema_version"], 1)
                self.assertTrue(view["source"]["sha256_ar"])
                self.assertTrue(view["source"]["sha256_en"])
                for row in rows:
                    self.assertIn("raw_course_code", row)
                    self.assertIn("display_course_code", row)
                    self.assertIn("raw_prerequisite_corequisite_text", row)
                    self.assertEqual(set(row["flags"]), {
                        "placeholder", "unresolved_requisite", "training", "project",
                        "practicum", "cooperative_training", "zero_credit", "unplaced_requirement",
                    })

    def test_skip_is_evidence_based_and_not_forced(self) -> None:
        self.assertEqual(REPORT["skipped"], [{
            "program_id": "catalog-geography-and-geographic-information-systems",
            "reason": "Expected 64/183; reproduced 83/240.",
        }])
        program = next(p for p in CATALOG["programs"] if p["id"] == REPORT["skipped"][0]["program_id"])
        self.assertEqual(program["coverage_state"], "CATALOG_ONLY")
        self.assertNotIn("official_plan_view", program)

    def test_placeholders_zero_null_and_unplaced_are_preserved(self) -> None:
        rows = [row for p in CATALOG["programs"] if p.get("official_plan_view") for s in p["official_plan_view"]["sections"] for row in s["rows"]]
        self.assertTrue(any(r["flags"]["placeholder"] for r in rows))
        self.assertTrue(any(r["credits"] == 0 and r["flags"]["zero_credit"] for r in rows))
        self.assertEqual(sum(r["credits"] is None for r in rows), 0)
        self.assertTrue(any(r["flags"]["unplaced_requirement"] and r["official_level_or_semester"] is None for r in rows))

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

    def test_removed_rows_are_only_exact_signature_duplicates(self) -> None:
        audit = json.loads((ROOT / "data/raw/kau/plan_audit/bachelor_recovery_wave_1/state.json").read_text(encoding="utf-8"))["programs"]
        by_id = {p["id"]: p for p in CATALOG["programs"]}
        for program_id in EXPECTED:
            view = by_id[program_id]["official_plan_view"]
            source = audit[program_id]["courses"]
            kept_orders = {row["source_order"] for section in view["sections"] for row in section["rows"]}
            for removed_order in view["normalization"]["removed_source_orders"]:
                removed = source[removed_order - 1]
                signature = (
                    removed.get("canonical_course_code"), removed.get("course_name_ar"),
                    removed.get("course_name_en"), removed.get("credit_hours"),
                )
                self.assertTrue(any(
                    (course.get("canonical_course_code"), course.get("course_name_ar"), course.get("course_name_en"), course.get("credit_hours")) == signature
                    for order, course in enumerate(source, 1) if order in kept_orders
                ), (program_id, removed_order))


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
        for program_id in EXPECTED:
            self.assertTrue(summaries[program_id]["official_plan_view_available"])
            status, program = self.request_status("GET", f"/api/program?major={program_id}")
            self.assertEqual(status, 200)
            self.assertIn("official_plan_view", program)

    def test_non_planner_endpoints_are_guarded(self) -> None:
        for program_id in list(EXPECTED) + ["catalog-geography-and-geographic-information-systems"]:
            for method, endpoint in (("POST", "plan"), ("GET", "progress"), ("POST", "progress")):
                with self.subTest(program_id=program_id, endpoint=endpoint, method=method):
                    status, payload = self.request_status(method, f"/api/{endpoint}?major={program_id}")
                    self.assertEqual(status, 409)
                    self.assertEqual(payload["code"], "PLANNER_UNAVAILABLE")


if __name__ == "__main__":
    unittest.main()
