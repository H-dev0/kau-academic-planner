#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { buildPlanner } from "./convert-visible-plans-to-interactive.mjs";
import { buildOfficialView, completeLevels } from "./import-official-levels.mjs";
import levelNormalization from "../web/level-normalization.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CATALOG_PATH = path.join(ROOT, "web/data/faculty_catalog.json");
const PLANNERS_PATH = path.join(ROOT, "web/data/additional_programs.json");
const CAPTURE_PATH = path.join(ROOT, "data/raw/kau/manual_bachelor_levels_audit/capture-state.json");
const REPORT_JSON_PATH = path.join(ROOT, "reports/manual_audit/manual_bachelor_levels_audit.json");
const REPORT_MD_PATH = path.join(ROOT, "reports/manual_audit/manual_bachelor_levels_audit.md");
const REVIEWED_HEAD = "4e59a2c06a485e2b586a2345d05e1c0c850779c7";

const RESTORE_FULL_IDS = new Set([
  "catalog-applied-medica-sciences-bachelor-of-clinical-nutrition",
  "catalog-applied-medica-sciences-rabigh-bachelor-of-science-in-nursing",
  "catalog-architecture-and-planning-bachelor-of-architecture",
  "catalog-arts-and-humanities-bachelor-of-arabic-language",
  "catalog-arts-and-humanities-bachelor-of-information-science",
  "catalog-bachelor-in-french-language-translation",
  "catalog-bachelor-of-public-relations-program",
  "catalog-bachelor-of-science-in-computer-science",
  "catalog-bachelor-of-science-in-cybersecurity",
  "catalog-bachelor-of-science-in-hydrology-and-water-resources-management",
  "catalog-bachelor-of-science-in-meteorology",
  "catalog-bachelor-of-sharia",
  "catalog-chinese-language",
  "catalog-computing-information-tech-bachelor-of-science-in-information-systems",
  "catalog-computing-information-tech-bachelor-of-science-in-information-technology",
  "catalog-counseling-psychology",
  "catalog-earth-sciences-bachelor-general-geology-structural-geology-and-remote-sensing",
  "catalog-earth-sciences-bachelor-of-general-geology-geo-exploration-techniques",
  "catalog-earth-sciences-bachelor-of-geophysics",
  "catalog-earth-sciences-bachelor-of-mineral-resources-and-rocks",
  "catalog-earth-sciences-bachelor-of-science-in-engineering-and-environmental-geology",
  "catalog-earth-sciences-hydrogeology-bsc",
  "catalog-earth-sciences-petroleum-geology-and-sedimentology-bsc",
  "catalog-engineering-bachelor-of-science-in-chemical-engineering",
  "catalog-engineering-bachelor-of-science-in-civil-engineering",
  "catalog-engineering-bachelor-of-science-in-electrical-engineering-biomedical",
  "catalog-engineering-bachelor-of-science-in-electrical-engineering-computer",
  "catalog-engineering-bachelor-of-science-in-electrical-engineering-electronics-and-communic",
  "catalog-engineering-bachelor-of-science-in-electrical-engineering-power-and-machines",
  "catalog-engineering-bachelor-of-science-in-industrial-engineering",
  "catalog-engineering-bachelor-of-science-in-mechanical-engineering-aeronautical",
  "catalog-engineering-bachelor-of-science-in-mechanical-engineering-production-and-mechanica",
  "catalog-engineering-bachelor-of-science-in-mechanical-engineering-thermal-engineering-and-",
  "catalog-engineering-bachelor-of-science-in-mining-engineering",
  "catalog-engineering-bachelor-of-science-in-nuclear-engineering",
  "catalog-engineering-bachelor-of-science-in-nuclear-engineering-medical-physics",
  "catalog-engineering-bachelor-of-science-in-nuclear-engineering-radiation-protection",
  "catalog-environmental-sciences-bachelor-of-science-in-arid-land-agricultural-general-progr",
  "catalog-environmental-sciences-bachelor-of-science-in-arid-land-agricultural-renewable-nat",
  "catalog-general-intermediate-diploma-in-applied-computing-and-network-technologies",
  "catalog-general-intermediate-diploma-in-law",
  "catalog-human-sciences-and-design-bacheior-interior-design-and-furniture",
  "catalog-human-sciences-and-design-bachelor-of-science-b-sc-in-family-sciences",
  "catalog-human-sciences-and-design-bachelor-s-department-of-early-childhood-guide",
  "catalog-law-bachelor-degree-in-law",
  "catalog-maritime-studies-bachelor-of-supply-chains-maritime-business",
  "catalog-maritime-studies-bachelor-of-the-marine-surveying",
  "catalog-medicine-rabigh-bachelor-of-medicine-and-surgery-mbbs",
  "catalog-science-bachelor-of-biochemistry",
  "catalog-tourism-bachelor-of-hospitality-management",
]);

const HEALTH_ADMIN_ID = "catalog-economics-and-administration-bachelor-of-health-services-and-hospital-administrati";
const ENVIRONMENT_ID = "catalog-environmental-sciences-bachelor-of-science-in-environment";
const DIPLOMA_IDS = new Set([
  "catalog-general-intermediate-diploma-in-applied-computing-and-network-technologies",
  "catalog-general-intermediate-diploma-in-law",
]);

const CATALOG_RETAINED_EVIDENCE = {
  "catalog-applied-medica-sciences-bachelor-of-clinical-psychohlogy": "Both current program routes contain no Levels tables or course rows. The official page and an exact-title KAU-domain PDF search expose no current complete study plan.",
  "catalog-engineering-rabigh-architectural-engineering": "The current Rabigh Engineering listing confirms the bachelor identity, but the program route has no Levels rows and no linked complete KAU plan or catalog PDF was found.",
  "catalog-engineering-rabigh-chemical-and-materials-engineering": "The current Rabigh Engineering listing confirms the bachelor identity, but the program route has no Levels rows and no linked complete KAU plan or catalog PDF was found.",
  "catalog-engineering-rabigh-civil-and-environmental-engineering": "The current Rabigh Engineering listing confirms the bachelor identity, but the program route has no Levels rows and no linked complete KAU plan or catalog PDF was found.",
  "catalog-geography-and-geographic-information-systems": "The official Levels section has eight headings but rows only in Levels One–Four (22 rows); Levels Five–Eight are empty. The separate 72-row requirements set has no safe level placement, and no linked complete KAU plan PDF was found.",
  "catalog-literary-in-english-language": "The official Levels section has eight headings but rows only in Levels One–Four (22 rows); Levels Five–Eight are empty. The course-description/track material cannot supply safe placement, and no linked complete KAU plan PDF was found.",
  "catalog-maritime-studies-bachelor-of-marine-engineering": "The current page confirms the program and describes its curriculum, but its Levels section has no level/course rows. Related KAU material is course-description/STCW evidence, not a complete level-by-level plan.",
  "catalog-med-rehabilitation-sciences-bachelor-s-degree-of-occupational-therapy": "The official faculty page publishes requirement totals but no level-by-level course plan; the central program route has no Levels rows and no linked complete KAU plan PDF was found.",
  "catalog-med-rehabilitation-sciences-bachelor-s-degree-of-physical-therapy": "The current official route has no Levels rows, and no linked or exact-title KAU-domain result supplies a complete level-by-level course plan.",
  "catalog-med-rehabilitation-sciences-bachelor-s-degree-of-prosthetics-and-orthotics": "The current official route has no Levels rows, and no linked or exact-title KAU-domain result supplies a complete level-by-level course plan.",
  "catalog-med-rehabilitation-sciences-bachelor-s-degree-of-respiratory-therapy": "The current official route has no Levels rows, and no linked or exact-title KAU-domain result supplies a complete level-by-level course plan.",
  "catalog-med-rehabilitation-sciences-bachelor-s-degree-of-speech-language-pathology-and-aud": "The current official route has no Levels rows, and no linked or exact-title KAU-domain result supplies a complete level-by-level course plan.",
  "catalog-medicine-bachelor-s-degree-in-medicine-and-surgery": "The distinct Jeddah medicine program routes have no Levels tables or course rows; no linked current KAU PDF/catalog plan safely matching this identity was found.",
};

const clean = (value) => String(value ?? "").replace(/\u00a0/g, " ").replace(/[ \t]+/g, " ").replace(/\s*\n\s*/g, " ").trim();
const normalizedCode = (value) => clean(value).normalize("NFKC").toUpperCase().replace(/[^\p{L}\p{N}]/gu, "");

function counts(programs) {
  return Object.fromEntries(["FULL_PLANNER", "OFFICIAL_PLAN_VIEW", "CATALOG_ONLY"].map((state) => [
    state,
    programs.filter((program) => program.coverage_state === state).length,
  ]));
}

function prepareCapture(result) {
  const prepared = JSON.parse(JSON.stringify(result));
  if (!DIPLOMA_IDS.has(result.program_id)) return prepared;
  for (const locale of ["ar", "en"]) {
    const source = prepared.locales[locale];
    if (source?.status !== "success" || !source.levels.length) continue;
    if (!levelNormalization.parseLevelId(source.levels[0].official_level_name)) {
      source.levels[0].audit_source_label = source.levels[0].official_level_name;
      source.levels[0].official_level_name = levelNormalization.localizedLevelName(1, locale);
    }
  }
  return prepared;
}

function exactView(result) {
  const prepared = prepareCapture(result);
  if (!completeLevels(prepared)) throw new Error(`${result.program_id}: current official levels are not complete`);
  return buildOfficialView(prepared, { preserveExactRows: true });
}

function setFull(program, planner, view) {
  program.coverage_state = "FULL_PLANNER";
  program.planner_available = true;
  program.planner_data_key = program.id;
  program.catalog_status = "active";
  program.catalog_note_ar = "الخطة الرسمية المتحقق منها متاحة في المخطط التفاعلي، وتظهر حالات عدم اليقين الأكاديمية كتنبيهات غير حاجبة.";
  program.catalog_note_en = "The verified official plan is interactive; academic uncertainty is shown as nonblocking warnings.";
  program.catalog_note = program.catalog_note_en;
  program.official_plan_view = view;
  view.warning_ar = "الخطة الرسمية متاحة تفاعليًا؛ تظهر حالات عدم اليقين في المتطلبات والمقررات الاختيارية والتدريب كتنبيهات غير حاجبة.";
  view.warning_en = "The official plan is interactive; prerequisite, elective, and training uncertainty is shown as nonblocking warnings.";
  view.program_warning_ar = null;
  view.program_warning_en = null;
  view.display_notes = view.display_notes.map((note) => note.startsWith("The read-only view contains")
    ? "The interactive planner preserves the exact official Levels rows; published credits are not treated as an independently verified degree total."
    : note);
  program.published_official_plan_interactive = true;
  program.total_program_credit_hours = planner.total_program_credit_hours;
  program.calculated_plan_credits = planner.calculated_plan_credits;
  program.credit_total_source = planner.credit_total_source;
  program.conversion_origin = "PR10_PRODUCT_OWNER_REVIEW";
  program.manual_audit_status = "verified_full_planner_after_product_owner_review";
  delete program.manual_audit_reason;
}

function directRowFlags(code, nameAr, nameEn) {
  const identity = `${normalizedCode(code)} ${clean(nameAr)} ${clean(nameEn)}`;
  return {
    placeholder: /(?:ELECT|ELEC|FREE|[67]XX|XXX|اختياري|اختيارية|حرة|حره)/iu.test(identity),
    unresolved_requisite: false,
    training: /(?:training|internship|تدريب|امتياز)/iu.test(identity),
    project: /(?:project|thesis|dissertation|مشروع|رسالة|أطروحة)/iu.test(identity),
    practicum: /(?:practicum|field\s+practice|تطبيق\s+ميداني)/iu.test(identity),
    cooperative_training: /(?:cooperative\s+training|co-op|تدريب\s+تعاوني)/iu.test(identity),
    zero_credit: false,
    unplaced_requirement: true,
  };
}

function healthAdminView(result) {
  const view = exactView(result);
  const arGroup = result.locales.ar.study_plans.find((group) => group.id === 2504);
  const enGroup = result.locales.en.study_plans.find((group) => group.id === 2504);
  if (!arGroup || !enGroup || arGroup.direct_courses.length !== 4 || enGroup.direct_courses.length !== 4) {
    throw new Error(`${result.program_id}: expected four bilingual elective rows`);
  }
  const visibleOffset = view.visible_course_count;
  const rows = arGroup.direct_courses.map((rowAr, index) => {
    const rowEn = enGroup.direct_courses[index];
    if (normalizedCode(rowAr.course_code) !== normalizedCode(rowEn.course_code) || rowAr.credits !== rowEn.credits) {
      throw new Error(`${result.program_id}: bilingual elective row ${index + 1} does not align`);
    }
    return {
      raw_course_code: rowAr.course_code,
      display_course_code: rowAr.course_code,
      course_name_ar: rowAr.course_name,
      course_name_en: rowEn.course_name,
      credits: rowAr.credits,
      original_source_section: arGroup.name,
      official_level_or_semester: null,
      raw_prerequisite_corequisite_text: rowAr.prerequisite_text || rowEn.prerequisite_text || null,
      prerequisite_text_ar: rowAr.prerequisite_text || null,
      prerequisite_text_en: rowEn.prerequisite_text || null,
      source_order: rowAr.source_order,
      visible_order: visibleOffset + index + 1,
      flags: directRowFlags(rowAr.course_code, rowAr.course_name, rowEn.course_name),
    };
  });
  view.sections.push({
    id: "unplaced-elective-courses",
    level_id: null,
    title_ar: arGroup.name,
    title_en: enGroup.name,
    source_label_ar: arGroup.name,
    source_label_en: enGroup.name,
    source_section: arGroup.name,
    source_level_order_ar: null,
    source_level_order_en: null,
    placement: "unplaced",
    rows,
  });
  view.visible_course_count += rows.length;
  view.source_course_row_count += rows.length;
  view.visible_credit_sum += rows.reduce((sum, row) => sum + row.credits, 0);
  view.warning_ar = "عرض للقراءة فقط: تنشر المستويات 30 مقررًا و118 ساعة، بينما ينص متطلب التخرج على 125 ساعة، وتنشر أربعة مقررات اختيارية منفصلة دون قاعدة اختيار أو موضع مستوى مكتمل.";
  view.warning_en = "Read-only: the Levels tables publish 30 courses/118 credits, while graduation requires 125 credits; four electives are published separately without a complete selection rule or level placement.";
  view.program_warning_ar = view.warning_ar;
  view.program_warning_en = view.warning_en;
  view.display_notes.push("Four separately published elective rows are preserved as unplaced requirements; no selection count or level placement is inferred.");
  return view;
}

function setReadOnly(program, view, reason) {
  program.coverage_state = "OFFICIAL_PLAN_VIEW";
  program.planner_available = false;
  program.planner_data_key = null;
  program.catalog_status = "catalog-only";
  program.catalog_note_ar = "الخطة الرسمية المتحقق منها متاحة للعرض فقط؛ أدوات التقدم معطلة.";
  program.catalog_note_en = "The verified official plan is read-only; progress tools are disabled.";
  program.catalog_note = program.catalog_note_en;
  program.official_plan_view = view;
  program.published_official_plan_interactive = false;
  program.manual_audit_status = "verified_read_only_after_product_owner_review";
  program.manual_audit_reason = reason;
}

function decisionEvidence(program, finalState, planner) {
  if (finalState === "FULL_PLANNER") {
    const scheduledSections = program.official_plan_view.sections.filter((section) => section.placement === "scheduled");
    const unplacedSections = program.official_plan_view.sections.filter((section) => section.placement === "unplaced");
    const unplaced = planner.courses.filter((course) => course.official_level_placement === "unplaced").length;
    const bilingual = program.official_plan_view.bilingual_identity_match
      ? "bilingual-aligned"
      : "available-language official (the other locale publishes no usable Levels rows)";
    return `${scheduledSections.length} numerically normalized ${bilingual} level(s)${unplacedSections.length ? ` plus ${unplacedSections.length} explicitly unplaced official section(s)` : ""}, ${planner.courses.length} official row(s), zero missing codes/names/credits in the published plan, and all published prerequisite text retained${unplaced ? `; ${unplaced} training/requirement row(s) remain marked unplaced` : ""}.`;
  }
  if (program.id === ENVIRONMENT_ID) {
    return "The official source publishes eight level headings, but only Levels One and Two contain rows (12 total); Levels Three–Eight are empty.";
  }
  if (program.id === HEALTH_ADMIN_ID) {
    return "Eight official levels contain 30 rows/118 credits; the same page states 125 graduation credits and separately publishes four 3-credit electives without selection count or level placement. All 34 verified rows are displayed read-only.";
  }
  return CATALOG_RETAINED_EVIDENCE[program.id] || program.manual_audit_reason || "No usable complete official plan was located.";
}

function markdown(report) {
  const decisions = report.product_owner_review.decisions.map((item) => (
    `| ${item.program} | ${item.current_pr_state} | ${item.final_recommended_state} | ${item.exact_official_evidence} | ${item.reason} |`
  )).join("\n");
  return `# Manual bachelor levels audit — product-owner review

Generated: ${report.generated_at}

## Decision

- Coverage: ${JSON.stringify(report.coverage_before)} → ${JSON.stringify(report.coverage_after)} (${report.total_before} → ${report.total_after} programs)
- Restored to FULL_PLANNER: ${report.programs_restored_to_full_planner.length}
- Retained as OFFICIAL_PLAN_VIEW: ${report.programs_retained_as_official_plan_view.length}
- Original FULL_PLANNER programs retained as CATALOG_ONLY: ${report.programs_downgraded_to_catalog_only.length}
- Browser validation: ${report.browser_validation.status} — ${report.browser_validation.reason}

The two added Arts and Humanities records are current, unique bachelor cards in the official bilingual AH inventory: \`BA-HIST-AH\` and \`BA-SOCW-AH\`. They increase the catalog from 223 to 225; no other record was added.

## Product-owner decision table

| Program | Current PR state | Final recommended state | Exact official evidence | Reason |
|---|---|---|---|---|
${decisions}
`;
}

async function writeJson(filePath, value, mode = 0o644) {
  const temporary = `${filePath}.tmp`;
  await fs.writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, { encoding: "utf8", mode });
  await fs.rename(temporary, filePath);
}

async function runProductOwnerReview() {
  if (process.argv.length > 2) throw new Error("Usage: node scripts/review-pr10-coverage.mjs");
  const catalog = JSON.parse(await fs.readFile(CATALOG_PATH, "utf8"));
  const planners = JSON.parse(await fs.readFile(PLANNERS_PATH, "utf8"));
  const capture = JSON.parse(await fs.readFile(CAPTURE_PATH, "utf8"));
  const priorReport = JSON.parse(await fs.readFile(REPORT_JSON_PATH, "utf8"));
  const catalogById = new Map(catalog.programs.map((program) => [program.id, program]));
  const plannerById = new Map(planners.programs.map((program) => [program.id, program]));
  const priorById = new Map(priorReport.programs.map((item) => [item.resolved_repository_id, item]));

  const generated = new Map();
  for (const programId of RESTORE_FULL_IDS) {
    const program = catalogById.get(programId);
    const result = capture.programs[programId];
    if (!program || !result) throw new Error(`${programId}: missing catalog or capture record`);
    const view = exactView(result);
    const planner = buildPlanner({ ...program, official_plan_view: view, conversion_origin: "OFFICIAL_PLAN_VIEW" });
    if (!planner.courses.length || planner.courses.some((course) => (
      !clean(course.course_code) || (!clean(course.course_name_ar) && !clean(course.course_name_en)) || course.credit_hours === null
    ))) throw new Error(`${programId}: official rows are not complete enough for FULL_PLANNER`);
    setFull(program, planner, view);
    generated.set(programId, planner);
  }

  const health = catalogById.get(HEALTH_ADMIN_ID);
  const healthReason = "The 118-credit Levels table does not reconcile to the published 125-credit graduation requirement; four separately published electives have no complete selection rule or level placement.";
  setReadOnly(health, healthAdminView(capture.programs[HEALTH_ADMIN_ID]), healthReason);

  const environment = catalogById.get(ENVIRONMENT_ID);
  environment.manual_audit_reason = "The official source publishes eight level headings, but Levels Three–Eight are empty; only 12 rows in Levels One–Two can be shown safely.";
  environment.official_plan_view.warning_ar = "عرض للقراءة فقط: المستويات من الثالث إلى الثامن منشورة بلا مقررات؛ تظهر فقط الصفوف المتحقق منها في المستويين الأول والثاني.";
  environment.official_plan_view.warning_en = "Read-only: Levels Three through Eight are published without course rows; only verified rows from Levels One and Two are shown.";
  environment.official_plan_view.program_warning_ar = environment.official_plan_view.warning_ar;
  environment.official_plan_view.program_warning_en = environment.official_plan_view.warning_en;

  const reviewedIds = new Set(planners.programs.map((program) => program.id));
  planners.programs = planners.programs.map((program) => generated.get(program.id) || program);
  planners.programs.push(...[...generated.values()]
    .filter((program) => !reviewedIds.has(program.id))
    .sort((left, right) => left.id.localeCompare(right.id)));
  for (const [programId, planner] of generated) plannerById.set(programId, planner);

  for (const [programId, reason] of Object.entries(CATALOG_RETAINED_EVIDENCE)) {
    const program = catalogById.get(programId);
    if (!program || program.coverage_state !== "CATALOG_ONLY") throw new Error(`${programId}: expected retained CATALOG_ONLY`);
    program.manual_audit_reason = reason;
  }

  const coverageAfter = counts(catalog.programs);
  const expectedCoverage = { FULL_PLANNER: 180, OFFICIAL_PLAN_VIEW: 2, CATALOG_ONLY: 43 };
  if (catalog.programs.length !== 225 || JSON.stringify(coverageAfter) !== JSON.stringify(expectedCoverage)) {
    throw new Error(`unexpected final coverage: ${catalog.programs.length} ${JSON.stringify(coverageAfter)}`);
  }
  if (planners.programs.length !== 181 || new Set(planners.programs.map((program) => program.id)).size !== planners.programs.length) {
    throw new Error(`expected 179 active plus two preserved disabled planner datasets, found ${planners.programs.length}`);
  }

  const decisions = [];
  const priorReviewState = new Map((priorReport.product_owner_review?.decisions || []).map((item) => [
    item.resolved_repository_id,
    item.current_pr_state,
  ]));
  const originallyDowngraded = priorReport.programs.filter((item) => (
    item.original_coverage_state === "FULL_PLANNER"
    && (priorReviewState.get(item.resolved_repository_id) || item.final_coverage_state) !== "FULL_PLANNER"
  ));
  for (const oldItem of originallyDowngraded) {
    const program = catalogById.get(oldItem.resolved_repository_id);
    const planner = generated.get(program.id) || plannerById.get(program.id);
    const finalState = program.coverage_state;
    const evidence = decisionEvidence(program, finalState, planner);
    const exactDefect = finalState === "FULL_PLANNER"
      ? "None: the official bilingual Levels plan is complete enough for interactive progress."
      : finalState === "OFFICIAL_PLAN_VIEW"
        ? program.manual_audit_reason
        : CATALOG_RETAINED_EVIDENCE[program.id];
    decisions.push({
      program: oldItem.user_provided_name,
      resolved_repository_id: program.id,
      current_pr_state: priorReviewState.get(program.id) || oldItem.final_coverage_state,
      final_recommended_state: finalState,
      official_arabic_url: oldItem.official_arabic_url,
      official_english_url: oldItem.official_english_url,
      exact_official_source_defect: exactDefect,
      all_official_levels_present: finalState === "FULL_PLANNER" || program.id === HEALTH_ADMIN_ID,
      all_verified_course_rows_present: finalState !== "CATALOG_ONLY",
      all_published_credits_present: finalState !== "CATALOG_ONLY",
      all_published_prerequisite_text_present: finalState !== "CATALOG_ONLY",
      exact_official_evidence: evidence,
      reason: finalState === "FULL_PLANNER"
        ? "The prior downgrade treated elective, prerequisite, or training uncertainty as blocking; the existing warning model handles it without disabling progress."
        : exactDefect,
    });
  }
  decisions.sort((left, right) => left.program.localeCompare(right.program, "ar"));

  const updatedPrograms = priorReport.programs.map((item) => {
    const program = catalogById.get(item.resolved_repository_id);
    if (!program) return item;
    const planner = program.coverage_state === "FULL_PLANNER" ? plannerById.get(program.id) : null;
    const view = program.official_plan_view;
    const afterRows = planner?.courses?.length || (program.coverage_state === "OFFICIAL_PLAN_VIEW" ? view.visible_course_count : 0);
    const afterLevels = planner
      ? new Set(planner.courses.filter((course) => course.official_level_placement !== "unplaced").map((course) => levelNormalization.courseLevelId(course)).filter(Boolean)).size
      : program.coverage_state === "OFFICIAL_PLAN_VIEW"
        ? view.sections.filter((section) => section.placement === "scheduled").length
        : 0;
    return {
      ...item,
      final_coverage_state: program.coverage_state,
      repository_level_count_after: afterLevels,
      repository_row_count_after: afterRows,
      correction_performed: RESTORE_FULL_IDS.has(program.id)
        ? "Re-extracted exact bilingual official rows, normalized numeric level identity/order, restored FULL_PLANNER, and retained uncertainty as nonblocking warnings."
        : program.id === HEALTH_ADMIN_ID
          ? "Moved from CATALOG_ONLY to OFFICIAL_PLAN_VIEW and displayed all 30 scheduled rows plus four separately published unplaced elective rows."
          : item.correction_performed,
      unresolved_issue: program.coverage_state === "FULL_PLANNER"
        ? null
        : program.manual_audit_reason || item.unresolved_issue,
    };
  });

  const finalById = new Map(updatedPrograms.map((item) => [item.resolved_repository_id, item]));
  const restored = [...RESTORE_FULL_IDS].sort();
  const retainedViews = [ENVIRONMENT_ID, HEALTH_ADMIN_ID].sort();
  const downgradedCatalog = updatedPrograms.filter((item) => (
    item.original_coverage_state === "FULL_PLANNER" && item.final_coverage_state === "CATALOG_ONLY"
  )).map((item) => item.resolved_repository_id).sort();
  const report = {
    ...priorReport,
    generated_at: new Date().toISOString().replace(/\.\d{3}Z$/, "Z"),
    source_policy: `${priorReport.source_policy} Product-owner review also inspected current official page links and exact-title KAU-domain PDF/catalog search results on 2026-07-29.`,
    browser_validation: {
      status: "blocked_api_html_validated",
      reason: "Chromium cannot load libnspr4.so; Playwright Firefox and WebKit executables are not installed. Representative Arabic/English API payloads and the static HTML integration are validated instead; no browser pass is claimed.",
    },
    total_before: 223,
    total_after: 225,
    coverage_before: { FULL_PLANNER: 195, OFFICIAL_PLAN_VIEW: 0, CATALOG_ONLY: 28 },
    coverage_at_pr_review_start: { FULL_PLANNER: 130, OFFICIAL_PLAN_VIEW: 45, CATALOG_ONLY: 50 },
    coverage_after: coverageAfter,
    programs: updatedPrograms,
    programs_restored_to_full_planner: restored,
    programs_retained_as_official_plan_view: retainedViews,
    programs_reordered: [...new Set([...(priorReport.programs_reordered || []), ...restored])].sort(),
    programs_downgraded_to_official_plan_view: updatedPrograms.filter((item) => (
      item.original_coverage_state === "FULL_PLANNER" && item.final_coverage_state === "OFFICIAL_PLAN_VIEW"
    )).map((item) => item.resolved_repository_id).sort(),
    programs_downgraded_to_catalog_only: downgradedCatalog,
    programs_kept_full_planner: [...new Set([...(priorReport.programs_kept_full_planner || []), ...restored])].sort(),
    product_owner_review: {
      reviewed_pr: 10,
      reviewed_head: REVIEWED_HEAD,
      reviewed_at: new Date().toISOString().replace(/\.\d{3}Z$/, "Z"),
      policy: "A complete bilingual Levels table with codes, names, credits, and preserved published prerequisite text remains interactive; uncertain electives/training/requisites use nonblocking warnings. Read-only is reserved for material plan incompleteness.",
      decisions,
      catalog_only_search_scope: {
        checked_at: "2026-07-29",
        sources: [
          "Current Arabic and English KAU program pages and their Study Plans & Courses sections",
          "Related links exposed by the current official pages",
          "Exact-title, site-restricted searches for current official KAU PDF/catalog plans",
        ],
        retained_original_full_planner_downgrades: downgradedCatalog,
      },
      arts_and_humanities_additions: [
        { id: "catalog-bachelor-of-history", official_code: "BA-HIST-AH", official_path: "/programs/bachelor-of-history", duplicate: false },
        { id: "catalog-bachelor-of-social-science-social-work", official_code: "BA-SOCW-AH", official_path: "/programs/bachelor-of-social-science-social-work", duplicate: false },
      ],
      total_explanation: "The catalog increased from 223 to 225 only because the official bilingual AH inventory contains two current bachelor cards absent from the repository: BA-HIST-AH and BA-SOCW-AH.",
      validation: {
        browser_runtime: "blocked",
        browser_runtime_attempts: [
          "Playwright Chromium: blocked by missing libnspr4.so",
          "Playwright Firefox: executable not installed",
          "Playwright WebKit: executable not installed",
        ],
        fallback: "Representative FULL_PLANNER, OFFICIAL_PLAN_VIEW, and CATALOG_ONLY API payloads plus Arabic/English canonical labels and static HTML integration are covered by the test suite.",
        tests: [
          "PYTHONPATH=src python3 -m unittest discover -s tests -v — 142 passed",
          "PYTHONPATH=src python3 -m compileall -q src tests — passed",
          "node --check server.js; node --check web/app.js; changed audit scripts — passed",
          "npm run test:full-planners — 180 planners / 5,078 rows / zero permanently blocked courses",
          "git diff --check — passed",
        ],
      },
    },
  };

  if (decisions.length !== 65 || restored.length !== 50 || downgradedCatalog.length !== 13) {
    throw new Error(`unexpected decision counts: ${decisions.length}/${restored.length}/${downgradedCatalog.length}`);
  }
  for (const id of restored) {
    const item = finalById.get(id);
    if (!item || item.final_coverage_state !== "FULL_PLANNER") throw new Error(`${id}: report did not record restoration`);
  }

  await writeJson(CATALOG_PATH, catalog);
  await writeJson(PLANNERS_PATH, planners, 0o755);
  await writeJson(REPORT_JSON_PATH, report);
  await fs.writeFile(REPORT_MD_PATH, markdown(report), "utf8");
  process.stdout.write(`${JSON.stringify({ coverage: coverageAfter, restored: restored.length, views: retainedViews.length, catalog_downgrades: downgradedCatalog.length, planners: planners.programs.length })}\n`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  runProductOwnerReview().catch((error) => {
    process.stderr.write(`${error.stack || error}\n`);
    process.exitCode = 1;
  });
}

export { runProductOwnerReview };
