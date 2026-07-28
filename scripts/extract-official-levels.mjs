#!/usr/bin/env node

import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DEFAULT_CATALOG = path.join(ROOT, "web/data/faculty_catalog.json");
const DEFAULT_OUTPUT = path.join(ROOT, "data/raw/kau/official_levels_completion");
const DEFAULT_STATE = path.join(DEFAULT_OUTPUT, "state.json");
const LEVELS_TAB = /^(?:Levels|المستويات)$/iu;
const STUDY_PLAN_TAB = /(?:Study Plan|الخطة الدراسية)$/iu;
const NOT_FOUND = /(?:page\s+not\s+found|the page you are looking for|الصفحة\s+غير\s+موجودة|عذراً.*الصفحة)/iu;

function clean(value) {
  return String(value ?? "").replace(/\u00a0/g, " ").replace(/[ \t]+/g, " ").replace(/\s*\n\s*/g, "\n").trim();
}

function asciiDigits(value) {
  return clean(value)
    .replace(/[٠-٩]/g, (digit) => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit)))
    .replace(/[۰-۹]/g, (digit) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit)));
}

function parseCredits(value) {
  const normalized = asciiDigits(value);
  return /^\d+$/.test(normalized) ? Number(normalized) : null;
}

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function now() {
  return new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
}

function relative(filePath) {
  return path.relative(ROOT, filePath).split(path.sep).join("/");
}

function parseArgs(argv) {
  const options = {
    catalog: DEFAULT_CATALOG,
    outputDir: DEFAULT_OUTPUT,
    state: DEFAULT_STATE,
    coverageStates: new Set(["OFFICIAL_PLAN_VIEW", "CATALOG_ONLY"]),
    programIds: new Set(),
    delayMs: 600,
    timeoutMs: 60_000,
    refresh: false,
    headless: true,
    screenshotProgram: null,
    htmlFile: null,
    htmlLocale: null,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const flag = argv[index];
    const value = argv[index + 1];
    if (flag === "--catalog") options.catalog = path.resolve(value), index += 1;
    else if (flag === "--output-dir") options.outputDir = path.resolve(value), index += 1;
    else if (flag === "--state") options.state = path.resolve(value), index += 1;
    else if (flag === "--coverage") options.coverageStates = new Set(value.split(",").filter(Boolean)), index += 1;
    else if (flag === "--program-id") value.split(",").filter(Boolean).forEach((id) => options.programIds.add(id)), index += 1;
    else if (flag === "--delay-ms") options.delayMs = Number(value), index += 1;
    else if (flag === "--timeout-ms") options.timeoutMs = Number(value), index += 1;
    else if (flag === "--screenshot-program") options.screenshotProgram = value, index += 1;
    else if (flag === "--html-file") options.htmlFile = path.resolve(value), index += 1;
    else if (flag === "--locale") options.htmlLocale = value, index += 1;
    else if (flag === "--refresh") options.refresh = true;
    else if (flag === "--headed") options.headless = false;
    else if (flag === "--help") options.help = true;
    else throw new Error(`unknown argument: ${flag}`);
  }
  if (!Number.isFinite(options.delayMs) || options.delayMs < 0) throw new Error("--delay-ms must be non-negative");
  if (!Number.isFinite(options.timeoutMs) || options.timeoutMs < 1_000) throw new Error("--timeout-ms must be at least 1000");
  if (options.htmlFile && !["ar", "en"].includes(options.htmlLocale)) throw new Error("--html-file requires --locale ar|en");
  if (options.htmlFile && options.programIds.size !== 1) throw new Error("--html-file requires exactly one --program-id");
  return options;
}

function usage() {
  return `Usage: node scripts/extract-official-levels.mjs [options]

Options:
  --program-id ID[,ID]       Extract selected program IDs only
  --coverage STATE[,STATE]   Coverage states to select (default: OFFICIAL_PLAN_VIEW,CATALOG_ONLY)
  --refresh                  Re-fetch successful saved results
  --delay-ms N               Delay between live pages (default: 600)
  --timeout-ms N             Per-page navigation timeout (default: 60000)
  --screenshot-program ID    Save one expanded-page screenshot as evidence
  --html-file PATH           Import one saved official page response without launching a browser
  --locale ar|en             Locale for --html-file
  --output-dir PATH          Raw snapshot directory
  --state PATH               Resumable state JSON path
  --headed                   Show the browser window
`;
}

function extractJsonArray(value) {
  let depth = 0;
  let quoted = false;
  let escaped = false;
  for (let index = 0; index < value.length; index += 1) {
    const character = value[index];
    if (quoted) {
      if (escaped) escaped = false;
      else if (character === "\\") escaped = true;
      else if (character === '"') quoted = false;
      continue;
    }
    if (character === '"') quoted = true;
    else if (character === "[") depth += 1;
    else if (character === "]") {
      depth -= 1;
      if (depth === 0) return JSON.parse(value.slice(0, index + 1));
    }
  }
  return null;
}

function extractEmbeddedLevelTables(html) {
  const flightPattern = /self\.__next_f\.push\(\[1,("(?:[^"\\]|\\.)*")\]\)<\/script>/gu;
  const studyPlans = [];
  for (const match of html.matchAll(flightPattern)) {
    let chunk;
    try {
      chunk = JSON.parse(match[1]);
    } catch {
      continue;
    }
    const marker = '"studyPlan":';
    const markerIndex = chunk.indexOf(marker);
    if (markerIndex === -1) continue;
    try {
      const studyPlan = extractJsonArray(chunk.slice(markerIndex + marker.length));
      if (Array.isArray(studyPlan)) studyPlans.push(...studyPlan);
    } catch {
      // Ignore malformed framework payloads and continue to the rendered DOM fallback.
    }
  }

  const levelPlan = studyPlans.find((plan) => (
    plan?.has_levels === true
      && /^(?:Levels|المستويات|Study Plan(?: \(levels\))?|الخطة الدراسية)$/iu.test(clean(plan.name))
      && Array.isArray(plan.levels)
      && plan.levels.length
  ));
  if (!levelPlan) return [];

  let sourceOrder = 0;
  return levelPlan.levels.map((level, levelIndex) => ({
    official_level_name: clean(level.name),
    source_level_order: levelIndex + 1,
    headers: ["Course Code", "Course", "Credits", "Prerequisites"],
    rows: (level.courses || []).map((course) => {
      sourceOrder += 1;
      const prerequisite = clean(course.prerequisites);
      return {
        course_code: clean(course.code),
        course_name: clean(course.name),
        credits: Number.isInteger(course.credit_hours) ? course.credit_hours : parseCredits(course.credit_hours),
        credits_text: clean(course.credit_hours),
        prerequisite_text: prerequisite && !/^[\-–—]+$/u.test(prerequisite) ? prerequisite : null,
        source_order: sourceOrder,
        source_cells: [clean(course.code), clean(course.name), clean(course.credit_hours), prerequisite],
      };
    }),
  }));
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

async function clickLevelsTab(page) {
  const bodyText = clean(await page.locator("body").innerText().catch(() => ""));
  let found = /(?:^|\n)(?:Levels|المستويات|Semester\/Level[^\n]*)(?:\n|$)/iu.test(bodyText);
  const buttons = page.locator("button");
  const count = await buttons.count();
  for (let index = 0; index < count; index += 1) {
    const button = buttons.nth(index);
    const label = clean(await button.innerText().catch(() => ""));
    if (!LEVELS_TAB.test(label) && !STUDY_PLAN_TAB.test(label)) continue;
    found = true;
    if (await button.isVisible().catch(() => false)) {
      await button.scrollIntoViewIfNeeded().catch(() => {});
      await button.click({ timeout: 5_000 }).catch(() => {});
      await page.waitForTimeout(250);
      break;
    }
  }
  return found;
}

async function expandAndReadLevelTables(page) {
  let buttons = page.locator("main button[aria-expanded]");
  if (await buttons.count() === 0) buttons = page.locator("button[aria-expanded]");
  const count = await buttons.count();
  for (let index = 0; index < count; index += 1) {
    const button = buttons.nth(index);
    if (await button.getAttribute("aria-expanded") === "true") continue;
    if (!await button.isVisible().catch(() => false)) continue;
    await button.scrollIntoViewIfNeeded().catch(() => {});
    await button.click({ timeout: 5_000 }).catch(() => {});
    await page.waitForTimeout(80);
  }

  const levels = await page.evaluate(() => {
    const normalize = (value) => String(value ?? "")
      .replace(/\u00a0/g, " ")
      .replace(/[ \t]+/g, " ")
      .replace(/\s*\n\s*/g, "\n")
      .trim();
    const candidates = [];
    for (const button of document.querySelectorAll("button[aria-expanded]")) {
      if (!button.checkVisibility() || button.getClientRects().length === 0) continue;
      const container = button.parentElement;
      const table = container?.querySelector("table");
      if (!table) continue;
      const headers = [...table.querySelectorAll("thead th")].map((cell) => normalize(cell.innerText));
      const headerText = headers.join(" ");
      const looksLikeCourses = /(?:course|مقرر)/iu.test(headerText) && /(?:credit|hour|ساع)/iu.test(headerText);
      if (!looksLikeCourses || headers.length < 3) continue;
      const rows = [...table.querySelectorAll("tbody tr")].flatMap((row) => {
        const cells = [...row.querySelectorAll(":scope > th, :scope > td")].map((cell) => normalize(cell.innerText));
        if (cells.length < headers.length) return [];
        return [{
          course_code: cells[0] ?? "",
          course_name: cells[1] ?? "",
          credits_text: cells[2] ?? "",
          prerequisite_text: cells[3] ?? "",
          cells,
        }];
      });
      candidates.push({
        official_level_name: normalize(button.innerText),
        headers,
        rows,
      });
    }
    return candidates;
  });

  let sourceOrder = 0;
  return levels.map((level, levelIndex) => ({
    official_level_name: clean(level.official_level_name),
    source_level_order: levelIndex + 1,
    headers: level.headers.map(clean),
    rows: level.rows.map((row) => {
      sourceOrder += 1;
      const prerequisite = clean(row.prerequisite_text);
      return {
        course_code: clean(row.course_code),
        course_name: clean(row.course_name),
        credits: parseCredits(row.credits_text),
        credits_text: clean(row.credits_text),
        prerequisite_text: prerequisite && !/^[\-–—]+$/u.test(prerequisite) ? prerequisite : null,
        source_order: sourceOrder,
        source_cells: row.cells.map(clean),
      };
    }),
  }));
}

function summarizeLevels(levels) {
  const rows = levels.flatMap((level) => level.rows);
  const issues = [];
  if (!levels.length) issues.push("no table-backed level accordions found");
  if (levels.some((level) => !level.official_level_name)) issues.push("one or more level names are empty");
  if (levels.some((level) => level.rows.length === 0)) issues.push("one or more level tables are empty");
  if (rows.some((row) => !row.course_code)) issues.push("one or more course codes are empty");
  if (rows.some((row) => !row.course_name)) issues.push("one or more course names are empty");
  if (rows.some((row) => row.credits === null)) issues.push("one or more credit values are not exact integers");
  return {
    level_count: levels.length,
    row_count: rows.length,
    credit_sum: rows.reduce((sum, row) => sum + (row.credits ?? 0), 0),
    issues,
  };
}

async function extractLocale(context, program, locale, options) {
  const url = program[`source_url_${locale}`];
  const retrievedAt = now();
  if (!url) return { status: "missing_url", url: null, retrieved_at: retrievedAt, levels: [], ...summarizeLevels([]) };
  const page = await context.newPage();
  page.setDefaultTimeout(Math.min(options.timeoutMs, 15_000));
  try {
    const response = await page.goto(url, { waitUntil: "domcontentloaded", timeout: options.timeoutMs });
    await page.locator("body").waitFor({ state: "visible", timeout: options.timeoutMs });
    await page.waitForLoadState("networkidle", { timeout: 5_000 }).catch(() => {});
    await page.waitForFunction(
      () => /(?:Levels|المستويات|Study Plans|خطط الدراسة|page not found|الصفحة غير موجودة)/iu.test(document.body?.innerText || ""),
      null,
      { timeout: 12_000 },
    ).catch(() => {});
    const bodyText = clean(await page.locator("body").innerText());
    const pageNotFound = NOT_FOUND.test(bodyText);
    let levelsTabFound = pageNotFound ? false : await clickLevelsTab(page);
    let levels = levelsTabFound ? await expandAndReadLevelTables(page) : [];
    const html = await page.content();
    if (!levels.length && !pageNotFound) {
      const embeddedLevels = extractEmbeddedLevelTables(html);
      if (embeddedLevels.length) {
        levels = embeddedLevels;
        levelsTabFound = true;
      }
    }
    const localeDir = path.join(options.outputDir, program.id);
    await fs.mkdir(localeDir, { recursive: true });
    const htmlPath = path.join(localeDir, `${locale}.html`);
    await fs.writeFile(htmlPath, html, "utf8");
    let screenshotPath = null;
    if (options.screenshotProgram === program.id && levels.length) {
      screenshotPath = path.join(localeDir, `${locale}-expanded.png`);
      await page.screenshot({ path: screenshotPath, fullPage: true });
    }
    const summary = summarizeLevels(levels);
    const status = pageNotFound ? "page_not_found" : summary.row_count ? "success" : "no_levels";
    return {
      status,
      url: page.url(),
      requested_url: url,
      http_status: response?.status() ?? null,
      retrieved_at: retrievedAt,
      levels_tab_found: levelsTabFound,
      page_not_found: pageNotFound,
      document_title: clean(await page.title()),
      html_path: relative(htmlPath),
      html_sha256: sha256(html),
      screenshot_path: screenshotPath ? relative(screenshotPath) : null,
      levels,
      ...summary,
    };
  } catch (error) {
    return {
      status: "error",
      url,
      requested_url: url,
      retrieved_at: retrievedAt,
      error: clean(error?.message || error),
      levels: [],
      ...summarizeLevels([]),
    };
  } finally {
    await page.close().catch(() => {});
  }
}

function programSummary(programResult) {
  const ar = programResult.locales.ar;
  const en = programResult.locales.en;
  const preferred = ar?.row_count ? ar : en?.row_count ? en : null;
  const errors = [ar, en].filter((item) => item?.status === "error");
  return {
    preferred_locale: preferred === ar ? "ar" : preferred === en ? "en" : null,
    levels_tab_found: Boolean(ar?.levels_tab_found || en?.levels_tab_found),
    level_count: preferred?.level_count ?? 0,
    row_count: preferred?.row_count ?? 0,
    credit_sum: preferred?.credit_sum ?? 0,
    status: preferred?.row_count ? "success" : errors.length === 2 ? "failed" : "unresolved",
    issues: [...new Set([...(ar?.issues || []), ...(en?.issues || []), ...errors.map((item) => item.error)])],
  };
}

async function selectedPrograms(catalog, options) {
  const additional = await readJson(path.join(ROOT, "web/data/additional_programs.json"), { programs: [] });
  const accounting = await readJson(path.join(ROOT, "data/validated/kau_accounting.json"), {});
  const plannerData = new Map([
    { ...accounting, id: accounting.id || "accounting" },
    ...(additional.programs || []),
  ].map((program) => [program.id, program]));
  return catalog.programs
    .filter((program) => {
      if (options.programIds.size) return options.programIds.has(program.id);
      if (options.coverageStates.has(program.coverage_state)) return true;
      if (program.coverage_state !== "FULL_PLANNER") return false;
      const planner = plannerData.get(program.id) || plannerData.get(program.planner_data_key);
      const courses = program.courses?.length ? program.courses : planner?.courses;
      return !courses?.length || courses.some((course) => !clean(course.semester_or_level));
    })
    .sort((left, right) => {
      const priority = { OFFICIAL_PLAN_VIEW: 0, CATALOG_ONLY: 1, FULL_PLANNER: 2 };
      return (priority[left.coverage_state] ?? 3) - (priority[right.coverage_state] ?? 3)
        || left.id.localeCompare(right.id);
    });
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) return process.stdout.write(usage());
  const catalogText = await fs.readFile(options.catalog, "utf8");
  const catalog = JSON.parse(catalogText);
  const programs = await selectedPrograms(catalog, options);
  if (options.programIds.size) {
    const found = new Set(programs.map((program) => program.id));
    const missing = [...options.programIds].filter((id) => !found.has(id));
    if (missing.length) throw new Error(`program IDs not found: ${missing.join(", ")}`);
  }
  await fs.mkdir(options.outputDir, { recursive: true });
  const state = await readJson(options.state, {
    schema_version: 1,
    extractor: "scripts/extract-official-levels.mjs",
    started_at: now(),
    programs: {},
  });
  state.catalog_sha256 = sha256(catalogText);
  state.selection = {
    coverage_states: [...options.coverageStates],
    requested_program_ids: [...options.programIds],
    selected_program_count: programs.length,
  };
  state.updated_at = now();
  await writeJson(options.state, state);

  if (options.htmlFile) {
    const program = programs[0];
    const locale = options.htmlLocale;
    const html = await fs.readFile(options.htmlFile, "utf8");
    const levels = extractEmbeddedLevelTables(html);
    const localeDir = path.join(options.outputDir, program.id);
    await fs.mkdir(localeDir, { recursive: true });
    const htmlPath = path.join(localeDir, `${locale}.html`);
    await fs.writeFile(htmlPath, html, "utf8");
    const saved = state.programs[program.id];
    const result = {
      program_id: program.id,
      program_name_ar: program.program_name_ar || program.name_ar || null,
      program_name_en: program.program_name_en || program.name_en || program.program_name || null,
      degree_level: program.degree_level,
      initial_coverage_state: saved?.initial_coverage_state || program.coverage_state,
      source_urls: { ar: program.source_url_ar || null, en: program.source_url_en || null },
      locales: saved?.locales || {},
    };
    result.locales[locale] = {
      status: levels.length ? "success" : "no_levels",
      url: program[`source_url_${locale}`] || null,
      requested_url: program[`source_url_${locale}`] || null,
      http_status: 200,
      retrieved_at: now(),
      levels_tab_found: Boolean(levels.length),
      page_not_found: false,
      document_title: null,
      html_path: relative(htmlPath),
      html_sha256: sha256(html),
      screenshot_path: null,
      levels,
      ...summarizeLevels(levels),
    };
    Object.assign(result, programSummary(result));
    result.updated_at = now();
    state.programs[program.id] = result;
    state.updated_at = now();
    await writeJson(options.state, state);
    process.stdout.write(`${JSON.stringify({ program_id: program.id, locale, status: result.status, levels: result.level_count, rows: result.row_count })}\n`);
    return;
  }

  const browser = await chromium.launch({ headless: options.headless });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1200 },
    locale: "ar-SA",
    userAgent: "kau-program-scraper-official-levels/1.0 (respectful academic data validation)",
  });
  let completed = 0;
  try {
    for (const program of programs) {
      const saved = state.programs[program.id];
      if (!options.refresh && saved?.status === "success" && saved?.locales?.ar && saved?.locales?.en) {
        completed += 1;
        process.stdout.write(`[${completed}/${programs.length}] ${program.id}: resumed (${saved.level_count} levels, ${saved.row_count} rows)\n`);
        continue;
      }
      const result = {
        program_id: program.id,
        program_name_ar: program.program_name_ar || program.name_ar || null,
        program_name_en: program.program_name_en || program.name_en || program.program_name || null,
        degree_level: program.degree_level,
        initial_coverage_state: program.coverage_state,
        source_urls: { ar: program.source_url_ar || null, en: program.source_url_en || null },
        locales: saved?.locales || {},
      };
      for (const locale of ["ar", "en"]) {
        if (!options.refresh && result.locales[locale]?.status === "success") continue;
        result.locales[locale] = await extractLocale(context, program, locale, options);
        Object.assign(result, programSummary(result));
        result.updated_at = now();
        state.programs[program.id] = result;
        state.updated_at = now();
        await writeJson(options.state, state);
        await new Promise((resolve) => setTimeout(resolve, options.delayMs));
      }
      Object.assign(result, programSummary(result));
      result.updated_at = now();
      state.programs[program.id] = result;
      state.updated_at = now();
      await writeJson(options.state, state);
      completed += 1;
      process.stdout.write(`[${completed}/${programs.length}] ${program.id}: ${result.status} (${result.level_count} levels, ${result.row_count} rows)\n`);
    }
  } finally {
    await context.close().catch(() => {});
    await browser.close().catch(() => {});
  }
  const results = Object.values(state.programs).filter((program) => programs.some((selected) => selected.id === program.program_id));
  state.completed_at = now();
  state.summary = {
    programs_checked: results.length,
    levels_tabs_found: results.filter((program) => program.levels_tab_found).length,
    successful_programs: results.filter((program) => program.status === "success").length,
    unresolved_programs: results.filter((program) => program.status !== "success").length,
    exact_level_count: results.reduce((sum, program) => sum + (program.level_count || 0), 0),
    exact_course_row_count: results.reduce((sum, program) => sum + (program.row_count || 0), 0),
  };
  await writeJson(options.state, state);
  process.stdout.write(`${JSON.stringify(state.summary)}\n`);
}

const invokedPath = process.argv[1] ? path.resolve(process.argv[1]) : null;
if (invokedPath === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    process.stderr.write(`${error.stack || error}\n`);
    process.exitCode = 1;
  });
}

export { clean, extractEmbeddedLevelTables, parseCredits, summarizeLevels };
