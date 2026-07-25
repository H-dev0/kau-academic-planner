from __future__ import annotations

import hashlib
import json
import subprocess
import unittest
from collections import defaultdict
from pathlib import Path

from kau_programs.planner import normalize_course_code


ROOT = Path(__file__).resolve().parents[1]
CATALOG = json.loads((ROOT / "web/data/faculty_catalog.json").read_text(encoding="utf-8"))
PROGRAMS = {program["id"]: program for program in CATALOG["programs"]}


class ConfirmedPrerequisiteNormalizationTests(unittest.TestCase):
    def test_simple_single_prerequisite_still_unlocks_normally(self) -> None:
        script = r"""
const { planCourses } = require('./server.js');
const program = { program_name: 'single fixture', courses: [
  { course_code: 'BASE 101', semester_or_level: 'level 1', prerequisites: [] },
  { course_code: 'NEXT 201', semester_or_level: 'level 2', prerequisites: ['BASE 101'] },
] };
process.stdout.write(JSON.stringify({
  before: planCourses(program, []),
  after: planCourses(program, ['BASE 101']),
}));
"""
        result = subprocess.run(
            ["node", "-e", script], cwd=ROOT, check=True, capture_output=True, text=True
        )
        payload = json.loads(result.stdout)
        self.assertEqual(payload["before"]["blocked_courses"][0]["missing_prerequisites"], ["BASE 101"])
        self.assertEqual([c["course_code"] for c in payload["after"]["available_courses"]], ["NEXT 201"])

    def test_all_corrected_and_expressions_resolve_in_the_same_program(self) -> None:
        corrected = []
        for program in PROGRAMS.values():
            identities = {
                normalize_course_code(course["course_code"])
                for course in program.get("courses", [])
            }
            for course in program.get("courses", []):
                if "raw_requisite_notation" not in course:
                    continue
                corrected.append((program["id"], course["course_code"]))
                self.assertGreaterEqual(len(course["prerequisites"]), 1)
                self.assertTrue(
                    all(normalize_course_code(code) in identities for code in course["prerequisites"]),
                    (program["id"], course),
                )
        self.assertEqual(len(corrected), 69)

    def test_runtime_requires_every_and_prerequisite_and_then_unlocks(self) -> None:
        script = r"""
const { planCourses } = require('./server.js');
const program = { program_name: 'AND fixture', courses: [
  { course_code: 'A 101', semester_or_level: 'level 1', prerequisites: [] },
  { course_code: 'B 101', semester_or_level: 'level 1', prerequisites: [] },
  { course_code: 'C 201', semester_or_level: 'level 2', prerequisites: ['A 101', 'B 101'] },
] };
const before = planCourses(program, []);
const partial = planCourses(program, ['A 101']);
const complete = planCourses(program, ['A 101', 'B 101']);
process.stdout.write(JSON.stringify({ before, partial, complete }));
"""
        result = subprocess.run(
            ["node", "-e", script], cwd=ROOT, check=True, capture_output=True, text=True
        )
        payload = json.loads(result.stdout)
        self.assertEqual(payload["before"]["blocked_courses"][0]["missing_prerequisites"], ["A 101", "B 101"])
        self.assertEqual(payload["partial"]["blocked_courses"][0]["missing_prerequisites"], ["B 101"])
        self.assertEqual([c["course_code"] for c in payload["complete"]["available_courses"]], ["C 201"])

    def test_bilingual_identity_resolves_without_becoming_a_fake_code(self) -> None:
        script = r"""
const { planCourses } = require('./server.js');
const program = { program_name: 'bilingual fixture', courses: [
  { course_code: 'سلم ٢٠١ | ISLS 201', semester_or_level: 'level 1', prerequisites: [] },
  { course_code: 'سلم ٣٠١ | ISLS 301', semester_or_level: 'level 2', prerequisites: ['سلم ٢٠١ | ISLS 201'], raw_requisite_notation: 'سلم 201 | ISLS 201' },
] };
const plan = planCourses(program, ['سلم ٢٠١ | ISLS 201']);
process.stdout.write(JSON.stringify(plan));
"""
        result = subprocess.run(
            ["node", "-e", script], cwd=ROOT, check=True, capture_output=True, text=True
        )
        plan = json.loads(result.stdout)
        self.assertEqual([c["course_code"] for c in plan["available_courses"]], ["سلم ٣٠١ | ISLS 301"])
        self.assertEqual(plan["blocked_courses"], [])

    def test_unicode_normalization_preserves_arabic_prefix_identity(self) -> None:
        self.assertEqual(normalize_course_code("سلم ٢٠١"), "سلم201")
        self.assertEqual(normalize_course_code("عرب 201"), "عرب201")
        self.assertNotEqual(normalize_course_code("سلم 201"), normalize_course_code("عرب 201"))
        self.assertNotEqual(normalize_course_code("ت ط ف م 111"), normalize_course_code("ص 111"))

        for program_id in (
            "catalog-human-sciences-and-design-bacheior-interior-design-and-furniture",
            "catalog-human-sciences-and-design-bachelor-of-science-b-sc-in-family-sciences",
            "catalog-human-sciences-and-design-bachelor-s-department-of-early-childhood-guide",
        ):
            grouped = defaultdict(list)
            for course in PROGRAMS[program_id]["courses"]:
                grouped[normalize_course_code(course["course_code"])].append(course["course_code"])
            self.assertFalse({key: values for key, values in grouped.items() if len(values) > 1})

    def test_ambiguous_or_like_pipe_is_not_interpreted(self) -> None:
        program = PROGRAMS["catalog-earth-sciences-hydrogeology-bsc"]
        course = next(course for course in program["courses"] if course["course_code"] == "ESR 220")
        self.assertEqual(course["prerequisites"], ["EMR 110 | ESR 110"])
        self.assertNotIn("prerequisite_options", course)

    def test_actual_foundation_isls_prerequisite_resolves(self) -> None:
        program = PROGRAMS[
            "catalog-earth-sciences-bachelor-general-geology-structural-geology-and-remote-sensing"
        ]
        identities = {
            normalize_course_code(course["course_code"])
            for course in program["courses"]
        }
        course = next(course for course in program["courses"] if course["course_code"] == "ISLS 201")
        self.assertEqual(course["prerequisites"], ["ISLS 101"])
        self.assertIn(normalize_course_code("ISLS 101"), identities)

    def test_sallam_401_chain_no_longer_uses_id_101_as_sallam_101(self) -> None:
        script = r"""
const fs = require('fs');
const { planCourses } = require('./server.js');
const catalog = JSON.parse(fs.readFileSync('./web/data/faculty_catalog.json', 'utf8'));
const program = catalog.programs.find((item) => item.id === 'catalog-human-sciences-and-design-bacheior-interior-design-and-furniture');
let completed = [];
let plan;
for (let iteration = 0; iteration <= program.courses.length; iteration += 1) {
  plan = planCourses(program, completed);
  const available = plan.available_courses.map((course) => course.course_code);
  const next = [...new Set([...completed, ...available])];
  if (next.length === completed.length) break;
  completed = next;
}
const blocked = Object.fromEntries(plan.blocked_courses.map((item) => [item.course.course_code, item.missing_prerequisites]));
process.stdout.write(JSON.stringify({ completed, blocked }));
"""
        result = subprocess.run(
            ["node", "-e", script], cwd=ROOT, check=True, capture_output=True, text=True
        )
        payload = json.loads(result.stdout)
        self.assertIn("ID 101", payload["completed"])
        self.assertEqual(payload["blocked"]["سلم 201"], ["سلم 101"])
        self.assertEqual(payload["blocked"]["سلم 301"], ["سلم 201"])
        self.assertEqual(payload["blocked"]["سلم 401"], ["سلم 301"])

    def test_accounting_and_finance_data_are_unchanged(self) -> None:
        accounting_hash = hashlib.sha256(
            (ROOT / "data/validated/kau_accounting.json").read_bytes()
        ).hexdigest()
        self.assertEqual(
            accounting_hash,
            "e06347e91e9fb91e011e053a39365c7575bd53525141720f64995408523e62bb",
        )
        additional = json.loads((ROOT / "web/data/additional_programs.json").read_text(encoding="utf-8"))
        finance = next(program for program in additional["programs"] if program["id"] == "finance")
        finance_hash = hashlib.sha256(
            json.dumps(
                finance, ensure_ascii=False, sort_keys=True, separators=(",", ":")
            ).encode()
        ).hexdigest()
        self.assertEqual(
            finance_hash,
            "d0864c2a1bf78a5c82105ef1b60edf41d180c08de0024b082baea058f0cedc4a",
        )


if __name__ == "__main__":
    unittest.main()
