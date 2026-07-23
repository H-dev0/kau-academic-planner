from __future__ import annotations

import json
import subprocess
import unittest
from pathlib import Path

from kau_programs.planner import plan_courses
from kau_programs.schema import Program
from tests.elective_fixtures import fixture_copy


ROOT = Path(__file__).resolve().parents[1]


def node_call(module: str, helper: str, *args: object) -> dict:
    script = """
const api = require(process.argv[1]);
const args = JSON.parse(process.argv[3]);
process.stdout.write(JSON.stringify(api[process.argv[2]](...args)));
"""
    output = subprocess.check_output(
        ["node", "-e", script, module, helper, json.dumps(args)], cwd=ROOT, text=True
    )
    return json.loads(output)


class ElectiveGroupsJavaScriptTests(unittest.TestCase):
    def test_node_and_python_planner_parity(self) -> None:
        raw = fixture_copy()
        completed = ["SYN 100", "SYN 101", "SYN 302", "SYN 303"]
        selections = {
            "choose-one": ["SYN 101"],
            "credit-based": ["SYN 302", "SYN 303"],
            "with-prerequisite": ["SYN 501"],
        }
        python = plan_courses(Program.from_dict(raw), completed, selections)
        node = node_call("./web/elective-groups.js", "electivePlan", raw, completed, selections)
        for key in (
            "validation_errors", "elective_group_statuses", "required_course_count",
            "completed_required_course_count", "effective_required_credits",
            "applied_completed_credits", "remaining_required_credits", "graduation_complete",
        ):
            self.assertEqual(node[key], python[key], key)

    def test_node_api_planner_is_additive_and_rejects_excess(self) -> None:
        raw = fixture_copy()
        valid = node_call("./server.js", "planCourses", raw, ["SYN 101"], {"choose-one": ["SYN 101"]})
        self.assertIn("available_courses", valid)
        self.assertIn("elective_group_statuses", valid)
        self.assertEqual(valid["validation_errors"], [])
        invalid = node_call(
            "./server.js", "planCourses", raw, [],
            {"choose-one": ["SYN 101", "SYN 102"]},
        )
        self.assertTrue(invalid["validation_errors"])

    def test_progress_v1_inference_and_v2_round_trip(self) -> None:
        raw = fixture_copy()
        legacy = node_call(
            "./web/elective-groups.js", "validateProgressPayload", raw,
            {"completed_codes": ["SYN 101"]}, True,
        )
        self.assertTrue(legacy["ok"])
        self.assertEqual(legacy["state"]["elective_selections"]["choose-one"], ["SYN101"])
        payload = node_call(
            "./web/elective-groups.js", "progressPayload",
            ["SYN101"], {"choose-one": ["SYN101"]},
        )
        self.assertEqual(payload["version"], 2)
        restored = node_call(
            "./web/elective-groups.js", "validateProgressPayload", raw, payload, False,
        )
        self.assertTrue(restored["ok"])
        self.assertEqual(restored["state"], {
            "completed_codes": ["SYN101"],
            "elective_selections": {"choose-one": ["SYN101"]},
        })

    def test_invalid_import_is_atomic_for_caller(self) -> None:
        raw = fixture_copy()
        current = {"completed_codes": ["SYN100"], "elective_selections": {}}
        invalid = node_call(
            "./web/elective-groups.js", "validateProgressPayload", raw,
            {"version": 2, "completed_codes": ["SYN 101"],
             "elective_selections": {"choose-one": ["SYN 201"]}}, False,
        )
        if invalid["ok"]:
            current = invalid["state"]
        self.assertEqual(current, {"completed_codes": ["SYN100"], "elective_selections": {}})

    def test_unknown_codes_groups_and_duplicates(self) -> None:
        raw = fixture_copy()
        invalid = node_call(
            "./web/elective-groups.js", "validateProgressPayload", raw,
            {"version": 2, "completed_codes": ["SYN 999"],
             "elective_selections": {"missing": ["SYN 101"]}}, False,
        )
        self.assertFalse(invalid["ok"])
        duplicate = node_call(
            "./web/elective-groups.js", "validateProgressPayload", raw,
            {"version": 2, "completed_codes": [],
             "elective_selections": {"choose-one": ["SYN 101", "syn101"]}}, False,
        )
        self.assertTrue(duplicate["ok"])
        self.assertEqual(duplicate["state"]["elective_selections"]["choose-one"], ["SYN101"])


if __name__ == "__main__":
    unittest.main()
