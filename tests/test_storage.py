from __future__ import annotations

import tempfile
import unittest
from pathlib import Path

from kau_programs.storage import PlannerStore


class PlannerStoreTests(unittest.TestCase):
    def test_login_session_and_progress_round_trip(self) -> None:
        with tempfile.TemporaryDirectory() as tempdir:
            store = PlannerStore(Path(tempdir) / "planner.sqlite")

            token, user = store.login("hamed")
            self.assertEqual(user["username"], "hamed")
            self.assertEqual(store.user_for_token(token), user)

            store.save_progress(user["id"], ["ISLS 101", "ARAB 101"])
            self.assertEqual(store.load_progress(user["id"]), ["ISLS 101", "ARAB 101"])

            store.logout(token)
            self.assertIsNone(store.user_for_token(token))

    def test_empty_username_fails(self) -> None:
        with tempfile.TemporaryDirectory() as tempdir:
            store = PlannerStore(Path(tempdir) / "planner.sqlite")
            with self.assertRaises(ValueError):
                store.login("  ")


if __name__ == "__main__":
    unittest.main()
