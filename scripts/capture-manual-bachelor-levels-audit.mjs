#!/usr/bin/env node

import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { extractEmbeddedLevelTables, extractEmbeddedStudyPlans, summarizeLevels } from "./extract-official-levels.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CATALOG_PATH = path.join(ROOT, "web/data/faculty_catalog.json");
const OUTPUT_DIR = path.join(ROOT, "data/raw/kau/manual_bachelor_levels_audit");
const STATE_PATH = path.join(OUTPUT_DIR, "capture-state.json");
const USER_AGENT = "kau-academic-planner-manual-bachelor-audit/1.0 (respectful official-data validation)";

const SOURCE_PATH_OVERRIDES = {
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

const SOURCE_URL_OVERRIDES = {
  "ri-bachelor-computer-science": {
    ar: "https://kau.edu.sa/faculty/ar/computing-it-rabigh/page/computer-science",
    en: "https://kau.edu.sa/faculty/en/computing-it-rabigh/page/computer-science",
  },
};

const TARGET_IDS = [
  // Product-owner level-order review.
  "catalog-bachelor-of-public-relations-program",
  "catalog-bachelor-in-french-language-translation",
  "catalog-counseling-psychology",
  "catalog-bachelor-of-sharia",
  "catalog-general-intermediate-diploma-in-applied-computing-and-network-technologies",
  "catalog-general-intermediate-diploma-in-law",
  "catalog-intermediate-diploma-in-cybersecurity",
  "catalog-bachelor-of-science-in-computer-science",
  "catalog-bachelor-of-science-in-cybersecurity",
  "catalog-medicine-bachelor-s-degree-in-medicine-and-surgery",
  "catalog-bachelor-of-science-in-hydrology-and-water-resources-management",
  "catalog-bachelor-of-science-in-meteorology",
  "catalog-engineering-bachelor-of-science-in-electrical-engineering-electronics-and-communic",
  "catalog-engineering-bachelor-of-science-in-electrical-engineering-power-and-machines",

  // Explicit re-extraction and catalog-only fallbacks.
  "catalog-geography-and-geographic-information-systems",
  "ri-bachelor-computer-science",
  "ri-bachelor-information-systems",
  "ri-bachelor-information-technology",
  "catalog-arts-and-humanities-bachelor-of-arabic-language",
  "catalog-arts-and-humanities-bachelor-of-information-science",
  "catalog-economics-and-administration-bachelor-of-health-services-and-hospital-administrati",
  "catalog-computing-information-tech-bachelor-of-science-in-information-systems",
  "catalog-computing-information-tech-bachelor-of-science-in-information-technology",
  "catalog-law-bachelor-degree-in-law",
  "catalog-tourism-bachelor-of-hospitality-management",

  // Programs requiring completeness-based OFFICIAL_PLAN_VIEW decisions.
  "catalog-medicine-rabigh-bachelor-of-medicine-and-surgery-mbbs",
  "catalog-science-bachelor-of-biochemistry",
  "catalog-environmental-sciences-bachelor-of-science-in-arid-land-agricultural-general-progr",
  "catalog-environmental-sciences-bachelor-of-science-in-arid-land-agricultural-renewable-nat",
  "catalog-environmental-sciences-bachelor-of-science-in-environment",
  "catalog-applied-medica-sciences-bachelor-of-clinical-nutrition",
  "catalog-applied-medica-sciences-bachelor-of-clinical-psychohlogy",
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

  // Faculty-wide bachelor review groups.
  "catalog-maritime-studies-bachelor-of-marine-engineering",
  "catalog-nautical-science",
  "catalog-maritime-studies-bachelor-of-supply-chains-maritime-business",
  "catalog-maritime-studies-bachelor-of-the-marine-surveying",
  "catalog-engineering-rabigh-architectural-engineering",
  "catalog-engineering-rabigh-chemical-and-materials-engineering",
  "catalog-engineering-rabigh-civil-and-environmental-engineering",
  "catalog-engineering-rabigh-electrical-engineering",
  "catalog-engineering-rabigh-industrial-engineering",
  "catalog-engineering-rabigh-mechanical-engineering",
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
  "catalog-med-rehabilitation-sciences-bachelor-s-degree-of-occupational-therapy",
  "catalog-med-rehabilitation-sciences-bachelor-s-degree-of-physical-therapy",
  "catalog-med-rehabilitation-sciences-bachelor-s-degree-of-prosthetics-and-orthotics",
  "catalog-med-rehabilitation-sciences-bachelor-s-degree-of-respiratory-therapy",
  "catalog-med-rehabilitation-sciences-bachelor-s-degree-of-speech-language-pathology-and-aud",

  // Existing Arts and Humanities bachelor inventory entries.
  "catalog-chinese-language",
  "catalog-literary-in-english-language",
];

const NEW_ARTS_PROGRAMS = [
  {
    id: "catalog-bachelor-of-history",
    name_ar: "البكالوريوس في التاريخ والإرشاد السياحي",
    name_en: "Bachelor of History",
    source_url_ar: "https://kau.edu.sa/ar/programs/bachelor-of-history",
    source_url_en: "https://kau.edu.sa/en/programs/bachelor-of-history",
  },
  {
    id: "catalog-bachelor-of-social-science-social-work",
    name_ar: "بكالوريوس في علم الاجتماع والخدمة الاجتماعية",
    name_en: "Bachelor of Social Science & Social Work",
    source_url_ar: "https://kau.edu.sa/ar/programs/bachelor-of-social-science-social-work",
    source_url_en: "https://kau.edu.sa/en/programs/bachelor-of-social-science-social-work",
  },
];

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function now() {
  return new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
}

function relative(filePath) {
  return path.relative(ROOT, filePath).split(path.sep).join("/");
}

async function readJson(filePath, fallback) {
  try {
    return JSON.parse(await fs.readFile(filePath, "utf8"));
  } catch (error) {
    if (error.code === "ENOENT") return fallback;
    throw error;
  }
}

async function writeJson(filePath, value) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  const temporary = `${filePath}.tmp`;
  await fs.writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  await fs.rename(temporary, filePath);
}

async function retrieve(url, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      redirect: "follow",
      headers: { "User-Agent": USER_AGENT, Accept: "text/html" },
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return { html: await response.text(), finalUrl: response.url, httpStatus: response.status };
  } finally {
    clearTimeout(timer);
  }
}

function summarizeStudyPlans(html) {
  return extractEmbeddedStudyPlans(html).map((plan) => ({
    id: plan?.id ?? null,
    name: plan?.name ?? null,
    description: plan?.description ?? null,
    has_levels: plan?.has_levels === true,
    level_count: Array.isArray(plan?.levels) ? plan.levels.length : 0,
    level_course_row_count: (plan?.levels || []).reduce((sum, level) => sum + (level?.courses || []).length, 0),
    direct_course_row_count: Array.isArray(plan?.courses) ? plan.courses.length : 0,
    direct_courses: (plan?.courses || []).map((course, index) => ({
      course_code: course?.code ?? null,
      course_name: course?.name ?? null,
      credits: Number.isInteger(course?.credit_hours) ? course.credit_hours : null,
      prerequisite_text: course?.prerequisites || null,
      source_order: index + 1,
    })),
  }));
}

async function main() {
  const refresh = process.argv.includes("--refresh");
  const fromSnapshots = process.argv.includes("--from-snapshots");
  const programIdIndex = process.argv.indexOf("--program-id");
  const selectedIds = programIdIndex === -1 ? null : new Set(String(process.argv[programIdIndex + 1] || "").split(",").filter(Boolean));
  const delayMs = Number(process.env.KAU_AUDIT_DELAY_MS || 750);
  const timeoutMs = Number(process.env.KAU_AUDIT_TIMEOUT_MS || 60_000);
  const positional = process.argv.slice(2).filter((value, index, args) => value !== "--refresh" && value !== "--from-snapshots" && value !== "--program-id" && args[index - 1] !== "--program-id");
  if (positional.length || (programIdIndex !== -1 && !selectedIds.size)) {
    throw new Error("Usage: node scripts/capture-manual-bachelor-levels-audit.mjs [--refresh|--from-snapshots] [--program-id ID[,ID]]");
  }
  const catalog = JSON.parse(await fs.readFile(CATALOG_PATH, "utf8"));
  const byId = new Map(catalog.programs.map((program) => [program.id, program]));
  const missing = TARGET_IDS.filter((id) => !byId.has(id));
  if (missing.length) throw new Error(`catalog targets missing: ${missing.join(", ")}`);
  const allTargets = [
    ...TARGET_IDS.map((id) => {
      const program = { ...byId.get(id) };
      const sourcePath = SOURCE_PATH_OVERRIDES[id];
      if (sourcePath) {
        program.source_url_ar = `https://kau.edu.sa/ar/programs/${sourcePath}`;
        program.source_url_en = `https://kau.edu.sa/en/programs/${sourcePath}`;
      }
      const sourceUrls = SOURCE_URL_OVERRIDES[id];
      if (sourceUrls) {
        program.source_url_ar = sourceUrls.ar;
        program.source_url_en = sourceUrls.en;
      }
      return program;
    }),
    ...NEW_ARTS_PROGRAMS,
  ];
  const targets = allTargets.filter((program) => !selectedIds || selectedIds.has(program.id));
  if (selectedIds) {
    const found = new Set(targets.map((program) => program.id));
    const notFound = [...selectedIds].filter((id) => !found.has(id));
    if (notFound.length) throw new Error(`selected program IDs missing: ${notFound.join(", ")}`);
  }
  const state = await readJson(STATE_PATH, {
    schema_version: 1,
    started_at: now(),
    source_policy: "Current official KAU Arabic and English HTML; browser launch attempted separately.",
    programs: {},
  });
  state.updated_at = now();
  state.target_count = allTargets.length;
  await writeJson(STATE_PATH, state);

  let completed = 0;
  for (const program of targets) {
    const result = state.programs[program.id] || {
      program_id: program.id,
      program_name_ar: program.name_ar || program.program_name_ar || null,
      program_name_en: program.name_en || program.program_name_en || program.program_name || null,
      faculty_id: program.faculty_id || "AH",
      original_coverage_state: program.coverage_state || null,
      source_urls: { ar: program.source_url_ar, en: program.source_url_en },
      locales: {},
    };
    result.source_urls = { ar: program.source_url_ar, en: program.source_url_en };
    for (const locale of ["ar", "en"]) {
      if (!refresh && !fromSnapshots && result.locales[locale]?.status) continue;
      const requestedUrl = program[`source_url_${locale}`];
      const retrievedAt = now();
      try {
        const existingPath = path.join(OUTPUT_DIR, program.id, `${locale}.html`);
        const response = fromSnapshots
          ? { html: await fs.readFile(existingPath, "utf8"), finalUrl: result.locales[locale]?.final_url || requestedUrl, httpStatus: result.locales[locale]?.http_status || 200 }
          : await retrieve(requestedUrl, timeoutMs);
        const levels = extractEmbeddedLevelTables(response.html);
        const studyPlans = summarizeStudyPlans(response.html);
        const summary = summarizeLevels(levels);
        const directory = path.join(OUTPUT_DIR, program.id);
        const htmlPath = path.join(directory, `${locale}.html`);
        await fs.mkdir(directory, { recursive: true });
        await fs.writeFile(htmlPath, response.html, "utf8");
        result.locales[locale] = {
          status: summary.row_count ? "success" : "no_levels",
          requested_url: requestedUrl,
          final_url: response.finalUrl,
          http_status: response.httpStatus,
          retrieved_at: fromSnapshots ? (result.locales[locale]?.retrieved_at || retrievedAt) : retrievedAt,
          html_path: relative(htmlPath),
          html_sha256: sha256(response.html),
          study_plans: studyPlans,
          levels,
          ...summary,
        };
      } catch (error) {
        result.locales[locale] = {
          status: "error",
          requested_url: requestedUrl,
          retrieved_at: retrievedAt,
          error: String(error?.message || error),
          levels: [],
          ...summarizeLevels([]),
        };
      }
      result.updated_at = now();
      state.programs[program.id] = result;
      state.updated_at = now();
      await writeJson(STATE_PATH, state);
      if (!fromSnapshots) await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
    completed += 1;
    const preferred = result.locales.ar?.row_count ? result.locales.ar : result.locales.en;
    process.stdout.write(`[${completed}/${targets.length}] ${program.id}: ${preferred?.level_count || 0} levels, ${preferred?.row_count || 0} rows\n`);
  }

  const results = allTargets.map((program) => state.programs[program.id]).filter(Boolean);
  state.completed_at = now();
  state.summary = {
    programs_checked: results.length,
    successful_programs: results.filter((program) => Object.values(program.locales).some((locale) => locale.status === "success")).length,
    no_levels_programs: results.filter((program) => Object.values(program.locales).every((locale) => locale.status === "no_levels")).length,
    error_programs: results.filter((program) => Object.values(program.locales).some((locale) => locale.status === "error")).length,
  };
  await writeJson(STATE_PATH, state);
  process.stdout.write(`${JSON.stringify(state.summary)}\n`);
}

main().catch((error) => {
  process.stderr.write(`${error.stack || error}\n`);
  process.exitCode = 1;
});
