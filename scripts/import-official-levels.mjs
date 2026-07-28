#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DEFAULT_STATE = path.join(ROOT, "data/raw/kau/official_levels_completion/state.json");
const DEFAULT_CATALOG = path.join(ROOT, "web/data/faculty_catalog.json");
const DEFAULT_JSON_REPORT = path.join(ROOT, "reports/plan_extraction/official_levels_completion.json");
const DEFAULT_MD_REPORT = path.join(ROOT, "reports/plan_extraction/official_levels_completion.md");
const TARGET_STATES = new Set(["OFFICIAL_PLAN_VIEW", "CATALOG_ONLY"]);

const WARNING_AR = "عرض فقط للمستويات الرسمية المنشورة من جامعة الملك عبدالعزيز. تم تعطيل إكمال المقررات وفتح المتطلبات واختيار المواد الاختيارية وحفظ التقدم.";
const WARNING_EN = "Read-only view of the official levels published by KAU. Course completion, prerequisite unlocking, elective selection, and progress saving are disabled.";

function clean(value) {
  return String(value ?? "").replace(/\u00a0/g, " ").replace(/[ \t]+/g, " ").replace(/\s*\n\s*/g, "\n").trim();
}

function normalizedCode(value) {
  return clean(value).normalize("NFKC").toUpperCase().replace(/[^\p{L}\p{N}]/gu, "");
}

function isPlaceholder(code, nameAr, nameEn) {
  const identity = `${normalizedCode(code)} ${clean(nameAr)} ${clean(nameEn)}`;
  return /(?:ELECT|ELEC|FREE|[67]XX|XXX|اختياري|اختيارية|حرة|حره)/iu.test(identity);
}

function canConsolidateExactDuplicate(row) {
  const code = normalizedCode(row.course_code);
  return /\d/u.test(code) && !/X/u.test(code) && !isPlaceholder(code, row.course_name, row.course_name);
}

function exactSignature(row) {
  return JSON.stringify([
    normalizedCode(row.course_code),
    clean(row.course_name).normalize("NFKC").toLocaleLowerCase(),
    row.credits,
    clean(row.prerequisite_text).normalize("NFKC").toLocaleLowerCase(),
  ]);
}

function alignedLocales(result) {
  const ar = result.locales?.ar;
  const en = result.locales?.en;
  if (ar?.status !== "success" || en?.status !== "success") return false;
  if (ar.levels.length !== en.levels.length) return false;
  return ar.levels.every((level, levelIndex) => {
    const counterpart = en.levels[levelIndex];
    return level.rows.length === counterpart.rows.length
      && level.rows.every((row, rowIndex) => (
        normalizedCode(row.course_code) === normalizedCode(counterpart.rows[rowIndex].course_code)
        && row.credits === counterpart.rows[rowIndex].credits
      ));
  });
}

function completeLevels(result) {
  const primary = result.locales?.ar?.status === "success"
    ? result.locales.ar
    : result.locales?.en?.status === "success"
      ? result.locales.en
      : null;
  if (!primary?.levels?.length) return false;
  return primary.levels.every((level) => (
    clean(level.official_level_name)
    && level.rows.length
    && level.rows.every((row) => clean(row.course_code) && clean(row.course_name))
  ));
}

function rowFlags(row, rowAr, rowEn) {
  const code = row.course_code;
  const nameAr = rowAr?.course_name || (row === rowAr ? row.course_name : "");
  const nameEn = rowEn?.course_name || (row === rowEn ? row.course_name : "");
  const names = `${clean(nameAr)} ${clean(nameEn)}`;
  const training = /(?:training|internship|تدريب|امتياز)/iu.test(names);
  const cooperativeTraining = /(?:cooperative\s+training|co-op|تدريب\s+تعاوني)/iu.test(names);
  return {
    placeholder: isPlaceholder(code, nameAr, nameEn),
    unresolved_requisite: false,
    training,
    project: /(?:project|thesis|dissertation|مشروع|رسالة|أطروحة)/iu.test(names),
    practicum: /(?:practicum|field\s+practice|تطبيق\s+ميداني)/iu.test(names),
    cooperative_training: cooperativeTraining,
    zero_credit: row.credits === 0,
    unplaced_requirement: false,
  };
}

function buildOfficialView(result, { preserveExactRows = false } = {}) {
  const ar = result.locales.ar;
  const en = result.locales.en;
  const primaryLocale = ar?.status === "success" ? "ar" : "en";
  const primary = result.locales[primaryLocale];
  const bilingualAligned = alignedLocales(result);
  const removed = [];
  const sections = [];
  let visibleOrder = 0;

  for (let levelIndex = 0; levelIndex < primary.levels.length; levelIndex += 1) {
    const primaryLevel = primary.levels[levelIndex];
    const arLevel = primaryLocale === "ar" ? primaryLevel : bilingualAligned ? ar.levels[levelIndex] : null;
    const enLevel = primaryLocale === "en" ? primaryLevel : bilingualAligned ? en.levels[levelIndex] : null;
    const seen = new Map();
    const rows = [];
    for (let rowIndex = 0; rowIndex < primaryLevel.rows.length; rowIndex += 1) {
      const row = primaryLevel.rows[rowIndex];
      const signature = exactSignature(row);
      if (!preserveExactRows && canConsolidateExactDuplicate(row) && seen.has(signature)) {
        removed.push({
          level_order: levelIndex + 1,
          level_name: primaryLevel.official_level_name,
          course_code: row.course_code,
          kept_source_order: seen.get(signature),
          removed_source_order: row.source_order,
        });
        continue;
      }
      seen.set(signature, row.source_order);
      visibleOrder += 1;
      const rowAr = primaryLocale === "ar" ? row : bilingualAligned ? arLevel.rows[rowIndex] : null;
      const rowEn = primaryLocale === "en" ? row : bilingualAligned ? enLevel.rows[rowIndex] : null;
      rows.push({
        raw_course_code: row.course_code,
        display_course_code: row.course_code,
        course_name_ar: rowAr?.course_name || null,
        course_name_en: rowEn?.course_name || null,
        credits: row.credits,
        original_source_section: primaryLevel.official_level_name,
        official_level_or_semester: primaryLevel.official_level_name,
        raw_prerequisite_corequisite_text: rowAr?.prerequisite_text || rowEn?.prerequisite_text || null,
        prerequisite_text_ar: rowAr?.prerequisite_text || null,
        prerequisite_text_en: rowEn?.prerequisite_text || null,
        source_order: row.source_order,
        visible_order: visibleOrder,
        flags: rowFlags(row, rowAr, rowEn),
      });
    }
    sections.push({
      id: `scheduled-level-${levelIndex + 1}`,
      title_ar: arLevel?.official_level_name || null,
      title_en: enLevel?.official_level_name || null,
      source_section: primaryLevel.official_level_name,
      source_level_order: levelIndex + 1,
      placement: "scheduled",
      rows,
    });
  }

  const rows = sections.flatMap((section) => section.rows);
  const missingCredits = rows.filter((row) => row.credits === null).length;
  const displayNotes = [
    "The read-only view contains only the browser-rendered KAU Levels tab; visible credits are not treated as an official degree total.",
  ];
  if (removed.length) displayNotes.push(`${removed.length} exact repeated coded course row(s) in the same official level were consolidated; placeholder slots were preserved.`);
  if (missingCredits) displayNotes.push(`${missingCredits} row(s) publish no integer credit value and are preserved as null.`);
  if (!bilingualAligned) displayNotes.push("The English Levels rows were unavailable or did not align safely; the interface falls back to the official available-language text.");

  return {
    schema_version: 2,
    extraction_method: "browser_rendered_levels_tab",
    source: {
      url_ar: ar?.requested_url || result.source_urls.ar,
      url_en: en?.requested_url || result.source_urls.en,
      final_url_ar: ar?.url || null,
      final_url_en: en?.url || null,
      retrieved_at: primary.retrieved_at,
      sha256_ar: ar?.html_sha256 || null,
      sha256_en: en?.html_sha256 || null,
    },
    warning_ar: WARNING_AR,
    warning_en: WARNING_EN,
    visible_course_count: rows.length,
    source_course_row_count: primary.levels.reduce((sum, level) => sum + level.rows.length, 0),
    visible_credit_sum: rows.reduce((sum, row) => sum + (row.credits ?? 0), 0),
    credits_complete: missingCredits === 0,
    missing_credit_count: missingCredits,
    bilingual_identity_match: bilingualAligned,
    unresolved_requisite_codes: [],
    display_notes: displayNotes,
    program_warning_en: missingCredits ? "Some credit values are not published in the official Levels table." : null,
    program_warning_ar: missingCredits ? "بعض قيم الساعات غير منشورة في جدول المستويات الرسمي." : null,
    normalization: {
      rule: preserveExactRows
        ? "Preserve every published official course row; represent repeated identities independently in the interactive planner."
        : "Consolidate only exact repeated coded course identities within the same official level; preserve every published placeholder occurrence.",
      removed_exact_duplicate_count: removed.length,
      removed_source_orders: removed.map((item) => item.removed_source_order),
      removed_duplicate_mappings: removed,
    },
    sections,
  };
}

function unresolvedReason(result) {
  const locales = Object.values(result.locales || {});
  if (locales.some((locale) => locale.status === "error")) return "Official page failed to load in one language and no complete browser-rendered Levels tables were available.";
  if (locales.some((locale) => locale.status === "page_not_found")) return "Official program route is unavailable in at least one language and no complete browser-rendered Levels tables were available.";
  if (result.levels_tab_found) return "Levels label was present, but no complete expandable level tables with course rows were rendered.";
  return "Official page exposes no browser-rendered Levels section with course rows.";
}

function counts(programs) {
  return Object.fromEntries(["FULL_PLANNER", "OFFICIAL_PLAN_VIEW", "CATALOG_ONLY"].map((state) => [
    state,
    programs.filter((program) => program.coverage_state === state).length,
  ]));
}

function markdownReport(report) {
  const completedRows = report.completed_programs.map((item) => (
    `| ${item.program_name_en} (\`${item.program_id}\`) | ${item.action} | ${item.level_count} | ${item.source_course_row_count} | ${item.visible_course_count} | ${item.visible_credit_sum} | ${item.missing_credit_count} |`
  ));
  const unresolvedRows = report.unresolved_programs.map((item) => (
    `| ${item.program_name_en} (\`${item.program_id}\`) | ${item.initial_coverage_state} | ${item.reason} |`
  ));
  return `# Official Levels completion

Generated: ${report.generated_at}

## Outcome

- Programs checked: ${report.summary.programs_checked}
- Browser-rendered Levels tabs completed: ${report.summary.levels_tabs_found}
- Existing OFFICIAL_PLAN_VIEW programs corrected: ${report.summary.programs_corrected}
- Programs promoted to OFFICIAL_PLAN_VIEW: ${report.summary.programs_promoted_to_official_plan_view}
- Programs promoted to FULL_PLANNER: ${report.summary.programs_promoted_to_full_planner}
- Unresolved programs: ${report.summary.unresolved_programs}
- Coverage: ${JSON.stringify(report.coverage_before)} → ${JSON.stringify(report.coverage_after)}
- Extracted/displayed rows: ${report.summary.source_course_rows} / ${report.summary.visible_course_rows}; displayed credits: ${report.summary.visible_credit_sum}

Chinese Language now shows 8 official levels and ${report.chinese_language.visible_course_count} courses (${report.chinese_language.source_course_row_count} published rows with ${report.chinese_language.exact_duplicates_removed} exact duplicate consolidated), totaling ${report.chinese_language.visible_credit_sum} visible credits.

All imported programs remain read-only: \`planner_available=false\`, \`planner_data_key=null\`, no planner controls, and no progress storage. No program met the standard for a new FULL_PLANNER promotion.

## Completed programs

| Program | Action | Levels | Source rows | Display rows | Credits | Missing credits |
|---|---:|---:|---:|---:|---:|---:|
${completedRows.join("\n")}

## Unresolved programs

| Program | Existing state | Reason |
|---|---|---|
${unresolvedRows.join("\n")}
`;
}

async function writeJson(filePath, value) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  const temporary = `${filePath}.tmp`;
  await fs.writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  await fs.rename(temporary, filePath);
}

async function main() {
  if (process.argv.includes("--help")) {
    process.stdout.write("Usage: node scripts/import-official-levels.mjs [--dry-run]\n");
    return;
  }
  const unknown = process.argv.slice(2).filter((argument) => argument !== "--dry-run");
  if (unknown.length) throw new Error(`unknown argument: ${unknown[0]}`);
  const dryRun = process.argv.includes("--dry-run");
  const state = JSON.parse(await fs.readFile(DEFAULT_STATE, "utf8"));
  const catalog = JSON.parse(await fs.readFile(DEFAULT_CATALOG, "utf8"));
  const before = counts(catalog.programs);
  const byId = new Map(catalog.programs.map((program) => [program.id, program]));
  const targetResults = Object.values(state.programs)
    .filter((result) => TARGET_STATES.has(result.initial_coverage_state))
    .sort((left, right) => left.program_id.localeCompare(right.program_id));
  const completed = [];
  const unresolved = [];

  for (const result of targetResults) {
    const program = byId.get(result.program_id);
    if (!program) throw new Error(`catalog program missing: ${result.program_id}`);
    if (result.status !== "success" || !completeLevels(result)) {
      unresolved.push({
        program_id: result.program_id,
        program_name_en: result.program_name_en,
        initial_coverage_state: result.initial_coverage_state,
        existing_official_view_preserved: result.initial_coverage_state === "OFFICIAL_PLAN_VIEW",
        reason: unresolvedReason(result),
        locale_status: Object.fromEntries(Object.entries(result.locales || {}).map(([locale, value]) => [locale, value.status])),
      });
      continue;
    }
    const view = buildOfficialView(result);
    const action = result.initial_coverage_state === "CATALOG_ONLY" ? "promoted" : "corrected";
    program.coverage_state = "OFFICIAL_PLAN_VIEW";
    program.planner_available = false;
    program.planner_data_key = null;
    program.catalog_status = "catalog-only";
    program.catalog_note_ar = "الخطة الرسمية متاحة للعرض فقط.";
    program.catalog_note_en = "Official study plan available in read-only mode.";
    program.catalog_note = program.catalog_note_en;
    program.official_plan_view = view;
    completed.push({
      program_id: result.program_id,
      program_name_ar: result.program_name_ar,
      program_name_en: result.program_name_en,
      degree_level: result.degree_level,
      action,
      level_count: view.sections.length,
      source_course_row_count: view.source_course_row_count,
      visible_course_count: view.visible_course_count,
      visible_credit_sum: view.visible_credit_sum,
      missing_credit_count: view.missing_credit_count,
      exact_duplicates_removed: view.normalization.removed_exact_duplicate_count,
      bilingual_identity_match: view.bilingual_identity_match,
      source: view.source,
    });
  }

  const after = counts(catalog.programs);
  const chinese = completed.find((item) => item.program_id === "catalog-chinese-language");
  if (!chinese || chinese.level_count !== 8) throw new Error("Chinese Language must import exactly eight official levels");
  const report = {
    generated_at: new Date().toISOString().replace(/\.\d{3}Z$/, "Z"),
    extractor: state.extractor,
    source_policy: "Official KAU browser-rendered Levels tabs; Arabic preferred and English merged only after code/credit identity alignment.",
    coverage_before: before,
    coverage_after: after,
    summary: {
      programs_checked: targetResults.length,
      levels_tabs_found: completed.length,
      programs_corrected: completed.filter((item) => item.action === "corrected").length,
      programs_promoted_to_official_plan_view: completed.filter((item) => item.action === "promoted").length,
      programs_promoted_to_full_planner: 0,
      unresolved_programs: unresolved.length,
      official_levels: completed.reduce((sum, item) => sum + item.level_count, 0),
      source_course_rows: completed.reduce((sum, item) => sum + item.source_course_row_count, 0),
      visible_course_rows: completed.reduce((sum, item) => sum + item.visible_course_count, 0),
      visible_credit_sum: completed.reduce((sum, item) => sum + item.visible_credit_sum, 0),
      missing_credit_rows: completed.reduce((sum, item) => sum + item.missing_credit_count, 0),
      exact_duplicate_rows_removed: completed.reduce((sum, item) => sum + item.exact_duplicates_removed, 0),
    },
    chinese_language: chinese,
    completed_programs: completed,
    unresolved_programs: unresolved,
    programs_promoted_to_full_planner: [],
  };

  if (!dryRun) {
    await writeJson(DEFAULT_CATALOG, catalog);
    await writeJson(DEFAULT_JSON_REPORT, report);
    await fs.writeFile(DEFAULT_MD_REPORT, markdownReport(report), "utf8");
  }
  process.stdout.write(`${JSON.stringify({ dry_run: dryRun, summary: report.summary, coverage_after: after, chinese })}\n`);
}

const invokedPath = process.argv[1] ? path.resolve(process.argv[1]) : null;
if (invokedPath === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    process.stderr.write(`${error.stack || error}\n`);
    process.exitCode = 1;
  });
}

export { buildOfficialView, completeLevels, unresolvedReason };
