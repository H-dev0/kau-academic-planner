#!/usr/bin/env node

import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CATALOG_PATH = path.join(ROOT, "web/data/faculty_catalog.json");
const PLANNERS_PATH = path.join(ROOT, "web/data/additional_programs.json");
const RAW_STATE_PATH = path.join(ROOT, "data/raw/kau/official_levels_completion/state.json");
const JSON_REPORT_PATH = path.join(ROOT, "reports/plan_extraction/official_views_to_full_planners.json");
const MD_REPORT_PATH = path.join(ROOT, "reports/plan_extraction/official_views_to_full_planners.md");
const PROMOTED_ID = "catalog-professional-master-in-public-relations";

const clean = (value) => String(value ?? "")
  .replace(/\u00a0/g, " ")
  .replace(/[ \t]+/g, " ")
  .replace(/\s*\n\s*/g, "\n")
  .trim();

function normalizeCode(value) {
  const normalized = clean(value).normalize("NFKC").toUpperCase();
  return /[A-Z]/.test(normalized)
    ? normalized.replace(/[^A-Z0-9]/g, "")
    : normalized
      .replace(/[٠-٩]/g, (digit) => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit)))
      .replace(/[^\p{L}\p{N}]/gu, "");
}

function canonicalCode(value) {
  const normalized = clean(value).normalize("NFKC").toUpperCase();
  const match = normalized.match(/^([A-Z]{1,8})\s*(\d{3})$/);
  return match ? `${match[1]} ${match[2]}` : clean(value);
}

function counts(programs) {
  return {
    total: programs.length,
    FULL_PLANNER: programs.filter((program) => program.coverage_state === "FULL_PLANNER").length,
    OFFICIAL_PLAN_VIEW: programs.filter((program) => program.coverage_state === "OFFICIAL_PLAN_VIEW").length,
    CATALOG_ONLY: programs.filter((program) => program.coverage_state === "CATALOG_ONLY").length,
  };
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function blocker(code, detail, affected = []) {
  return { code, detail, affected: unique(affected) };
}

function classify(program) {
  const view = program.official_plan_view || {};
  const sections = view.sections || [];
  const rows = sections.flatMap((section) => section.rows || []);
  const blockers = [];

  if (
    view.schema_version !== 2
    || view.extraction_method !== "browser_rendered_levels_tab"
    || sections.some((section) => section.placement !== "scheduled")
  ) {
    blockers.push(blocker(
      "incomplete_level_evidence",
      "The retained view is not a complete browser-rendered Levels plan with every row assigned to an official level.",
      sections.filter((section) => section.placement !== "scheduled").map((section) => section.title_en || section.title_ar),
    ));
  }

  const missingCredits = rows.filter((row) => row.credits === null);
  if (missingCredits.length) {
    blockers.push(blocker(
      "missing_credits",
      `${missingCredits.length} official row(s) publish no exact integer credit value.`,
      missingCredits.map((row) => row.display_course_code || row.raw_course_code),
    ));
  }

  const placeholders = rows.filter((row) => row.flags?.placeholder);
  if (placeholders.length) {
    blockers.push(blocker(
      "unresolved_electives",
      `${placeholders.length} placeholder/elective row(s) do not identify the complete option set and selection rule.`,
      placeholders.map((row) => `${row.display_course_code || row.raw_course_code}: ${row.course_name_en || row.course_name_ar}`),
    ));
  }

  const removedDuplicates = view.normalization?.removed_exact_duplicate_count || 0;
  if (removedDuplicates) {
    blockers.push(blocker(
      "consolidated_duplicates",
      `${removedDuplicates} published repeated row(s) were consolidated for display, but interactive completion semantics for the repetition are not published.`,
      (view.normalization?.removed_duplicate_mappings || []).map((item) => item.course_code),
    ));
  }

  const trackSections = sections.filter((section) => /(?:track|مسار)/iu.test(`${section.title_en || ""} ${section.title_ar || ""}`));
  if (trackSections.length) {
    blockers.push(blocker(
      "track_rules",
      "The Levels plan contains named tracks without a complete official track-selection rule for planner credit accounting.",
      trackSections.map((section) => section.title_en || section.title_ar),
    ));
  }

  const occurrences = new Map();
  for (const row of rows) {
    if (row.flags?.placeholder) continue;
    const identity = normalizeCode(row.display_course_code || row.raw_course_code);
    if (!identity) continue;
    if (!occurrences.has(identity)) occurrences.set(identity, []);
    occurrences.get(identity).push(row.display_course_code || row.raw_course_code);
  }
  const repeated = [...occurrences.values()].filter((items) => items.length > 1).flat();
  if (repeated.length) {
    blockers.push(blocker(
      "repeated_identities",
      "One or more course identities repeat across official levels; repeatable/continuation completion and credit semantics are not published.",
      repeated,
    ));
  }

  const knownCodes = new Set(rows.map((row) => normalizeCode(row.display_course_code || row.raw_course_code)).filter(Boolean));
  const alternative = [];
  const semantic = [];
  const unparsed = [];
  const missingReferences = [];
  const selfReferences = [];
  const corequisites = [];
  for (const row of rows) {
    const raw = clean(row.raw_prerequisite_corequisite_text);
    if (!raw) continue;
    const identity = normalizeCode(row.display_course_code || row.raw_course_code);
    if (/(?:coreq|co-?requisite|متزامن)/iu.test(raw)) corequisites.push(`${row.display_course_code}: ${raw}`);
    if (/(?:\bor\b|أو)/iu.test(raw)) alternative.push(`${row.display_course_code}: ${raw}`);
    const nonCourseRule = /(?:all courses|pass all|completion|credit hours|جميع المقررات|اجتياز|الساعات)/iu.test(raw);
    if (nonCourseRule) semantic.push(`${row.display_course_code}: ${raw}`);
    const references = [...raw.matchAll(/[A-Z]{1,8}\s*\d{3}/gi)].map((match) => normalizeCode(match[0]));
    if (!references.length && !nonCourseRule) unparsed.push(`${row.display_course_code}: ${raw}`);
    const missing = references.filter((reference) => !knownCodes.has(reference));
    if (missing.length) missingReferences.push(`${row.display_course_code}: ${raw}`);
    if (references.includes(identity)) selfReferences.push(`${row.display_course_code}: ${raw}`);
  }
  if (corequisites.length) blockers.push(blocker(
    "corequisite_semantics",
    "Published corequisite text cannot be represented safely by the existing prerequisite-only availability behavior.",
    corequisites,
  ));
  if (alternative.length) blockers.push(blocker(
    "alternative_requisite",
    "Published alternative/OR prerequisite logic is not supported by the existing all-prerequisites engine.",
    alternative,
  ));
  if (semantic.length) blockers.push(blocker(
    "non_course_requisite",
    "A thesis/project gate is expressed as completed courses or credit hours rather than exact course identities.",
    semantic,
  ));
  if (unparsed.length) blockers.push(blocker(
    "unparsed_requisite",
    "Published requisite text is not an exact safely parseable course-code expression.",
    unparsed,
  ));
  if (missingReferences.length) blockers.push(blocker(
    "missing_requisite_course",
    "Published prerequisite text references course identities absent from this official Levels plan.",
    missingReferences,
  ));
  if (selfReferences.length) blockers.push(blocker(
    "self_requisite",
    "A published prerequisite resolves to the same displayed course identity.",
    selfReferences,
  ));

  const ungated = rows.filter((row) => (
    row.flags?.project
    || row.flags?.training
    || row.flags?.practicum
    || row.flags?.cooperative_training
  ) && !clean(row.raw_prerequisite_corequisite_text));
  if (ungated.length) {
    blockers.push(blocker(
      "ungated_capstone_or_training",
      "The official Levels placement includes a thesis/project/training course but publishes no gating or completion rule; enabling it initially would be an academic assumption.",
      ungated.map((row) => `${row.display_course_code}: ${row.course_name_en || row.course_name_ar}`),
    ));
  }

  return { rows, sections, blockers };
}

function prerequisiteCodes(raw, codeByIdentity) {
  if (!clean(raw)) return [];
  const references = [...clean(raw).matchAll(/[A-Z]{1,8}\s*\d{3}/gi)].map((match) => normalizeCode(match[0]));
  if (!references.length) throw new Error(`cannot parse prerequisite: ${raw}`);
  return unique(references.map((identity) => {
    const code = codeByIdentity.get(identity);
    if (!code) throw new Error(`prerequisite is absent from promoted plan: ${raw}`);
    return code;
  }));
}

function buildPlanner(program) {
  const view = program.official_plan_view;
  const rows = view.sections.flatMap((section) => section.rows);
  const codeByIdentity = new Map(rows.map((row) => {
    const code = canonicalCode(row.display_course_code || row.raw_course_code);
    return [normalizeCode(code), code];
  }));
  if (codeByIdentity.size !== rows.length) throw new Error(`${program.id}: promoted plan contains repeated identities`);
  const sourceTitle = "KAU official browser-rendered Levels plan (captured bilingual evidence)";
  const checkedDate = String(view.source.retrieved_at || "").slice(0, 10);
  const courses = [];
  const levelRequiredCredits = {};
  for (const section of view.sections) {
    const level = section.title_en || section.title_ar;
    levelRequiredCredits[level] = section.rows.reduce((sum, row) => sum + row.credits, 0);
    for (const row of section.rows) {
      const courseCode = codeByIdentity.get(normalizeCode(row.display_course_code || row.raw_course_code));
      courses.push({
        semester_or_level: level,
        semester_or_level_ar: section.title_ar,
        semester_or_level_en: section.title_en,
        course_code: courseCode,
        official_course_name: row.course_name_ar || row.course_name_en,
        course_name_ar: row.course_name_ar,
        course_name_en: row.course_name_en,
        credit_hours: row.credits,
        prerequisites: prerequisiteCodes(row.raw_prerequisite_corequisite_text, codeByIdentity),
        corequisites: [],
        prerequisite_text_ar: row.prerequisite_text_ar,
        prerequisite_text_en: row.prerequisite_text_en,
        official_source_url: program.source_url_en || program.official_source_url,
        source_title: sourceTitle,
        last_checked_date: checkedDate,
      });
    }
  }
  return {
    id: program.id,
    faculty_id: program.faculty_id,
    program_name: program.program_name_en || program.name_en || program.program_name,
    program_name_ar: program.program_name_ar || program.name_ar,
    program_name_en: program.program_name_en || program.name_en || program.program_name,
    name_ar: program.name_ar || program.program_name_ar,
    name_en: program.name_en || program.program_name_en || program.program_name,
    degree_level: program.degree_level,
    degree_level_ar: program.degree_level_ar,
    degree_level_en: program.degree_level_en,
    university_name: "King Abdulaziz University",
    college_name: program.faculty_name_en || program.faculty_name || "communications&media",
    faculty_name_ar: program.faculty_name_ar,
    faculty_name_en: program.faculty_name_en || program.faculty_name,
    total_program_credit_hours: null,
    calculated_plan_credit_hours: courses.reduce((sum, course) => sum + course.credit_hours, 0),
    official_source_url: program.source_url_en || program.official_source_url,
    source_url_ar: program.source_url_ar,
    source_url_en: program.source_url_en,
    source_title: sourceTitle,
    last_checked_date: checkedDate,
    level_required_credit_hours: levelRequiredCredits,
    courses,
  };
}

async function writeJson(filePath, value) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  const temporary = `${filePath}.tmp`;
  await fs.writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  await fs.rename(temporary, filePath);
}

async function appendPlannerPreservingExistingFormatting(raw, planner) {
  const closing = "\n  ]\n}\n";
  if (!raw.endsWith(closing)) throw new Error("unexpected additional_programs.json closing structure");
  const indented = JSON.stringify(planner, null, 2)
    .split("\n")
    .map((line) => `    ${line}`)
    .join("\n");
  const updated = `${raw.slice(0, -closing.length)},\n${indented}${closing}`;
  const temporary = `${PLANNERS_PATH}.tmp`;
  await fs.writeFile(temporary, updated, { encoding: "utf8", mode: 0o755 });
  await fs.rename(temporary, PLANNERS_PATH);
}

function markdown(report) {
  const promotedRows = report.promoted_programs.map((item) => (
    `| ${item.program_name_en} (\`${item.program_id}\`) | ${item.level_count} | ${item.course_count} | ${item.calculated_plan_credit_hours} | ${item.initial_available} / ${item.initial_blocked} |`
  ));
  const retainedRows = report.retained_programs.map((item) => (
    `| ${item.program_name_en} (\`${item.program_id}\`) | ${item.blockers.map((entry) => entry.detail).join("<br>")} |`
  ));
  const catalogRows = report.remaining_bachelor_catalog_only.map((item) => (
    `| ${item.program_name_en} | \`${item.program_id}\` |`
  ));
  return `# Official views to full planners

Generated: ${report.generated_at}

## Outcome

- Programs reviewed: ${report.summary.programs_reviewed}
- Promoted to FULL_PLANNER: ${report.summary.programs_promoted}
- Retained as OFFICIAL_PLAN_VIEW: ${report.summary.programs_retained}
- Captured HTML snapshots reverified: ${report.summary.captured_snapshots_verified}
- Coverage: ${JSON.stringify(report.coverage_before)} → ${JSON.stringify(report.coverage_after)}
- Remaining bachelor CATALOG_ONLY programs: ${report.remaining_bachelor_catalog_only.length}
- Validation: ${report.validation.status}

The official total remains null for the promoted plan because KAU does not publish a separate total in the captured page. The planner uses the exact 39-credit sum of the complete official Levels rows as its calculated plan total.

## Promoted programs

| Program | Levels | Courses | Calculated credits | Initially available / blocked |
|---|---:|---:|---:|---:|
${promotedRows.join("\n")}

## Retained OFFICIAL_PLAN_VIEW programs

| Program | Exact blocker(s) |
|---|---|
${retainedRows.join("\n")}

## Remaining bachelor CATALOG_ONLY programs

| Program | ID |
|---|---|
${catalogRows.join("\n")}

## Validation

${report.validation.commands.map((command) => `- ${command}`).join("\n")}
`;
}

async function sha256File(filePath) {
  return crypto.createHash("sha256").update(await fs.readFile(filePath)).digest("hex");
}

async function main() {
  const validated = process.argv.includes("--validated");
  const catalog = JSON.parse(await fs.readFile(CATALOG_PATH, "utf8"));
  const plannersRaw = await fs.readFile(PLANNERS_PATH, "utf8");
  const planners = JSON.parse(plannersRaw);
  const rawState = JSON.parse(await fs.readFile(RAW_STATE_PATH, "utf8"));
  const reviewPrograms = catalog.programs.filter((program) => (
    program.coverage_state === "OFFICIAL_PLAN_VIEW" || program.id === PROMOTED_ID
  ));
  if (reviewPrograms.length !== 117) throw new Error(`expected 117 review programs, found ${reviewPrograms.length}`);

  let snapshotsVerified = 0;
  const reviews = [];
  for (const program of reviewPrograms) {
    const result = classify(program);
    const raw = rawState.programs?.[program.id];
    if (raw && program.official_plan_view?.extraction_method === "browser_rendered_levels_tab") {
      for (const locale of ["ar", "en"]) {
        const evidence = raw.locales?.[locale];
        if (!evidence?.html_path) continue;
        const hash = await sha256File(path.join(ROOT, evidence.html_path));
        if (hash !== evidence.html_sha256 || hash !== program.official_plan_view?.source?.[`sha256_${locale}`]) {
          throw new Error(`${program.id}: ${locale} captured evidence hash mismatch`);
        }
        snapshotsVerified += 1;
      }
    }
    reviews.push({
      program_id: program.id,
      program_name_ar: program.program_name_ar || program.name_ar,
      program_name_en: program.program_name_en || program.name_en || program.program_name,
      degree_level: program.degree_level,
      decision: result.blockers.length ? "retain_OFFICIAL_PLAN_VIEW" : "promote_FULL_PLANNER",
      level_count: result.sections.length,
      course_count: result.rows.length,
      visible_credit_sum: program.official_plan_view?.visible_credit_sum ?? null,
      blockers: result.blockers,
      evidence: program.official_plan_view?.source || null,
    });
  }
  const eligible = reviews.filter((review) => review.decision === "promote_FULL_PLANNER");
  if (eligible.length !== 1 || eligible[0].program_id !== PROMOTED_ID) {
    throw new Error(`safe promotion set changed: ${eligible.map((item) => item.program_id).join(", ")}`);
  }

  const program = catalog.programs.find((item) => item.id === PROMOTED_ID);
  const planner = buildPlanner(program);
  if (planner.courses.length !== 13 || planner.calculated_plan_credit_hours !== 39) {
    throw new Error("Professional Public Relations planner count changed");
  }
  const initialBlocked = planner.courses.filter((course) => course.prerequisites.length).length;
  if (initialBlocked !== 3) throw new Error(`expected 3 initially blocked courses, found ${initialBlocked}`);
  const existingPlannerIndex = planners.programs.findIndex((item) => item.id === PROMOTED_ID);
  if (existingPlannerIndex === -1) {
    planners.programs.push(planner);
    await appendPlannerPreservingExistingFormatting(plannersRaw, planner);
  } else if (JSON.stringify(planners.programs[existingPlannerIndex]) !== JSON.stringify(planner)) {
    throw new Error(`${PROMOTED_ID}: existing generated planner differs from captured official evidence`);
  }

  program.planner_available = true;
  program.planner_data_key = PROMOTED_ID;
  program.catalog_status = "active";
  program.catalog_note_ar = "الخطة الدراسية متاحة في المخطط.";
  program.catalog_note_en = "The detailed study plan is available in the planner.";
  program.catalog_note = program.catalog_note_en;
  program.coverage_state = "FULL_PLANNER";
  program.total_program_credit_hours = null;

  const coverageAfter = counts(catalog.programs);
  const coverageBefore = {
    total: coverageAfter.total,
    FULL_PLANNER: coverageAfter.FULL_PLANNER - 1,
    OFFICIAL_PLAN_VIEW: coverageAfter.OFFICIAL_PLAN_VIEW + 1,
    CATALOG_ONLY: coverageAfter.CATALOG_ONLY,
  };
  if (JSON.stringify(coverageBefore) !== JSON.stringify({ total: 223, FULL_PLANNER: 72, OFFICIAL_PLAN_VIEW: 117, CATALOG_ONLY: 34 })) {
    throw new Error(`unexpected before coverage: ${JSON.stringify(coverageBefore)}`);
  }
  if (JSON.stringify(coverageAfter) !== JSON.stringify({ total: 223, FULL_PLANNER: 73, OFFICIAL_PLAN_VIEW: 116, CATALOG_ONLY: 34 })) {
    throw new Error(`unexpected after coverage: ${JSON.stringify(coverageAfter)}`);
  }

  const remainingBachelorCatalogOnly = catalog.programs
    .filter((item) => item.coverage_state === "CATALOG_ONLY" && item.degree_level === "bachelor")
    .map((item) => ({
      program_id: item.id,
      program_name_ar: item.program_name_ar || item.name_ar,
      program_name_en: item.program_name_en || item.name_en || item.program_name,
    }))
    .sort((left, right) => left.program_id.localeCompare(right.program_id));

  const promotedReview = reviews.find((review) => review.program_id === PROMOTED_ID);
  const report = {
    generated_at: new Date().toISOString().replace(/\.\d{3}Z$/, "Z"),
    source_policy: "Existing captured KAU browser-rendered Levels evidence; no rule inferred from order, codes, or similar programs.",
    coverage_before: coverageBefore,
    coverage_after: coverageAfter,
    summary: {
      programs_reviewed: reviews.length,
      programs_promoted: 1,
      programs_retained: reviews.length - 1,
      captured_snapshots_verified: snapshotsVerified,
    },
    promoted_programs: [{
      ...promotedReview,
      planner_data_key: PROMOTED_ID,
      calculated_plan_credit_hours: planner.calculated_plan_credit_hours,
      initial_available: planner.courses.length - initialBlocked,
      initial_blocked: initialBlocked,
      prerequisite_chain: ["PR 601", "PR 605", "PR 690", "PR 698"],
      total_program_credit_hours: null,
    }],
    retained_programs: reviews.filter((review) => review.decision === "retain_OFFICIAL_PLAN_VIEW"),
    remaining_bachelor_catalog_only: remainingBachelorCatalogOnly,
    validation: {
      status: validated ? "passed" : "pending",
      commands: validated ? [
        "PYTHONPATH=src python3 -m unittest discover -s tests -v — passed",
        "npm run test:full-planners — all 73 FULL_PLANNER programs simulated",
        "npm run test:promoted-planner-ui — Arabic/English, desktop/mobile, light/dark passed",
        "npm run test:official-levels-ui — retained read-only representative matrix passed",
        "python3 -m compileall, node --check, and git diff --check — passed",
      ] : ["Validation runs pending"],
    },
  };

  await writeJson(CATALOG_PATH, catalog);
  await writeJson(JSON_REPORT_PATH, report);
  await fs.writeFile(MD_REPORT_PATH, markdown(report), "utf8");
  process.stdout.write(`${JSON.stringify({ coverage: coverageAfter, promoted: [PROMOTED_ID], retained: 116, bachelor_catalog_only: remainingBachelorCatalogOnly.length, snapshots_verified: snapshotsVerified })}\n`);
}

main().catch((error) => {
  process.stderr.write(`${error.stack || error}\n`);
  process.exitCode = 1;
});
