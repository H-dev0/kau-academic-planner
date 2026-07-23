from __future__ import annotations

import argparse
import json
import os
from http import HTTPStatus
from http.cookies import SimpleCookie
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Any

from .planner import plan_courses
from .schema import Program
from .storage import PlannerStore


SESSION_COOKIE = "kau_planner_session"


class PlannerServer(ThreadingHTTPServer):
    def __init__(
        self,
        server_address: tuple[str, int],
        handler_class: type[SimpleHTTPRequestHandler],
        *,
        program_path: Path,
        web_dir: Path,
        db_path: Path,
    ) -> None:
        self.program = Program.from_dict(json.loads(program_path.read_text(encoding="utf-8")))
        self.web_dir = web_dir
        self.store = PlannerStore(db_path)
        super().__init__(server_address, handler_class)


class PlannerHandler(SimpleHTTPRequestHandler):
    server: PlannerServer

    def __init__(self, request: Any, client_address: Any, server: PlannerServer) -> None:
        super().__init__(request, client_address, server, directory=str(server.web_dir))

    def end_headers(self) -> None:
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def do_GET(self) -> None:
        if self.path == "/api/program":
            self._json(self._program_payload())
        elif self.path == "/api/me":
            user = self._current_user()
            self._json({"authenticated": bool(user), "user": user})
        elif self.path == "/api/progress":
            user = self._require_user()
            if user:
                self._json({"completed_codes": self.server.store.load_progress(user["id"])})
        else:
            super().do_GET()

    def do_POST(self) -> None:
        if self.path == "/api/login":
            payload = self._read_json()
            try:
                token, user = self.server.store.login(str(payload.get("username", "")))
            except ValueError as error:
                self._json({"error": str(error)}, HTTPStatus.BAD_REQUEST)
                return
            self.send_response(HTTPStatus.OK)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Set-Cookie", self._session_cookie(token))
            self.end_headers()
            self.wfile.write(json.dumps({"user": user}).encode("utf-8"))
        elif self.path == "/api/logout":
            token = self._session_token()
            if token:
                self.server.store.logout(token)
            self.send_response(HTTPStatus.OK)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Set-Cookie", self._session_cookie("", max_age=0))
            self.end_headers()
            self.wfile.write(b'{"ok": true}')
        elif self.path == "/api/plan":
            payload = self._read_json()
            completed_codes = list(payload.get("completed_codes") or [])
            elective_selections = payload.get("elective_selections") or {}
            result = plan_courses(
                self.server.program, completed_codes, elective_selections
            )
            self._json(result, status=400 if result.get("validation_errors") else 200)
        elif self.path == "/api/progress":
            user = self._require_user()
            if user:
                payload = self._read_json()
                completed_codes = list(payload.get("completed_codes") or [])
                self.server.store.save_progress(user["id"], completed_codes)
                self._json({"completed_codes": completed_codes})
        else:
            self._json({"error": "not found"}, HTTPStatus.NOT_FOUND)

    def _program_payload(self) -> dict:
        return json.loads(json.dumps(self.server.program, default=lambda item: item.__dict__))

    def _read_json(self) -> dict:
        length = int(self.headers.get("Content-Length", "0"))
        if length <= 0:
            return {}
        return json.loads(self.rfile.read(length).decode("utf-8"))

    def _json(self, payload: dict, status: HTTPStatus = HTTPStatus.OK) -> None:
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _session_token(self) -> str | None:
        cookie_header = self.headers.get("Cookie")
        if not cookie_header:
            return None
        cookie = SimpleCookie(cookie_header)
        morsel = cookie.get(SESSION_COOKIE)
        return morsel.value if morsel else None

    def _current_user(self) -> dict | None:
        return self.server.store.user_for_token(self._session_token())

    def _require_user(self) -> dict | None:
        user = self._current_user()
        if not user:
            self._json({"error": "login required"}, HTTPStatus.UNAUTHORIZED)
            return None
        return user

    @staticmethod
    def _session_cookie(token: str, max_age: int | None = None) -> str:
        cookie = SimpleCookie()
        cookie[SESSION_COOKIE] = token
        cookie[SESSION_COOKIE]["path"] = "/"
        cookie[SESSION_COOKIE]["samesite"] = "Lax"
        if max_age is not None:
            cookie[SESSION_COOKIE]["max-age"] = str(max_age)
        return cookie.output(header="").strip()


def main() -> int:
    parser = argparse.ArgumentParser(description="Run the local KAU planner app server.")
    parser.add_argument("--host", default="0.0.0.0")
    parser.add_argument("--port", type=int, default=int(os.environ.get("PORT", "8766")))
    parser.add_argument("--program", type=Path, default=Path("data/validated/kau_accounting.json"))
    parser.add_argument("--web-dir", type=Path, default=Path("web"))
    parser.add_argument("--db", type=Path, default=Path("data/local/planner.sqlite"))
    args = parser.parse_args()

    server = PlannerServer(
        (args.host, args.port),
        PlannerHandler,
        program_path=args.program,
        web_dir=args.web_dir,
        db_path=args.db,
    )
    print(f"Serving local planner at http://localhost:{args.port}")
    server.serve_forever()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
