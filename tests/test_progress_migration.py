import json
import subprocess
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
CATALOG = json.loads((ROOT / "web/data/faculty_catalog.json").read_text(encoding="utf-8"))
PROGRAMS = {program["id"]: program for program in CATALOG["programs"]}


class ProgressMigrationTests(unittest.TestCase):
    maxDiff = None

    def run_node(self, body):
        script = "const migration=require('./web/progress-migration.js');\n" + body
        result = subprocess.run(
            ["node", "-e", script],
            cwd=ROOT,
            text=True,
            capture_output=True,
            check=True,
        )
        return json.loads(result.stdout)

    def test_exact_six_collision_groups(self):
        body = """
const fs=require('fs');
const catalog=JSON.parse(fs.readFileSync('web/data/faculty_catalog.json'));
const rows=[];
for(const id of migration.affectedPrograms){
  const program=catalog.programs.find(item=>item.id===id);
  for(const [legacy,candidates] of migration.identityMappings(program.courses)){
    if(candidates.length>1) rows.push([id,legacy,candidates.map(x=>x.current_identity).sort()]);
  }
}
console.log(JSON.stringify(rows));
"""
        actual = self.run_node(body)
        expected = [
            ["catalog-human-sciences-and-design-bacheior-interior-design-and-furniture", "401", ["سلم401", "غت401"]],
            ["catalog-human-sciences-and-design-bachelor-of-science-b-sc-in-family-sciences", "101", ["سلم101", "عرب101"]],
            ["catalog-human-sciences-and-design-bachelor-s-department-of-early-childhood-guide", "111", ["تطفم111", "تم111", "ص111"]],
            ["catalog-human-sciences-and-design-bachelor-s-department-of-early-childhood-guide", "101", ["إنج101", "سلم101", "عرب101"]],
            ["catalog-human-sciences-and-design-bachelor-s-department-of-early-childhood-guide", "201", ["سلم201", "عرب201"]],
            ["catalog-human-sciences-and-design-bachelor-s-department-of-early-childhood-guide", "301", ["تطفم301", "سلم301"]],
        ]
        self.assertEqual(sorted(actual), sorted(expected))

    def test_no_saved_progress_and_unaffected_program_are_unchanged(self):
        result = self.run_node("""
const none=migration.migrateProgress('catalog-human-sciences-and-design-bachelor-of-science-b-sc-in-family-sciences',[],null);
const saved={completed_codes:['101'],note:'keep'};
const unaffected=migration.migrateProgress('accounting',[],saved);
console.log(JSON.stringify({none,unaffected,same:unaffected.progress===saved}));
""")
        self.assertFalse(result["none"]["changed"])
        self.assertIsNone(result["none"]["progress"])
        self.assertFalse(result["unaffected"]["changed"])
        self.assertTrue(result["same"])

    def test_modern_unambiguous_ambiguous_and_mixed_progress(self):
        result = self.run_node("""
const courses=[
 {course_code:'عرب 101',official_course_name:'Arabic'},
 {course_code:'سلم 101',official_course_name:'Islamic'},
 {course_code:'سلم 201',official_course_name:'Islamic 2'},
 {course_code:'EN 100',official_course_name:'English'}
];
const id='catalog-human-sciences-and-design-bachelor-of-science-b-sc-in-family-sciences';
const modern=migration.migrateProgress(id,courses,{completed_codes:['عرب101','EN100']});
const mixed=migration.migrateProgress(id,courses,{completed_codes:['EN100','201','101','سلم101'],extra:'keep'});
console.log(JSON.stringify({modern,mixed}));
""")
        modern = result["modern"]["progress"]
        self.assertEqual(modern["completed_codes"], ["عرب101", "EN100"])
        self.assertEqual(modern["course_identity_migration"]["status"], "complete")
        mixed = result["mixed"]["progress"]
        self.assertEqual(mixed["completed_codes"], ["EN100", "سلم201", "سلم101"])
        self.assertEqual(mixed["extra"], "keep")
        metadata = mixed["course_identity_migration"]
        self.assertEqual(metadata["unambiguous_mappings"][0]["legacy_value"], "201")
        self.assertEqual(metadata["ambiguous_legacy_values"][0]["legacy_value"], "101")
        self.assertIsNone(metadata["ambiguous_legacy_values"][0]["resolution"])
        self.assertNotIn("عرب101", mixed["completed_codes"])

    def test_repeated_migration_is_idempotent_and_backup_is_retained(self):
        result = self.run_node("""
const courses=[{course_code:'عرب 101'},{course_code:'سلم 101'}];
const id='catalog-human-sciences-and-design-bachelor-of-science-b-sc-in-family-sciences';
const first=migration.migrateProgress(id,courses,{completed_codes:['101','OTHER']});
const second=migration.migrateProgress(id,courses,first.progress);
const resolved=migration.reconfirmCourse(first.migration,'سلم101');
const third=migration.migrateProgress(id,courses,{...first.progress,course_identity_migration:resolved,completed_codes:['OTHER','سلم101']});
console.log(JSON.stringify({first,second,resolved,third}));
""")
        self.assertTrue(result["first"]["changed"])
        self.assertFalse(result["second"]["changed"])
        self.assertEqual(result["first"]["progress"], result["second"]["progress"])
        resolved = result["resolved"]
        self.assertFalse(resolved["notice_pending"])
        self.assertEqual(resolved["status"], "complete")
        backup = resolved["ambiguous_legacy_values"][0]
        self.assertEqual(backup["legacy_value"], "101")
        self.assertEqual(backup["resolution"]["current_identity"], "سلم101")
        self.assertFalse(result["third"]["changed"])
        self.assertEqual(result["third"]["progress"]["completed_codes"], ["OTHER", "سلم101"])

    def test_reconfirmed_course_can_unlock_its_real_dependent(self):
        result = self.run_node("""
const courses=[
 {course_code:'عرب 101'}, {course_code:'سلم 101'},
 {course_code:'سلم 201',prerequisites:['سلم 101']}
];
const id='catalog-human-sciences-and-design-bachelor-of-science-b-sc-in-family-sciences';
const first=migration.migrateProgress(id,courses,{completed_codes:['101']});
const before=new Set(first.progress.completed_codes);
const selected='سلم101';
const after=new Set([...before,selected]);
const normalizedPrerequisites=courses[2].prerequisites.map(migration.currentNormalize);
const blockedBefore=normalizedPrerequisites.some(code=>!before.has(code));
const blockedAfter=normalizedPrerequisites.some(code=>!after.has(code));
console.log(JSON.stringify({blockedBefore,blockedAfter,metadata:migration.reconfirmCourse(first.migration,selected)}));
""")
        self.assertTrue(result["blockedBefore"])
        self.assertFalse(result["blockedAfter"])
        self.assertFalse(result["metadata"]["notice_pending"])

    def test_notice_text_and_same_storage_key_integration(self):
        html = (ROOT / "web/index.html").read_text(encoding="utf-8")
        app = (ROOT / "web/app.js").read_text(encoding="utf-8")
        self.assertIn(
            "Some previously saved course selections used ambiguous course codes. Your other progress was preserved, but the affected selections must be confirmed again to prevent incorrect prerequisite results.",
            html,
        )
        self.assertIn(
            "كانت بعض اختيارات المقررات المحفوظة سابقًا تستخدم رموزًا متشابهة وغير واضحة. تم الاحتفاظ ببقية تقدمك، ولكن يجب تأكيد المقررات المتأثرة مرة أخرى لمنع ظهور نتائج غير صحيحة للمتطلبات.",
            html,
        )
        self.assertIn('const localProgressPrefix = "kau-planner-local-progress";', app)
        self.assertNotIn("localStorage.clear", app)

    def test_affected_programs_are_full_planners_and_accounting_finance_not_affected(self):
        affected = {
            "catalog-human-sciences-and-design-bacheior-interior-design-and-furniture",
            "catalog-human-sciences-and-design-bachelor-of-science-b-sc-in-family-sciences",
            "catalog-human-sciences-and-design-bachelor-s-department-of-early-childhood-guide",
        }
        self.assertTrue(all(PROGRAMS[program_id]["coverage_state"] == "FULL_PLANNER" for program_id in affected))
        self.assertTrue(all(PROGRAMS[program_id]["planner_available"] for program_id in affected))
        self.assertTrue(all("official_plan_view" in PROGRAMS[program_id] for program_id in affected))
        self.assertNotIn("accounting", affected)
        self.assertNotIn("finance", affected)


if __name__ == "__main__":
    unittest.main()
