#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const { planCourses } = require("../server.js");

const root = path.resolve(__dirname, "..");
const catalog = JSON.parse(fs.readFileSync(path.join(root, "web/data/faculty_catalog.json"), "utf8"));
const additional = JSON.parse(fs.readFileSync(path.join(root, "web/data/additional_programs.json"), "utf8"));
const accounting = JSON.parse(fs.readFileSync(path.join(root, "data/validated/kau_accounting.json"), "utf8"));
accounting.id = "accounting";

const foundationCourses = [
  ["level 1", "CPIT 110"], ["level 1", "ELIS 110"], ["level 1", "ISLS 101"],
  ["level 1", "MATH 100"], ["level 1", "STAT 110"], ["level 2", "ARAB 101"],
  ["level 2", "ECON 107"], ["level 2", "ELIS 120"], ["level 2", "MATH 110"],
].map(([semester_or_level, course_code]) => ({ semester_or_level, course_code, prerequisites: [] }));

const active = new Map([accounting, ...additional.programs].map((program) => [program.id, program]));

function runtimeProgram(catalogProgram) {
  const planner = active.get(catalogProgram.id);
  const program = planner ? {
    ...catalogProgram,
    ...planner,
    faculty_id: catalogProgram.faculty_id || planner.faculty_id,
  } : { ...catalogProgram };
  program.courses = Array.isArray(program.courses) ? program.courses : [];
  if (program.faculty_id === "EA" && program.degree_level === "Bachelor's degree") {
    const levels = new Set(program.courses.map((course) => String(course.semester_or_level).toLowerCase()));
    program.courses = [
      ...(levels.has("level 1") ? [] : foundationCourses.filter((course) => course.semester_or_level === "level 1")),
      ...(levels.has("level 2") ? [] : foundationCourses.filter((course) => course.semester_or_level === "level 2")),
      ...program.courses,
    ];
  }
  return program;
}

const full = catalog.programs.filter((program) => program.coverage_state === "FULL_PLANNER").map(runtimeProgram);
if (full.length !== 73) throw new Error(`expected 73 FULL_PLANNER programs, found ${full.length}`);

const summary = {
  programs: full.length,
  course_rows: 0,
  initially_available: 0,
  initially_blocked: 0,
  permanently_blocked: 0,
  maximum_iterations: 0,
};

for (const program of full) {
  if (!program.courses.length) throw new Error(`${program.id}: empty planner dataset`);
  if (program.courses.some((course) => !course.semester_or_level)) throw new Error(`${program.id}: missing level placement`);
  const initial = planCourses(program, [], {});
  if (initial.validation_errors?.length) throw new Error(`${program.id}: ${initial.validation_errors.join("; ")}`);
  if (initial.available_courses.length + initial.blocked_courses.length !== program.courses.length) {
    throw new Error(`${program.id}: initial planner partition mismatch`);
  }
  summary.course_rows += program.courses.length;
  summary.initially_available += initial.available_courses.length;
  summary.initially_blocked += initial.blocked_courses.length;

  const completed = new Set();
  let iterations = 0;
  while (iterations <= program.courses.length) {
    iterations += 1;
    const plan = planCourses(program, [...completed], {});
    const newlyAvailable = plan.available_courses
      .map((course) => course.course_code)
      .filter((code) => !completed.has(code));
    if (!newlyAvailable.length) {
      summary.permanently_blocked += plan.blocked_courses.length;
      break;
    }
    newlyAvailable.forEach((code) => completed.add(code));
  }
  if (iterations > program.courses.length) throw new Error(`${program.id}: planner simulation did not converge`);
  summary.maximum_iterations = Math.max(summary.maximum_iterations, iterations);
}

const byId = new Map(full.map((program) => [program.id, program]));
for (const [programId, expected] of [["accounting", [43, 38, 5]], ["finance", [43, 43, 0]]]) {
  const program = byId.get(programId);
  const plan = planCourses(program, [], {});
  const actual = [program.courses.length, plan.available_courses.length, plan.blocked_courses.length];
  if (JSON.stringify(actual) !== JSON.stringify(expected)) throw new Error(`${programId}: expected ${expected}, got ${actual}`);
}
const publicRelations = byId.get("catalog-professional-master-in-public-relations");
const publicRelationsPlan = planCourses(publicRelations, [], {});
const publicRelationsActual = [publicRelations.courses.length, publicRelationsPlan.available_courses.length, publicRelationsPlan.blocked_courses.length];
if (JSON.stringify(publicRelationsActual) !== JSON.stringify([13, 10, 3])) {
  throw new Error(`professional public relations: expected 13,10,3, got ${publicRelationsActual}`);
}
const financeIsls = byId.get("finance").courses.find((course) => course.course_code === "ISLS 201");
if (!financeIsls || financeIsls.prerequisites.length !== 0) throw new Error("Finance ISLS 201 changed");

process.stdout.write(`${JSON.stringify(summary)}\n`);
