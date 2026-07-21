(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.creditDisplay = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const labels = {
    ar: { official: "إجمالي الساعات", calculated: "الساعات المحتسبة", unavailable: "غير متاح" },
    en: { official: "Total credits", calculated: "Calculated credits", unavailable: "Unavailable" },
  };

  function validNumber(value) {
    return typeof value === "number" && Number.isFinite(value);
  }

  function effectiveCreditTotal(program) {
    if (validNumber(program?.total_program_credit_hours)) {
      return { total: program.total_program_credit_hours, calculated: false };
    }
    const courses = Array.isArray(program?.courses) ? program.courses : [];
    const total = courses
      .filter((course) => course?.counts_toward_program_credit_total !== false)
      .reduce((sum, course) => sum + (validNumber(course?.credit_hours) ? course.credit_hours : 0), 0);
    return total > 0 ? { total, calculated: true } : { total: null, calculated: false };
  }

  function plannerProgressMetrics(program, completedCourses) {
    const courses = Array.isArray(program?.courses) ? program.courses : [];
    const completed = Array.isArray(completedCourses) ? completedCourses : [];
    const effective = effectiveCreditTotal(program);
    const creditedCompleted = completed.filter((course) => validNumber(course?.credit_hours));
    const completedCredits = creditedCompleted.reduce((sum, course) => sum + course.credit_hours, 0);
    const creditsKnown = creditedCompleted.length === completed.length;
    const remainingCredits = creditsKnown && validNumber(effective.total)
      ? Math.max(effective.total - completedCredits, 0)
      : null;
    const completionPercentage = courses.length
      ? Math.round((completed.length / courses.length) * 100)
      : 0;

    return {
      effectiveTotalCredits: effective.total,
      calculatedTotal: effective.calculated,
      completedCredits: creditsKnown ? completedCredits : null,
      remainingCredits,
      completionPercentage,
      completedCourseCount: completed.length,
      remainingCourseCount: Math.max(courses.length - completed.length, 0),
    };
  }

  function programCreditDisplay(program, language) {
    const text = labels[language === "en" ? "en" : "ar"];
    const effective = effectiveCreditTotal(program);
    if (validNumber(effective.total)) {
      return {
        value: String(effective.total),
        label: effective.calculated ? text.calculated : text.official,
        calculated: effective.calculated,
      };
    }
    return { value: text.unavailable, label: text.official, calculated: false };
  }

  return { effectiveCreditTotal, plannerProgressMetrics, programCreditDisplay };
});
