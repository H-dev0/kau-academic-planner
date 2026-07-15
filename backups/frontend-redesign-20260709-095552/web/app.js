const state = {
  program: null,
  programs: new Map(),
  user: null,
  selected: new Set(),
  search: "",
  level: "all",
  faculty: "economics-and-administration",
  major: "accounting",
  collapsedLevels: new Set(),
};

const courseChecklist = document.querySelector("#courseChecklist");
const plannerTitle = document.querySelector("#plannerTitle");
const loginForm = document.querySelector("#loginForm");
const usernameInput = document.querySelector("#usernameInput");
const userPanel = document.querySelector("#userPanel");
const userName = document.querySelector("#userName");
const logoutButton = document.querySelector("#logoutButton");
const facultySelect = document.querySelector("#facultySelect");
const majorSelect = document.querySelector("#majorSelect");
const majorStatus = document.querySelector("#majorStatus");
const searchInput = document.querySelector("#searchInput");
const levelFilter = document.querySelector("#levelFilter");
const clearButton = document.querySelector("#clearButton");
const addRecommendedButton = document.querySelector("#addRecommendedButton");
const exportButton = document.querySelector("#exportButton");
const themeToggle = document.querySelector("#themeToggle");
const progressText = document.querySelector("#progressText");
const completedCount = document.querySelector("#completedCount");
const availableCount = document.querySelector("#availableCount");
const blockedCount = document.querySelector("#blockedCount");
const officialCredits = document.querySelector("#officialCredits");
const creditsCompleted = document.querySelector("#creditsCompleted");
const creditsRemaining = document.querySelector("#creditsRemaining");
const creditNote = document.querySelector("#creditNote");
const saveStatus = document.querySelector("#saveStatus");
const completedList = document.querySelector("#completedList");
const recommendedList = document.querySelector("#recommendedList");
const availableList = document.querySelector("#availableList");
const blockedList = document.querySelector("#blockedList");
const themeStorageKey = "kau-planner-theme";
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
  if (updated.faculty_id && updated.faculty_id !== "economics-and-administration") {
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
  document.documentElement.dataset.theme = dark ? "dark" : "light";
  themeToggle.textContent = dark ? "Light" : "Dark";
  themeToggle.setAttribute("aria-pressed", String(dark));
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

async function saveProgress() {
  if (isCatalogOnly()) return;
  if (!state.user) {
    saveStatus.textContent = "Login to save progress.";
    return;
  }

  saveStatus.textContent = "Saving...";
  try {
    await api(`/api/progress?major=${encodeURIComponent(state.major)}`, {
      method: "POST",
      body: JSON.stringify({ completed_codes: completedCodes() }),
    });
    saveStatus.textContent = "Progress saved.";
  } catch {
    saveStatus.textContent = "Could not save progress.";
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
    program: {
      university_name: state.program.university_name,
      college_name: state.program.college_name,
      program_name: state.program.program_name,
      degree_level: state.program.degree_level,
      total_program_credit_hours: state.program.total_program_credit_hours,
      official_source_url: state.program.official_source_url,
      last_checked_date: state.program.last_checked_date,
    },
    completed_codes: sortByLevelThenCode(plan.completed).map((course) => course.course_code),
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
  const levels = [...new Set(state.program.courses.map((course) => course.semester_or_level))]
    .filter(Boolean)
    .sort((a, b) => levelNumber({ semester_or_level: a }) - levelNumber({ semester_or_level: b }));

  levelFilter.innerHTML = '<option value="all">All levels</option>';
  for (const level of levels) {
    const option = document.createElement("option");
    option.value = level;
    option.textContent = level;
    levelFilter.append(option);
  }
}

function setupFacultySelect() {
  const faculties = new Map();
  for (const program of state.programs.values()) {
    if (program.faculty_id) {
      faculties.set(program.faculty_id, program.faculty_name || program.college_name || program.faculty_id);
    }
  }
  facultySelect.innerHTML = "";
  for (const [id, name] of faculties) {
    const option = document.createElement("option");
    option.value = id;
    option.textContent = name;
    facultySelect.append(option);
  }
  if (!faculties.has(state.faculty)) state.faculty = faculties.keys().next().value || "economics-and-administration";
  facultySelect.value = state.faculty;
}

function setupMajorSelect() {
  const programs = Array.from(state.programs.values()).filter((program) => program.faculty_id === state.faculty);
  majorSelect.innerHTML = "";
  for (const program of programs) {
    const option = document.createElement("option");
    option.value = program.id;
    const shortName = program.program_name
      .replace(/^Bachelor of Science in /, "")
      .replace(/^Bachelor(?:’s|'s)? Degree in /, "")
      .replace(/^Bachelor of /, "");
    option.textContent = program.catalog_status === "catalog-only" ? shortName + " (study plan needed)" : shortName;
    majorSelect.append(option);
  }
  if (!programs.some((program) => program.id === state.major)) state.major = programs.length ? programs[0].id : "accounting";
  majorSelect.value = state.major;
}

function isCatalogOnly() {
  return state.program && state.program.catalog_status === "catalog-only";
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
        "Official total credits are known, but KAU's course rows do not include usable per-course credits yet.",
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

function renderChecklist() {
  courseChecklist.innerHTML = "";
  if (isCatalogOnly()) {
    const empty = document.createElement("div");
    empty.className = "majorEmpty";
    const title = document.createElement("strong");
    title.textContent = "Study plan not loaded yet.";
    const note = document.createElement("span");
    note.textContent = "This is an official KAU bachelor catalog entry. Send the study-plan table or credits for this major and I can activate course tracking.";
    empty.append(title, note);
    if (state.program.official_source_url) {
      const link = document.createElement("a");
      link.href = state.program.official_source_url;
      link.target = "_blank";
      link.rel = "noreferrer";
      link.textContent = "Official source";
      empty.append(link);
    }
    courseChecklist.append(empty);
    return;
  }
  const fragment = document.createDocumentFragment();

  for (const [level, courses] of groupCoursesByLevel(visibleCourses())) {
    const tableBlock = document.createElement("section");
    tableBlock.className = "studyPlanTable";
    const requiredCredits = requiredCreditTotal(courses);
    const collapsed = state.collapsedLevels.has(level);
    tableBlock.innerHTML = `
      <div class="studyPlanHeader">
        <div>
          <strong>${level}</strong>
          <span>${requiredCredits} required credits</span>
        </div>
        <button class="levelToggle secondaryButton" type="button" aria-expanded="${!collapsed}">
          ${collapsed ? "Show" : "Hide"}
        </button>
      </div>
      <table ${collapsed ? "hidden" : ""}>
        <thead>
          <tr>
            <th class="doneColumn">Done</th>
            <th>Course</th>
            <th>Name</th>
            <th class="creditColumn">Credits</th>
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
    for (const course of courses) {
      const code = courseCode(course);
      const row = document.createElement("tr");
      if (state.selected.has(code)) row.className = "selectedRow";
      const credits = Number.isInteger(course.credit_hours) ? course.credit_hours : "--";
      const optionNote =
        course.counts_toward_program_credit_total === false
          ? `<span class="meta">${course.credit_total_exclusion_reason || "Alternative option"}</span>`
          : "";

      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.checked = state.selected.has(code);
      checkbox.setAttribute("aria-label", `Mark ${course.course_code} completed`);
      checkbox.addEventListener("change", () => setCompleted(code, checkbox.checked));

      const doneCell = document.createElement("td");
      doneCell.className = "doneColumn";
      doneCell.append(checkbox);

      const codeCell = document.createElement("td");
      codeCell.innerHTML = `<span class="code">${course.course_code}</span>`;

      const nameCell = document.createElement("td");
      nameCell.innerHTML = `<span class="name">${course.official_course_name || ""}</span>${optionNote}`;

      const creditCell = document.createElement("td");
      creditCell.className = "creditColumn";
      creditCell.textContent = credits;

      row.append(doneCell, codeCell, nameCell, creditCell);
      body.append(row);
    }

    fragment.append(tableBlock);
  }

  courseChecklist.append(fragment);
}

function courseItem(course, className, reason = "") {
  const item = document.createElement("article");
  item.className = `courseItem ${className}`;
  const credits =
    Number.isInteger(course.credit_hours) && course.credit_hours > 0
      ? `${course.credit_hours} credits`
      : "credits unavailable";
  item.innerHTML = `
    <span class="code">${course.course_code}</span>
    <span class="name">${course.official_course_name || ""}</span>
    <span class="meta">${course.semester_or_level || ""} - ${credits}</span>
    ${reason ? `<span class="reason">${reason}</span>` : ""}
  `;
  return item;
}

function completedCourseItem(course) {
  const item = courseItem(course, "completed");
  const button = document.createElement("button");
  button.type = "button";
  button.className = "removeButton";
  button.textContent = "Remove";
  button.addEventListener("click", () => setCompleted(courseCode(course), false));
  item.append(button);
  return item;
}

function renderList(target, items, emptyText, kind) {
  target.innerHTML = "";
  if (!items.length) {
    const empty = document.createElement("div");
    empty.className = "empty";
    empty.textContent = emptyText;
    target.append(empty);
    return;
  }

  const fragment = document.createDocumentFragment();
  for (const item of items) {
    if (kind === "blocked") {
      fragment.append(
        courseItem(item.course, "blocked", `Missing: ${item.missing.join(", ")}`),
      );
    } else if (kind === "completed") {
      fragment.append(completedCourseItem(item));
    } else if (kind === "recommended") {
      fragment.append(courseItem(item, "recommended", "Earliest available course"));
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
  const recommended = recommendedCourses(plan.available);

  const titleName = state.program.program_name.replace(/^Bachelor of Science in /, "");
  plannerTitle.textContent = isCatalogOnly() ? titleName + " Catalog" : titleName + " Course Planner";
  progressText.textContent = `${percent}% complete`;
  completedCount.textContent = plan.completed.length;
  availableCount.textContent = plan.available.length;
  blockedCount.textContent = plan.blocked.length;
  officialCredits.textContent = state.program.total_program_credit_hours || "--";
  creditsCompleted.textContent = credits.completedText;
  creditsRemaining.textContent = credits.remainingText;
  creditsCompleted.title = credits.note;
  creditsRemaining.title = credits.note;
  creditNote.textContent = credits.note || (state.program.total_program_credit_hours ? "" : "Level 1 and 2 data may still be missing for this major.");
  addRecommendedButton.disabled = recommended.length === 0 || isCatalogOnly();
  clearButton.disabled = isCatalogOnly();
  loginForm.hidden = Boolean(state.user);
  userPanel.hidden = !state.user;
  userName.textContent = state.user ? `Student ID ${state.user.username}` : "";
  majorStatus.textContent = isCatalogOnly()
    ? "Catalog only - " + (state.program.catalog_note || "study plan needed")
    : String((state.program.courses || []).length) + " courses loaded";

  renderChecklist();
  renderList(
    completedList,
    sortByLevelThenCode(plan.completed),
    "No completed courses selected yet.",
    "completed",
  );
  renderList(
    recommendedList,
    recommended,
    "Select completed courses to see recommendations.",
    "recommended",
  );
  renderList(availableList, plan.available, "No available courses.", "available");
  renderList(blockedList, plan.blocked, "No blocked courses.", "blocked");
}

searchInput.addEventListener("input", () => {
  state.search = searchInput.value;
  renderChecklist();
});

levelFilter.addEventListener("change", () => {
  state.level = levelFilter.value;
  renderChecklist();
});

facultySelect.addEventListener("change", async () => {
  state.faculty = facultySelect.value;
  setupMajorSelect();
  await chooseMajor(majorSelect.value);
});

async function chooseMajor(majorId) {
  state.major = majorId;
  state.program = state.programs.get(state.major) || state.programs.get("accounting");
  state.selected.clear();
  state.search = "";
  state.level = "all";
  state.collapsedLevels.clear();
  searchInput.value = "";
  levelFilter.value = "all";
  setupLevelFilter();
  if (state.user && !isCatalogOnly()) {
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

addRecommendedButton.addEventListener("click", () => {
  const plan = buildPlan();
  for (const course of recommendedCourses(plan.available)) {
    state.selected.add(courseCode(course));
  }
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
});

themeToggle.addEventListener("click", () => {
  const nextTheme = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
  localStorage.setItem(themeStorageKey, nextTheme);
  applyTheme(nextTheme);
});

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const studentId = usernameInput.value.trim();
  if (!/^\d{7}$/.test(studentId)) {
    saveStatus.textContent = "Student ID must be exactly 7 numbers.";
    usernameInput.focus();
    return;
  }
  saveStatus.textContent = "Signing in...";
  try {
    const result = await api("/api/login", {
      method: "POST",
      body: JSON.stringify({ username: studentId }),
    });
    state.user = result.user;
    await loadProgress();
    render();
    saveStatus.textContent = "Signed in. Progress will be saved.";
  } catch {
    saveStatus.textContent = "Login failed. Student ID must be exactly 7 numbers.";
  }
});

logoutButton.addEventListener("click", async () => {
  await api("/api/logout", { method: "POST", body: "{}" });
  state.user = null;
  render();
  saveStatus.textContent = "Signed out.";
});

async function loadProgress() {
  if (!state.user) return;
  const progress = await api(`/api/progress?major=${encodeURIComponent(state.major)}`);
  state.selected = new Set((progress.completed_codes || []).map(normalize));
}

async function start() {
  loadTheme();
  try {
    const registry = await api("/api/programs");
    for (const summary of registry.programs || []) {
      if (summary.catalog_status === "catalog-only") {
        state.programs.set(summary.id, { ...summary, courses: [] });
      } else {
        const program = await api(`/api/program?major=${encodeURIComponent(summary.id)}`);
        state.programs.set(program.id || summary.id, withCommonFoundation({ ...summary, ...program }));
      }
    }
    state.program = state.programs.get(state.major) || state.programs.values().next().value;
    state.faculty = state.program?.faculty_id || state.faculty;
  } catch {
    const response = await fetch("data/kau_accounting.json");
    const accounting = await response.json();
    accounting.id = "accounting";
    state.programs.set("accounting", withCommonFoundation({ faculty_id: "economics-and-administration", faculty_name: accounting.college_name || "economics and administration", catalog_status: "active", ...accounting }));
    try {
      const catalogResponse = await fetch("data/faculty_catalog.json");
      const catalog = await catalogResponse.json();
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
        state.programs.set(program.id, withCommonFoundation({ faculty_id: "economics-and-administration", faculty_name: program.college_name || "economics and administration", catalog_status: "active", ...program }));
      }
    } catch {
      // Static fallback can still run with Accounting only.
    }
    state.program = state.programs.get(state.major) || state.programs.values().next().value;
    state.faculty = state.program?.faculty_id || state.faculty;
    saveStatus.textContent = "Backend API unavailable. Running without saved login.";
  }
  setupFacultySelect();
  setupMajorSelect();
  setupLevelFilter();

  try {
    const me = await api("/api/me");
    state.user = me.user;
    if (!isCatalogOnly()) await loadProgress();
  } catch {
    state.user = null;
  }
  render();
}

start().catch(() => {
  progressText.textContent = "Could not load data";
});
