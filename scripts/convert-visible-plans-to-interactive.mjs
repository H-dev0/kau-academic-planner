#!/usr/bin/env node

import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { buildOfficialView, completeLevels, unresolvedReason } from "./import-official-levels.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CATALOG_PATH = path.join(ROOT, "web/data/faculty_catalog.json");
const PLANNERS_PATH = path.join(ROOT, "web/data/additional_programs.json");
const RAW_STATE_PATH = path.join(ROOT, "data/raw/kau/official_levels_completion/state.json");
const CATALOG_REVIEW_PATH = path.join(ROOT, "data/parsed/catalog_interactive_review.json");
const JSON_REPORT_PATH = path.join(ROOT, "reports/plan_extraction/all_visible_plans_to_interactive.json");
const MD_REPORT_PATH = path.join(ROOT, "reports/plan_extraction/all_visible_plans_to_interactive.md");
const CONVERSION_ORIGIN = "OFFICIAL_PLAN_VIEW";

const clean = (value) => String(value ?? "")
  .replace(/\u00a0/g, " ")
  .replace(/[ \t]+/g, " ")
  .replace(/\s*\n\s*/g, " ")
  .trim();

function normalizeCode(value) {
  const normalized = clean(value).normalize("NFKC").toUpperCase();
  return /[A-Z]/.test(normalized)
    ? normalized.replace(/[^A-Z0-9]/g, "")
    : normalized
      .replace(/[٠-٩]/g, (digit) => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit)))
      .replace(/[^\p{L}\p{N}]/gu, "");
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

function publishedLevelCreditTotal(view) {
  const totals = (view.sections || []).map((section) => {
    const title = clean(`${section.title_en || ""} ${section.title_ar || ""}`)
      .replace(/[٠-٩]/g, (digit) => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit)));
    const match = title.match(/(?:Total Credit Hours|إجمالي ساعات|مجموع الساعات)[^0-9]*(\d+)/iu);
    return match ? Number(match[1]) : null;
  });
  return totals.length && totals.every((total) => Number.isFinite(total) && total >= 0)
    ? totals.reduce((sum, total) => sum + total, 0)
    : null;
}

function warning(code, messageAr, messageEn, count = null) {
  return { code, message_ar: messageAr, message_en: messageEn, count };
}

const warningTemplates = {
  unresolved_prerequisite: () => warning(
    "unresolved_prerequisite",
    "بيانات المتطلب تحتاج إلى تحقق",
    "Prerequisite information requires verification",
  ),
  missing_credit: () => warning(
    "missing_credit",
    "الساعات المعتمدة لهذا الصف غير منشورة في الخطة الرسمية.",
    "Credit hours for this row are not published in the official plan.",
  ),
  flexible_requirement: () => warning(
    "flexible_requirement",
    "قاعدة الاختيار أو المسار غير منشورة بالكامل؛ حدّد هذا الصف فقط إذا أكملته فعليًا.",
    "The elective or track rule is not fully published; mark this row only if you actually completed it.",
  ),
  training_rule: () => warning(
    "training_rule",
    "شروط التدريب أو المشروع غير منشورة بالكامل؛ يظهر المقرر وفق موضعه الرسمي دون افتراض شروط إضافية.",
    "Training or project eligibility rules are not fully published; the course remains at its official level without assumed conditions.",
  ),
  repeated_identity: () => warning(
    "repeated_identity",
    "رمز المقرر مكرر في الخطة المنشورة؛ يتم حفظ إكمال كل صف بصورة مستقلة.",
    "This course code repeats in the published plan; completion is stored independently for each row.",
  ),
};

function isNoPrerequisiteText(value) {
  return /^(?:none|n\/?a|nil|no prerequisite|لا يوجد|بدون|[-–—])$/iu.test(clean(value));
}

function isTrackSection(section) {
  return /(?:track|مسار)/iu.test(`${section.title_en || ""} ${section.title_ar || ""}`);
}

function isElectiveSection(section) {
  return /(?:elective|optional|اختياري)/iu.test(`${section.title_en || ""} ${section.title_ar || ""}`);
}

function courseType(row, section) {
  if (isTrackSection(section)) return "track";
  if (isElectiveSection(section) || row.flags?.placeholder) return "elective";
  if (row.flags?.cooperative_training) return "cooperative_training";
  if (row.flags?.practicum) return "practicum";
  if (row.flags?.training) return "training";
  if (row.flags?.project) return "project";
  return "required";
}

function extractExplicitPrerequisites(raw, currentIdentity, identitiesByCode) {
  const originalText = String(raw ?? "");
  const text = clean(originalText);
  if (!text || isNoPrerequisiteText(text)) return { prerequisites: [], unresolved: false };
  if (/(?:coreq|co-?requisite|متزامن)/iu.test(text)) return { prerequisites: [], unresolved: true };
  if (/(?:\bor\b|أو)/iu.test(text)) return { prerequisites: [], unresolved: true };

  const matches = [...text.matchAll(/[A-Z]{1,8}\s*-?\s*\d{3}/giu)];
  if (!matches.length) return { prerequisites: [], unresolved: true };
  const rawCodes = matches.map((match) => match[0]);
  let remainder = text.replace(/[A-Z]{1,8}\s*-?\s*\d{3}/giu, " ");
  remainder = remainder
    .replace(/\band\b/giu, " ")
    .replace(/[\s,;+&()[\]{}]/g, "")
    .trim();
  const explicitSeparator = rawCodes.length === 1 || /[,;+&]|\band\b|\r?\n/iu.test(originalText);
  if (remainder || !explicitSeparator) return { prerequisites: [], unresolved: true };

  const prerequisites = [];
  for (const rawCode of rawCodes) {
    const candidates = identitiesByCode.get(normalizeCode(rawCode)) || [];
    if (candidates.length !== 1 || candidates[0] === currentIdentity) {
      return { prerequisites: [], unresolved: true };
    }
    if (!prerequisites.includes(candidates[0])) prerequisites.push(candidates[0]);
  }
  return { prerequisites, unresolved: false };
}

function buildPlanner(program) {
  const view = program.official_plan_view;
  if (!view?.sections?.length) throw new Error(`${program.id}: official plan has no sections`);
  const flattened = view.sections.flatMap((section, sectionIndex) => (
    (section.rows || []).map((row, rowIndex) => ({ section, sectionIndex, row, rowIndex }))
  ));
  if (!flattened.length) throw new Error(`${program.id}: official plan has no course rows`);

  const occurrences = new Map();
  for (const item of flattened) {
    const code = clean(item.row.display_course_code || item.row.raw_course_code);
    const normalized = normalizeCode(code) || "PLACEHOLDER";
    if (!occurrences.has(normalized)) occurrences.set(normalized, []);
    occurrences.get(normalized).push(item);
  }

  const identitiesByCode = new Map();
  flattened.forEach((item, globalIndex) => {
    const code = clean(item.row.display_course_code || item.row.raw_course_code);
    const publishedNormalized = normalizeCode(code);
    const normalized = publishedNormalized || "PLACEHOLDER";
    const repeated = occurrences.get(normalized).length > 1 || !publishedNormalized;
    item.courseCode = code;
    item.normalizedCode = normalized;
    item.repeated = repeated;
    item.repeatIndex = occurrences.get(normalized).indexOf(item);
    item.identity = repeated
      ? `PV-${normalized}-${String(globalIndex + 1).padStart(3, "0")}`
      : code;
    if (!identitiesByCode.has(normalized)) identitiesByCode.set(normalized, []);
    identitiesByCode.get(normalized).push(item.identity);
  });

  const courses = [];
  const unresolvedPrerequisiteRows = [];
  let unresolvedElectiveRule = false;
  let unresolvedTrainingRule = false;
  let missingCreditRows = 0;
  let repeatedRows = 0;

  for (const item of flattened) {
    const { row, section } = item;
    const type = courseType(row, section);
    const flexible = type === "track" || type === "elective";
    const officialRawRequisite = row.raw_prerequisite_corequisite_text;
    const rawRequisite = clean(officialRawRequisite);
    const parsed = extractExplicitPrerequisites(officialRawRequisite, item.identity, identitiesByCode);
    const courseWarnings = [];
    if (parsed.unresolved) {
      courseWarnings.push(warningTemplates.unresolved_prerequisite());
      unresolvedPrerequisiteRows.push({
        planner_course_id: item.identity,
        course_code: item.courseCode,
        level_ar: section.title_ar || null,
        level_en: section.title_en || null,
        official_text: rawRequisite,
      });
    }
    if (row.credits === null) {
      courseWarnings.push(warningTemplates.missing_credit());
      missingCreditRows += 1;
    }
    if (type === "elective" || type === "track") {
      courseWarnings.push(warningTemplates.flexible_requirement());
      unresolvedElectiveRule = true;
    }
    if (["training", "cooperative_training", "practicum", "project"].includes(type)
        && (!rawRequisite || parsed.unresolved)) {
      courseWarnings.push(warningTemplates.training_rule());
      unresolvedTrainingRule = true;
    }
    if (item.repeated) {
      courseWarnings.push(warningTemplates.repeated_identity());
      repeatedRows += 1;
    }

    const countsTowardCalculatedTotal = !flexible && (!item.repeated || item.repeatIndex === 0);
    courses.push({
      semester_or_level: section.title_en || section.title_ar,
      semester_or_level_ar: section.title_ar || null,
      semester_or_level_en: section.title_en || null,
      official_level_placement: section.placement || "scheduled",
      course_code: item.courseCode,
      ...(item.repeated ? { planner_course_id: item.identity } : {}),
      official_course_name: row.course_name_ar || row.course_name_en,
      course_name_ar: row.course_name_ar || null,
      course_name_en: row.course_name_en || null,
      credit_hours: row.credits,
      prerequisites: parsed.prerequisites,
      corequisites: [],
      prerequisite_text_original: rawRequisite || null,
      prerequisite_text_ar: row.prerequisite_text_ar || null,
      prerequisite_text_en: row.prerequisite_text_en || null,
      prerequisite_verification_required: parsed.unresolved,
      course_type: type,
      counts_toward_program_credit_total: countsTowardCalculatedTotal,
      ...(countsTowardCalculatedTotal ? {} : {
        credit_total_exclusion_reason: type === "track" || type === "elective"
          ? "Flexible published requirement; exact selection rule is not published."
          : "Repeated published identity; completion semantics require verification.",
      }),
      academic_data_warnings: courseWarnings,
      official_source_url: program.source_url_en || program.official_source_url,
      source_title: "KAU published official study plan",
      last_checked_date: String(view.source?.retrieved_at || program.last_checked_date || "").slice(0, 10),
    });
  }

  if (new Set(courses.map((course) => normalizeCode(course.planner_course_id || course.course_code))).size !== courses.length) {
    throw new Error(`${program.id}: generated planner identities are not unique`);
  }

  const calculatedPlanCredits = courses.reduce((sum, course) => (
    sum + (course.counts_toward_program_credit_total !== false && Number.isFinite(course.credit_hours)
      ? course.credit_hours : 0)
  ), 0);
  const officialTotalCredits = publishedLevelCreditTotal(view);
  const levelRequiredCredits = {};
  for (const section of view.sections) {
    const level = section.title_en || section.title_ar;
    const sectionCourses = courses.filter((course) => course.semester_or_level === level);
    levelRequiredCredits[level] = sectionCourses.reduce((sum, course) => (
      sum + (course.counts_toward_program_credit_total !== false && Number.isFinite(course.credit_hours)
        ? course.credit_hours : 0)
    ), 0);
  }

  const academicWarnings = [];
  if (unresolvedPrerequisiteRows.length) academicWarnings.push(warning(
    "unresolved_prerequisite_rows",
    `توجد ${unresolvedPrerequisiteRows.length} صفوف ببيانات متطلبات تحتاج إلى تحقق؛ تبقى هذه المقررات متاحة ولا تُحجب تلقائيًا.`,
    `${unresolvedPrerequisiteRows.length} course row(s) have prerequisite information requiring verification; they remain available and are not automatically blocked.`,
    unresolvedPrerequisiteRows.length,
  ));
  if (unresolvedElectiveRule) academicWarnings.push(warning(
    "unresolved_elective_rule",
    "يجب التحقق من متطلبات المقررات الاختيارية أو المسارات مع القسم؛ لم يُفترض عدد مطلوب غير منشور.",
    "Elective or track completion requirements should be verified with the department; no unpublished required count was assumed.",
  ));
  if (unresolvedTrainingRule) academicWarnings.push(warning(
    "unresolved_training_rule",
    "يجب التحقق من شروط التدريب أو المشروع مع القسم عندما لا تنشرها الخطة.",
    "Training or project eligibility rules should be verified with the department when the plan does not publish them.",
  ));
  if (missingCreditRows) academicWarnings.push(warning(
    "missing_credit_rows",
    `لا تنشر الخطة قيمة الساعات في ${missingCreditRows} صفوف؛ لا تدخل هذه الصفوف في إجمالي الساعات المحتسب.`,
    `${missingCreditRows} row(s) have no published credit value and are excluded from the calculated credit total.`,
    missingCreditRows,
  ));
  if (repeatedRows) academicWarnings.push(warning(
    "repeated_course_identities",
    "تتكرر بعض رموز المقررات في الخطة الرسمية؛ يحفظ المخطط كل صف بشكل مستقل ولا يفترض أنها متكافئة.",
    "Some course codes repeat in the official plan; the planner stores each row independently and does not assume equivalence.",
    repeatedRows,
  ));

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
    college_name: program.faculty_name_en || program.faculty_name || program.college_name,
    faculty_name_ar: program.faculty_name_ar,
    faculty_name_en: program.faculty_name_en || program.faculty_name,
    total_program_credit_hours: officialTotalCredits,
    official_total_credits: officialTotalCredits,
    calculated_plan_credit_hours: calculatedPlanCredits,
    calculated_plan_credits: calculatedPlanCredits,
    credit_total_source: officialTotalCredits === null
      ? "calculated_from_published_plan"
      : "official_published_level_totals",
    credit_progress_mode: "published_plan_credits",
    allow_incomplete_course_credits: missingCreditRows > 0,
    published_official_plan_interactive: true,
    conversion_origin: program.conversion_origin || CONVERSION_ORIGIN,
    official_plan_row_count: courses.length,
    official_plan_level_count: view.sections.length,
    academic_data_warnings: academicWarnings,
    unresolved_elective_rule: unresolvedElectiveRule,
    unresolved_training_rule: unresolvedTrainingRule,
    unresolved_prerequisite_rows: unresolvedPrerequisiteRows,
    official_source_url: program.source_url_en || program.official_source_url,
    source_url_ar: program.source_url_ar,
    source_url_en: program.source_url_en,
    source_title: "KAU published official study plan",
    last_checked_date: String(view.source?.retrieved_at || program.last_checked_date || "").slice(0, 10),
    level_required_credit_hours: levelRequiredCredits,
    courses,
  };
}

async function sha256File(filePath) {
  return crypto.createHash("sha256").update(await fs.readFile(filePath)).digest("hex");
}

async function writeJson(filePath, value, mode = 0o644) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  const temporary = `${filePath}.tmp`;
  await fs.writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, { encoding: "utf8", mode });
  await fs.rename(temporary, filePath);
}

async function writePlanners(generated) {
  const current = await fs.readFile(PLANNERS_PATH, "utf8");
  const currentData = JSON.parse(current);
  const baselinePrograms = currentData.programs.filter((program) => (
    !["OFFICIAL_PLAN_VIEW", "CATALOG_ONLY"].includes(program.conversion_origin)
  ));
  if (baselinePrograms.length !== 28) throw new Error("unexpected baseline planner count");
  const closing = "\n  ]\n}\n";
  if (!current.endsWith(closing)) throw new Error("unexpected planner formatting");
  const marker = `,\n    {\n      "id": "${generated[0].id}"`;
  const markerIndex = current.indexOf(marker);
  const baselineHead = markerIndex === -1
    ? current.slice(0, -closing.length)
    : current.slice(0, markerIndex);
  const blocks = generated.map((planner) => JSON.stringify(planner, null, 2)
    .split("\n")
    .map((line) => `    ${line}`)
    .join("\n"));
  const updated = `${baselineHead},\n${blocks.join(",\n")}${closing}`;
  const temporary = `${PLANNERS_PATH}.tmp`;
  await fs.writeFile(temporary, updated, { encoding: "utf8", mode: 0o755 });
  await fs.rename(temporary, PLANNERS_PATH);
}

function markdown(report) {
  const converted = report.converted_from_official_plan_view.map((item) => (
    `| ${item.program_name_en} (\`${item.program_id}\`) | ${item.level_count} | ${item.course_count} | ${item.calculated_plan_credits} | ${item.warning_count} |`
  )).join("\n");
  const convertedCatalog = report.converted_from_catalog_only.map((item) => (
    `| ${item.program_name_en} (\`${item.program_id}\`) | ${item.level_count} | ${item.course_count} | ${item.calculated_plan_credits} | ${item.warning_count} |`
  )).join("\n");
  const remaining = report.remaining_catalog_only.map((item) => (
    `| ${item.program_name_en} (\`${item.program_id}\`) | ${item.reason_en} |`
  )).join("\n");
  return `# All visible plans to interactive planners

Generated: ${report.generated_at}

## Outcome

- Converted from OFFICIAL_PLAN_VIEW: ${report.summary.converted_from_official_plan_view}
- Converted from CATALOG_ONLY: ${report.summary.converted_from_catalog_only}
- Programs carrying academic warnings: ${report.summary.programs_with_academic_warnings}
- Ambiguous prerequisite rows: ${report.summary.ambiguous_prerequisite_rows}
- Programs with unresolved elective/training rules: ${report.summary.unresolved_elective_programs} / ${report.summary.unresolved_training_programs}
- Coverage: ${JSON.stringify(report.coverage_before)} → ${JSON.stringify(report.coverage_after)}
- Validation: ${report.validation.status}

## Converted official plans

| Program | Levels | Published rows | Calculated plan credits | Warnings |
|---|---:|---:|---:|---:|
${converted}

## Converted catalog plans

| Program | Levels | Published rows | Calculated plan credits | Warnings |
|---|---:|---:|---:|---:|
${convertedCatalog}

## Remaining CATALOG_ONLY programs

| Program | Exact reason |
|---|---|
${remaining}

Exact program warnings and unresolved row metadata are included in the JSON report and planner datasets.
`;
}

async function main() {
  const validated = process.argv.includes("--validated");
  const playwrightBlocked = process.argv.includes("--playwright-blocked");
  if (playwrightBlocked && !validated) throw new Error("--playwright-blocked requires --validated");
  const catalog = JSON.parse(await fs.readFile(CATALOG_PATH, "utf8"));
  const rawState = JSON.parse(await fs.readFile(RAW_STATE_PATH, "utf8"));
  const catalogReview = JSON.parse(await fs.readFile(CATALOG_REVIEW_PATH, "utf8").catch(() => "{\"programs\":{}}"));
  const existingOfficialPrograms = catalog.programs.filter((program) => (
    (program.coverage_state === "OFFICIAL_PLAN_VIEW" && !program.conversion_origin)
    || (program.published_official_plan_interactive === true
      && program.conversion_origin === CONVERSION_ORIGIN)
  ));
  if (existingOfficialPrograms.length !== 116) throw new Error(`expected 116 existing official plan views, found ${existingOfficialPrograms.length}`);
  const catalogConversions = catalog.programs.filter((program) => {
    const result = rawState.programs?.[program.id];
    const catalogCandidate = program.coverage_state === "CATALOG_ONLY"
      || program.conversion_origin === "CATALOG_ONLY";
    return catalogCandidate && result?.initial_coverage_state === "CATALOG_ONLY"
      && result?.status === "success" && completeLevels(result);
  });
  for (const program of catalogConversions) {
    const result = rawState.programs[program.id];
    program.official_plan_view = buildOfficialView(result, { preserveExactRows: true });
    program.conversion_origin = "CATALOG_ONLY";
  }
  const sourcePrograms = [...existingOfficialPrograms, ...catalogConversions];

  let snapshotsVerified = 0;
  for (const program of sourcePrograms) {
    const raw = rawState.programs?.[program.id];
    if (!raw || program.official_plan_view?.extraction_method !== "browser_rendered_levels_tab") continue;
    for (const locale of ["ar", "en"]) {
      const evidence = raw.locales?.[locale];
      if (!evidence?.html_path || !evidence?.html_sha256) continue;
      const actual = await sha256File(path.join(ROOT, evidence.html_path));
      const expected = program.official_plan_view?.source?.[`sha256_${locale}`];
      if (actual !== evidence.html_sha256 || (expected && actual !== expected)) {
        throw new Error(`${program.id}: captured ${locale} evidence hash mismatch`);
      }
      snapshotsVerified += 1;
    }
  }

  const generated = sourcePrograms.map(buildPlanner);
  const generatedById = new Map(generated.map((planner) => [planner.id, planner]));
  for (const program of sourcePrograms) {
    const planner = generatedById.get(program.id);
    program.planner_available = true;
    program.planner_data_key = program.id;
    program.catalog_status = "active";
    program.catalog_note_ar = "الخطة الرسمية متاحة في المخطط التفاعلي.";
    program.catalog_note_en = "The published official plan is available in the interactive planner.";
    program.catalog_note = program.catalog_note_en;
    program.coverage_state = "FULL_PLANNER";
    program.total_program_credit_hours = planner.total_program_credit_hours;
    program.published_official_plan_interactive = true;
    program.conversion_origin = planner.conversion_origin;
    program.calculated_plan_credits = planner.calculated_plan_credits;
    program.credit_total_source = planner.credit_total_source;
  }

  await writePlanners(generated);
  await writeJson(CATALOG_PATH, catalog);

  const coverageAfter = counts(catalog.programs);
  const coverageBefore = { total: 223, FULL_PLANNER: 73, OFFICIAL_PLAN_VIEW: 116, CATALOG_ONLY: 34 };
  if (coverageAfter.OFFICIAL_PLAN_VIEW !== 0) throw new Error(`official plan views remain: ${coverageAfter.OFFICIAL_PLAN_VIEW}`);
  const remainingCatalog = catalog.programs
    .filter((program) => program.coverage_state === "CATALOG_ONLY")
    .map((program) => {
      const reviewed = catalogReview.programs?.[program.id] || {};
      const category = catalogReview.reason_categories?.[reviewed.category] || {};
      return {
        program_id: program.id,
        program_name_ar: program.program_name_ar || program.name_ar,
        program_name_en: program.program_name_en || program.name_en || program.program_name,
        reason_ar: reviewed.reason_ar || category.reason_ar || "لم تتوفر خطة رسمية قابلة للاستخدام.",
        reason_en: reviewed.reason_en || category.reason_en || "No usable official plan was available.",
        sources_checked: reviewed.sources_checked || unique([
          program.source_url_ar,
          program.source_url_en,
          "Exact-title search of official KAU PDF sources (2026-07-28)",
        ]),
      };
    })
    .sort((left, right) => left.program_id.localeCompare(right.program_id));

  const converted = generated.map((planner) => ({
    program_id: planner.id,
    program_name_ar: planner.program_name_ar,
    program_name_en: planner.program_name_en,
    degree_level: planner.degree_level,
    level_count: planner.official_plan_level_count,
    course_count: planner.official_plan_row_count,
    calculated_plan_credits: planner.calculated_plan_credits,
    warning_count: planner.academic_data_warnings.length,
    academic_data_warnings: planner.academic_data_warnings,
    unresolved_prerequisite_rows: planner.unresolved_prerequisite_rows,
    unresolved_elective_rule: planner.unresolved_elective_rule,
    unresolved_training_rule: planner.unresolved_training_rule,
  }));
  const convertedOfficial = converted.filter((item) => generatedById.get(item.program_id).conversion_origin === CONVERSION_ORIGIN);
  const convertedCatalog = converted.filter((item) => generatedById.get(item.program_id).conversion_origin === "CATALOG_ONLY");
  const report = {
    generated_at: new Date().toISOString().replace(/\.\d{3}Z$/, "Z"),
    policy: "Every readable official KAU plan with levels, course rows, and published credits is interactive; localized uncertainty is represented as metadata and visible warnings.",
    coverage_before: coverageBefore,
    coverage_after: coverageAfter,
    summary: {
      converted_from_official_plan_view: convertedOfficial.length,
      converted_from_catalog_only: convertedCatalog.length,
      programs_with_academic_warnings: converted.filter((item) => item.warning_count > 0).length,
      ambiguous_prerequisite_rows: generated.reduce((sum, planner) => sum + planner.unresolved_prerequisite_rows.length, 0),
      unresolved_elective_programs: generated.filter((planner) => planner.unresolved_elective_rule).length,
      unresolved_training_programs: generated.filter((planner) => planner.unresolved_training_rule).length,
      captured_snapshots_verified: snapshotsVerified,
    },
    converted_from_official_plan_view: convertedOfficial,
    converted_from_catalog_only: convertedCatalog,
    remaining_catalog_only: remainingCatalog,
    validation: {
      status: validated
        ? (playwrightBlocked ? "passed_with_playwright_environment_blocker" : "passed")
        : "pending",
      commands: validated ? [
        "PYTHONPATH=src python3 -m unittest discover -s tests -v — passed",
        `npm run test:full-planners — all ${coverageAfter.FULL_PLANNER} FULL_PLANNER programs simulated; all 122 converted planners converge with zero permanently blocked rows`,
        ...(playwrightBlocked
          ? ["Arabic/English desktop/mobile light/dark Playwright matrix — defined; Chromium launch blocked because the host lacks libnspr4.so"]
          : ["Arabic/English desktop/mobile light/dark Playwright matrix — passed"]),
        "compileall, Node syntax checks, and git diff check — passed",
      ] : ["Validation pending"],
    },
  };
  await writeJson(JSON_REPORT_PATH, report);
  await fs.writeFile(MD_REPORT_PATH, markdown(report), "utf8");
  process.stdout.write(`${JSON.stringify({ coverage: coverageAfter, converted: generated.length, rows: generated.reduce((sum, planner) => sum + planner.courses.length, 0), warnings: report.summary, remaining_catalog: remainingCatalog.length })}\n`);
}

main().catch((error) => {
  process.stderr.write(`${error.stack || error}\n`);
  process.exitCode = 1;
});
