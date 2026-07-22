(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.electiveGroups = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  function normalize(code) {
    return String(code || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
  }

  function groupsFor(program) {
    return Array.isArray(program?.elective_groups) ? program.elective_groups : [];
  }

  function coursesFor(program) {
    return Array.isArray(program?.courses) ? program.courses : [];
  }

  function normalizedSelections(program, input) {
    const groups = new Map(groupsFor(program).map((group) => [group.id, group]));
    const selections = {};
    const errors = [];
    const raw = input && typeof input === "object" && !Array.isArray(input) ? input : {};
    for (const [groupId, rawCodes] of Object.entries(raw)) {
      const group = groups.get(groupId);
      if (!group) {
        errors.push(`unknown elective group id: ${groupId}`);
        continue;
      }
      if (!Array.isArray(rawCodes)) {
        errors.push(`elective selection for ${groupId} must be a list`);
        continue;
      }
      const allowed = new Map((group.option_course_codes || []).map((code) => [normalize(code), code]));
      const unique = [];
      for (const rawCode of rawCodes) {
        const code = normalize(rawCode);
        if (!allowed.has(code)) errors.push(`course ${rawCode} does not belong to elective group ${groupId}`);
        else if (!unique.includes(code)) unique.push(code);
      }
      if (Number.isInteger(group.maximum_course_count) && unique.length > group.maximum_course_count) {
        errors.push(`elective group ${groupId} allows at most ${group.maximum_course_count} selections`);
      }
      selections[groupId] = unique;
    }
    return { selections, errors };
  }

  function electivePlan(program, completedCodes, inputSelections) {
    const courses = coursesFor(program);
    const coursesByCode = new Map(courses.filter((course) => course.course_code).map((course) => [normalize(course.course_code), course]));
    const completed = new Set((completedCodes || []).map(normalize));
    const normalized = normalizedSelections(program, inputSelections);
    const optionCodes = new Set(groupsFor(program).flatMap((group) => (group.option_course_codes || []).map(normalize)));
    const fixedCodes = new Set([...coursesByCode.keys()].filter((code) => !optionCodes.has(code)));
    const statuses = groupsFor(program).map((group) => {
      const selected = normalized.selections[group.id] || [];
      const completedSelected = selected.filter((code) => completed.has(code));
      const appliedCredits = completedSelected.reduce((sum, code) => {
        const credits = coursesByCode.get(code)?.credit_hours;
        return sum + (Number.isFinite(credits) ? credits : 0);
      }, 0);
      const countSatisfied = group.required_course_count == null || selected.length >= group.required_course_count;
      const completedCountSatisfied = group.required_course_count == null || completedSelected.length >= group.required_course_count;
      const creditsSatisfied = group.required_credit_hours == null || appliedCredits >= group.required_credit_hours;
      return {
        id: group.id,
        name_ar: group.name_ar,
        name_en: group.name_en,
        classification: group.classification,
        required: group.required,
        semester_or_level: group.semester_or_level,
        option_course_codes: group.option_course_codes || [],
        selected_course_codes: selected.map((code) => coursesByCode.get(code)?.course_code).filter(Boolean),
        completed_selected_course_codes: completedSelected.map((code) => coursesByCode.get(code)?.course_code).filter(Boolean),
        selected_count: selected.length,
        completed_selected_count: completedSelected.length,
        required_course_count: group.required_course_count ?? null,
        required_credit_hours: group.required_credit_hours ?? null,
        maximum_course_count: group.maximum_course_count ?? null,
        applied_completed_credits: appliedCredits,
        remaining_required_count: group.required_course_count == null ? null : Math.max(group.required_course_count - completedSelected.length, 0),
        remaining_elective_credits: group.required_credit_hours == null ? null : Math.max(group.required_credit_hours - appliedCredits, 0),
        complete: group.required ? countSatisfied && completedCountSatisfied && creditsSatisfied : true,
      };
    });
    const creditOnly = groupsFor(program).some((group) => group.required && group.required_course_count == null);
    const requiredCourseCount = creditOnly ? null : fixedCodes.size + groupsFor(program)
      .filter((group) => group.required)
      .reduce((sum, group) => sum + (group.required_course_count || 0), 0);
    const completedFixed = [...fixedCodes].filter((code) => completed.has(code));
    const completedRequiredCount = requiredCourseCount == null ? null : completedFixed.length + statuses
      .filter((status) => status.required)
      .reduce((sum, status) => sum + Math.min(status.completed_selected_count, status.required_course_count || 0), 0);
    const fixedCompletedCredits = completedFixed.reduce((sum, code) => {
      const course = coursesByCode.get(code);
      return sum + (course?.counts_toward_program_credit_total === false || !Number.isFinite(course?.credit_hours) ? 0 : course.credit_hours);
    }, 0);
    const appliedCompletedCredits = fixedCompletedCredits + statuses
      .filter((status) => status.required)
      .reduce((sum, status) => sum + status.applied_completed_credits, 0);
    const requiredCredits = effectiveRequiredCredits(program);
    const remainingRequiredCredits = Number.isFinite(requiredCredits)
      ? Math.max(requiredCredits - appliedCompletedCredits, 0) : null;
    return {
      validation_errors: normalized.errors,
      normalized_selections: normalized.selections,
      elective_group_statuses: statuses,
      required_course_count: requiredCourseCount,
      completed_required_course_count: completedRequiredCount,
      required_course_progress_percent: requiredCourseCount
        ? Math.round((completedRequiredCount / requiredCourseCount) * 1000) / 10 : null,
      effective_required_credits: requiredCredits,
      applied_completed_credits: appliedCompletedCredits,
      remaining_required_credits: remainingRequiredCredits,
      graduation_complete: normalized.errors.length === 0
        && [...fixedCodes].every((code) => completed.has(code))
        && statuses.filter((status) => status.required).every((status) => status.complete)
        && (remainingRequiredCredits == null || remainingRequiredCredits === 0),
    };
  }

  function effectiveRequiredCredits(program) {
    if (Number.isFinite(program?.total_program_credit_hours)) return program.total_program_credit_hours;
    const optionCodes = new Set(groupsFor(program).flatMap((group) => (group.option_course_codes || []).map(normalize)));
    const fixed = coursesFor(program).filter((course) => course.course_code && !optionCodes.has(normalize(course.course_code)) && course.counts_toward_program_credit_total !== false);
    if (fixed.some((course) => !Number.isFinite(course.credit_hours))) return null;
    let total = fixed.reduce((sum, course) => sum + course.credit_hours, 0);
    const byCode = new Map(coursesFor(program).map((course) => [normalize(course.course_code), course]));
    for (const group of groupsFor(program).filter((item) => item.required)) {
      if (Number.isFinite(group.required_credit_hours)) total += group.required_credit_hours;
      else if (Number.isInteger(group.required_course_count)) {
        const values = (group.option_course_codes || []).map((code) => byCode.get(normalize(code))?.credit_hours);
        if (!values.length || values.some((value) => !Number.isFinite(value)) || new Set(values).size !== 1) return null;
        total += values[0] * group.required_course_count;
      } else return null;
    }
    return total || null;
  }

  function validateProgressPayload(program, payload, inferVersionOne) {
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) return { ok: false, errors: ["progress payload must be an object"] };
    const known = new Set(coursesFor(program).filter((course) => course.course_code).map((course) => normalize(course.course_code)));
    const completedInput = Array.isArray(payload.completed_codes) ? payload.completed_codes : [];
    const completed = [];
    const errors = [];
    for (const rawCode of completedInput) {
      const code = normalize(rawCode);
      if (!known.has(code)) errors.push(`unknown course code: ${rawCode}`);
      else if (!completed.includes(code)) completed.push(code);
    }
    let rawSelections = payload.elective_selections;
    const isV1 = payload.version !== 2 && rawSelections == null;
    if (rawSelections == null) rawSelections = {};
    if (isV1 && inferVersionOne) {
      const memberships = new Map();
      for (const group of groupsFor(program)) {
        for (const rawCode of group.option_course_codes || []) {
          const code = normalize(rawCode);
          if (!memberships.has(code)) memberships.set(code, []);
          memberships.get(code).push(group);
        }
      }
      for (const code of completed) {
        const candidates = memberships.get(code) || [];
        if (candidates.length !== 1) continue;
        const group = candidates[0];
        const selected = rawSelections[group.id] || [];
        if (!Number.isInteger(group.maximum_course_count) || selected.length < group.maximum_course_count) {
          rawSelections[group.id] = [...selected, code];
        }
      }
    }
    const checked = normalizedSelections(program, rawSelections);
    errors.push(...checked.errors);
    return {
      ok: errors.length === 0,
      errors,
      state: { completed_codes: completed, elective_selections: checked.selections },
    };
  }

  function progressPayload(completedCodes, electiveSelections) {
    const selections = electiveSelections || {};
    const hasSelections = Object.values(selections).some((codes) => Array.isArray(codes) && codes.length);
    return hasSelections
      ? { version: 2, completed_codes: [...completedCodes], elective_selections: selections }
      : { completed_codes: [...completedCodes] };
  }

  return {
    normalize,
    normalizedSelections,
    electivePlan,
    effectiveRequiredCredits,
    validateProgressPayload,
    progressPayload,
  };
});
