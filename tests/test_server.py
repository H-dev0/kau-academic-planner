from __future__ import annotations

import json
import tempfile
import threading
import unittest
from http.cookiejar import CookieJar
from pathlib import Path
from urllib.request import HTTPCookieProcessor, Request, build_opener

from kau_programs.server import PlannerHandler, PlannerServer


def write_program(path: Path) -> None:
    path.write_text(
        json.dumps(
            {
                "university_name": "King Abdulaziz University",
                "college_name": "Faculty of Economics and Administration",
                "program_name": "Accounting",
                "degree_level": "Bachelor's degree",
                "total_program_credit_hours": 125,
                "official_source_url": "https://kau.edu.sa/en/programs/example",
                "source_title": "Official study plan",
                "last_checked_date": "2026-07-05",
                "courses": [
                    {
                        "semester_or_level": "level 1",
                        "course_code": "ISLS 101",
                        "official_course_name": "Islamic Studies I",
                        "credit_hours": None,
                        "prerequisites": [],
                        "official_source_url": "https://kau.edu.sa/en/programs/example",
                        "source_title": "Official study plan",
                        "last_checked_date": "2026-07-05",
                    }
                ],
            }
        ),
        encoding="utf-8",
    )


class ServerTests(unittest.TestCase):
    def test_login_progress_and_plan_api(self) -> None:
        with tempfile.TemporaryDirectory() as tempdir:
            root = Path(tempdir)
            program_path = root / "program.json"
            web_dir = root / "web"
            web_dir.mkdir()
            write_program(program_path)
            server = PlannerServer(
                ("127.0.0.1", 0),
                PlannerHandler,
                program_path=program_path,
                web_dir=web_dir,
                db_path=root / "planner.sqlite",
            )
            thread = threading.Thread(target=server.serve_forever, daemon=True)
            thread.start()
            base = f"http://127.0.0.1:{server.server_port}"
            opener = build_opener(HTTPCookieProcessor(CookieJar()))

            def post(path: str, payload: dict) -> dict:
                request = Request(
                    base + path,
                    data=json.dumps(payload).encode("utf-8"),
                    headers={"Content-Type": "application/json"},
                    method="POST",
                )
                return json.loads(opener.open(request, timeout=5).read().decode("utf-8"))

            self.assertEqual(post("/api/login", {"username": "hamed"})["user"]["username"], "hamed")
            self.assertEqual(
                post("/api/progress", {"completed_codes": ["ISLS 101"]})["completed_codes"],
                ["ISLS 101"],
            )
            plan = post("/api/plan", {"completed_codes": ["ISLS 101"]})
            self.assertEqual(plan["completed_count"], 1)

            server.shutdown()
            server.server_close()


if __name__ == "__main__":
    unittest.main()
