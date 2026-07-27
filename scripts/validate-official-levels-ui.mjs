import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { chromium } from "playwright";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const webRoot = path.join(repositoryRoot, "web");
const origin = "http://kau-planner.local";

const contentTypes = new Map([
  [".css", "text/css; charset=utf-8"],
  [".html", "text/html; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".svg", "image/svg+xml"],
]);

const cases = [
  {
    name: "chinese-ar-desktop-light",
    programId: "catalog-chinese-language",
    facultyId: "AH",
    language: "ar",
    theme: "light",
    viewport: { width: 1440, height: 1000 },
    sections: 8,
    courses: 44,
    requisites: 32,
    firstLevel: "المستوى الأول",
  },
  {
    name: "chinese-en-mobile-dark",
    programId: "catalog-chinese-language",
    facultyId: "AH",
    language: "en",
    theme: "dark",
    viewport: { width: 390, height: 844 },
    sections: 8,
    courses: 44,
    requisites: 32,
    firstLevel: "First Level",
  },
  {
    name: "geography-en-desktop-dark",
    programId: "catalog-geography-and-geographic-information-systems",
    facultyId: "AH",
    language: "en",
    theme: "dark",
    viewport: { width: 1440, height: 1000 },
    sections: 8,
    courses: 45,
    requisites: 15,
    firstLevel: "First Level",
  },
  {
    name: "accounting-masters-ar-mobile-light",
    programId: "catalog-master-of-science-in-accounting",
    facultyId: "EA",
    language: "ar",
    theme: "light",
    viewport: { width: 390, height: 844 },
    sections: 4,
    courses: 12,
    requisites: 0,
    firstLevel: "المستوى الأول",
  },
];

function localAssetPath(url) {
  const pathname = new URL(url).pathname;
  const relativePath = pathname === "/" ? "index.html" : decodeURIComponent(pathname.slice(1));
  const resolved = path.resolve(webRoot, relativePath);
  if (resolved !== webRoot && !resolved.startsWith(`${webRoot}${path.sep}`)) return null;
  return resolved;
}

async function fulfillLocalApplication(route) {
  const url = new URL(route.request().url());
  if (url.pathname === "/.auth/me") {
    await route.fulfill({ status: 200, contentType: "application/json", body: "[]" });
    return;
  }
  if (url.pathname.startsWith("/api/")) {
    // Exercise the application's checked-in static-data fallback without a server.
    await route.fulfill({ status: 200, contentType: "application/json", body: "{" });
    return;
  }
  const assetPath = localAssetPath(url.href);
  if (!assetPath) {
    await route.abort();
    return;
  }
  try {
    const body = await readFile(assetPath);
    await route.fulfill({
      status: 200,
      contentType: contentTypes.get(path.extname(assetPath)) || "application/octet-stream",
      body,
    });
  } catch {
    await route.fulfill({ status: 404, body: "Not found" });
  }
}

async function validateCase(browser, testCase) {
  const context = await browser.newContext({ viewport: testCase.viewport });
  await context.addInitScript(({ language, theme }) => {
    localStorage.setItem("kau-planner-ui-language", language);
    localStorage.setItem("kau-planner-theme", theme);
  }, { language: testCase.language, theme: testCase.theme });
  await context.route(`${origin}/**`, fulfillLocalApplication);

  const page = await context.newPage();
  const browserErrors = [];
  page.on("pageerror", (error) => browserErrors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") browserErrors.push(message.text());
  });

  try {
    await page.goto(`${origin}/`, { waitUntil: "domcontentloaded" });
    await page.locator(`#facultySelect option[value="${testCase.facultyId}"]`).waitFor({ state: "attached" });
    await page.selectOption("#facultySelect", testCase.facultyId);
    await page.locator(`#majorSelect option[value="${testCase.programId}"]`).waitFor({ state: "attached" });
    await page.selectOption("#majorSelect", testCase.programId);
    await page.locator("#officialPlanView:not([hidden])").waitFor();

    const result = await page.evaluate(() => ({
      language: document.documentElement.lang,
      direction: document.documentElement.dir,
      theme: document.documentElement.dataset.theme,
      sections: document.querySelectorAll(".officialPlanSection").length,
      courses: document.querySelectorAll(".officialPlanCourse").length,
      requisites: document.querySelectorAll(".officialPlanRequisite").length,
      firstLevel: document.querySelector(".officialPlanSection h3")?.textContent?.trim(),
      viewHidden: document.querySelector("#officialPlanView")?.hidden,
      toolbarHidden: document.querySelector(".toolbarActions")?.hidden,
      privacyHidden: document.querySelector(".privacyNotice")?.hidden,
      workspaceHidden: document.querySelector("#plannerWorkspace")?.hidden,
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      progressKeys: Object.keys(localStorage).filter((key) => key.startsWith("kau-planner-local-progress")),
    }));

    assert.equal(result.language, testCase.language, `${testCase.name}: language`);
    assert.equal(result.direction, testCase.language === "en" ? "ltr" : "rtl", `${testCase.name}: direction`);
    assert.equal(result.theme, testCase.theme, `${testCase.name}: theme`);
    assert.equal(result.sections, testCase.sections, `${testCase.name}: section count`);
    assert.equal(result.courses, testCase.courses, `${testCase.name}: course count`);
    assert.equal(result.requisites, testCase.requisites, `${testCase.name}: prerequisite text count`);
    assert.equal(result.firstLevel, testCase.firstLevel, `${testCase.name}: first level title`);
    assert.equal(result.viewHidden, false, `${testCase.name}: official plan is visible`);
    assert.equal(result.toolbarHidden, true, `${testCase.name}: progress toolbar is hidden`);
    assert.equal(result.privacyHidden, true, `${testCase.name}: progress storage notice is hidden`);
    assert.equal(result.workspaceHidden, true, `${testCase.name}: planner controls are hidden`);
    assert.ok(result.overflow <= 1, `${testCase.name}: horizontal overflow is ${result.overflow}px`);
    assert.deepEqual(result.progressKeys, [], `${testCase.name}: progress storage remains disabled`);
    assert.deepEqual(browserErrors, [], `${testCase.name}: browser errors`);

    return { name: testCase.name, ...result };
  } finally {
    await context.close();
  }
}

const browser = await chromium.launch({ headless: true });
try {
  const results = [];
  for (const testCase of cases) results.push(await validateCase(browser, testCase));
  console.log(JSON.stringify({ cases: results.length, results }, null, 2));
} finally {
  await browser.close();
}
