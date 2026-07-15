from __future__ import annotations

import json
import secrets
import sqlite3
from pathlib import Path


class PlannerStore:
    def __init__(self, path: Path) -> None:
        self.path = path
        self.path.parent.mkdir(parents=True, exist_ok=True)
        self._init_db()

    def _connect(self) -> sqlite3.Connection:
        return sqlite3.connect(self.path)

    def _init_db(self) -> None:
        with self._connect() as connection:
            connection.execute(
                """
                CREATE TABLE IF NOT EXISTS users (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    username TEXT NOT NULL UNIQUE
                )
                """
            )
            connection.execute(
                """
                CREATE TABLE IF NOT EXISTS sessions (
                    token TEXT PRIMARY KEY,
                    user_id INTEGER NOT NULL,
                    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY(user_id) REFERENCES users(id)
                )
                """
            )
            connection.execute(
                """
                CREATE TABLE IF NOT EXISTS progress (
                    user_id INTEGER PRIMARY KEY,
                    completed_codes_json TEXT NOT NULL,
                    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY(user_id) REFERENCES users(id)
                )
                """
            )

    def login(self, username: str) -> tuple[str, dict]:
        normalized = username.strip()
        if not normalized:
            raise ValueError("username is required")

        with self._connect() as connection:
            connection.execute(
                "INSERT OR IGNORE INTO users (username) VALUES (?)",
                (normalized,),
            )
            user = connection.execute(
                "SELECT id, username FROM users WHERE username = ?",
                (normalized,),
            ).fetchone()
            token = secrets.token_urlsafe(32)
            connection.execute(
                "INSERT INTO sessions (token, user_id) VALUES (?, ?)",
                (token, user[0]),
            )
        return token, {"id": user[0], "username": user[1]}

    def logout(self, token: str) -> None:
        with self._connect() as connection:
            connection.execute("DELETE FROM sessions WHERE token = ?", (token,))

    def user_for_token(self, token: str | None) -> dict | None:
        if not token:
            return None
        with self._connect() as connection:
            row = connection.execute(
                """
                SELECT users.id, users.username
                FROM sessions
                JOIN users ON users.id = sessions.user_id
                WHERE sessions.token = ?
                """,
                (token,),
            ).fetchone()
        if not row:
            return None
        return {"id": row[0], "username": row[1]}

    def save_progress(self, user_id: int, completed_codes: list[str]) -> None:
        payload = json.dumps(completed_codes, ensure_ascii=False)
        with self._connect() as connection:
            connection.execute(
                """
                INSERT INTO progress (user_id, completed_codes_json)
                VALUES (?, ?)
                ON CONFLICT(user_id) DO UPDATE SET
                    completed_codes_json = excluded.completed_codes_json,
                    updated_at = CURRENT_TIMESTAMP
                """,
                (user_id, payload),
            )

    def load_progress(self, user_id: int) -> list[str]:
        with self._connect() as connection:
            row = connection.execute(
                "SELECT completed_codes_json FROM progress WHERE user_id = ?",
                (user_id,),
            ).fetchone()
        if not row:
            return []
        return list(json.loads(row[0]))
