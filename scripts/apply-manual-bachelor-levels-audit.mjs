#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { buildOfficialView, completeLevels } from "./import-official-levels.mjs";
import levelNormalization from "../web/level-normalization.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CATALOG_PATH = path.join(ROOT, "web/data/faculty_catalog.json");
const PLANNERS_PATH = path.join(ROOT, "web/data/additional_programs.json");
const CAPTURE_PATH = path.join(ROOT, "data/raw/kau/manual_bachelor_levels_audit/capture-state.json");
const REPORT_JSON_PATH = path.join(ROOT, "reports/manual_audit/manual_bachelor_levels_audit.json");
const REPORT_MD_PATH = path.join(ROOT, "reports/manual_audit/manual_bachelor_levels_audit.md");

const DIPLOMA_IDS = new Set([
  "catalog-general-intermediate-diploma-in-applied-computing-and-network-technologies",
  "catalog-general-intermediate-diploma-in-law",
  "catalog-intermediate-diploma-in-cybersecurity",
]);

const KEEP_FULL_IDS = new Set([
  "catalog-intermediate-diploma-in-cybersecurity",
]);

const OFFICIAL_VIEW_IDS = new Set([
  // Level-order corrections whose academic rules are not safe for progress operations.
  "catalog-bachelor-of-public-relations-program",
  "catalog-bachelor-in-french-language-translation",
  "catalog-counseling-psychology",
  "catalog-bachelor-of-sharia",
  "catalog-general-intermediate-diploma-in-applied-computing-and-network-technologies",
  "catalog-general-intermediate-diploma-in-law",
  "catalog-bachelor-of-science-in-computer-science",
  "catalog-bachelor-of-science-in-cybersecurity",
  "catalog-bachelor-of-science-in-hydrology-and-water-resources-management",
  "catalog-bachelor-of-science-in-meteorology",
  "catalog-engineering-bachelor-of-science-in-electrical-engineering-electronics-and-communic",
  "catalog-engineering-bachelor-of-science-in-electrical-engineering-power-and-machines",

  // Explicit completeness-based read-only fallbacks.
  "catalog-medicine-rabigh-bachelor-of-medicine-and-surgery-mbbs",
  "catalog-science-bachelor-of-biochemistry",
  "catalog-environmental-sciences-bachelor-of-science-in-arid-land-agricultural-general-progr",
  "catalog-environmental-sciences-bachelor-of-science-in-arid-land-agricultural-renewable-nat",
  "catalog-environmental-sciences-bachelor-of-science-in-environment",
  "catalog-applied-medica-sciences-bachelor-of-clinical-nutrition",
  "catalog-applied-medica-sciences-rabigh-bachelor-of-science-in-nursing",
  "catalog-architecture-and-planning-bachelor-of-architecture",
  "catalog-engineering-bachelor-of-science-in-chemical-engineering",
  "catalog-engineering-bachelor-of-science-in-civil-engineering",
  "catalog-engineering-bachelor-of-science-in-electrical-engineering-biomedical",
  "catalog-engineering-bachelor-of-science-in-electrical-engineering-computer",
  "catalog-engineering-bachelor-of-science-in-industrial-engineering",
  "catalog-engineering-bachelor-of-science-in-mechanical-engineering-aeronautical",
  "catalog-engineering-bachelor-of-science-in-mechanical-engineering-production-and-mechanica",
  "catalog-engineering-bachelor-of-science-in-mechanical-engineering-thermal-engineering-and-",
  "catalog-engineering-bachelor-of-science-in-mining-engineering",
  "catalog-engineering-bachelor-of-science-in-nuclear-engineering",
  "catalog-engineering-bachelor-of-science-in-nuclear-engineering-medical-physics",
  "catalog-engineering-bachelor-of-science-in-nuclear-engineering-radiation-protection",
  "catalog-earth-sciences-bachelor-general-geology-structural-geology-and-remote-sensing",
  "catalog-earth-sciences-bachelor-of-general-geology-geo-exploration-techniques",
  "catalog-earth-sciences-bachelor-of-geophysics",
  "catalog-earth-sciences-bachelor-of-mineral-resources-and-rocks",
  "catalog-earth-sciences-bachelor-of-science-in-engineering-and-environmental-geology",
  "catalog-earth-sciences-hydrogeology-bsc",
  "catalog-earth-sciences-petroleum-geology-and-sedimentology-bsc",
  "catalog-human-sciences-and-design-bacheior-interior-design-and-furniture",
  "catalog-human-sciences-and-design-bachelor-of-science-b-sc-in-family-sciences",
  "catalog-human-sciences-and-design-bachelor-s-department-of-early-childhood-guide",

  // Maritime programs with current rows but insufficient planner rules.
  "catalog-maritime-studies-bachelor-of-supply-chains-maritime-business",
  "catalog-maritime-studies-bachelor-of-the-marine-surveying",

  // Arts inventory: preserve every repeated/placeholder row read-only.
  "catalog-chinese-language",
]);

const CATALOG_ONLY_IDS = new Set([
  "catalog-medicine-bachelor-s-degree-in-medicine-and-surgery",
  "catalog-geography-and-geographic-information-systems",
  "catalog-arts-and-humanities-bachelor-of-arabic-language",
  "catalog-arts-and-humanities-bachelor-of-information-science",
  "catalog-economics-and-administration-bachelor-of-health-services-and-hospital-administrati",
  "catalog-computing-information-tech-bachelor-of-science-in-information-systems",
  "catalog-computing-information-tech-bachelor-of-science-in-information-technology",
  "catalog-law-bachelor-degree-in-law",
  "catalog-tourism-bachelor-of-hospitality-management",
  "catalog-applied-medica-sciences-bachelor-of-clinical-psychohlogy",
  "catalog-maritime-studies-bachelor-of-marine-engineering",
  "catalog-engineering-rabigh-architectural-engineering",
  "catalog-engineering-rabigh-chemical-and-materials-engineering",
  "catalog-engineering-rabigh-civil-and-environmental-engineering",
  "catalog-engineering-rabigh-electrical-engineering",
  "catalog-engineering-rabigh-industrial-engineering",
  "catalog-engineering-rabigh-mechanical-engineering",
  "catalog-med-rehabilitation-sciences-bachelor-s-degree-of-occupational-therapy",
  "catalog-med-rehabilitation-sciences-bachelor-s-degree-of-physical-therapy",
  "catalog-med-rehabilitation-sciences-bachelor-s-degree-of-prosthetics-and-orthotics",
  "catalog-med-rehabilitation-sciences-bachelor-s-degree-of-respiratory-therapy",
  "catalog-med-rehabilitation-sciences-bachelor-s-degree-of-speech-language-pathology-and-aud",
  "catalog-literary-in-english-language",
  "catalog-bachelor-of-history",
  "catalog-bachelor-of-social-science-social-work",
]);

const PARTIAL_VIEW_IDS = new Set([
  "catalog-environmental-sciences-bachelor-of-science-in-environment",
]);

const CANONICAL_ENGINEERING_PATHS = {
  "catalog-engineering-bachelor-of-science-in-civil-engineering": "bachelor-of-science-in-civil-engineering",
  "catalog-engineering-bachelor-of-science-in-electrical-engineering-biomedical": "bachelor-of-science-in-electrical-engineering-biomedical",
  "catalog-engineering-bachelor-of-science-in-electrical-engineering-computer": "bachelor-of-science-in-electrical-engineering-computer",
  "catalog-engineering-bachelor-of-science-in-electrical-engineering-electronics-and-communic": "bachelor-of-science-in-electrical-engineering-electronics-and-communications",
  "catalog-engineering-bachelor-of-science-in-electrical-engineering-power-and-machines": "bachelor-of-science-in-electrical-engineering-power-and-machines",
  "catalog-engineering-bachelor-of-science-in-industrial-engineering": "bachelor-of-science-in-industrial-engineering",
  "catalog-engineering-bachelor-of-science-in-mechanical-engineering-aeronautical": "bachelor-of-science-in-mechanical-engineering-aeronautical",
  "catalog-engineering-bachelor-of-science-in-mechanical-engineering-production-and-mechanica": "bachelor-of-science-in-mechanical-engineering-production-and-mechanical-systems-design",
  "catalog-engineering-bachelor-of-science-in-mechanical-engineering-thermal-engineering-and-": "bachelor-of-science-in-mechanical-engineering-thermal-engineering-and-desalination-technology",
  "catalog-engineering-bachelor-of-science-in-mining-engineering": "bachelor-of-science-in-mining-engineering",
};

const NEW_ARTS_PROGRAMS = [
  {
    id: "catalog-bachelor-of-history",
    slug: "bachelor-of-history",
    faculty_id: "AH",
    name_ar: "البكالوريوس في التاريخ والإرشاد السياحي",
    name_en: "Bachelor of History",
    official_code: "BA-HIST-AH",
    duration_ar: "4 years",
    duration_en: "4 years",
  },
  {
    id: "catalog-bachelor-of-social-science-social-work",
    slug: "bachelor-of-social-science-social-work",
    faculty_id: "AH",
    name_ar: "بكالوريوس في علم الاجتماع والخدمة الاجتماعية",
    name_en: "Bachelor of Social Science & Social Work",
    official_code: "BA-SOCW-AH",
    duration_ar: "4 Years",
    duration_en: "4 Years",
  },
];

const CATALOG_REASONS = {
  "catalog-medicine-bachelor-s-degree-in-medicine-and-surgery": "The current official Arabic and English routes expose no usable Levels plan, so the legacy seven-year row grouping cannot be verified safely.",
  "catalog-geography-and-geographic-information-systems": "The current Levels plan has rows only in Levels One–Four; Levels Five–Eight are empty and 72 other rows are grouped under program requirements.",
  "catalog-arts-and-humanities-bachelor-of-arabic-language": "The Levels rows conflict with separate course-description and requirement groupings; complete placement and elective rules cannot be matched safely.",
  "catalog-arts-and-humanities-bachelor-of-information-science": "The Levels rows conflict with separate course-description and requirement groupings; complete placement and elective rules cannot be matched safely.",
  "catalog-economics-and-administration-bachelor-of-health-services-and-hospital-administrati": "The 118-credit Levels rows do not reconcile to the published 125-credit graduation statement and separately published elective rows.",
  "catalog-computing-information-tech-bachelor-of-science-in-information-systems": "The published Levels structure conflicts with separately published faculty, university, and program requirement sets; safe planner rules are not complete.",
  "catalog-computing-information-tech-bachelor-of-science-in-information-technology": "The published Levels structure contains an extra direct row and conflicts with separately published requirement sets; safe planner rules are not complete.",
  "catalog-law-bachelor-degree-in-law": "The Levels credit sum does not reconcile to the published mandatory, elective, free-course, training, and university totals.",
  "catalog-tourism-bachelor-of-hospitality-management": "The Levels rows conflict with separate university, faculty, program, and description structures; the complete official plan cannot be matched safely.",
  "catalog-applied-medica-sciences-bachelor-of-clinical-psychohlogy": "The current official routes expose no Levels plan and no usable current official course rows.",
  "catalog-maritime-studies-bachelor-of-marine-engineering": "The current official routes expose no usable Levels plan.",
  "catalog-literary-in-english-language": "Levels Five–Eight are empty; only 22 rows are placed while separate track/course-description structures remain unmatched.",
  "catalog-bachelor-of-history": "Levels Five–Eight are empty and separate program-requirement rows cannot be assigned safely.",
  "catalog-bachelor-of-social-science-social-work": "Levels Five–Eight are empty and separate program-requirement rows cannot be assigned safely.",
};

const VIEW_WARNING_AR = "عرض للقراءة فقط للصفوف الرسمية المتحقق منها. عُطّل إكمال المقررات وفتح المتطلبات واختيار المواد الاختيارية وحفظ التقدم لأن الخطة أو قواعدها الأكاديمية غير مكتملة للمخطط التفاعلي.";
const VIEW_WARNING_EN = "Read-only display of verified official rows. Course completion, prerequisite unlocking, elective selection, and progress saving are disabled because the plan or its academic rules are incomplete for an interactive planner.";

function counts(programs) {
  return Object.fromEntries(["FULL_PLANNER", "OFFICIAL_PLAN_VIEW", "CATALOG_ONLY"].map((state) => [
    state,
    programs.filter((program) => program.coverage_state === state).length,
  ]));
}

function deepClone(value) {
  return JSON.parse(JSON.stringify(value));
}

function normalizedCode(value) {
  return String(value || "").normalize("NFKC").toUpperCase().replace(/[^\p{L}\p{N}]/gu, "");
}

async function writeJson(filePath, value) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  const temporary = `${filePath}.tmp`;
  await fs.writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  await fs.rename(temporary, filePath);
}

function runtimeCourses(program, plannerById) {
  if (Array.isArray(program?.courses) && program.courses.length) return program.courses;
  return plannerById.get(program?.planner_data_key || program?.id)?.courses || [];
}

function repositoryLevelCount(program, plannerById) {
  return new Set(runtimeCourses(program, plannerById).map((course) => course.semester_or_level).filter(Boolean)).size;
}

function prepareCapture(result, { allowPartial = false, repairFirstLevel = false } = {}) {
  const prepared = deepClone(result);
  for (const locale of ["ar", "en"]) {
    const source = prepared.locales[locale];
    if (source?.status !== "success") continue;
    if (repairFirstLevel && source.levels.length && !levelNormalization.parseLevelId(source.levels[0].official_level_name)) {
      source.levels[0].audit_source_label = source.levels[0].official_level_name;
      source.levels[0].official_level_name = levelNormalization.localizedLevelName(1, locale);
    }
    if (allowPartial) source.levels = source.levels.filter((level) => level.rows.length);
    source.level_count = source.levels.length;
    source.row_count = source.levels.reduce((sum, level) => sum + level.rows.length, 0);
  }
  return prepared;
}

function readOnlyReason(programId) {
  if (PARTIAL_VIEW_IDS.has(programId)) return "Only nonempty verified levels are displayed; empty published source levels are omitted and no planner rules are inferred.";
  if (DIPLOMA_IDS.has(programId)) return "The published rows are displayable, but prerequisite or training eligibility rules are not complete enough for progress operations.";
  if (programId === "catalog-chinese-language") return "A repeated coded row and incomplete elective-slot rules make interactive completion semantics unsafe.";
  return "The verified official rows are displayable, but prerequisites, electives, training rules, totals, or complete level placement are not sufficient for safe progress operations.";
}

function buildCurrentView(programId, capture) {
  const result = capture.programs[programId];
  if (!result) throw new Error(`${programId}: capture missing`);
  const prepared = prepareCapture(result, {
    allowPartial: PARTIAL_VIEW_IDS.has(programId),
    repairFirstLevel: DIPLOMA_IDS.has(programId),
  });
  if (!completeLevels(prepared)) throw new Error(`${programId}: official Levels capture is incomplete or has unknown level labels`);
  const view = buildOfficialView(prepared, { preserveExactRows: true });
  if (DIPLOMA_IDS.has(programId)) {
    for (const locale of ["ar", "en"]) {
      const original = result.locales[locale]?.levels?.[0]?.official_level_name || null;
      if (view.sections[0]) view.sections[0][`source_label_${locale}`] = original;
    }
  }
  view.warning_ar = VIEW_WARNING_AR;
  view.warning_en = VIEW_WARNING_EN;
  view.program_warning_ar = PARTIAL_VIEW_IDS.has(programId)
    ? "تعرض الخطة المستويين الأول والثاني فقط لأن المستويات المنشورة الأخرى فارغة."
    : "الخطة معروضة للقراءة فقط لعدم اكتمال قواعد التشغيل التفاعلي المنشورة.";
  view.program_warning_en = PARTIAL_VIEW_IDS.has(programId)
    ? "Only Levels One and Two are shown because the other published source levels are empty."
    : "The plan is read-only because the published interactive academic rules are incomplete.";
  view.display_notes.push(readOnlyReason(programId));
  return view;
}

function setOfficialView(program, view) {
  program.coverage_state = "OFFICIAL_PLAN_VIEW";
  program.planner_available = false;
  program.planner_data_key = null;
  program.catalog_status = "catalog-only";
  program.catalog_note_ar = "الخطة الرسمية متاحة للعرض فقط؛ أدوات التقدم معطلة.";
  program.catalog_note_en = "The official plan is available read-only; progress tools are disabled.";
  program.catalog_note = program.catalog_note_en;
  program.official_plan_view = view;
  program.published_official_plan_interactive = false;
  program.manual_audit_status = "verified_read_only";
}

function setCatalogOnly(program, reason) {
  program.coverage_state = "CATALOG_ONLY";
  program.planner_available = false;
  program.planner_data_key = null;
  program.catalog_status = "catalog-only";
  program.catalog_note_ar = "لا تتوفر خطة مستويات رسمية كاملة وآمنة للاستخدام في المخطط.";
  program.catalog_note_en = "No complete official Levels plan is safely usable in the planner.";
  program.catalog_note = program.catalog_note_en;
  program.published_official_plan_interactive = false;
  program.manual_audit_status = "verified_catalog_only";
  program.manual_audit_reason = reason;
  delete program.official_plan_view;
}

function normalizePlannerCourses(programId, planner, view) {
  const sourceSections = new Map();
  for (const section of view.sections.filter((item) => item.placement === "scheduled")) {
    for (const row of section.rows) {
      const key = `${normalizedCode(row.display_course_code || row.raw_course_code)}\u0000${row.credits}`;
      if (!sourceSections.has(key)) sourceSections.set(key, []);
      sourceSections.get(key).push(section.level_id);
    }
  }
  const normalized = planner.courses.map((course, sourceIndex) => {
    const sourceAr = course.semester_or_level_ar || null;
    const sourceEn = course.semester_or_level_en || course.semester_or_level || null;
    let levelId = levelNormalization.parseLevelId(sourceAr) || levelNormalization.parseLevelId(sourceEn);
    if (!levelId && /Semester\s*\/\s*Level\s*\(/iu.test(String(sourceEn))) levelId = 1;
    const candidates = sourceSections.get(`${normalizedCode(course.course_code)}\u0000${course.credit_hours}`) || [];
    if (!levelId && new Set(candidates).size === 1) [levelId] = candidates;
    if (!levelNormalization.validLevelId(levelId)) throw new Error(`${programId}: unknown planner course level for ${course.course_code}`);
    if (candidates.length && !candidates.includes(levelId)) throw new Error(`${programId}: ${course.course_code} is assigned to the wrong official level`);
    return {
      ...course,
      level_id: levelId,
      semester_or_level: levelNormalization.internalLevelKey(levelId),
      semester_or_level_ar: levelNormalization.localizedLevelName(levelId, "ar"),
      semester_or_level_en: levelNormalization.localizedLevelName(levelId, "en"),
      source_level_label_ar: sourceAr,
      source_level_label_en: sourceEn,
      sourceIndex,
    };
  });
  normalized.sort((left, right) => left.level_id - right.level_id || left.sourceIndex - right.sourceIndex);
  planner.courses = normalized.map(({ sourceIndex, ...course }) => course);
  const levelIds = [...new Set(planner.courses.map((course) => course.level_id))];
  levelNormalization.validateLevelSequence(levelIds.map((level_id) => ({ level_id })));
}

function newArtsProgram(source, capture) {
  const result = capture.programs[source.id];
  const retrieved = result.locales.en?.retrieved_at || result.locales.ar?.retrieved_at;
  return {
    id: source.id,
    slug: source.slug,
    faculty_id: "AH",
    name_ar: source.name_ar,
    name_en: source.name_en,
    degree_level: "bachelor",
    degree_level_ar: "بكالوريوس",
    degree_level_en: "Bachelor",
    official_degree_label_ar: "Bachelor",
    official_degree_label_en: "Bachelor",
    language: ["ar"],
    official_code: source.official_code,
    duration_ar: source.duration_ar,
    duration_en: source.duration_en,
    source_url_ar: result.source_urls.ar,
    source_url_en: result.source_urls.en,
    source_kind: "central_catalog",
    source_path: `/programs/${source.slug}`,
    program_name: source.name_en,
    program_name_ar: source.name_ar,
    program_name_en: source.name_en,
    faculty_name: "Arts and Humanities",
    program_code: source.official_code,
    official_source_url: result.source_urls.en,
    planner_available: false,
    planner_data_key: null,
    catalog_status: "catalog-only",
    catalog_note_ar: "المستويات الرسمية المنشورة غير مكتملة؛ أضيف البرنامج إلى الكتالوج فقط.",
    catalog_note_en: "The published official levels are incomplete; the program is catalog-only.",
    coverage_state: "CATALOG_ONLY",
    catalog_note: "The published official levels are incomplete; the program is catalog-only.",
    total_program_credit_hours: null,
    published_official_plan_interactive: false,
    manual_audit_status: "verified_catalog_only",
    manual_audit_reason: CATALOG_REASONS[source.id],
    last_checked_date: String(retrieved || "2026-07-29").slice(0, 10),
  };
}

function facultyCampus(program) {
  return ["RB", "RI", "RM", "RA", "RS", "RE"].includes(program?.faculty_id) ? "Rabigh" : "Jeddah";
}

function officialCounts(result) {
  const primary = result?.locales?.ar?.levels?.length ? result.locales.ar : result?.locales?.en;
  if (!primary) return { levels: 0, sourceSections: 0, rows: 0 };
  const parsed = primary.levels.map((level) => levelNormalization.parseLevelId(level.official_level_name)).filter(Boolean);
  const explicitFirst = DIPLOMA_IDS.has(result.program_id) && primary.levels.length && parsed.length === primary.levels.length - 1;
  return {
    levels: new Set(parsed).size + (explicitFirst ? 1 : 0),
    sourceSections: primary.levels.length,
    rows: primary.levels.reduce((sum, level) => sum + level.rows.length, 0),
  };
}

function markdown(report) {
  const rows = report.programs.map((item) => (
    `| ${item.user_provided_name} | \`${item.resolved_repository_id}\` | ${item.original_coverage_state || "NEW"} → ${item.final_coverage_state} | ${item.official_level_count} | ${item.repository_level_count_before} → ${item.repository_level_count_after} | ${item.official_course_row_count} | ${item.repository_row_count_before} → ${item.repository_row_count_after} | ${item.correction_performed} |`
  ));
  return `# Manual bachelor levels audit

Generated: ${report.generated_at}

Chromium could not launch because \`libnspr4.so\` is unavailable. Current official HTML and embedded KAU payloads were refreshed in both languages; no browser-validation pass is claimed.

## Coverage

- Before: ${JSON.stringify(report.coverage_before)} (${report.total_before} programs)
- After: ${JSON.stringify(report.coverage_after)} (${report.total_after} programs)
- Reordered/read-only normalized: ${report.programs_reordered.length}
- Downgraded to OFFICIAL_PLAN_VIEW: ${report.programs_downgraded_to_official_plan_view.length}
- Downgraded to CATALOG_ONLY: ${report.programs_downgraded_to_catalog_only.length}

## Arts and Humanities bachelor inventory

- Before: ${report.arts_and_humanities.before.map((item) => item.name_en).join("; ")}
- After: ${report.arts_and_humanities.after.map((item) => item.name_en).join("; ")}
- Added: ${report.arts_and_humanities.missing_programs_added.map((item) => item.name_en).join("; ")}
- Reclassified: ${report.arts_and_humanities.reclassified_programs.map((item) => item.name_en).join("; ")}

## Program decisions

| Program | Repository ID | Coverage | Official levels | Repository levels | Official rows | Repository rows | Correction |
|---|---|---|---:|---:|---:|---:|---|
${rows.join("\n")}
`;
}

async function main() {
  if (process.argv.length > 2) throw new Error("Usage: node scripts/apply-manual-bachelor-levels-audit.mjs");
  const catalog = JSON.parse(await fs.readFile(CATALOG_PATH, "utf8"));
  const planners = JSON.parse(await fs.readFile(PLANNERS_PATH, "utf8"));
  const capture = JSON.parse(await fs.readFile(CAPTURE_PATH, "utf8"));
  const plannerById = new Map(planners.programs.map((program) => [program.id, program]));
  const beforePrograms = deepClone(catalog.programs);
  const beforeById = new Map(beforePrograms.map((program) => [program.id, program]));
  const beforePlannerById = new Map(planners.programs.map((program) => [program.id, deepClone(program)]));
  const coverageBefore = counts(catalog.programs);
  const artsBefore = catalog.programs.filter((program) => program.faculty_id === "AH" && program.degree_level === "bachelor")
    .map((program) => ({ id: program.id, name_ar: program.name_ar, name_en: program.name_en, coverage_state: program.coverage_state }));

  for (const source of NEW_ARTS_PROGRAMS) {
    if (catalog.programs.some((program) => program.id === source.id)) throw new Error(`${source.id}: already exists`);
    catalog.programs.push(newArtsProgram(source, capture));
  }
  const english = catalog.programs.find((program) => program.id === "catalog-literary-in-english-language");
  english.degree_level = "bachelor";
  english.degree_level_ar = "بكالوريوس";
  english.degree_level_en = "Bachelor";
  english.official_degree_label_ar = "Bachelor";
  english.official_degree_label_en = "Bachelor";
  english.identity_audit_note = "The current official title, degree row, four-year duration, and BA-ENGL-AH code identify a bachelor program; the official type badge is inconsistent and retained here as an audit note.";

  const byId = new Map(catalog.programs.map((program) => [program.id, program]));
  for (const [programId, sourcePath] of Object.entries(CANONICAL_ENGINEERING_PATHS)) {
    const program = byId.get(programId);
    program.source_url_ar = `https://kau.edu.sa/ar/programs/${sourcePath}`;
    program.source_url_en = `https://kau.edu.sa/en/programs/${sourcePath}`;
    program.official_source_url = program.source_url_en;
    program.source_path = `/programs/${sourcePath}`;
  }
  const rabighComputerScience = byId.get("ri-bachelor-computer-science");
  rabighComputerScience.source_url_ar = "https://kau.edu.sa/faculty/ar/computing-it-rabigh/page/computer-science";
  rabighComputerScience.source_url_en = "https://kau.edu.sa/faculty/en/computing-it-rabigh/page/computer-science";
  rabighComputerScience.official_source_url = rabighComputerScience.source_url_en;
  rabighComputerScience.source_path = "/faculty/computing-it-rabigh/page/computer-science";

  for (const programId of OFFICIAL_VIEW_IDS) {
    const program = byId.get(programId);
    if (!program) throw new Error(`${programId}: catalog program missing`);
    setOfficialView(program, buildCurrentView(programId, capture));
  }
  for (const programId of CATALOG_ONLY_IDS) {
    const program = byId.get(programId);
    if (!program) throw new Error(`${programId}: catalog program missing`);
    const facultyReason = program.faculty_id === "RE"
      ? "The current official Rabigh Engineering routes expose no usable Levels plan."
      : program.faculty_id === "RH"
        ? "The current official Medical Rehabilitation Sciences route exposes no usable Levels plan for this program."
        : CATALOG_REASONS[programId] || "No complete usable current official Levels plan is available.";
    setCatalogOnly(program, facultyReason);
  }

  const fullProgram = byId.get("catalog-intermediate-diploma-in-cybersecurity");
  const fullView = buildCurrentView(fullProgram.id, capture);
  const fullPlanner = plannerById.get(fullProgram.id);
  normalizePlannerCourses(fullProgram.id, fullPlanner, fullView);
  fullProgram.coverage_state = "FULL_PLANNER";
  fullProgram.planner_available = true;
  fullProgram.planner_data_key = fullProgram.id;
  fullProgram.catalog_status = "active";
  fullProgram.catalog_note_ar = "الخطة الرسمية الكاملة متاحة في المخطط.";
  fullProgram.catalog_note_en = "The complete verified official plan is available in the planner.";
  fullProgram.catalog_note = fullProgram.catalog_note_en;
  fullProgram.official_plan_view = fullView;
  fullProgram.manual_audit_status = "verified_full_planner";

  catalog.generated_at = "2026-07-29T00:00:00Z";
  catalog.last_checked_date = "2026-07-29";
  catalog.scope_note = "Bilingual official catalog with the July 2026 manual bachelor-levels audit and conservative planner coverage decisions.";

  const coverageAfter = counts(catalog.programs);
  if (catalog.programs.length !== 225) throw new Error(`expected 225 programs, found ${catalog.programs.length}`);
  if (JSON.stringify(coverageAfter) !== JSON.stringify({ FULL_PLANNER: 130, OFFICIAL_PLAN_VIEW: 45, CATALOG_ONLY: 50 })) {
    throw new Error(`unexpected coverage after audit: ${JSON.stringify(coverageAfter)}`);
  }

  for (const programId of OFFICIAL_VIEW_IDS) {
    const program = byId.get(programId);
    if (program.planner_available || program.planner_data_key || !program.official_plan_view?.visible_course_count) {
      throw new Error(`${programId}: invalid OFFICIAL_PLAN_VIEW state`);
    }
    const scheduled = program.official_plan_view.sections.filter((section) => section.placement === "scheduled");
    levelNormalization.validateLevelSequence(scheduled);
    for (const section of scheduled) {
      if (section.title_ar !== levelNormalization.localizedLevelName(section.level_id, "ar")
          || section.title_en !== levelNormalization.localizedLevelName(section.level_id, "en")) {
        throw new Error(`${programId}: noncanonical visible level title`);
      }
    }
  }
  for (const programId of CATALOG_ONLY_IDS) {
    const program = byId.get(programId);
    if (program.planner_available || program.planner_data_key || program.official_plan_view) throw new Error(`${programId}: invalid CATALOG_ONLY state`);
  }
  const fullLevelIds = fullPlanner.courses.map((course) => course.level_id);
  if (fullLevelIds.some((id) => !levelNormalization.validLevelId(id))) throw new Error(`${fullProgram.id}: unknown course level`);

  const artsAfter = catalog.programs.filter((program) => program.faculty_id === "AH" && program.degree_level === "bachelor")
    .map((program) => ({ id: program.id, name_ar: program.name_ar, name_en: program.name_en, coverage_state: program.coverage_state }));
  const expectedArts = new Set([
    "catalog-bachelor-in-french-language-translation",
    "catalog-arts-and-humanities-bachelor-of-arabic-language",
    "catalog-bachelor-of-history",
    "catalog-arts-and-humanities-bachelor-of-information-science",
    "catalog-bachelor-of-sharia",
    "catalog-bachelor-of-social-science-social-work",
    "catalog-chinese-language",
    "catalog-counseling-psychology",
    "catalog-geography-and-geographic-information-systems",
    "catalog-literary-in-english-language",
  ]);
  if (artsAfter.length !== expectedArts.size || artsAfter.some((program) => !expectedArts.has(program.id))) throw new Error("Arts and Humanities bachelor inventory mismatch");

  const auditPrograms = [];
  for (const result of Object.values(capture.programs)) {
    const program = byId.get(result.program_id);
    if (!program) continue;
    const before = beforeById.get(program.id);
    const official = officialCounts(result);
    const beforeRows = before ? runtimeCourses(before, beforePlannerById).length : 0;
    const afterRows = program.coverage_state === "FULL_PLANNER"
      ? runtimeCourses(program, plannerById).length
      : program.coverage_state === "OFFICIAL_PLAN_VIEW"
        ? program.official_plan_view.visible_course_count
        : 0;
    const afterLevels = program.coverage_state === "FULL_PLANNER"
      ? new Set(runtimeCourses(program, plannerById).map((course) => course.level_id).filter(Boolean)).size
      : program.coverage_state === "OFFICIAL_PLAN_VIEW"
        ? program.official_plan_view.sections.filter((section) => section.placement === "scheduled").length
        : 0;
    const primary = result.locales.ar?.retrieved_at ? result.locales.ar : result.locales.en;
    auditPrograms.push({
      user_provided_name: result.program_name_ar || program.name_ar,
      resolved_repository_id: program.id,
      official_arabic_url: result.source_urls.ar,
      official_english_url: result.source_urls.en,
      faculty_id: program.faculty_id,
      faculty: program.faculty_name,
      campus: facultyCampus(program),
      original_coverage_state: before?.coverage_state || null,
      final_coverage_state: program.coverage_state,
      official_level_count: official.levels,
      official_source_section_count: official.sourceSections,
      repository_level_count_before: before ? repositoryLevelCount(before, beforePlannerById) : 0,
      repository_level_count_after: afterLevels,
      official_course_row_count: official.rows,
      repository_row_count_before: beforeRows,
      repository_row_count_after: afterRows,
      correction_performed: !before
        ? "Added missing official Arts and Humanities bachelor program as CATALOG_ONLY."
        : program.coverage_state === "OFFICIAL_PLAN_VIEW"
          ? "Re-extracted bilingual official rows, normalized numeric level identity/order, and disabled unsafe planner/progress operations."
          : program.coverage_state === "CATALOG_ONLY"
            ? "Verified the official source, removed misleading planner availability, and retained catalog identity only."
            : KEEP_FULL_IDS.has(program.id)
              ? "Normalized four numeric level identities and ordering while preserving all 20 course identities and progress compatibility."
              : "Verified official bilingual identity and coverage; no program data change required.",
      unresolved_issue: program.id === "ri-bachelor-computer-science"
        ? "The current official Rabigh department page confirms the bachelor identity, but its Bachelor catalog link returns 404 and no usable Levels plan is published."
        : program.coverage_state === "CATALOG_ONLY"
          ? program.manual_audit_reason || "No usable current official Levels plan."
        : program.coverage_state === "OFFICIAL_PLAN_VIEW"
          ? readOnlyReason(program.id)
          : null,
      source_retrieval_timestamp: primary?.retrieved_at || null,
      source_snapshot_sha256: {
        ar: result.locales.ar?.html_sha256 || null,
        en: result.locales.en?.html_sha256 || null,
      },
    });
  }
  auditPrograms.sort((left, right) => left.resolved_repository_id.localeCompare(right.resolved_repository_id));

  const downgradedView = auditPrograms.filter((item) => item.original_coverage_state === "FULL_PLANNER" && item.final_coverage_state === "OFFICIAL_PLAN_VIEW").map((item) => item.resolved_repository_id);
  const downgradedCatalog = auditPrograms.filter((item) => item.original_coverage_state === "FULL_PLANNER" && item.final_coverage_state === "CATALOG_ONLY").map((item) => item.resolved_repository_id);
  const report = {
    generated_at: new Date().toISOString().replace(/\.\d{3}Z$/, "Z"),
    source_policy: "Current official KAU Arabic/English HTML and embedded program payloads; retained local snapshots with SHA-256. Chromium launch was attempted and blocked by missing libnspr4.so.",
    browser_validation: { status: "blocked", reason: "Chromium cannot load libnspr4.so" },
    total_before: beforePrograms.length,
    total_after: catalog.programs.length,
    coverage_before: coverageBefore,
    coverage_after: coverageAfter,
    programs: auditPrograms,
    programs_reordered: [...OFFICIAL_VIEW_IDS, ...KEEP_FULL_IDS].sort(),
    programs_downgraded_to_official_plan_view: downgradedView,
    programs_downgraded_to_catalog_only: downgradedCatalog,
    programs_kept_full_planner: [...KEEP_FULL_IDS],
    duplicate_identities_resolved: [
      {
        identities: ["catalog-medicine-bachelor-s-degree-in-medicine-and-surgery", "catalog-medicine-rabigh-bachelor-of-medicine-and-surgery-mbbs"],
        resolution: "Distinct Jeddah (MD) and Rabigh (RM) official programs; not merged.",
      },
      {
        identities: ["catalog-bachelor-of-science-in-computer-science", "ri-bachelor-computer-science"],
        resolution: "Distinct Jeddah (IT) and Rabigh (RI) catalog identities; not merged.",
      },
    ],
    arts_and_humanities: {
      official_filter_urls: {
        ar: "https://kau.edu.sa/ar/programs?faculty_code=AH",
        en: "https://kau.edu.sa/en/programs?faculty_code=AH",
      },
      official_reported_program_count: 36,
      official_unique_program_count: 35,
      official_bachelor_count: 10,
      pagination_duplicate: "/programs/phd-in-sociology appears on pages 1 and 2 in both languages.",
      before: artsBefore,
      after: artsAfter,
      missing_programs_added: artsAfter.filter((program) => !beforeById.has(program.id)),
      reclassified_programs: artsAfter.filter((program) => beforeById.has(program.id) && beforeById.get(program.id).degree_level !== "bachelor"),
    },
  };

  await writeJson(CATALOG_PATH, catalog);
  await writeJson(PLANNERS_PATH, planners);
  await writeJson(REPORT_JSON_PATH, report);
  await fs.mkdir(path.dirname(REPORT_MD_PATH), { recursive: true });
  await fs.writeFile(REPORT_MD_PATH, markdown(report), "utf8");
  process.stdout.write(`${JSON.stringify({ coverage_before: coverageBefore, coverage_after: coverageAfter, total_after: catalog.programs.length, report_programs: auditPrograms.length })}\n`);
}

main().catch((error) => {
  process.stderr.write(`${error.stack || error}\n`);
  process.exitCode = 1;
});
