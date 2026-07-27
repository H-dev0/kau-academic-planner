const crypto = require("crypto");
const fs = require("fs");
const http = require("http");
const path = require("path");
const url = require("url");
const electiveGroups = require("./web/elective-groups.js");

const root = __dirname;
const webDir = path.join(root, "web");
const programPath = path.join(root, "data", "validated", "kau_accounting.json");
const additionalProgramsPath = path.join(root, "web", "data", "additional_programs.json");
const facultyCatalogPath = path.join(root, "web", "data", "faculty_catalog.json");
const progressPath = path.join(root, "data", "local", "progress.json");
const sessionCookie = "kau_planner_session";
const sessions = new Map();
const foundationLevelRequiredCreditHours = { "level 1": 14, "level 2": 12 };
const foundationCourses = [
  {
    semester_or_level: "level 1",
    course_code: "CPIT 110",
    official_course_name: "Programming & Solving Problems",
    credit_hours: 3,
    prerequisites: [],
  },
  {
    semester_or_level: "level 1",
    course_code: "ELIS 110",
    official_course_name: "English Language 1",
    credit_hours: 3,
    prerequisites: [],
  },
  {
    semester_or_level: "level 1",
    course_code: "ISLS 101",
    official_course_name: "Islamic Studies 1",
    credit_hours: 2,
    prerequisites: [],
  },
  {
    semester_or_level: "level 1",
    course_code: "MATH 100",
    official_course_name: "Mathematics",
    credit_hours: 3,
    prerequisites: [],
  },
  {
    semester_or_level: "level 1",
    course_code: "STAT 110",
    official_course_name: "Statistics 1",
    credit_hours: 3,
    prerequisites: [],
  },
  {
    semester_or_level: "level 2",
    course_code: "ARAB 101",
    official_course_name: "Arabic 1",
    credit_hours: 3,
    prerequisites: [],
  },
  {
    semester_or_level: "level 2",
    course_code: "ECON 107",
    official_course_name: "Economics Foundation",
    credit_hours: 3,
    prerequisites: [],
  },
  {
    semester_or_level: "level 2",
    course_code: "ELIS 120",
    official_course_name: "English Language 2",
    credit_hours: 3,
    prerequisites: [],
  },
  {
    semester_or_level: "level 2",
    course_code: "MATH 110",
    official_course_name: "Mathematics for Business",
    credit_hours: 3,
    prerequisites: [],
  },
];

function readJson(filePath, fallback) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return fallback;
  }
}

function writeJson(filePath, data) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf8");
}

function normalize(code) {
  const value = String(code || "")
    .normalize("NFKC")
    .toUpperCase();
  return /[A-Z]/.test(value)
    ? value.replace(/[^A-Z0-9]/g, "")
    : value
      .replace(/[٠-٩]/g, (digit) => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit)))
      .replace(/[^\p{L}\p{N}]/gu, "");
}

function programId(program) {
  return program.id || normalize(program.program_name).toLowerCase() || "accounting";
}

function coverageState(program) {
  if (program?.coverage_state) return program.coverage_state;
  return program?.planner_available || program?.catalog_status === "active"
    ? "FULL_PLANNER"
    : "CATALOG_ONLY";
}

function isPlannerProgram(program) {
  return coverageState(program) === "FULL_PLANNER";
}

function rejectNonPlanner(res, program) {
  if (isPlannerProgram(program)) return false;
  sendJson(res, 409, {
    error: "interactive planner unavailable",
    code: "PLANNER_UNAVAILABLE",
    coverage_state: coverageState(program),
    program_id: programId(program),
  });
  return true;
}

function requiresCommonFoundation(program) {
  return (
    program?.faculty_id === "EA"
    && program?.degree_level === "Bachelor's degree"
  );
}

function withCommonFoundation(program) {
  const updated = JSON.parse(JSON.stringify(program || {}));
  if (updated.catalog_status === "catalog-only") {
    updated.courses = [];
    return updated;
  }
  if (!requiresCommonFoundation(updated)) {
    updated.courses = Array.isArray(updated.courses) ? updated.courses : [];
    return updated;
  }
  const courses = Array.isArray(updated.courses) ? updated.courses : [];
  const hasLevelOne = courses.some((course) => String(course.semester_or_level).toLowerCase() === "level 1");
  const hasLevelTwo = courses.some((course) => String(course.semester_or_level).toLowerCase() === "level 2");

  updated.courses = [
    ...(hasLevelOne ? [] : foundationCourses.filter((course) => course.semester_or_level === "level 1")),
    ...(hasLevelTwo ? [] : foundationCourses.filter((course) => course.semester_or_level === "level 2")),
    ...courses,
  ];
  updated.level_required_credit_hours = {
    ...foundationLevelRequiredCreditHours,
    ...(updated.level_required_credit_hours || {}),
  };
  const requiredTotal = Object.values(updated.level_required_credit_hours).reduce(
    (sum, value) => sum + (Number.isInteger(value) ? value : 0),
    0,
  );
  if (!updated.total_program_credit_hours && requiredTotal) {
    updated.total_program_credit_hours = requiredTotal;
  }
  return updated;
}

function loadPrograms() {
  const accounting = readJson(programPath, {});
  accounting.id = "accounting";
  const additional = readJson(additionalProgramsPath, { programs: [] });
  const programs = [accounting, ...(additional.programs || [])].filter(
    (program) => program && program.id && Array.isArray(program.courses),
  ).map((program) => withCommonFoundation({
    faculty_id: "EA",
    faculty_name: program.college_name || "economics and administration",
    catalog_status: "active",
    catalog_note: "Course planner is available.",
    ...program,
  }));
  return Object.fromEntries(programs.map((program) => [programId(program), program]));
}

function loadCatalog() {
  const catalog = readJson(facultyCatalogPath, { faculties: [], programs: [] });
  const activePrograms = loadPrograms();
  const catalogPrograms = (catalog.programs || []).map((program) => {
    const active = activePrograms[program.id];
    if (active) {
      return {
        ...program,
        ...active,
        faculty_id: program.faculty_id || active.faculty_id,
        faculty_name: program.faculty_name || active.faculty_name,
        program_code: program.program_code || active.program_code,
        official_source_url: active.official_source_url || program.official_source_url,
        catalog_status: "active",
        catalog_note: "Course planner is available.",
      };
    }
    return {
      university_name: "King Abdulaziz University",
      college_name: program.faculty_name,
      total_program_credit_hours: null,
      source_title: catalog.source_title,
      last_checked_date: catalog.last_checked_date,
      courses: [],
      ...program,
    };
  });
  const catalogIds = new Set(catalogPrograms.map((program) => program.id));
  const activeOnly = Object.values(activePrograms).filter((program) => !catalogIds.has(programId(program)));
  return {
    ...catalog,
    programs: [...catalogPrograms, ...activeOnly],
  };
}

function selectedProgram(req) {
  const programs = Object.fromEntries(loadCatalog().programs.map((program) => [programId(program), program]));
  const parsed = url.parse(req.url, true);
  const requested = String(parsed.query.major || "accounting");
  return programs[requested] || programs.accounting || {};
}

function levelNumber(course) {
  const match = String(course.semester_or_level || "").match(/\d+/);
  return match ? Number(match[0]) : 99;
}

function sortByLevelThenCode(courses) {
  return [...courses].sort((a, b) => {
    const levelDiff = levelNumber(a) - levelNumber(b);
    if (levelDiff) return levelDiff;
    return String(a.course_code || "").localeCompare(String(b.course_code || ""));
  });
}

function planCourses(program, completedCodes, electiveSelections = {}) {
  const selected = new Set(completedCodes.map(normalize));
  const completed = [];
  const available = [];
  const blocked = [];

  for (const course of program.courses || []) {
    const code = normalize(course.course_code);
    if (selected.has(code)) {
      completed.push(course);
      continue;
    }

    const missing = (course.prerequisites || []).filter(
      (prerequisite) => !selected.has(normalize(prerequisite)),
    );
    if (missing.length) {
      blocked.push({ course, missing_prerequisites: missing });
    } else {
      available.push(course);
    }
  }

  const totalCourses = (program.courses || []).filter((course) => course.course_code).length;
  const result = {
    program_name: program.program_name,
    total_courses: totalCourses,
    completed_count: completed.length,
    progress_percent: totalCourses ? Math.round((completed.length / totalCourses) * 1000) / 10 : 0,
    completed_courses: sortByLevelThenCode(completed),
    available_courses: sortByLevelThenCode(available),
    blocked_courses: blocked,
  };
  if (Array.isArray(program.elective_groups) && program.elective_groups.length) {
    Object.assign(result, electiveGroups.electivePlan(program, completedCodes, electiveSelections));
  }
  return result;
}

function parseCookies(header) {
  return Object.fromEntries(
    String(header || "")
      .split(";")
      .map((part) => part.trim().split("="))
      .filter(([key, value]) => key && value)
      .map(([key, value]) => [key, decodeURIComponent(value)]),
  );
}

function sendJson(res, status, payload, headers = {}) {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(body),
    "Cache-Control": "no-store",
    ...headers,
  });
  res.end(body);
}

function sendFile(res, filePath) {
  if (!filePath.startsWith(webDir)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }
  fs.readFile(filePath, (error, data) => {
    if (error) {
      res.writeHead(404);
      res.end("Not found");
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    const type = {
      ".html": "text/html; charset=utf-8",
      ".css": "text/css; charset=utf-8",
      ".js": "application/javascript; charset=utf-8",
      ".json": "application/json; charset=utf-8",
    }[ext] || "application/octet-stream";
    res.writeHead(200, { "Content-Type": type, "Cache-Control": "no-store" });
    res.end(data);
  });
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > 1_000_000) req.destroy();
    });
    req.on("end", () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (error) {
        reject(error);
      }
    });
  });
}

function currentUser(req) {
  const cookies = parseCookies(req.headers.cookie);
  const token = cookies[sessionCookie];
  return token ? sessions.get(token) : null;
}

const server = http.createServer(async (req, res) => {
  const parsed = url.parse(req.url, true);
  const pathname = parsed.pathname;
  const program = selectedProgram(req);

  try {
    if (req.method === "GET" && pathname === "/api/programs") {
      const catalog = loadCatalog();
      sendJson(res, 200, {
        source_title: catalog.source_title,
        official_source_url: catalog.official_source_url,
        last_checked_date: catalog.last_checked_date,
        scope_note: catalog.scope_note,
        faculties: catalog.faculties || [],
        programs: catalog.programs.map((item) => ({
          id: programId(item),
          faculty_id: item.faculty_id,
          faculty_name: item.faculty_name || item.college_name,
          program_name: item.program_name,
          name_ar: item.name_ar || item.program_name_ar,
          name_en: item.name_en || item.program_name_en || item.program_name,
          program_name_ar: item.program_name_ar || item.name_ar,
          program_name_en: item.program_name_en || item.name_en || item.program_name,
          degree_level: item.degree_level,
          degree_level_ar: item.degree_level_ar,
          degree_level_en: item.degree_level_en,
          catalog_status: item.catalog_status || "active",
          catalog_note: item.catalog_note,
          catalog_note_ar: item.catalog_note_ar,
          catalog_note_en: item.catalog_note_en,
          planner_available: Boolean(item.planner_available),
          planner_data_key: item.planner_data_key || null,
          program_code: item.program_code,
          official_source_url: item.official_source_url,
          source_url_ar: item.source_url_ar,
          source_url_en: item.source_url_en,
          official_code: item.official_code,
          total_program_credit_hours: item.total_program_credit_hours,
          course_count: (item.courses || []).length,
          source_title: item.source_title,
          coverage_state: coverageState(item),
          official_plan_view_available: coverageState(item) === "OFFICIAL_PLAN_VIEW" && Boolean(item.official_plan_view),
          official_plan_view_course_count: item.official_plan_view?.visible_course_count ?? null,
          official_plan_view_level_count: item.official_plan_view?.sections?.filter(
            (section) => section.placement === "scheduled",
          ).length ?? null,
          warning_ar: item.official_plan_view?.warning_ar,
          warning_en: item.official_plan_view?.warning_en,
        })),
      });
      return;
    }

    if (req.method === "GET" && pathname === "/api/program") {
      sendJson(res, 200, program);
      return;
    }

    if (req.method === "GET" && pathname === "/api/me") {
      const user = currentUser(req);
      sendJson(res, 200, { authenticated: Boolean(user), user });
      return;
    }

    if (req.method === "POST" && pathname === "/api/login") {
      const payload = await readBody(req);
      const username = String(payload.username || "").trim();
      if (!/^\d{7}$/.test(username)) {
        sendJson(res, 400, { error: "student ID must be exactly 7 numbers" });
        return;
      }
      const token = crypto.randomBytes(24).toString("base64url");
      const user = { id: crypto.createHash("sha1").update(username).digest("hex"), username };
      sessions.set(token, user);
      sendJson(res, 200, { user }, {
        "Set-Cookie": `${sessionCookie}=${encodeURIComponent(token)}; Path=/; SameSite=Lax`,
      });
      return;
    }

    if (req.method === "POST" && pathname === "/api/logout") {
      const cookies = parseCookies(req.headers.cookie);
      sessions.delete(cookies[sessionCookie]);
      sendJson(res, 200, { ok: true }, {
        "Set-Cookie": `${sessionCookie}=; Path=/; Max-Age=0; SameSite=Lax`,
      });
      return;
    }

    if (req.method === "GET" && pathname === "/api/progress") {
      if (rejectNonPlanner(res, program)) return;
      const user = currentUser(req);
      if (!user) {
        sendJson(res, 401, { error: "login required" });
        return;
      }
      const progress = readJson(progressPath, {});
      const key = `${user.id}:${programId(program)}`;
      sendJson(res, 200, { completed_codes: progress[key] || [] });
      return;
    }

    if (req.method === "POST" && pathname === "/api/progress") {
      if (rejectNonPlanner(res, program)) return;
      const user = currentUser(req);
      if (!user) {
        sendJson(res, 401, { error: "login required" });
        return;
      }
      const payload = await readBody(req);
      const progress = readJson(progressPath, {});
      const key = `${user.id}:${programId(program)}`;
      progress[key] = Array.isArray(payload.completed_codes) ? payload.completed_codes : [];
      writeJson(progressPath, progress);
      sendJson(res, 200, { completed_codes: progress[key] });
      return;
    }

    if (req.method === "POST" && pathname === "/api/plan") {
      if (rejectNonPlanner(res, program)) return;
      const payload = await readBody(req);
      const result = planCourses(
        program,
        Array.isArray(payload.completed_codes) ? payload.completed_codes : [],
        payload.elective_selections || {},
      );
      sendJson(res, result.validation_errors?.length ? 400 : 200, result);
      return;
    }

    const safePath = pathname === "/" ? "/index.html" : pathname;
    sendFile(res, path.normalize(path.join(webDir, safePath)));
  } catch (error) {
    sendJson(res, 500, { error: "server error" });
  }
});

const port = process.env.PORT || 8766;
if (require.main === module) {
  server.listen(port, () => {
    console.log(`KAU planner listening on ${port}`);
  });
}

module.exports = { planCourses, server };
