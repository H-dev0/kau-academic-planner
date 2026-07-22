(function (root, factory) {
  const electiveApi = typeof module === "object" && module.exports
    ? require("./elective-groups.js")
    : root.electiveGroups;
  const api = factory(electiveApi);
  if (typeof module === "object" && module.exports) module.exports = api;
  root.creditDisplay = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function (electiveApi) {
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

  function plannerProgressMetrics(program, completedCourses, electiveSelections) {
    if (Array.isArray(program?.elective_groups) && program.elective_groups.length
        && electiveApi) {
      const completedCodes = (completedCourses || []).map((course) => course?.course_code).filter(Boolean);
      const elective = electiveApi.electivePlan(program, completedCodes, electiveSelections || {});
      const effectiveTotal = elective.effective_required_credits;
      const percent = elective.required_course_progress_percent != null
        ? Math.round(elective.required_course_progress_percent)
        : Number.isFinite(effectiveTotal) && effectiveTotal > 0
          ? Math.round((elective.applied_completed_credits / effectiveTotal) * 100)
          : 0;
      return {
        effectiveTotalCredits: effectiveTotal,
        calculatedTotal: !Number.isFinite(program?.total_program_credit_hours),
        completedCredits: elective.applied_completed_credits,
        remainingCredits: elective.remaining_required_credits,
        completionPercentage: Math.min(Math.max(percent, 0), 100),
        completedCourseCount: elective.completed_required_course_count,
        remainingCourseCount: elective.required_course_count == null
          ? null : Math.max(elective.required_course_count - elective.completed_required_course_count, 0),
        graduationComplete: elective.graduation_complete,
        electiveGroupStatuses: elective.elective_group_statuses,
        validationErrors: elective.validation_errors,
      };
    }
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
    const effective = Array.isArray(program?.elective_groups) && program.elective_groups.length
      && electiveApi
      ? { total: electiveApi.effectiveRequiredCredits(program), calculated: !validNumber(program?.total_program_credit_hours) }
      : effectiveCreditTotal(program);
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
