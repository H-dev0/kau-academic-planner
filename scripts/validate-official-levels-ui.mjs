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
    courses: 44,
    kind: "interactive",
  },
  {
    name: "food-en-mobile-dark",
    programId: "catalog-food-and-nutrition",
    facultyId: "HD",
    language: "en",
    theme: "dark",
    viewport: { width: 390, height: 844 },
    courses: 45,
    kind: "interactive",
  },
  {
    name: "graphical-diploma-en-desktop-dark",
    programId: "catalog-associate-diploma-in-graphical-design",
    facultyId: "AL",
    language: "en",
    theme: "dark",
    viewport: { width: 1440, height: 1000 },
    courses: 10,
    kind: "interactive",
  },
  {
    name: "accounting-masters-ar-mobile-light",
    programId: "catalog-master-of-science-in-accounting",
    facultyId: "EA",
    language: "ar",
    theme: "light",
    viewport: { width: 390, height: 844 },
    courses: 12,
    kind: "interactive",
  },
  {
    name: "marine-doctorate-en-desktop-light",
    programId: "catalog-phd-in-marine-physics",
    facultyId: "MR",
    language: "en",
    theme: "light",
    viewport: { width: 1440, height: 1000 },
    courses: 12,
    kind: "interactive",
  },
  {
    name: "retained-radiologic-ar-mobile-dark",
    programId: "catalog-applied-medica-sciences-bachelor-of-radiologic-sciences",
    facultyId: "AM",
    language: "ar",
    theme: "dark",
    viewport: { width: 390, height: 844 },
    kind: "catalog",
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
    if (testCase.kind === "catalog") {
      await page.locator("#catalogOnly:not([hidden])").waitFor();
      const retained = await page.evaluate(() => ({
        language: document.documentElement.lang,
        direction: document.documentElement.dir,
        theme: document.documentElement.dataset.theme,
        catalogHidden: document.querySelector("#catalogOnly")?.hidden,
        workspaceHidden: document.querySelector("#plannerWorkspace")?.hidden,
        toolbarHidden: document.querySelector(".toolbarActions")?.hidden,
        progressKeys: Object.keys(localStorage).filter((key) => key.startsWith("kau-planner-local-progress")),
        overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      }));
      assert.equal(retained.language, testCase.language, `${testCase.name}: language`);
      assert.equal(retained.direction, testCase.language === "en" ? "ltr" : "rtl", `${testCase.name}: direction`);
      assert.equal(retained.theme, testCase.theme, `${testCase.name}: theme`);
      assert.equal(retained.catalogHidden, false, `${testCase.name}: catalog notice`);
      assert.equal(retained.workspaceHidden, true, `${testCase.name}: planner unavailable`);
      assert.equal(retained.toolbarHidden, true, `${testCase.name}: toolbar hidden`);
      assert.deepEqual(retained.progressKeys, [], `${testCase.name}: no progress storage`);
      assert.ok(retained.overflow <= 1, `${testCase.name}: horizontal overflow`);
      assert.deepEqual(browserErrors, [], `${testCase.name}: browser errors`);
      return { name: testCase.name, ...retained };
    }

    await page.locator("#plannerWorkspace:not([hidden])").waitFor();
    await page.locator("#courseChecklist tr[data-course-code]").first().waitFor();
    const progressKey = `kau-planner-local-progress:${testCase.programId}`;

    const result = await page.evaluate(() => ({
      language: document.documentElement.lang,
      direction: document.documentElement.dir,
      theme: document.documentElement.dataset.theme,
      courses: document.querySelectorAll("#courseChecklist tr[data-course-code]").length,
      sourceNotice: document.querySelector("#academicDataNotices")?.textContent || "",
      noticesHidden: document.querySelector("#academicDataNotices")?.hidden,
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
    assert.equal(result.courses, testCase.courses, `${testCase.name}: course count`);
    assert.equal(result.noticesHidden, false, `${testCase.name}: source notice visible`);
    assert.ok(result.sourceNotice.includes(testCase.language === "en"
      ? "This planner was created from the published official plan."
      : "تم إنشاء المخطط من الخطة الرسمية المنشورة."), `${testCase.name}: localized source notice`);
    assert.equal(result.viewHidden, true, `${testCase.name}: read-only view hidden`);
    assert.equal(result.toolbarHidden, false, `${testCase.name}: progress toolbar visible`);
    assert.equal(result.privacyHidden, false, `${testCase.name}: progress storage notice visible`);
    assert.equal(result.workspaceHidden, false, `${testCase.name}: planner controls visible`);
    assert.ok(result.overflow <= 1, `${testCase.name}: horizontal overflow is ${result.overflow}px`);
    assert.deepEqual(result.progressKeys, [], `${testCase.name}: progress storage remains disabled`);

    const checkbox = page.locator('#courseChecklist tr.courseStatus-available input[type="checkbox"]').first();
    await checkbox.check();
    await page.waitForFunction((key) => localStorage.getItem(key) !== null, progressKey);
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.selectOption("#facultySelect", testCase.facultyId);
    await page.selectOption("#majorSelect", testCase.programId);
    await page.locator("#courseChecklist tr.courseStatus-completed").first().waitFor();
    const saved = await page.evaluate((key) => ({
      completed: document.querySelectorAll("#courseChecklist tr.courseStatus-completed").length,
      keys: Object.keys(localStorage).filter((item) => item.startsWith("kau-planner-local-progress")),
      payload: JSON.parse(localStorage.getItem(key) || "null"),
    }), progressKey);
    assert.equal(saved.completed, 1, `${testCase.name}: saved completion reloads`);
    assert.deepEqual(saved.keys, [progressKey], `${testCase.name}: isolated progress key`);
    assert.equal(saved.payload.completed_codes.length, 1, `${testCase.name}: one saved course`);
    assert.deepEqual(browserErrors, [], `${testCase.name}: browser errors`);

    return { name: testCase.name, ...result, completedAfterReload: saved.completed };
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
