import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { chromium } from "playwright";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const webRoot = path.join(repositoryRoot, "web");
const origin = "http://kau-planner.local";
const programId = "catalog-professional-master-in-public-relations";
const progressKey = `kau-planner-local-progress:${programId}`;

const contentTypes = new Map([
  [".css", "text/css; charset=utf-8"],
  [".html", "text/html; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".svg", "image/svg+xml"],
]);

const cases = [
  {
    name: "public-relations-ar-desktop-light",
    language: "ar",
    theme: "light",
    viewport: { width: 1440, height: 1000 },
    expectedCourseName: "نظريات وممارسات العلاقات العامة",
  },
  {
    name: "public-relations-en-mobile-dark",
    language: "en",
    theme: "dark",
    viewport: { width: 390, height: 844 },
    expectedCourseName: "Public Relations Theories and Practices",
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
    await page.locator('#facultySelect option[value="CM"]').waitFor({ state: "attached" });
    await page.selectOption("#facultySelect", "CM");
    await page.locator(`#majorSelect option[value="${programId}"]`).waitFor({ state: "attached" });
    await page.selectOption("#majorSelect", programId);
    await page.locator("#plannerWorkspace:not([hidden])").waitFor();
    await page.locator('#courseChecklist tr[data-course-code="PR601"]').waitFor();

    const initial = await page.evaluate((expectedProgressKey) => ({
      language: document.documentElement.lang,
      direction: document.documentElement.dir,
      theme: document.documentElement.dataset.theme,
      courses: document.querySelectorAll("#courseChecklist tr[data-course-code]").length,
      available: document.querySelectorAll("#courseChecklist tr.courseStatus-available").length,
      blocked: document.querySelectorAll("#courseChecklist tr.courseStatus-blocked").length,
      totalCredits: document.querySelector("#officialCredits")?.textContent?.trim(),
      toolbarHidden: document.querySelector(".toolbarActions")?.hidden,
      privacyHidden: document.querySelector(".privacyNotice")?.hidden,
      workspaceHidden: document.querySelector("#plannerWorkspace")?.hidden,
      officialViewHidden: document.querySelector("#officialPlanView")?.hidden,
      hasProgress: localStorage.getItem(expectedProgressKey) !== null,
    }), progressKey);
    assert.equal(initial.language, testCase.language, `${testCase.name}: language`);
    assert.equal(initial.direction, testCase.language === "en" ? "ltr" : "rtl", `${testCase.name}: direction`);
    assert.equal(initial.theme, testCase.theme, `${testCase.name}: theme`);
    assert.equal(initial.courses, 13, `${testCase.name}: courses`);
    assert.equal(initial.available, 10, `${testCase.name}: initially available`);
    assert.equal(initial.blocked, 3, `${testCase.name}: initially blocked`);
    assert.equal(initial.totalCredits, "39", `${testCase.name}: calculated credit total`);
    assert.equal(initial.toolbarHidden, false, `${testCase.name}: planner toolbar`);
    assert.equal(initial.privacyHidden, false, `${testCase.name}: local storage notice`);
    assert.equal(initial.workspaceHidden, false, `${testCase.name}: planner workspace`);
    assert.equal(initial.officialViewHidden, true, `${testCase.name}: read-only view hidden`);
    assert.equal(initial.hasProgress, false, `${testCase.name}: selection alone does not write progress`);
    await page.locator('#courseChecklist tr[data-course-code="PR601"]').getByText(testCase.expectedCourseName, { exact: true }).waitFor();

    const checkbox = (code) => page.locator(`#courseChecklist tr[data-course-code="${code}"] input[type="checkbox"]`);
    await checkbox("PR601").check();
    await page.locator('#courseChecklist tr[data-course-code="PR605"].courseStatus-available').waitFor();
    await checkbox("PR605").check();
    await page.locator('#courseChecklist tr[data-course-code="PR690"].courseStatus-available').waitFor();
    await checkbox("PR690").check();
    await page.locator('#courseChecklist tr[data-course-code="PR698"].courseStatus-available').waitFor();

    const final = await page.evaluate((expectedProgressKey) => ({
      completed: document.querySelectorAll("#courseChecklist tr.courseStatus-completed").length,
      blocked: document.querySelectorAll("#courseChecklist tr.courseStatus-blocked").length,
      projectAvailable: document.querySelector('#courseChecklist tr[data-course-code="PR698"]')?.classList.contains("courseStatus-available"),
      progressKeys: Object.keys(localStorage).filter((key) => key.startsWith("kau-planner-local-progress")),
      saved: JSON.parse(localStorage.getItem(expectedProgressKey) || "null"),
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    }), progressKey);
    assert.equal(final.completed, 3, `${testCase.name}: completion chain`);
    assert.equal(final.blocked, 0, `${testCase.name}: no permanently blocked course`);
    assert.equal(final.projectAvailable, true, `${testCase.name}: project unlocks after training`);
    assert.deepEqual(final.progressKeys, [progressKey], `${testCase.name}: unique progress key`);
    assert.deepEqual(final.saved.completed_codes.sort(), ["PR601", "PR605", "PR690"], `${testCase.name}: saved completion identities`);
    assert.ok(final.overflow <= 1, `${testCase.name}: horizontal overflow is ${final.overflow}px`);
    assert.deepEqual(browserErrors, [], `${testCase.name}: browser errors`);
    return { name: testCase.name, ...initial, completed: final.completed, finalBlocked: final.blocked, overflow: final.overflow };
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
