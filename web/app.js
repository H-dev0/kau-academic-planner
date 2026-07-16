const state = {
  program: null,
  programs: new Map(),
  faculties: [],
  user: null,
  selected: new Set(),
  search: "",
  level: "all",
  faculty: "",
  major: "",
  statusFilter: "all",
  statusView: "available",
  collapsedLevels: new Set(),
};

const courseChecklist = document.querySelector("#courseChecklist");
const plannerTitle = document.querySelector("#plannerTitle");
const saveProgressButton = document.querySelector("#saveProgressButton");
const resetProgressButton = document.querySelector("#resetProgressButton");
const importButton = document.querySelector("#importButton");
const importInput = document.querySelector("#importInput");
const facultySelect = document.querySelector("#facultySelect");
const majorSelect = document.querySelector("#majorSelect");
const majorStatus = document.querySelector("#majorStatus");
const searchInput = document.querySelector("#searchInput");
const levelFilter = document.querySelector("#levelFilter");
const clearButton = document.querySelector("#clearButton");
const exportButton = document.querySelector("#exportButton");
const themeToggle = document.querySelector("#themeToggle");
const progressText = document.querySelector("#progressText");
const completedCount = document.querySelector("#completedCount");
const availableCount = document.querySelector("#availableCount");
const blockedCount = document.querySelector("#blockedCount");
const officialCredits = document.querySelector("#officialCredits");
const creditsCompleted = document.querySelector("#creditsCompleted");
const creditsRemaining = document.querySelector("#creditsRemaining");
const homeCreditsCompleted = document.querySelector("#homeCreditsCompleted");
const homeCreditsRemaining = document.querySelector("#homeCreditsRemaining");
const homeProgressValue = document.querySelector("#homeProgressValue");
const homeProgressBar = document.querySelector("#homeProgressBar");
const homeAvailableCount = document.querySelector("#homeAvailableCount");
const homeBlockedCount = document.querySelector("#homeBlockedCount");
const creditNote = document.querySelector("#creditNote");
const saveStatus = document.querySelector("#saveStatus");
const completedList = document.querySelector("#completedList");
const availableList = document.querySelector("#availableList");
const blockedList = document.querySelector("#blockedList");
const optionalList = document.querySelector("#optionalList");
const plannerShell = document.querySelector("#planner");
const plannerWorkspace = document.querySelector("#plannerWorkspace");
const plannerOnboarding = document.querySelector("#plannerOnboarding");
const plannerOverviewContent = document.querySelector("#plannerOverviewContent");
const plannerSubtitle = document.querySelector("#plannerSubtitle");
const plannerHeaderMeta = document.querySelector("#plannerHeaderMeta");
const plannerFacultyName = document.querySelector("#plannerFacultyName");
const plannerCourseMeta = document.querySelector("#plannerCourseMeta");
const plannerCreditMeta = document.querySelector("#plannerCreditMeta");
const degreeProgressValue = document.querySelector("#degreeProgressValue");
const degreeProgressBar = document.querySelector("#degreeProgressBar");
const degreeProgressCourseLabel = document.querySelector("#degreeProgressCourseLabel");
const totalCourseCount = document.querySelector("#totalCourseCount");
const courseCatalogSummary = document.querySelector("#courseCatalogSummary");
const filterResultSummary = document.querySelector("#filterResultSummary");
const filterClearButton = document.querySelector("#filterClearButton");
const statusFilters = document.querySelector("#statusFilters");
const contextTotalCount = document.querySelector("#contextTotalCount");
const availableTabCount = document.querySelector("#availableTabCount");
const completedTabCount = document.querySelector("#completedTabCount");
const blockedTabCount = document.querySelector("#blockedTabCount");
const optionalTabCount = document.querySelector("#optionalTabCount");
const filterAllCount = document.querySelector("#filterAllCount");
const filterCompletedCount = document.querySelector("#filterCompletedCount");
const filterAvailableCount = document.querySelector("#filterAvailableCount");
const filterBlockedCount = document.querySelector("#filterBlockedCount");
const statusTabs = Array.from(document.querySelectorAll(".statusTab"));
const statusPanels = Array.from(document.querySelectorAll(".statusPanel"));
const contextViewAllButtons = Array.from(document.querySelectorAll(".contextViewAll"));
const menuToggle = document.querySelector("#menuToggle");
const siteNav = document.querySelector("#siteNav");
const microsoftLogin = document.querySelector("#microsoftLogin");
const microsoftLoginStatus = document.querySelector("#microsoftLoginStatus");
const microsoftLoginButton = document.querySelector("#microsoftLoginButton");
const microsoftLogoutButton = document.querySelector("#microsoftLogoutButton");
const themeStorageKey = "kau-planner-theme";
const localProgressPrefix = "kau-planner-local-progress";
const azureAuthTokenKey = "kau-planner-azure-auth-token";
let microsoftUser = null;
let microsoftAuthAvailable = true;
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



function currentLanguageSafe() {
  try {
    return localStorage.getItem("kau-planner-ui-language") === "en" ? "en" : "ar";
  } catch {
    return "ar";
  }
}

const dynamicText = {
  ar: {
    chooseFaculty: "اختر الكلية",
    chooseMajor: "اختر التخصص",
    chooseFacultyFirst: "اختر الكلية أولاً",
    chooseFacultyAndMajor: "اختر الكلية والتخصص",
    chooseFacultyAndMajorHint: "ابدأ باختيار الكلية، ثم اختر التخصص لعرض الخطة والمقررات.",
    noPrograms: "لا توجد برامج",
    noProgramsHint: "هذه الكلية موجودة في قائمة الجامعة الرسمية، لكن لا توجد برامج بكالوريوس محملة لها داخل الأداة حاليًا.",
    catalogOnly: "فهرس فقط",
    studyPlanNeeded: "الخطة الدراسية مطلوبة",
    loadedCourses: "مقرر محمل",
    catalogSuffix: "فهرس البرنامج",
    plannerSuffix: "مخطط المقررات",
    requiredCredits: "ساعة مطلوبة",
    done: "مجتاز",
    course: "المقرر",
    name: "الاسم",
    credits: "الساعات",
    show: "إظهار",
    hide: "إخفاء",
    missing: "المتطلبات الناقصة",
    earliest: "أقرب مقرر متاح",
    remove: "إزالة",
    creditsUnavailable: "الساعات غير متوفرة",
    officialElective: "مادة اختيارية من المصدر الرسمي",
    noOptional: "لا توجد مواد اختيارية محملة لهذا التخصص.",
    optionalSourceMissing: "لا توجد أسماء رسمية محملة لهذا الخيار.",
    levelMissingNote: "قد تكون بيانات المستوى الأول والثاني ناقصة لهذا التخصص.",
    creditRowsMissingNote: "إجمالي الساعات معروف رسميًا، لكن صفوف المقررات في مصدر الجامعة لا تحتوي على ساعات قابلة للاستخدام لكل مقرر بعد.",
    localSaveIntro: "تسجيل الدخول اختياري. يمكنك استخدام المخطط مباشرة وحفظ التقدم على هذا الجهاز.",
    progressSaved: "تم حفظ التقدم على هذا الجهاز.",
    progressSaveFailed: "تعذر حفظ التقدم على هذا الجهاز.",
    progressReset: "تمت إعادة ضبط التقدم المحفوظ لهذا البرنامج.",
    importSuccess: "تم استيراد {count} مقرر وحفظه على هذا الجهاز.",
    importFailed: "تعذر استيراد الملف. تأكد أنه ملف JSON صالح.",
    progressReadFailed: "تعذر قراءة التقدم المحفوظ محليًا.",
    backendUnavailable: "واجهة البيانات غير متاحة. يعمل المخطط محليًا بدون تسجيل."
  },
  en: {
    chooseFaculty: "Choose a Faculty",
    chooseMajor: "Choose a Major",
    chooseFacultyFirst: "Choose a Faculty first",
    chooseFacultyAndMajor: "Choose a Faculty and Major",
    chooseFacultyAndMajorHint: "Start by choosing a faculty, then choose a major to view the plan and courses.",
    noPrograms: "No programs found",
    noProgramsHint: "This faculty appears in the official university list, but no bachelor programs are loaded in this tool yet.",
    catalogOnly: "Catalog only",
    studyPlanNeeded: "study plan needed",
    loadedCourses: "loaded courses",
    catalogSuffix: "catalog only",
    plannerSuffix: "course planner",
    requiredCredits: "required credits",
    done: "Done",
    course: "Course",
    name: "Name",
    credits: "Credits",
    show: "Show",
    hide: "Hide",
    missing: "Missing",
    earliest: "Earliest available course",
    remove: "Remove",
    creditsUnavailable: "credits unavailable",
    officialElective: "Official elective option",
    noOptional: "No optional subjects are loaded for this major.",
    optionalSourceMissing: "No official name is loaded for this option.",
    levelMissingNote: "Level 1 and 2 data may still be missing for this major.",
    creditRowsMissingNote: "Official total credits are known, but KAU's course rows do not include usable per-course credits yet.",
    localSaveIntro: "Login is optional. You can use the planner directly and save progress on this device.",
    progressSaved: "Progress saved on this device.",
    progressSaveFailed: "Could not save progress on this device.",
    progressReset: "Saved progress for this program was reset.",
    importSuccess: "Imported and saved {count} courses on this device.",
    importFailed: "Could not import the file. Make sure it is valid JSON.",
    progressReadFailed: "Could not read locally saved progress.",
    backendUnavailable: "Backend API unavailable. Running locally without sign-in."
  }
};

function textFor(key) {
  return (dynamicText[currentLanguageSafe()] || dynamicText.ar)[key] || key;
}

function readStoredAuthToken() {
  try {
    return localStorage.getItem(azureAuthTokenKey) || "";
  } catch {
    return "";
  }
}

function saveStoredAuthToken(token) {
  try {
    if (token) localStorage.setItem(azureAuthTokenKey, token);
    else localStorage.removeItem(azureAuthTokenKey);
  } catch {
    // Ignore storage errors; login remains optional.
  }
}

function clearStoredAuthToken() {
  saveStoredAuthToken("");
}

function captureAuthTokenFromHash() {
  const hash = window.location.hash || "";
  if (!hash.includes("token=")) return;
  const params = new URLSearchParams(hash.slice(1));
  const rawToken = params.get("token");
  if (!rawToken) return;
  try {
    const payload = JSON.parse(decodeURIComponent(rawToken));
    if (payload.authenticationToken) saveStoredAuthToken(payload.authenticationToken);
    history.replaceState(null, document.title, window.location.pathname + window.location.search);
  } catch {
    // Leave the page usable even if Azure returns an unexpected token format.
  }
}

function setMicrosoftAuthControls({ loading = false, authenticated = false, authAvailable = true } = {}) {
  if (microsoftLoginButton) {
    microsoftLoginButton.hidden = loading || authenticated;
    microsoftLoginButton.setAttribute("aria-disabled", authAvailable ? "false" : "true");
    microsoftLoginButton.tabIndex = authAvailable && !loading && !authenticated ? 0 : -1;
    if (!authAvailable) microsoftLoginButton.removeAttribute("href");
    else microsoftLoginButton.setAttribute("href", "/.auth/login/aad?post_login_redirect_uri=/");
  }
  if (microsoftLogoutButton) microsoftLogoutButton.hidden = loading || !authenticated;
}

function authDisplayName(user) {
  const nameClaim = user?.claims?.find?.((claim) => claim.typ === "name" || claim.typ === "preferred_username");
  return user?.userDetails || user?.user_id || nameClaim?.val || "";
}

function authEmail(user) {
  const emailClaim = user?.claims?.find?.((claim) => ["preferred_username", "email", "upn"].includes(claim.typ));
  return user?.userDetails || user?.user_id || emailClaim?.val || "";
}

function isKauStudentUser(user) {
  return authEmail(user).toLowerCase().endsWith("@stu.kau.edu.sa");
}

async function loadMicrosoftUser() {
  setMicrosoftAuthControls({ loading: true });
  try {
    const authToken = readStoredAuthToken();
    const headers = { Accept: "application/json" };
    if (authToken) headers["X-ZUMO-AUTH"] = authToken;
    const response = await fetch("/.auth/me?_=" + Date.now(), { cache: "no-store", credentials: "include", headers });
    if (response.status === 401) {
      clearStoredAuthToken();
      microsoftAuthAvailable = true;
      microsoftUser = null;
      applyMicrosoftLoginState();
      return;
    }
    if (!response.ok) throw new Error("auth unavailable");
    const payload = await response.json();
    microsoftAuthAvailable = true;
    microsoftUser = Array.isArray(payload) ? payload[0] || null : null;
    if (!microsoftUser) clearStoredAuthToken();
  } catch {
    microsoftAuthAvailable = false;
    microsoftUser = null;
  }
  applyMicrosoftLoginState();
}

function applyMicrosoftLoginState() {
  const authenticated = Boolean(microsoftUser);
  const signedIn = authenticated && isKauStudentUser(microsoftUser);
  if (microsoftLogin) microsoftLogin.classList.toggle("accessGranted", signedIn);
  setMicrosoftAuthControls({ authenticated, authAvailable: microsoftAuthAvailable });
  if (microsoftLoginStatus) {
    if (!microsoftAuthAvailable) {
      microsoftLoginStatus.textContent = currentLanguageSafe() === "en"
        ? "Microsoft sign-in is temporarily unavailable. You can use the planner without signing in."
        : "تسجيل Microsoft غير متاح مؤقتًا. يمكنك استخدام المخطط بدون تسجيل.";
      return;
    }
    if (authenticated && !signedIn) {
      microsoftLoginStatus.textContent = currentLanguageSafe() === "en"
        ? "This Microsoft account is signed in, but it is not a KAU student email. Use an account ending with @stu.kau.edu.sa, or continue without login."
        : "تم تسجيل الدخول، لكن الحساب ليس بريدًا طلابيًا لجامعة الملك عبدالعزيز. استخدم حسابًا ينتهي بـ @stu.kau.edu.sa أو تابع بدون تسجيل.";
      return;
    }
    microsoftLoginStatus.textContent = signedIn
      ? (currentLanguageSafe() === "en"
        ? `Signed in as ${authDisplayName(microsoftUser) || "Microsoft user"}. Planner remains available without sign-in.`
        : `تم تسجيل الدخول باسم ${authDisplayName(microsoftUser) || "مستخدم Microsoft"}. يبقى المخطط متاحًا بدون تسجيل.`)
      : (currentLanguageSafe() === "en"
        ? "No login is required. You can use the planner directly."
        : "لا تحتاج إلى تسجيل دخول. يمكنك استخدام المخطط مباشرة.");
  }
}

function normalize(code) {
  return String(code || "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
}

function courseCode(course) {
  return normalize(course.course_code);
}

function withCommonFoundation(program) {
  const updated = structuredClone(program);
  if (updated.catalog_status === "catalog-only") {
    updated.courses = [];
    return updated;
  }
  if (updated.faculty_id && updated.faculty_id !== "EA") {
    updated.courses = Array.isArray(updated.courses) ? updated.courses : [];
    return updated;
  }
  const courses = Array.isArray(updated.courses) ? updated.courses : [];
  const hasLevelOne = courses.some(
    (course) => String(course.semester_or_level).toLowerCase() === "level 1",
  );
  const hasLevelTwo = courses.some(
    (course) => String(course.semester_or_level).toLowerCase() === "level 2",
  );

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

function applyTheme(theme) {
  const dark = theme === "dark";
  const english = currentLanguageSafe() === "en";
  const label = dark ? (english ? "Light" : "فاتح") : (english ? "Dark" : "داكن");
  document.documentElement.dataset.theme = dark ? "dark" : "light";
  const labelTarget = themeToggle.querySelector("span");
  if (labelTarget) labelTarget.textContent = label;
  else themeToggle.textContent = label;
  themeToggle.setAttribute("aria-pressed", String(dark));
  themeToggle.setAttribute("aria-label", dark ? (english ? "Use light theme" : "استخدام المظهر الفاتح") : (english ? "Use dark theme" : "استخدام المظهر الداكن"));
}

function loadTheme() {
  const savedTheme = localStorage.getItem(themeStorageKey);
  applyTheme(savedTheme === "dark" ? "dark" : "light");
}

async function api(path, options = {}) {
  const response = await fetch(path, {
    credentials: "same-origin",
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options,
  });
  if (!response.ok) throw new Error(`Request failed: ${response.status}`);
  return response.json();
}

function visibleCourses() {
  const term = state.search.trim().toLowerCase();
  return (state.program.courses || []).filter((course) => {
    if (state.level !== "all" && course.semester_or_level !== state.level) return false;
    if (!term) return true;
    return `${course.course_code} ${course.official_course_name}`.toLowerCase().includes(term);
  });
}

function buildPlan() {
  const completed = [];
  const available = [];
  const blocked = [];

  for (const course of state.program.courses || []) {
    const code = courseCode(course);
    if (state.selected.has(code)) {
      completed.push(course);
      continue;
    }

    const missing = course.prerequisites.filter(
      (prerequisite) => !state.selected.has(normalize(prerequisite)),
    );
    if (missing.length) blocked.push({ course, missing });
    else available.push(course);
  }

  return { completed, available, blocked };
}

function completedCodes() {
  return Array.from(state.selected).sort();
}

function localProgressKey(major = state.major) {
  return `${localProgressPrefix}:${major}`;
}

function localProgressPayload() {
  return {
    version: 1,
    saved_at: new Date().toISOString(),
    major: state.major,
    faculty: state.faculty,
    completed_codes: completedCodes(),
  };
}

async function saveProgress(showMessage = false) {
  if (isCatalogOnly() || isNoPrograms()) return;
  try {
    localStorage.setItem(localProgressKey(), JSON.stringify(localProgressPayload()));
    if (showMessage) saveStatus.textContent = textFor("progressSaved");
  } catch {
    saveStatus.textContent = textFor("progressSaveFailed");
  }
}

function setCompleted(code, checked) {
  if (checked) state.selected.add(code);
  else state.selected.delete(code);
  render();
  saveProgress();
}

function serializablePlan() {
  const plan = buildPlan();
  return {
    version: 1,
    exported_at: new Date().toISOString(),
    storage: "browser-local",
    program: {
      university_name: state.program.university_name,
      college_name: state.program.college_name,
      program_name: state.program.program_name,
      degree_level: state.program.degree_level,
      total_program_credit_hours: state.program.total_program_credit_hours,
      official_source_url: state.program.official_source_url,
      last_checked_date: state.program.last_checked_date,
    },
    completed_codes: completedCodes(),
    completed_courses: sortByLevelThenCode(plan.completed).map((course) => course.course_code),
    recommended_next: recommendedCourses(plan.available).map((course) => ({
      course_code: course.course_code,
      official_course_name: course.official_course_name,
      semester_or_level: course.semester_or_level,
    })),
    blocked_courses: plan.blocked.map((item) => ({
      course_code: item.course.course_code,
      official_course_name: item.course.official_course_name,
      semester_or_level: item.course.semester_or_level,
      missing_prerequisites: item.missing,
    })),
  };
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

function recommendedCourses(available) {
  return sortByLevelThenCode(available).slice(0, 7);
}

function setupLevelFilter() {
  const levels = [...new Set((state.program?.courses || []).map((course) => course.semester_or_level))]
    .filter(Boolean)
    .sort((a, b) => levelNumber({ semester_or_level: a }) - levelNumber({ semester_or_level: b }));

  if (!levelFilter) return;
  levelFilter.innerHTML = `<option value="all">${plannerText().allLevels}</option>`;
  for (const level of levels) {
    const option = document.createElement("option");
    option.value = level;
    option.textContent = level;
    levelFilter.append(option);
  }
}

function setupFacultySelect() {
  const faculties = new Map();
  for (const faculty of state.faculties) {
    faculties.set(faculty.id, faculty.name || faculty.id);
  }
  if (!faculties.size) {
    for (const program of state.programs.values()) {
      if (program.faculty_id) faculties.set(program.faculty_id, program.faculty_name || program.college_name || program.faculty_id);
    }
  }
  facultySelect.innerHTML = "";
  const placeholder = document.createElement("option");
  placeholder.value = "";
  placeholder.textContent = textFor("chooseFaculty");
  facultySelect.append(placeholder);
  for (const [id, name] of faculties) {
    const option = document.createElement("option");
    option.value = id;
    option.textContent = name;
    facultySelect.append(option);
  }
  if (state.faculty && !faculties.has(state.faculty)) state.faculty = "";
  facultySelect.value = state.faculty;
}

function currentFacultyName() {
  return state.faculties.find((faculty) => faculty.id === state.faculty)?.name || state.faculty;
}

function setupMajorSelect() {
  majorSelect.innerHTML = "";
  const placeholder = document.createElement("option");
  placeholder.value = "";
  placeholder.textContent = state.faculty
    ? textFor("chooseMajor")
    : textFor("chooseFacultyFirst");
  majorSelect.append(placeholder);
  if (!state.faculty) {
    state.major = "";
    majorSelect.value = "";
    return;
  }
  const programs = Array.from(state.programs.values()).filter((program) => program.faculty_id === state.faculty);
  if (!programs.length) {
    const option = document.createElement("option");
    option.value = "";
    option.textContent = textFor("noPrograms");
    majorSelect.append(option);
    state.major = "";
    majorSelect.value = "";
    return;
  }
  for (const program of programs) {
    const option = document.createElement("option");
    option.value = program.id;
    const shortName = program.program_name
      .replace(/^Bachelor of Science in /, "")
      .replace(/^Bachelor(?:’s|'s)? Degree in /, "")
      .replace(/^Bachelor of /, "");
    option.textContent = program.catalog_status === "catalog-only" ? `${shortName} (${textFor("studyPlanNeeded")})` : shortName;
    majorSelect.append(option);
  }
  if (state.major && !programs.some((program) => program.id === state.major)) state.major = "";
  majorSelect.value = state.major;
}

function isNoSelection() {
  return !state.program || state.program.catalog_status === "no-selection";
}

function isCatalogOnly() {
  return state.program && state.program.catalog_status === "catalog-only";
}

function isNoPrograms() {
  return state.program && state.program.catalog_status === "no-programs";
}

function noProgramsProgram() {
  return {
    id: "no-programs",
    faculty_id: state.faculty,
    faculty_name: currentFacultyName(),
    program_name: textFor("noPrograms"),
    degree_level: "Bachelor",
    catalog_status: "no-programs",
    catalog_note: textFor("noPrograms"),
    courses: [],
  };
}

function noSelectionProgram() {
  return {
    id: "no-selection",
    faculty_id: state.faculty,
    faculty_name: currentFacultyName(),
    program_name: textFor("chooseFacultyAndMajor"),
    degree_level: "Bachelor",
    catalog_status: "no-selection",
    courses: [],
    total_program_credit_hours: null,
  };
}

function requiredCreditTotal(courses) {
  const level = courses[0]?.semester_or_level;
  const override = state.program.level_required_credit_hours?.[level];
  if (Number.isInteger(override)) return override;
  return courses
    .filter((course) => course.counts_toward_program_credit_total !== false)
    .reduce((sum, course) => sum + (Number.isInteger(course.credit_hours) ? course.credit_hours : 0), 0);
}

function groupCoursesByLevel(courses) {
  const groups = new Map();
  for (const course of sortByLevelThenCode(courses)) {
    const level = course.semester_or_level || "Other";
    if (!groups.has(level)) groups.set(level, []);
    groups.get(level).push(course);
  }
  return groups;
}

const plannerPresentationText = {
  ar: {
    defaultSubtitle: "ابدأ باختيار برنامجك، ثم حدّد المقررات التي اجتزتها لرؤية تقدمك والمواد المتاحة.",
    selectedSubtitle: "راجع تقدمك، وابحث في مقررات الخطة، وحدّث المواد التي اجتزتها من مساحة عمل واحدة.",
    catalogSubtitle: "يمكنك استعراض معلومات البرنامج، لكن تتبع المتطلبات يحتاج إلى تحميل الخطة الدراسية.",
    creditSummaryHelp: "تُحتسب الساعات من المقررات التي حددتها كمجتازة.",
    creditsUnavailableHelp: "إجمالي الساعات غير متاح في بيانات هذا البرنامج.",
    unavailable: "غير متاح",
    course: "مقرر",
    courses: "مقررات",
    credit: "ساعة",
    progress: "نسبة إكمال الخطة",
    completedCredits: "الساعات المنجزة",
    totalCredits: "إجمالي الساعات",
    remainingCredits: "الساعات المتبقية",
    completedCourses: "المقررات المجتازة",
    availableNow: "متاح الآن",
    blocked: "محجوب",
    totalCourses: "إجمالي المقررات",
    programKicker: "البرنامج الدراسي",
    chooseProgram: "اختر الكلية والتخصص",
    catalogKicker: "كتالوج الخطة",
    catalogTitle: "المقررات",
    catalogAll: "جميع المقررات",
    search: "البحث في المقررات",
    level: "المستوى",
    allLevels: "كل المستويات",
    clearFilters: "مسح التصفية",
    clearSelected: "مسح المحدد",
    all: "الكل",
    completed: "مجتاز",
    available: "متاح",
    optional: "اختياري",
    contextKicker: "ملخص سريع",
    contextTitle: "حالة المقررات",
    filterAria: "تصفية المقررات حسب الحالة",
    tabsAria: "عرض حالة المقررات",
    details: "التفاصيل",
    hideDetails: "إخفاء التفاصيل",
    missing: "المتطلبات الناقصة",
    status: "الحالة",
    noFilterResults: "لا توجد مقررات تطابق التصفية الحالية.",
    emptyHelp: "ستظهر المقررات هنا عندما تصبح هذه القائمة متاحة.",
    completedEmptyHelp: "حدّد مربع أي مقرر اجتزته لإضافته إلى هذه القائمة.",
    blockedEmptyHelp: "لا توجد متطلبات ناقصة للمقررات الحالية.",
    optionalEmptyHelp: "لا توجد مواد اختيارية محملة لهذا التخصص.",
    onboardingKicker: "ابدأ من هنا",
    onboardingTitle: "ثلاث خطوات لرؤية خطتك بوضوح",
    onboardingText: "لن تظهر بطاقات فارغة قبل اختيار البرنامج.",
    onboardingSteps: ["اختر الكلية", "اختر التخصص", "حدّد المواد المجتازة"],
    localStrong: "يعمل المخطط محليًا بدون تسجيل دخول.",
    localText: "تسجيل Microsoft اختياري، والمزامنة بين الأجهزة غير مفعلة حاليًا.",
    reset: "إعادة التعيين",
    exported: "تم تصدير التقدم الحالي.",
    viewAllCatalog: "عرض الكل في الكتالوج",
  },
  en: {
    defaultSubtitle: "Choose your program, then mark completed courses to see your progress and what is available.",
    selectedSubtitle: "Review progress, search the study plan, and update completed courses from one focused workspace.",
    catalogSubtitle: "You can review this program, but prerequisite tracking requires a loaded study plan.",
    creditSummaryHelp: "Credits are calculated from the courses you mark as completed.",
    creditsUnavailableHelp: "The official credit total is unavailable in this program data.",
    unavailable: "Unavailable",
    course: "course",
    courses: "courses",
    credit: "credits",
    progress: "Degree completion",
    completedCredits: "Credits completed",
    totalCredits: "Total credits",
    remainingCredits: "Credits remaining",
    completedCourses: "Completed courses",
    availableNow: "Available now",
    blocked: "Blocked",
    totalCourses: "Total courses",
    programKicker: "Study program",
    chooseProgram: "Choose a Faculty and Major",
    catalogKicker: "Study plan catalog",
    catalogTitle: "Courses",
    catalogAll: "All courses",
    search: "Search courses",
    level: "Level",
    allLevels: "All levels",
    clearFilters: "Clear filters",
    clearSelected: "Clear selected",
    all: "All",
    completed: "Completed",
    available: "Available",
    optional: "Electives",
    contextKicker: "Quick summary",
    contextTitle: "Course status",
    filterAria: "Filter courses by status",
    tabsAria: "View courses by status",
    details: "Details",
    hideDetails: "Hide details",
    missing: "Missing prerequisites",
    status: "Status",
    noFilterResults: "No courses match the current filters.",
    emptyHelp: "Courses will appear here when this list has results.",
    completedEmptyHelp: "Select a completed-course checkbox to add it to this list.",
    blockedEmptyHelp: "There are no missing prerequisites for the current courses.",
    optionalEmptyHelp: "No elective courses are loaded for this program.",
    onboardingKicker: "Start here",
    onboardingTitle: "Three steps to understand your plan",
    onboardingText: "Empty dashboard cards stay hidden until you choose a program.",
    onboardingSteps: ["Choose a faculty", "Choose a major", "Mark completed courses"],
    localStrong: "The planner works locally without signing in.",
    localText: "Microsoft sign-in is optional, and cross-device sync is not active.",
    reset: "Reset",
    exported: "Current progress was exported.",
    viewAllCatalog: "View all in catalog",
  },
};

function plannerText() {
  return plannerPresentationText[currentLanguageSafe()] || plannerPresentationText.ar;
}

function updateCountControlLabel(control, label) {
  if (!control) return;
  const textNode = Array.from(control.childNodes).find((node) => node.nodeType === Node.TEXT_NODE);
  if (textNode) textNode.nodeValue = label + " ";
}

function formatCourseCount(count) {
  const text = plannerText();
  return `${count} ${count === 1 ? text.course : text.courses}`;
}

function displayLevelLabel(level) {
  const value = String(level || "").trim();
  const match = value.match(/^level\s*(\d+)$/i);
  if (!match) return value;
  const number = Number(match[1]);
  if (currentLanguageSafe() === "en") return `Level ${number}`;
  const arabicLevels = {
    1: "المستوى الأول",
    2: "المستوى الثاني",
    3: "المستوى الثالث",
    4: "المستوى الرابع",
    5: "المستوى الخامس",
    6: "المستوى السادس",
    7: "المستوى السابع",
    8: "المستوى الثامن",
    9: "المستوى التاسع",
    10: "المستوى العاشر",
  };
  return arabicLevels[number] || `المستوى ${number}`;
}

function hasArabicText(value) {
  return /[\u0600-\u06ff\u0750-\u077f\ufb50-\ufdff\ufe70-\ufeff]/.test(String(value || ""));
}

function courseNamePresentation(course) {
  const official = String(course?.official_course_name || "").normalize("NFKC").trim();
  const hasArabic = hasArabicText(official);
  const cleanedArabic = hasArabic ? official.replace(/^(?:I{1,4})\s+(?=[\u0600-\u06ff])/i, "").trim() : "";
  const englishTranslation = hasArabic ? courseNameEnglish(official) : "";
  if (currentLanguageSafe() === "en") {
    return {
      primary: englishTranslation || official,
      primaryLang: englishTranslation || !hasArabic ? "en" : "ar",
      secondary: englishTranslation ? cleanedArabic : "",
      secondaryLang: "ar",
    };
  }
  return {
    primary: hasArabic ? cleanedArabic : official,
    primaryLang: hasArabic ? "ar" : "en",
    secondary: hasArabic ? englishTranslation : "",
    secondaryLang: "en",
  };
}

function appendCourseNames(target, course) {
  const names = courseNamePresentation(course);
  const primary = document.createElement("span");
  primary.className = "name courseNamePrimary";
  primary.lang = names.primaryLang;
  primary.textContent = names.primary;
  target.append(primary);
  if (names.secondary && names.secondary !== names.primary) {
    const secondary = document.createElement("span");
    secondary.className = "courseNameSecondary";
    secondary.lang = names.secondaryLang;
    secondary.textContent = names.secondary;
    target.append(secondary);
  }
}

function displayCreditValue(value) {
  return ["Unknown", "Needs source", "--", ""].includes(String(value)) ? plannerText().unavailable : String(value);
}

function applyPlannerPresentationLanguage() {
  const text = plannerText();
  const set = (selector, value) => {
    const element = document.querySelector(selector);
    if (element) element.textContent = value;
  };

  set(".privacyNoticeIcon", "i");
  set(".privacyNotice div strong", text.localStrong);
  set(".privacyNotice div > span", text.localText);
  set("#plannerOnboarding .eyebrow", text.onboardingKicker);
  set("#plannerOnboarding strong", text.onboardingTitle);
  set("#plannerOnboarding > div > span", text.onboardingText);
  document.querySelectorAll(".onboardingSteps li").forEach((item, index) => {
    const number = item.querySelector("span");
    item.replaceChildren(number, text.onboardingSteps[index] || "");
  });

  set("#degreeProgressLabel", text.progress);
  set("#creditsDoneLabel", text.completedCredits);
  set("#creditsTotalLabel", text.totalCredits);
  set("#creditsLeftLabel", text.remainingCredits);
  set(".plannerMetrics .metricDone span", text.completedCourses);
  set(".plannerMetrics .metricAvailable span", text.availableNow);
  set(".plannerMetrics .metricBlocked span", text.blocked);
  set(".plannerMetrics .metricTotal span", text.totalCourses);
  set(".majorStripIntro .eyebrow", text.programKicker);
  set(".majorStripIntro h3", text.chooseProgram);
  set(".courseCatalog .panelHead .eyebrow", text.catalogKicker);
  set("#courseCatalogTitle", text.catalogTitle);
  set(".searchBox label", text.search);
  set(".levelFilterField label", text.level);
  set("#filterClearButton", text.clearFilters);
  set("#clearButton", text.clearSelected);
  set(".contextHead .eyebrow", text.contextKicker);
  set(".contextHead h2", text.contextTitle);
  set("#availablePanel h3", text.availableNow);
  set("#completedPanel h3", text.completedCourses);
  set("#blockedPanel h3", text.blocked);
  set("#optionalPanel h3", text.optional);
  set("#resetProgressButton", text.reset);

  if (levelFilter?.options[0]) levelFilter.options[0].textContent = text.allLevels;
  statusFilters?.setAttribute("aria-label", text.filterAria);
  document.querySelector(".statusTabs")?.setAttribute("aria-label", text.tabsAria);
  document.querySelector("#plannerOverview")?.setAttribute("aria-label", text.progress);
  degreeProgressBar?.setAttribute("aria-label", text.progress);

  const filterLabels = {
    all: text.all,
    completed: text.completed,
    available: text.available,
    blocked: text.blocked,
  };
  statusFilters?.querySelectorAll(".statusFilter").forEach((button) => {
    updateCountControlLabel(button, filterLabels[button.dataset.status]);
  });

  const tabLabels = {
    available: text.available,
    completed: text.completed,
    blocked: text.blocked,
    optional: text.optional,
  };
  statusTabs.forEach((button) => updateCountControlLabel(button, tabLabels[button.dataset.view]));
  contextViewAllButtons.forEach((button) => {
    button.textContent = text.viewAllCatalog;
  });
}

function creditSummary(completed) {
  const totalCredits = state.program.total_program_credit_hours;
  const hasCourseCredits = state.program.courses.some(
    (course) => Number.isInteger(course.credit_hours) && course.credit_hours > 0,
  );

  if (!hasCourseCredits) {
    return {
      completedText: completed.length ? "Needs source" : "0",
      remainingText: completed.length ? "Needs source" : String(totalCredits || "--"),
      note:
        textFor("creditRowsMissingNote"),
    };
  }

  const completedWithCredits = completed.filter(
    (course) => Number.isInteger(course.credit_hours) && course.credit_hours > 0,
  );
  const missingCompletedCredits = completed.length - completedWithCredits.length;
  const completedCredits = completedWithCredits.reduce(
    (sum, course) => sum + course.credit_hours,
    0,
  );

  if (missingCompletedCredits > 0 || completed.length === 0) {
    return {
      completedText: completed.length ? "Unknown" : "0",
      remainingText: completed.length ? "Unknown" : String(totalCredits || "--"),
      note:
        missingCompletedCredits > 0
          ? "Official per-course credits are missing for selected courses."
          : "",
    };
  }

  return {
    completedText: String(completedCredits),
    remainingText: Number.isInteger(totalCredits)
      ? String(Math.max(totalCredits - completedCredits, 0))
      : "Unknown",
    note: "",
  };
}

function plannerStatusLookup(plan) {
  const lookup = new Map();
  plan.completed.forEach((course) => lookup.set(courseCode(course), { status: "completed", missing: [] }));
  plan.available.forEach((course) => lookup.set(courseCode(course), { status: "available", missing: [] }));
  plan.blocked.forEach((item) => lookup.set(courseCode(item.course), { status: "blocked", missing: item.missing }));
  return lookup;
}

function statusLabel(status) {
  const text = plannerText();
  return {
    completed: text.completed,
    available: text.available,
    blocked: text.blocked,
    neutral: text.status,
  }[status] || text.status;
}

function setStatusView(view) {
  if (!["available", "completed", "blocked", "optional"].includes(view)) return;
  state.statusView = view;
  statusTabs.forEach((tab) => {
    const active = tab.dataset.view === view;
    tab.classList.toggle("active", active);
    tab.setAttribute("aria-selected", String(active));
    tab.tabIndex = active ? 0 : -1;
  });
  statusPanels.forEach((panel) => {
    panel.hidden = panel.id !== `${view}Panel`;
  });
}

function setStatusFilter(status, { revealCatalog = false } = {}) {
  state.statusFilter = ["all", "completed", "available", "blocked"].includes(status) ? status : "all";
  statusFilters?.querySelectorAll(".statusFilter").forEach((button) => {
    const active = button.dataset.status === state.statusFilter;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
  });
  renderChecklist(buildPlan());
  if (revealCatalog) {
    document.querySelector(".courseCatalog")?.scrollIntoView({
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
      block: "start",
    });
    statusFilters?.querySelector(`[data-status="${state.statusFilter}"]`)?.focus({ preventScroll: true });
  }
}

function renderChecklist(plan = buildPlan()) {
  courseChecklist.innerHTML = "";
  if (isNoSelection()) {
    const empty = document.createElement("div");
    empty.className = "majorEmpty";
    const title = document.createElement("strong");
    title.textContent = textFor("chooseFacultyAndMajor");
    const note = document.createElement("span");
    note.textContent = textFor("chooseFacultyAndMajorHint");
    empty.append(title, note);
    courseChecklist.append(empty);
    return;
  }
  if (isNoPrograms()) {
    const empty = document.createElement("div");
    empty.className = "majorEmpty";
    const title = document.createElement("strong");
    title.textContent = textFor("noPrograms");
    const note = document.createElement("span");
    note.textContent = textFor("noProgramsHint");
    empty.append(title, note);
    courseChecklist.append(empty);
    return;
  }
  if (isCatalogOnly()) {
    const empty = document.createElement("div");
    empty.className = "majorEmpty";
    const title = document.createElement("strong");
    title.textContent = "الخطة الدراسية غير محملة بعد.";
    const note = document.createElement("span");
    note.textContent = "هذا البرنامج موجود في فهرس الجامعة، لكن جدول الخطة غير متوفر داخل الأداة بعد. أرسل الخطة الدراسية أو الساعات لتفعيل التتبع الكامل.";
    empty.append(title, note);
    if (state.program.official_source_url) {
      const link = document.createElement("a");
      link.href = state.program.official_source_url;
      link.target = "_blank";
      link.rel = "noreferrer";
      link.textContent = currentLanguageSafe() === "en" ? "Official source" : "المصدر الرسمي";
      empty.append(link);
    }
    courseChecklist.append(empty);
    return;
  }
  const text = plannerText();
  const statusLookup = plannerStatusLookup(plan);
  const courses = visibleCourses().filter((course) => {
    if (state.statusFilter === "all") return true;
    return statusLookup.get(courseCode(course))?.status === state.statusFilter;
  });
  const resultText = formatCourseCount(courses.length);
  if (filterResultSummary) filterResultSummary.textContent = resultText;
  if (courseCatalogSummary) courseCatalogSummary.textContent = resultText;

  if (!courses.length) {
    const empty = document.createElement("div");
    empty.className = "plannerFilterEmpty";
    empty.innerHTML = `<span aria-hidden="true">⌕</span><strong>${text.noFilterResults}</strong>`;
    courseChecklist.append(empty);
    return;
  }

  const fragment = document.createDocumentFragment();

  for (const [level, levelCourses] of groupCoursesByLevel(courses)) {
    const tableBlock = document.createElement("section");
    tableBlock.className = "studyPlanTable";
    const requiredCredits = requiredCreditTotal(levelCourses);
    const levelCompleted = levelCourses.filter((course) => statusLookup.get(courseCode(course))?.status === "completed").length;
    const collapsed = state.collapsedLevels.has(level);
    const tableId = `level-${String(level).replace(/[^a-zA-Z0-9]+/g, "-").toLowerCase()}`;
    tableBlock.innerHTML = `
      <div class="studyPlanHeader">
        <div>
          <strong>${displayLevelLabel(level)}</strong>
          <span>${formatCourseCount(levelCourses.length)} · ${levelCompleted} ${text.completed} · ${requiredCredits} ${text.credit}</span>
        </div>
        <button class="levelToggle secondaryButton" type="button" aria-expanded="${!collapsed}" aria-controls="${tableId}">
          ${collapsed ? textFor("show") : textFor("hide")}
        </button>
      </div>
      <table id="${tableId}" ${collapsed ? "hidden" : ""}>
        <thead>
          <tr>
            <th class="doneColumn">${textFor("done")}</th>
            <th>${textFor("course")}</th>
            <th class="creditColumn">${textFor("credits")}</th>
            <th class="statusColumn">${text.status}</th>
            <th class="detailsColumn"><span class="srOnly">${text.details}</span></th>
          </tr>
        </thead>
        <tbody></tbody>
      </table>
    `;

    const toggle = tableBlock.querySelector(".levelToggle");
    toggle.addEventListener("click", () => {
      if (state.collapsedLevels.has(level)) state.collapsedLevels.delete(level);
      else state.collapsedLevels.add(level);
      renderChecklist();
    });

    const body = tableBlock.querySelector("tbody");
    for (const course of levelCourses) {
      const code = courseCode(course);
      const presentation = statusLookup.get(code) || { status: "neutral", missing: [] };
      const row = document.createElement("tr");
      if (state.selected.has(code)) row.className = "selectedRow";
      row.classList.add(`courseStatus-${presentation.status}`);
      row.dataset.courseCode = code;
      const credits = Number.isInteger(course.credit_hours) ? course.credit_hours : "--";
      const optionNote =
        course.counts_toward_program_credit_total === false
          ? `<span class="meta">${course.credit_total_exclusion_reason || "Alternative option"}</span>`
          : "";

      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.checked = state.selected.has(code);
      checkbox.setAttribute(
        "aria-label",
        currentLanguageSafe() === "en"
          ? `Mark ${course.course_code} completed`
          : `تحديد ${course.course_code} كمقرر مجتاز`,
      );
      checkbox.addEventListener("change", () => setCompleted(code, checkbox.checked));

      const doneCell = document.createElement("td");
      doneCell.className = "doneColumn";
      doneCell.dataset.label = textFor("done");
      const checkTarget = document.createElement("label");
      checkTarget.className = "courseCheckTarget";
      checkTarget.append(checkbox);
      doneCell.append(checkTarget);

      const identityCell = document.createElement("td");
      identityCell.className = "courseIdentityCell";
      const codeElement = document.createElement("span");
      codeElement.className = "code";
      codeElement.lang = "en";
      codeElement.textContent = course.course_code;
      identityCell.append(codeElement);
      appendCourseNames(identityCell, course);
      if (optionNote) identityCell.insertAdjacentHTML("beforeend", optionNote);

      const creditCell = document.createElement("td");
      creditCell.className = "creditColumn";
      creditCell.dataset.label = textFor("credits");
      const creditValue = document.createElement("span");
      creditValue.className = "creditValue";
      creditValue.textContent = credits;
      const creditUnit = document.createElement("span");
      creditUnit.className = "creditUnit";
      creditUnit.textContent = text.credit;
      creditCell.append(creditValue, creditUnit);

      const statusCell = document.createElement("td");
      statusCell.className = "statusColumn";
      statusCell.dataset.label = text.status;
      statusCell.innerHTML = `<span class="courseStatusBadge ${presentation.status}">${statusLabel(presentation.status)}</span>`;

      const detailsCell = document.createElement("td");
      detailsCell.className = "detailsColumn";
      if (presentation.status === "blocked" && presentation.missing.length) {
        const detailsId = `course-details-${String(code).replace(/[^a-zA-Z0-9]+/g, "-").toLowerCase()}`;
        const button = document.createElement("button");
        button.type = "button";
        button.className = "courseDetailsToggle";
        button.textContent = text.details;
        button.setAttribute("aria-expanded", "false");
        button.setAttribute("aria-controls", detailsId);
        const details = document.createElement("div");
        details.id = detailsId;
        details.className = "coursePrerequisiteDetail";
        details.hidden = true;
        details.textContent = `${text.missing}: ${presentation.missing.join(", ")}`;
        button.addEventListener("click", () => {
          const expanded = button.getAttribute("aria-expanded") === "true";
          button.setAttribute("aria-expanded", String(!expanded));
          button.textContent = expanded ? text.details : text.hideDetails;
          details.hidden = expanded;
        });
        detailsCell.append(button);
        identityCell.append(details);
      }

      row.append(doneCell, identityCell, creditCell, statusCell, detailsCell);
      body.append(row);
    }

    fragment.append(tableBlock);
  }

  courseChecklist.append(fragment);
}

function optionalCourses() {
  const options = state.program?.elective_options || state.program?.optional_subjects || {};
  const courseLookup = new Map((state.program?.courses || []).map((course) => [courseCode(course), course]));
  return Object.entries(options).map(([rawCode, rawCredits]) => {
    const code = normalize(rawCode);
    const existing = courseLookup.get(code);
    if (existing) return { ...existing, option_note: textFor("officialElective") };
    return {
      semester_or_level: currentLanguageSafe() === "en" ? "Optional" : "اختياري",
      course_code: String(rawCode).replace(/-/g, " "),
      official_course_name: textFor("optionalSourceMissing"),
      credit_hours: Number.isInteger(rawCredits) ? rawCredits : Number(rawCredits) || null,
      prerequisites: [],
      option_note: textFor("officialElective"),
    };
  }).sort((a, b) => String(a.course_code || "").localeCompare(String(b.course_code || "")));
}

function courseItem(course, className, reason = "") {
  const item = document.createElement("article");
  item.className = `courseItem ${className}`;
  const text = plannerText();
  const credits =
    Number.isInteger(course.credit_hours) && course.credit_hours > 0
      ? `${course.credit_hours} ${textFor("credits")}`
      : textFor("creditsUnavailable");
  const itemStatus = className === "recommended" ? "available" : className;
  item.innerHTML = `
    <div class="contextCourseHead">
      <span class="code">${course.course_code}</span>
      <span class="courseStatusBadge ${itemStatus}">${statusLabel(itemStatus)}</span>
    </div>
  `;
  item.querySelector(".code")?.setAttribute("lang", "en");
  appendCourseNames(item, course);
  const meta = document.createElement("span");
  meta.className = "meta";
  meta.textContent = `${displayLevelLabel(course.semester_or_level)} · ${credits}`;
  item.append(meta);
  if (reason && className === "blocked") {
    const details = document.createElement("details");
    details.className = "contextCourseDetails";
    const summary = document.createElement("summary");
    summary.textContent = text.details;
    const reasonText = document.createElement("span");
    reasonText.className = "reason";
    reasonText.textContent = reason;
    details.append(summary, reasonText);
    item.append(details);
  } else if (reason) {
    const reasonText = document.createElement("span");
    reasonText.className = "reason";
    reasonText.textContent = reason;
    item.append(reasonText);
  }
  return item;
}

function completedCourseItem(course) {
  const item = courseItem(course, "completed");
  const button = document.createElement("button");
  button.type = "button";
  button.className = "removeButton";
  button.textContent = textFor("remove");
  button.addEventListener("click", () => setCompleted(courseCode(course), false));
  item.append(button);
  return item;
}

function renderList(target, items, emptyText, kind) {
  target.innerHTML = "";
  const viewAllButton = target.closest(".statusPanel")?.querySelector(".contextViewAll");
  if (viewAllButton) viewAllButton.hidden = items.length <= 5;
  if (!items.length) {
    const text = plannerText();
    const empty = document.createElement("div");
    empty.className = `compactEmptyState ${kind}`;
    const icon = document.createElement("span");
    icon.className = "compactEmptyIcon";
    icon.setAttribute("aria-hidden", "true");
    icon.textContent = { completed: "✓", available: "↗", blocked: "!", optional: "◇" }[kind] || "·";
    const title = document.createElement("strong");
    title.textContent = emptyText;
    const help = document.createElement("span");
    help.textContent = {
      completed: text.completedEmptyHelp,
      blocked: text.blockedEmptyHelp,
      optional: text.optionalEmptyHelp,
    }[kind] || text.emptyHelp;
    empty.append(icon, title, help);
    target.append(empty);
    return;
  }

  const fragment = document.createDocumentFragment();
  for (const item of items.slice(0, 5)) {
    if (kind === "blocked") {
      fragment.append(
        courseItem(item.course, "blocked", `${textFor("missing")}: ${item.missing.join(", ")}`),
      );
    } else if (kind === "completed") {
      fragment.append(completedCourseItem(item));
    } else if (kind === "recommended") {
      fragment.append(courseItem(item, "recommended", textFor("earliest")));
     } else if (kind === "optional") {
      fragment.append(courseItem(item, "optional", item.option_note || textFor("officialElective")));
    } else {
      fragment.append(courseItem(item, "available"));
    }
  }
  target.append(fragment);
}

function render() {
  const plan = buildPlan();
  const total = (state.program.courses || []).length;
  const percent = total ? Math.round((plan.completed.length / total) * 100) : 0;
  const credits = creditSummary(plan.completed);
  const optionalItems = optionalCourses();
  const text = plannerText();
  const hasProgram = !isNoSelection() && !isNoPrograms();

  const titleName = state.program?.program_name?.replace(/^Bachelor of Science in /, "") || "اختر التخصص";
  if (isNoSelection()) {
    plannerTitle.textContent = textFor("chooseFacultyAndMajor");
  } else {
    const programName = document.createElement("span");
    programName.className = "programName";
    programName.textContent = titleName;
    if (/[A-Za-z]/.test(titleName) && !/[\u0600-\u06ff]/.test(titleName)) {
      programName.lang = "en";
    }
    plannerTitle.replaceChildren(programName);
  }
  plannerShell?.classList.toggle("plannerEmpty", !hasProgram);
  plannerShell?.classList.toggle("plannerSelected", hasProgram);
  if (plannerOnboarding) plannerOnboarding.hidden = hasProgram;
  if (plannerOverviewContent) plannerOverviewContent.hidden = !hasProgram;
  if (plannerWorkspace) plannerWorkspace.hidden = !hasProgram;
  if (plannerSubtitle) {
    plannerSubtitle.textContent = isNoSelection()
      ? text.defaultSubtitle
      : isCatalogOnly()
        ? text.catalogSubtitle
        : text.selectedSubtitle;
  }
  if (plannerHeaderMeta) plannerHeaderMeta.hidden = !hasProgram;
  if (plannerFacultyName) plannerFacultyName.textContent = currentFacultyName() || "--";
  if (plannerCourseMeta) plannerCourseMeta.textContent = formatCourseCount(total);
  if (plannerCreditMeta) plannerCreditMeta.textContent = state.program.total_program_credit_hours
    ? state.program.total_program_credit_hours + " " + text.credit
    : text.unavailable;

  progressText.textContent = `${percent}%`;
  if (degreeProgressValue) degreeProgressValue.textContent = `${percent}%`;
  if (degreeProgressCourseLabel) degreeProgressCourseLabel.textContent = `${plan.completed.length} / ${total} ${text.courses}`;
  if (degreeProgressBar) {
    degreeProgressBar.setAttribute("aria-valuenow", String(percent));
    const fill = degreeProgressBar.querySelector("i");
    if (fill) fill.style.width = `${percent}%`;
  }
  completedCount.textContent = plan.completed.length;
  availableCount.textContent = plan.available.length;
  blockedCount.textContent = plan.blocked.length;
  if (totalCourseCount) totalCourseCount.textContent = total;
  officialCredits.textContent = displayCreditValue(state.program.total_program_credit_hours);
  creditsCompleted.textContent = displayCreditValue(credits.completedText);
  creditsRemaining.textContent = displayCreditValue(credits.remainingText);
  if (homeCreditsCompleted) homeCreditsCompleted.textContent = credits.completedText;
  if (homeCreditsRemaining) homeCreditsRemaining.textContent = credits.remainingText;
  if (homeProgressValue) homeProgressValue.textContent = `${percent}%`;
  if (homeProgressBar) {
    homeProgressBar.setAttribute("aria-valuenow", String(percent));
    const fill = homeProgressBar.querySelector("i");
    if (fill) fill.style.width = `${percent}%`;
  }
  if (homeAvailableCount) homeAvailableCount.textContent = plan.available.length;
  if (homeBlockedCount) homeBlockedCount.textContent = plan.blocked.length;
  creditsCompleted.title = credits.note;
  creditsRemaining.title = credits.note;
  creditNote.textContent = credits.note || (state.program.total_program_credit_hours ? text.creditSummaryHelp : text.creditsUnavailableHelp);
  clearButton.disabled = isNoSelection() || isCatalogOnly() || isNoPrograms();
  saveProgressButton.disabled = isNoSelection() || isCatalogOnly() || isNoPrograms();
  resetProgressButton.disabled = isNoSelection() || isCatalogOnly() || isNoPrograms();
  exportButton.disabled = isNoSelection() || isNoPrograms();
  importButton.disabled = isNoSelection() || isCatalogOnly() || isNoPrograms();
  majorStatus.textContent = isNoSelection()
    ? textFor("chooseFacultyAndMajor")
    : isNoPrograms()
      ? textFor("noPrograms")
      : isCatalogOnly()
      ? textFor("catalogOnly") + " - " + (state.program.catalog_note || textFor("studyPlanNeeded"))
      : String((state.program.courses || []).length) + " " + textFor("loadedCourses");

  if (filterAllCount) filterAllCount.textContent = total;
  if (filterCompletedCount) filterCompletedCount.textContent = plan.completed.length;
  if (filterAvailableCount) filterAvailableCount.textContent = plan.available.length;
  if (filterBlockedCount) filterBlockedCount.textContent = plan.blocked.length;
  if (completedTabCount) completedTabCount.textContent = plan.completed.length;
  if (availableTabCount) availableTabCount.textContent = plan.available.length;
  if (blockedTabCount) blockedTabCount.textContent = plan.blocked.length;
  if (optionalTabCount) optionalTabCount.textContent = optionalItems.length;
  if (contextTotalCount) contextTotalCount.textContent = formatCourseCount(plan.completed.length + plan.available.length + plan.blocked.length);

  renderChecklist(plan);
  renderList(
    completedList,
    sortByLevelThenCode(plan.completed),
    currentLanguageSafe() === "en" ? "No completed courses selected yet." : "لم يتم تحديد مقررات مجتازة بعد.",
    "completed",
  );
  renderList(availableList, plan.available, currentLanguageSafe() === "en" ? "No available courses." : "لا توجد مقررات متاحة.", "available");
  renderList(blockedList, plan.blocked, currentLanguageSafe() === "en" ? "No blocked courses." : "لا توجد مقررات محجوبة.", "blocked");
  if (optionalList) renderList(optionalList, optionalItems, textFor("noOptional"), "optional");
  setStatusView(state.statusView);
}

searchInput.addEventListener("input", () => {
  state.search = searchInput.value;
  renderChecklist();
});

statusFilters?.addEventListener("click", (event) => {
  const button = event.target.closest(".statusFilter");
  if (!button) return;
  setStatusFilter(button.dataset.status || "all");
});

filterClearButton?.addEventListener("click", () => {
  state.search = "";
  state.level = "all";
  searchInput.value = "";
  if (levelFilter) levelFilter.value = "all";
  setStatusFilter("all");
});

contextViewAllButtons.forEach((button) => {
  button.addEventListener("click", () => setStatusFilter(button.dataset.status, { revealCatalog: true }));
});

statusTabs.forEach((tab, index) => {
  tab.addEventListener("click", () => setStatusView(tab.dataset.view));
  tab.addEventListener("keydown", (event) => {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    const direction = document.documentElement.dir === "rtl" ? -1 : 1;
    let nextIndex = index;
    if (event.key === "Home") nextIndex = 0;
    else if (event.key === "End") nextIndex = statusTabs.length - 1;
    else if (event.key === "ArrowRight") nextIndex = (index + direction + statusTabs.length) % statusTabs.length;
    else nextIndex = (index - direction + statusTabs.length) % statusTabs.length;
    statusTabs[nextIndex].focus();
    setStatusView(statusTabs[nextIndex].dataset.view);
  });
});

if (levelFilter) {
  levelFilter.addEventListener("change", () => {
    state.level = levelFilter.value;
    renderChecklist();
  });
}

facultySelect.addEventListener("change", async () => {
  state.faculty = facultySelect.value;
  state.major = "";
  setupMajorSelect();
  await chooseMajor("");
});

async function chooseMajor(majorId) {
  state.major = majorId;
  state.program = majorId ? state.programs.get(state.major) : noSelectionProgram();
  state.selected.clear();
  state.search = "";
  state.level = "all";
  state.statusFilter = "all";
  state.statusView = "available";
  state.collapsedLevels.clear();
  searchInput.value = "";
  if (levelFilter) levelFilter.value = "all";
  statusFilters?.querySelectorAll(".statusFilter").forEach((button) => {
    const active = button.dataset.status === "all";
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
  });
  setupLevelFilter();
  if (!isNoSelection() && !isCatalogOnly() && !isNoPrograms()) {
    await loadProgress();
  }
  render();
}

majorSelect.addEventListener("change", async () => {
  await chooseMajor(majorSelect.value);
});

clearButton.addEventListener("click", () => {
  state.selected.clear();
  render();
  saveProgress();
});

exportButton.addEventListener("click", () => {
  const blob = new Blob([JSON.stringify(serializablePlan(), null, 2)], {
    type: "application/json",
  });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "kau-" + state.major + "-progress.json";
  link.click();
  URL.revokeObjectURL(link.href);
  saveStatus.textContent = plannerText().exported;
});

themeToggle.addEventListener("click", () => {
  const nextTheme = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
  localStorage.setItem(themeStorageKey, nextTheme);
  applyTheme(nextTheme);
});

saveProgressButton.addEventListener("click", () => {
  saveProgress(true);
});

resetProgressButton.addEventListener("click", () => {
  localStorage.removeItem(localProgressKey());
  state.selected.clear();
  render();
  saveStatus.textContent = textFor("progressReset");
});

importButton.addEventListener("click", () => {
  importInput.click();
});

importInput.addEventListener("change", async () => {
  const file = importInput.files && importInput.files[0];
  if (!file) return;
  try {
    const payload = JSON.parse(await file.text());
    const importedCodes = Array.isArray(payload.completed_codes)
      ? payload.completed_codes
      : Array.isArray(payload.completed)
        ? payload.completed
        : [];
    const validCodes = new Set((state.program.courses || []).map(courseCode));
    state.selected = new Set(importedCodes.map(normalize).filter((code) => validCodes.has(code)));
    await saveProgress(true);
    render();
    saveStatus.textContent = textFor("importSuccess").replace("{count}", state.selected.size);
  } catch {
    saveStatus.textContent = textFor("importFailed");
  } finally {
    importInput.value = "";
  }
});


async function loadProgress() {
  try {
    const raw = localStorage.getItem(localProgressKey());
    if (!raw) {
      state.selected = new Set();
      return;
    }
    const progress = JSON.parse(raw);
    state.selected = new Set((progress.completed_codes || []).map(normalize));
  } catch {
    state.selected = new Set();
    saveStatus.textContent = textFor("progressReadFailed");
  }
}

async function start() {
  loadTheme();
  try {
    const registry = await api("/api/programs");
    state.faculties = registry.faculties || [];
    for (const summary of registry.programs || []) {
      if (summary.catalog_status === "catalog-only") {
        state.programs.set(summary.id, { ...summary, courses: [] });
      } else {
        const program = await api(`/api/program?major=${encodeURIComponent(summary.id)}`);
        state.programs.set(program.id || summary.id, withCommonFoundation({ ...summary, ...program }));
      }
    }
  } catch {
    const response = await fetch("data/kau_accounting.json");
    const accounting = await response.json();
    accounting.id = "accounting";
    state.programs.set("accounting", withCommonFoundation({ faculty_id: "EA", faculty_name: accounting.college_name || "economics and administration", catalog_status: "active", ...accounting }));
    try {
      const catalogResponse = await fetch("data/faculty_catalog.json");
      const catalog = await catalogResponse.json();
      state.faculties = catalog.faculties || state.faculties;
      for (const summary of catalog.programs || []) {
        if (!state.programs.has(summary.id)) state.programs.set(summary.id, { ...summary, courses: [] });
      }
    } catch {
      // Static fallback can still run with Accounting only.
    }
    try {
      const additionalResponse = await fetch("data/additional_programs.json");
      const additional = await additionalResponse.json();
      for (const program of additional.programs || []) {
        state.programs.set(program.id, withCommonFoundation({ faculty_id: "EA", faculty_name: program.college_name || "economics and administration", catalog_status: "active", ...program }));
      }
    } catch {
      // Static fallback can still run with Accounting only.
    }
    saveStatus.textContent = textFor("backendUnavailable");
  }
  setupFacultySelect();
  setupMajorSelect();
  state.program = noSelectionProgram();
  setupLevelFilter();

  if (!isNoSelection() && !isCatalogOnly() && !isNoPrograms()) await loadProgress();
  saveStatus.textContent = textFor("localSaveIntro");
  render();
}

start().catch(() => {
  progressText.textContent = "تعذر تحميل البيانات";
});


captureAuthTokenFromHash();
loadMicrosoftUser();
if (microsoftLogoutButton) {
  microsoftLogoutButton.addEventListener("click", (event) => {
    event.preventDefault();
    if (!microsoftUser) return;
    clearStoredAuthToken();
    window.location.assign("/.auth/logout?post_logout_redirect_uri=/");
  });
}
window.addEventListener("pageshow", () => {
  captureAuthTokenFromHash();
  loadMicrosoftUser();
});
window.addEventListener("focus", () => loadMicrosoftUser());
document.addEventListener("visibilitychange", () => {
  if (!document.hidden) loadMicrosoftUser();
});


if (menuToggle && siteNav) {
  menuToggle.addEventListener("click", () => {
    const open = document.body.classList.toggle("menuOpen");
    menuToggle.setAttribute("aria-expanded", String(open));
  });
  siteNav.addEventListener("click", (event) => {
    if (event.target.closest("a")) {
      document.body.classList.remove("menuOpen");
      menuToggle.setAttribute("aria-expanded", "false");
    }
  });
}

function syncActiveNavigation() {
  if (!siteNav) return;
  const activeHash = ["#home", "#planner", "#sources"].includes(window.location.hash) ? window.location.hash : "#home";
  siteNav.querySelectorAll(".navLink").forEach((link) => {
    const active = link.getAttribute("href") === activeHash;
    link.classList.toggle("active", active);
    if (active) link.setAttribute("aria-current", "page");
    else link.removeAttribute("aria-current");
  });
}
window.addEventListener("hashchange", syncActiveNavigation);
syncActiveNavigation();

// Lightweight language switcher. It only changes visible labels; planner data stays unchanged.
const uiLanguageStorageKey = "kau-planner-ui-language";
const uiLanguageToggle = document.querySelector("#languageToggle");
const uiText = {
  ar: {
    button: "EN", menu: "القائمة", dir: "rtl", pageTitle: "مخطط المقررات الجامعية", brand: "مخطط المقررات", brandSmall: "King Abdulaziz University Planner", brandAria: "مخطط المقررات", navAria: "التنقل الرئيسي", home: "الرئيسية", planner: "المخطط الدراسي", sources: "المصادر الرسمية",
    heroKicker: "مخطط أكاديمي للطلاب", heroTitleFirst: "خطّط لمسيرتك الجامعية", heroTitleSecond: "بكل وضوح وثقة", heroText: "اختر تخصصك، حدّد المواد التي أنجزتها، وتعرّف على المواد المتاحة والمتطلبات المتبقية حتى التخرج.",
    start: "ابدأ التخطيط", review: "استكشف التخصصات", progress: "التقدم", faculties: "الكليات", programs: "البرامج",
    save: "حفظ التقدم", reset: "إعادة ضبط التقدم", export: "تصدير التقدم", import: "استيراد التقدم", faculty: "الكلية", major: "التخصص",
    courses: "المقررات", clear: "مسح", search: "ابحث برمز المقرر أو الاسم", completed: "مكتمل", available: "متاح", blocked: "محجوب",
    totalCredits: "إجمالي الساعات", doneCredits: "ساعات منجزة", leftCredits: "ساعات متبقية", selected: "المقررات المحددة كمجتازة",
    availableNow: "متاح الآن", blockedNow: "محجوب", sourceTitle: "المصادر الرسمية هي المرجع النهائي", sourceButton: "فتح برامج الجامعة الرسمية", optionalNow: "المواد الاختيارية", logoutButton: "تسجيل الخروج", accessKicker: "تسجيل اختياري", accessTitle: "اختياري: سجل الدخول بحساب Microsoft", accessText: "يمكنك استخدام المخطط بدون تسجيل. تسجيل Microsoft اختياري للتعريف بحسابك الجامعي عند تفعيل المزامنة لاحقًا.", accessButton: "تسجيل الدخول", homeSummaryAria: "ملخص التقدم الدراسي", homeCreditsDone: "الساعات المنجزة", homeCreditsLeft: "الساعات المتبقية", homeProgress: "نسبة الإنجاز", homeAvailable: "المواد المتاحة", homeBlocked: "المواد المقفلة", creditUnit: "ساعة", courseUnit: "مادة", heroPlan: "الخطة الدراسية", featuresKicker: "تخطيط أبسط، وقرارات أوضح", featuresTitle: "كل ما تحتاجه لرؤية خطتك بوضوح"
  },
  en: {
    button: "ع", menu: "Menu", dir: "ltr", pageTitle: "University Course Planner", brand: "Course Planner", brandSmall: "King Abdulaziz University Planner", brandAria: "Course Planner", navAria: "Main navigation", home: "Home", planner: "Study planner", sources: "Official sources",
    heroKicker: "Academic planning for students", heroTitleFirst: "Plan your university journey", heroTitleSecond: "with clarity and confidence", heroText: "Choose your major, mark completed courses, and understand what is available and what remains before graduation.",
    start: "Start planning", review: "Explore majors", progress: "Progress", faculties: "Faculties", programs: "Programs",
    save: "Save progress", reset: "Reset progress", export: "Export progress", import: "Import progress", faculty: "Faculty", major: "Major",
    courses: "Courses", clear: "Clear", search: "Search by course code or name", completed: "Completed", available: "Available", blocked: "Blocked",
    totalCredits: "Total credits", doneCredits: "Credits done", leftCredits: "Credits left", selected: "Courses marked as completed",
    availableNow: "Available now", blockedNow: "Blocked", sourceTitle: "Official sources are the final authority", sourceButton: "Open official university programs", optionalNow: "Optional subjects", logoutButton: "Sign out", accessKicker: "Optional sign-in", accessTitle: "Optional: sign in with Microsoft", accessText: "You can use the planner without signing in. Microsoft sign-in is optional for identifying your university account if sync is enabled later.", accessButton: "Sign in", homeSummaryAria: "Study progress summary", homeCreditsDone: "Credits completed", homeCreditsLeft: "Credits remaining", homeProgress: "Completion", homeAvailable: "Available courses", homeBlocked: "Locked courses", creditUnit: "credits", courseUnit: "courses", heroPlan: "Study plan", featuresKicker: "Simpler planning, clearer decisions", featuresTitle: "Everything you need to understand your plan"
  }
};
function setUiText(selector, value) {
  const element = document.querySelector(selector);
  if (element) element.textContent = value;
}
function refreshSelectLanguageText() {
  if (!facultySelect || !majorSelect) return;
  if (!state.faculties.length && !state.programs.size) return;
  setupFacultySelect();
  setupMajorSelect();
}

function applyUiLanguage(language) {
  const text = uiText[language] || uiText.ar;
  document.documentElement.lang = language;
  document.documentElement.dir = text.dir;
  document.title = text.pageTitle;
  document.querySelector(".brand")?.setAttribute("aria-label", text.brandAria);
  document.querySelector(".siteNav")?.setAttribute("aria-label", text.navAria);
  document.querySelector(".homeSummary")?.setAttribute("aria-label", text.homeSummaryAria);
  if (uiLanguageToggle) {
    uiLanguageToggle.textContent = text.button;
    uiLanguageToggle.setAttribute("aria-label", language === "en" ? "Switch to Arabic" : "التبديل إلى الإنجليزية");
  }
  menuToggle?.setAttribute("aria-label", text.menu);
  microsoftLoginButton?.setAttribute("aria-label", text.accessButton);
  microsoftLogoutButton?.setAttribute("aria-label", text.logoutButton);
  setUiText("#menuToggle span", text.menu);
  setUiText(".brand strong", text.brand);
  setUiText(".brand small", text.brandSmall);
  setUiText(".siteNav a:nth-child(1)", text.home);
  setUiText(".siteNav a:nth-child(2)", text.planner);
  setUiText(".siteNav a:nth-child(3)", text.sources);
  setUiText(".heroCopy .eyebrow", text.heroKicker);
  const heroTitle = document.querySelector(".heroCopy h1");
  if (heroTitle) {
    const accentLine = document.createElement("em");
    accentLine.textContent = text.heroTitleSecond;
    heroTitle.replaceChildren(text.heroTitleFirst, document.createElement("br"), accentLine);
  }
  setUiText(".heroText", text.heroText);
  setUiText(".heroActions a:nth-child(1)", text.start);
  setUiText(".heroActions a:nth-child(2)", text.review);
  setUiText("#heroPlanLabel", text.heroPlan);
  setUiText("#homeCreditsDoneLabel", text.homeCreditsDone);
  setUiText("#homeCreditsLeftLabel", text.homeCreditsLeft);
  setUiText("#homeProgressLabel", text.homeProgress);
  setUiText("#homeAvailableLabel", text.homeAvailable);
  setUiText("#homeBlockedLabel", text.homeBlocked);
  setUiText("#homeCreditsDoneUnit", text.creditUnit);
  setUiText("#homeCreditsLeftUnit", text.creditUnit);
  setUiText("#homeAvailableUnit", text.courseUnit);
  setUiText("#homeBlockedUnit", text.courseUnit);
  setUiText(".featureSection .sectionIntro .eyebrow", text.featuresKicker);
  setUiText("#featuresTitle", text.featuresTitle);
  homeProgressBar?.setAttribute("aria-label", text.homeProgress);
  document.querySelectorAll(".heroPanel span").forEach((el, i) => { el.textContent = [text.progress, text.faculties, text.programs][i] || el.textContent; });
  setUiText("#saveProgressButton", text.save); setUiText("#resetProgressButton", text.reset); setUiText("#exportButton", text.export); setUiText("#importButton", text.import);
  setUiText("label[for=facultySelect]", text.faculty); setUiText("label[for=majorSelect]", text.major); setUiText(".panelHead h2", text.courses); setUiText("#clearButton", text.clear);
  if (searchInput) searchInput.placeholder = text.search;
  document.querySelectorAll(".metric span").forEach((el, i) => { el.textContent = [text.completed, text.available, text.blocked, text.totalCredits, text.doneCredits, text.leftCredits][i] || el.textContent; });
  setUiText(".completedBlock h2", text.selected);
  const heads = document.querySelectorAll(".columns .listBlock h2");
  if (heads[0]) heads[0].textContent = text.availableNow;
  if (heads[1]) heads[1].textContent = text.blockedNow;
  setUiText(".optionalBlock h2", text.optionalNow);
  setUiText("#sources h2", text.sourceTitle); setUiText("#sources a", text.sourceButton);
  setUiText("#microsoftLogin .eyebrow", text.accessKicker);
  setUiText("#microsoftLogin h2", text.accessTitle);
  setUiText("#microsoftLogin .accessCopy p:not(.eyebrow)", text.accessText);
  setUiText("#microsoftLoginButton span", text.accessButton);
  setUiText("#microsoftLogoutButton", text.logoutButton);
  applyMicrosoftLoginState();
}
function currentUiLanguage() { return localStorage.getItem(uiLanguageStorageKey) === "en" ? "en" : "ar"; }
if (uiLanguageToggle) {
  uiLanguageToggle.addEventListener("click", () => {
    const next = currentUiLanguage() === "en" ? "ar" : "en";
    localStorage.setItem(uiLanguageStorageKey, next);
    applyUiLanguage(next);
  });
}
const renderBeforeLanguage = render;
render = function renderWithLanguage() {
  renderBeforeLanguage();
  applyUiLanguage(currentUiLanguage());
};
applyUiLanguage(currentUiLanguage());

// Extra translation pass for text created after the first language switcher was added.
const uiTextExtra = {
  ar: {
    toolbarKicker: "جامعة الملك عبدالعزيز",
    completedFeatureTitle: "تابع تقدمك الدراسي",
    completedFeatureText: "راقب الساعات المنجزة والمتبقية ونسبة التقدم في الخطة.",
    availableFeatureTitle: "اعرف موادك المتاحة",
    availableFeatureText: "يوضّح لك النظام المواد التي يمكنك تسجيلها بناءً على المتطلبات السابقة.",
    blockedFeatureTitle: "بياناتك محفوظة على جهازك",
    blockedFeatureText: "يمكنك استخدام المخطط محليًا دون الحاجة إلى تسجيل الدخول.",
    privacyStrong: "تسجيل الدخول اختياري.",
    privacyText: "يمكنك استخدام المخطط مباشرة وحفظ التقدم على هذا الجهاز.",
    privacySmall: "تسجيل Microsoft لا يتم إجباره، والمزامنة بين الأجهزة غير مفعلة حاليًا.",
    optionalButton: "تسجيل الدخول اختياري لمزامنة التقدم",
    optionalText: "تسجيل Microsoft اختياري لمزامنة التقدم لاحقًا. هذه الميزة غير مفعلة الآن.",
    sourceKicker: "مشروع طلابي مستقل",
    sourceText: "هذا مشروع طلابي مستقل، والمصادر الرسمية لجامعة الملك عبدالعزيز هي المرجع النهائي للخطط واللوائح الأكاديمية.",
    themeDark: "الوضع الداكن",
    themeLight: "الوضع الفاتح"
  },
  en: {
    toolbarKicker: "King Abdulaziz University",
    completedFeatureTitle: "Track your study progress",
    completedFeatureText: "Monitor completed and remaining credits and your overall plan progress.",
    availableFeatureTitle: "Know what is available",
    availableFeatureText: "See which courses you can register for based on their prerequisites.",
    blockedFeatureTitle: "Your data stays on your device",
    blockedFeatureText: "Use the planner locally without needing to sign in.",
    privacyStrong: "Login is optional.",
    privacyText: "You can use the planner directly and save progress on this device.",
    privacySmall: "Microsoft sign-in is not required, and cross-device sync is not enabled yet.",
    optionalButton: "Optional login for progress sync",
    optionalText: "This feature is not enabled yet.",
    sourceKicker: "Independent student project",
    sourceText: "This is an independent student project. Official King Abdulaziz University sources remain the final authority for academic plans and regulations.",
    themeDark: "Dark",
    themeLight: "Light"
  }
};
const uiExactEnglish = new Map([
  ["كل المستويات", "All levels"], ["الوضع الداكن", "Dark"], ["الوضع الفاتح", "Light"],
  ["اختر الكلية", "Choose a Faculty"], ["اختر التخصص", "Choose a Major"], ["اختر الكلية أولاً", "Choose a Faculty first"],
  ["اختر الكلية والتخصص", "Choose a Faculty and Major"], ["المواد الاختيارية", "Optional subjects"],
  ["مخطط مقررات المحاسبة", "Accounting course planner"], ["لا توجد برامج", "No programs"],
  ["لا توجد برامج - No programs found", "No programs found"], ["الخطة الدراسية غير محملة بعد.", "The study plan is not loaded yet."],
  ["المصدر الرسمي", "Official source"], ["لم يتم تحديد مقررات مجتازة بعد.", "No completed courses selected yet."],
  ["حدد المقررات المجتازة لعرض المقترحات.", "Select completed courses to show suggestions."],
  ["لا توجد مقررات متاحة.", "No available courses."], ["لا توجد مقررات محجوبة.", "No blocked courses."],
  ["تم حفظ التقدم على هذا الجهاز.", "Progress saved on this device."],
  ["تعذر حفظ التقدم على هذا الجهاز.", "Could not save progress on this device."],
  ["تمت إعادة ضبط التقدم المحفوظ لهذا البرنامج.", "Saved progress for this program was reset."],
  ["تعذر استيراد الملف. تأكد أنه ملف JSON صالح.", "Could not import the file. Make sure it is valid JSON."],
  ["المزامنة الاختيارية غير مفعلة حاليًا. التقدم محفوظ محليًا فقط.", "Optional sync is not enabled yet. Progress is saved locally only."],
  ["تعذر قراءة التقدم المحفوظ محليًا.", "Could not read locally saved progress."],
  ["لا تحتاج إلى تسجيل دخول. يتم حفظ تقدمك على هذا الجهاز فقط.", "No login is required. Your progress is saved only on this device."],
  ["تعذر تحميل البيانات", "Could not load data"], ["مجتاز", "Done"], ["المقرر", "Course"], ["الاسم", "Name"], ["الساعات", "Credits"],
  ["إظهار", "Show"], ["إخفاء", "Hide"], ["إزالة", "Remove"], ["أقرب مقرر متاح", "Earliest available course"]
]);
const uiExactArabic = new Map(Array.from(uiExactEnglish, ([ar, en]) => [en, ar]));
function replaceExactVisibleText(map) {
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);
  for (const node of nodes) {
    const value = node.nodeValue.trim();
    if (map.has(value)) node.nodeValue = node.nodeValue.replace(value, map.get(value));
  }
}
function applyTextLanguageHints() {
  document.querySelectorAll(".brand small, .code").forEach((element) => {
    element.lang = "en";
  });
  document.querySelectorAll(
    "#plannerTitle, #facultySelect option, #majorSelect option, .name, .meta, .reason, .majorStatus, .studyPlanHeader strong, .studyPlanHeader span",
  ).forEach((element) => {
    if (element.classList.contains("programName")) return;
    const value = element.textContent || "";
    const hasArabic = /[\u0600-\u06ff]/.test(value);
    const hasEnglish = /[A-Za-z]/.test(value);
    if (hasArabic) element.lang = "ar";
    else if (hasEnglish) element.lang = "en";
    else element.removeAttribute("lang");
  });
}
const applyUiLanguageBase = applyUiLanguage;
applyUiLanguage = function applyUiLanguageExpanded(language) {
  applyUiLanguageBase(language);
  const extra = uiTextExtra[language] || uiTextExtra.ar;
  setUiText(".toolbar .eyebrow", extra.toolbarKicker);
  const featureCards = document.querySelectorAll(".featureCard");
  if (featureCards[0]) { featureCards[0].querySelector("h3").textContent = extra.completedFeatureTitle; featureCards[0].querySelector("p").textContent = extra.completedFeatureText; }
  if (featureCards[1]) { featureCards[1].querySelector("h3").textContent = extra.availableFeatureTitle; featureCards[1].querySelector("p").textContent = extra.availableFeatureText; }
  if (featureCards[2]) { featureCards[2].querySelector("h3").textContent = extra.blockedFeatureTitle; featureCards[2].querySelector("p").textContent = extra.blockedFeatureText; }
  setUiText(".privacyNotice div strong", extra.privacyStrong);
  setUiText(".privacyNotice div > span", extra.privacyText);
    setUiText("#sources .eyebrow", extra.sourceKicker);
  setUiText("#sources p:not(.eyebrow)", extra.sourceText);
  if (themeToggle) {
    const target = themeToggle.querySelector("span");
    if (target) target.textContent = document.documentElement.dataset.theme === "dark" ? extra.themeLight : extra.themeDark;
    const dark = document.documentElement.dataset.theme === "dark";
    themeToggle.setAttribute("aria-label", dark
      ? (language === "en" ? "Use light theme" : "استخدام المظهر الفاتح")
      : (language === "en" ? "Use dark theme" : "استخدام المظهر الداكن"));
  }
  document.body.dataset.lang = language;
  refreshSelectLanguageText();
  replaceExactVisibleText(language === "en" ? uiExactEnglish : uiExactArabic);
  if (language === "en") {
    document.querySelectorAll(".studyPlanHeader span").forEach((span) => { span.textContent = span.textContent.replace("required credits", "required credits").replace("ساعة مطلوبة", "required credits"); });
    document.querySelectorAll(".majorStatus").forEach((el) => { el.textContent = el.textContent.replace("مقرر محمل", "loaded courses").replace("فهرس فقط", "Catalog only").replace("الخطة الدراسية مطلوبة", "study plan needed"); });
    if (plannerTitle) plannerTitle.textContent = plannerTitle.textContent.replace(" - فهرس البرنامج", " - catalog only").replace(" - مخطط المقررات", " - course planner");
    if (saveStatus) saveStatus.textContent = saveStatus.textContent.replace(/تم استيراد (\d+) مقرر وحفظه على هذا الجهاز\./, "Imported and saved $1 courses on this device.");
  }
  applyPlannerPresentationLanguage();
  applyTextLanguageHints();
};
if (uiLanguageToggle) {
  uiLanguageToggle.addEventListener("click", () => {
    requestAnimationFrame(() => render());
  });
}

const courseNameEnglishMap = {
  "-2- محاسبة تكاليف": "Cost Accounting 2",
  "I المحاسبة المتوسطة": "Intermediate Accounting 1",
  "I المراجعة": "Auditing 1",
  "II المحاسبة المتوسط": "Intermediate Accounting 2",
  "II المراجعة": "Auditing 2",
  "أتمتة المؤسسات": "Enterprise Automation",
  "أخلاقيات الأعمال": "Business Ethics",
  "أساسيات الاستثمار": "Investment Fundamentals",
  "أساسيات المالية": "Fundamentals of Finance",
  "أمن الأعمال والأمن السيبراني": "Business Security and Cybersecurity",
  "أنظمة قواعد بيانات الأعمال": "Business Database Systems",
  "إدارة الأداء": "Performance Management",
  "إدارة التسويق": "Marketing Management",
  "إدارة التوظيف": "Recruitment Management",
  "إدارة الجودة": "Quality Management",
  "إدارة الخدمات": "Services Management",
  "إدارة العمليات": "Operations Management",
  "إدارة المحافظ الاستثمارية": "Portfolio Management",
  "إدارة المخاطر والأزمات": "Risk and Crisis Management",
  "إدارة المدن الحديثة": "Modern Cities Management",
  "إدارة المشاريع": "Project Management",
  "إدارة المنظمات": "Organization Management",
  "إدارة الموارد البشرية": "Human Resource Management",
  "إدارة تسعير المنتجات التجارية": "Commercial Product Pricing Management",
  "إدارة سلسلة الإمداد": "Supply Chain Management",
  "إدارة عمليات الأعمال": "Business Process Management",
  "إدارة مشاريع نظم المعلومات": "Information Systems Project Management",
  "إدارة وتقييم المشاريع": "Project Management and Evaluation",
  "إرشاد الطفل وتعديل السلوك": "Child Guidance and Behavior Modification",
  "اتصالات الأعمال المتقدمة": "Advanced Business Communication",
  "اقتصاد جزئي متوسط": "Intermediate Microeconomics",
  "اقتصاد كلي متوسط": "Intermediate Macroeconomics",
  "اقتصاديات البيئة والموارد": "Environmental and Resource Economics",
  "اقتصاديات الصحة": "Health Economics",
  "اقتصاديات الصناعة": "Industrial Economics",
  "اقتصاديات العمل": "Labor Economics",
  "الأعمال الدولية": "International Business",
  "الإدارة الاستراتيجية": "Strategic Management",
  "الإنجليزية للاقتصاديين": "English for Economists",
  "الابتكار الرقمي والاستدامة": "Digital Innovation and Sustainability",
  "الابتكار في المنظمات العامة": "Innovation in Public Organizations",
  "الاتصالات التسويقية": "Marketing Communications",
  "الاستشارات الإدارية": "Management Consulting",
  "الاقتصاد الإداري": "Managerial Economics",
  "الاقتصاد الدولي": "International Economics",
  "الاقتصاد الرقمي": "Digital Economy",
  "الاقتصاد الرياضي": "Mathematical Economics",
  "الاقتصاد السلوكي": "Behavioral Economics",
  "الاقتصاد القياسي 1": "Econometrics 1",
  "الاقتصاد القياسي 2": "Econometrics 2",
  "البيئة القانونية للأعمال": "Legal Environment of Business",
  "التأمين": "Insurance",
  "التجارة الإلكترونية": "E-Commerce",
  "التحرير الكتابي": "Writing and Editing",
  "التخطيط وصناعة القرار": "Planning and Decision Making",
  "التدريب التعاوني": "Cooperative Training",
  "التسويق الدولي": "International Marketing",
  "التسويق الرقمي": "Digital Marketing",
  "التطوير التنظيمي والتغيير": "Organizational Development and Change",
  "التعويضات والمزايا": "Compensation and Benefits",
  "التفاوض وإدارة النزاعات": "Negotiation and Conflict Management",
  "التقنية المالية": "Financial Technology",
  "التنبؤ الاقتصادي والبيانات": "Economic Forecasting and Data",
  "التنمية المستدامة": "Sustainable Development",
  "الثقافة الإسلامية 2": "Islamic Culture 2",
  "الثقافة الإسلامية 3": "Islamic Culture 3",
  "الثقافة الإسلامية 4": "Islamic Culture 4",
  "الحكومة والحوكمة الاجتماعية": "Government and Social Governance",
  "الرياضيات للتخصصات النظرية": "Mathematics for Theoretical Majors",
  "الرياضيات للصفوف الأولية": "Mathematics for Primary Grades",
  "السياسات الصحية": "Health Policies",
  "السياسة العامة واتخاذ القرار": "Public Policy and Decision Making",
  "العلاقات العامة والاتصال": "Public Relations and Communication",
  "الفنون والتربية البدنية": "Arts and Physical Education",
  "القرآن الكريم في الطفولة المبكرة": "Quran in Early Childhood",
  "القيادة": "Leadership",
  "القيادة في القطاع العام": "Leadership in the Public Sector",
  "الكتابة في مجال الأعمال": "Business Writing",
  "الكفاءات المهنية والعمل": "Professional Competencies and Work",
  "اللغة الإنجليزية (1)": "English Language 1",
  "اللغة الإنجليزية (2)": "English Language 2",
  "اللغة العربية 2": "Arabic Language 2",
  "المالية والمصرفية الإسلامية": "Islamic Finance and Banking",
  "المجتمع والإدارة المستدامة": "Society and Sustainable Management",
  "المحادثة في مجال الأعمال": "Business Conversation",
  "المحاسبة المالية المتقدمة": "Advanced Financial Accounting",
  "المشتقات المالية": "Financial Derivatives",
  "المهارات اللغوية للأطفال": "Language Skills for Children",
  "الموازنة العامة والمالية": "Public Budgeting and Finance",
  "الموضوعات المعاصرة في المالية": "Contemporary Topics in Finance",
  "النظرية العامة والسياسة العامة": "General Theory and Public Policy",
  "النقود والبنوك": "Money and Banking",
  "النمذجة المالية": "Financial Modeling",
  "بحوث التسويق": "Marketing Research",
  "بيع احترافي وإدارة مبيعات": "Professional Selling and Sales Management",
  "تاريخ الفكر الاقتصادي": "History of Economic Thought",
  "تحليل الأعمال": "Business Analytics",
  "تحليل السياسات": "Policy Analysis",
  "تحليل وتصميم النظم": "Systems Analysis and Design",
  "تسويق الخدمات": "Services Marketing",
  "تسويق مباشر بين مجالات الأعمال": "Business-to-Business Direct Marketing",
  "تفاعل الإنسان والحاسوب": "Human-Computer Interaction",
  "تقييم وإصلاح الرعاية الصحية": "Healthcare Evaluation and Reform",
  "تنمية الموارد البشرية": "Human Resource Development",
  "تنمية وتخطيط اقتصادي": "Economic Development and Planning",
  "ثقافة إسلامية (1)": "Islamic Culture 1",
  "ثقافة إسلامية (2)": "Islamic Culture 2",
  "ثقافة إسلامية (3)": "Islamic Culture 3",
  "ثقافة إسلامية (4)": "Islamic Culture 4",
  "حوكمة المؤسسات العامة وغير الربحية": "Governance of Public and Nonprofit Institutions",
  "دراسات اقتصادية لنظرية الألعاب": "Economic Studies in Game Theory",
  "دراسات الجدوى الاقتصادية": "Economic Feasibility Studies",
  "دمج ذوي الاحتياجات الخاصة": "Inclusion of People with Special Needs",
  "ذكاء الأعمال": "Business Intelligence",
  "ريادة الأعمال": "Entrepreneurship",
  "سلوك المستهلك": "Consumer Behavior",
  "سلوك تنظيمي في القطاع العام": "Organizational Behavior in the Public Sector",
  "شؤون بين القطاع العام والخاص": "Public-Private Sector Affairs",
  "علاقات الموظفين": "Employee Relations",
  "في الذكاء الاصطناعي وتقنية الأعمال": "Artificial Intelligence and Business Technology",
  "قانون إداري": "Administrative Law",
  "قنوات التوزيع": "Distribution Channels",
  "كتابة التقارير الإدارية": "Administrative Report Writing",
  "مؤسسات مالية وإدارة مخاطر": "Financial Institutions and Risk Management",
  "مالية الشركات": "Corporate Finance",
  "مالية دولية": "International Finance",
  "مبادئ الإحصاء": "Principles of Statistics",
  "مبادئ الإدارة العامة": "Principles of Public Administration",
  "مبادئ الاقتصاد الكلي": "Principles of Macroeconomics",
  "مبادئ التسويق": "Principles of Marketing",
  "مبادئ العلوم السياسية": "Principles of Political Science",
  "مبادئ محاسبة إدارية وتكاليف": "Principles of Managerial and Cost Accounting",
  "مبادئ محاسبة مالية": "Principles of Financial Accounting",
  "محاسبة الزكاة والضرائب": "Zakat and Tax Accounting",
  "مشروع تخرج": "Graduation Project",
  "مقدمة في التخطيط الاستراتيجي": "Introduction to Strategic Planning",
  "مقدمة في الفئات الخاصة": "Introduction to Special Needs Categories",
  "مقدمة في المنظمات غير الربحية": "Introduction to Nonprofit Organizations",
  "مناهج البحث والتواصل": "Research Methods and Communication",
  "مهارات البحث وإحصاء الأعمال": "Research Skills and Business Statistics",
  "مهارات الحاسب": "Computer Skills",
  "مهارات حاسب": "Computer Skills",
  "مهارات سوق العمل طفولة مبكره": "Labor Market Skills for Early Childhood",
  "مهارات سوق العمل للأعمال": "Labor Market Skills for Business",
  "مهارات لغوية": "Language Skills",
  "مواضيع متخصصة في موارد بشرية": "Special Topics in Human Resources",
  "نظام العمل والعلاقات الحكومية": "Labor Law and Government Relations",
  "نظم المعلومات الإدارية": "Management Information Systems",
  "نمو اقتصادي": "Economic Growth"
};
function courseNameEnglish(name) {
  if (!name) return "";
  return courseNameEnglishMap[String(name).trim()] || "";
}
function displayCourseName(course) {
  const officialName = course?.official_course_name || "";
  return officialName;
}

// Final official-source behavior: course names stay exactly as stored from KAU/source data.
function resetRenderedPlannerLanguage() {
  if (state.program) render();
}
if (uiLanguageToggle) {
  uiLanguageToggle.addEventListener("click", () => {
    requestAnimationFrame(resetRenderedPlannerLanguage);
  });
}
