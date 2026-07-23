from __future__ import annotations

import argparse
import json
import re
from dataclasses import asdict
from pathlib import Path

from .schema import Course, ElectiveGroup, Program


def normalize_course_code(code: str) -> str:
    return re.sub(r"[^A-Z0-9]", "", code.upper())


def _course_summary(course: Course) -> dict:
    data = asdict(course)
    data["normalized_course_code"] = (
        normalize_course_code(course.course_code) if course.course_code else None
    )
    return data


def _validated_elective_selections(
    program: Program, selections: dict[str, list[str]] | None
) -> tuple[dict[str, list[str]], list[str]]:
    raw = selections or {}
    errors: list[str] = []
    groups = {group.id: group for group in program.elective_groups}
    normalized: dict[str, list[str]] = {}
    for group_id, raw_codes in raw.items():
        group = groups.get(group_id)
        if group is None:
            errors.append(f"unknown elective group id: {group_id}")
            continue
        if not isinstance(raw_codes, list):
            errors.append(f"elective selection for {group_id} must be a list")
            continue
        allowed = {normalize_course_code(code) for code in group.option_course_codes}
        unique: list[str] = []
        for raw_code in raw_codes:
            code = normalize_course_code(str(raw_code))
            if code not in allowed:
                errors.append(f"course {raw_code} does not belong to elective group {group_id}")
            elif code not in unique:
                unique.append(code)
        if group.maximum_course_count is not None and len(unique) > group.maximum_course_count:
            errors.append(
                f"elective group {group_id} allows at most {group.maximum_course_count} selections"
            )
        normalized[group_id] = unique
    return normalized, errors


def _elective_status(
    group: ElectiveGroup,
    selected: list[str],
    completed: set[str],
    courses_by_code: dict[str, Course],
) -> dict:
    completed_selected = [code for code in selected if code in completed]
    applied_credits = sum(
        course.credit_hours
        for code in completed_selected
        if (course := courses_by_code.get(code)) is not None
        and isinstance(course.credit_hours, int)
    )
    count_satisfied = (
        group.required_course_count is None
        or len(selected) >= group.required_course_count
    )
    completed_count_satisfied = (
        group.required_course_count is None
        or len(completed_selected) >= group.required_course_count
    )
    credits_satisfied = (
        group.required_credit_hours is None
        or applied_credits >= group.required_credit_hours
    )
    constraints_satisfied = count_satisfied and completed_count_satisfied and credits_satisfied
    return {
        "id": group.id,
        "name_ar": group.name_ar,
        "name_en": group.name_en,
        "classification": group.classification,
        "required": group.required,
        "semester_or_level": group.semester_or_level,
        "option_course_codes": group.option_course_codes,
        "selected_course_codes": [courses_by_code[code].course_code for code in selected],
        "completed_selected_course_codes": [
            courses_by_code[code].course_code for code in completed_selected
        ],
        "selected_count": len(selected),
        "completed_selected_count": len(completed_selected),
        "required_course_count": group.required_course_count,
        "required_credit_hours": group.required_credit_hours,
        "maximum_course_count": group.maximum_course_count,
        "applied_completed_credits": applied_credits,
        "remaining_required_count": (
            max(group.required_course_count - len(completed_selected), 0)
            if group.required_course_count is not None else None
        ),
        "remaining_elective_credits": (
            max(group.required_credit_hours - applied_credits, 0)
            if group.required_credit_hours is not None else None
        ),
        "complete": constraints_satisfied if group.required else True,
    }


def _effective_required_credits(
    program: Program, option_codes: set[str], courses_by_code: dict[str, Course]
) -> int | None:
    if isinstance(program.total_program_credit_hours, int):
        return program.total_program_credit_hours
    fixed = [
        course for code, course in courses_by_code.items()
        if code not in option_codes and course.counts_toward_program_credit_total is not False
    ]
    if any(not isinstance(course.credit_hours, int) for course in fixed):
        return None
    total = sum(course.credit_hours for course in fixed if course.credit_hours is not None)
    for group in program.elective_groups:
        if not group.required:
            continue
        if isinstance(group.required_credit_hours, int):
            total += group.required_credit_hours
            continue
        if not isinstance(group.required_course_count, int):
            return None
        values = [
            courses_by_code[normalize_course_code(code)].credit_hours
            for code in group.option_course_codes
        ]
        if not values or any(not isinstance(value, int) for value in values) or len(set(values)) != 1:
            return None
        total += values[0] * group.required_course_count
    return total or None


def plan_courses(
    program: Program,
    completed_codes: list[str],
    elective_selections: dict[str, list[str]] | None = None,
) -> dict:
    completed_normalized = {normalize_course_code(code) for code in completed_codes}
    courses_by_code = {
        normalize_course_code(course.course_code): course
        for course in program.courses
        if course.course_code
    }
    selections, selection_errors = _validated_elective_selections(
        program, elective_selections
    )

    known_completed = []
    unknown_completed_codes = []
    for code in sorted(completed_normalized):
        course = courses_by_code.get(code)
        if course:
            known_completed.append(_course_summary(course))
        else:
            unknown_completed_codes.append(code)

    available = []
    blocked = []
    for course in program.courses:
        if not course.course_code:
            continue

        normalized_code = normalize_course_code(course.course_code)
        if normalized_code in completed_normalized:
            continue

        missing_prerequisites = [
            prerequisite
            for prerequisite in course.prerequisites
            if normalize_course_code(prerequisite) not in completed_normalized
        ]
        if missing_prerequisites:
            blocked.append(
                {
                    "course": _course_summary(course),
                    "missing_prerequisites": missing_prerequisites,
                }
            )
        else:
            available.append(_course_summary(course))

    total_courses = len([course for course in program.courses if course.course_code])
    completed_count = len(known_completed)
    progress_percent = round((completed_count / total_courses) * 100, 1) if total_courses else 0
    result = {
        "program_name": program.program_name,
        "total_courses": total_courses,
        "completed_count": completed_count,
        "progress_percent": progress_percent,
        "completed_courses": known_completed,
        "unknown_completed_codes": unknown_completed_codes,
        "available_courses": available,
        "blocked_courses": blocked,
    }
    if not program.elective_groups:
        return result

    option_codes = {
        normalize_course_code(code)
        for group in program.elective_groups
        for code in group.option_course_codes
    }
    fixed_codes = set(courses_by_code) - option_codes
    completed_fixed = fixed_codes & completed_normalized
    statuses = [
        _elective_status(
            group, selections.get(group.id, []), completed_normalized, courses_by_code
        )
        for group in program.elective_groups
    ]
    has_credit_only = any(
        group.required and group.required_course_count is None
        for group in program.elective_groups
    )
    required_course_count = None if has_credit_only else (
        len(fixed_codes)
        + sum(
            group.required_course_count or 0
            for group in program.elective_groups if group.required
        )
    )
    completed_required_count = None if required_course_count is None else (
        len(completed_fixed)
        + sum(
            min(status["completed_selected_count"], status["required_course_count"] or 0)
            for status in statuses if status["required"]
        )
    )
    fixed_completed_credits = sum(
        course.credit_hours
        for code in completed_fixed
        if isinstance((course := courses_by_code[code]).credit_hours, int)
        and course.counts_toward_program_credit_total is not False
    )
    elective_completed_credits = sum(
        status["applied_completed_credits"] for status in statuses if status["required"]
    )
    applied_completed_credits = fixed_completed_credits + elective_completed_credits
    required_credits = _effective_required_credits(program, option_codes, courses_by_code)
    remaining_credits = (
        max(required_credits - applied_completed_credits, 0)
        if isinstance(required_credits, int) else None
    )
    groups_complete = all(status["complete"] for status in statuses if status["required"])
    fixed_complete = fixed_codes <= completed_normalized
    credit_complete = remaining_credits in (None, 0)
    required_progress = (
        round((completed_required_count / required_course_count) * 100, 1)
        if required_course_count else None
    )
    result.update({
        "validation_errors": selection_errors,
        "elective_group_statuses": statuses,
        "required_course_count": required_course_count,
        "completed_required_course_count": completed_required_count,
        "required_course_progress_percent": required_progress,
        "effective_required_credits": required_credits,
        "applied_completed_credits": applied_completed_credits,
        "remaining_required_credits": remaining_credits,
        "graduation_complete": (
            not selection_errors and fixed_complete and groups_complete and credit_complete
        ),
    })
    return result


def _parse_completed(value: str | None) -> list[str]:
    if not value:
        return []
    return [part.strip() for part in value.split(",") if part.strip()]


def main() -> int:
    parser = argparse.ArgumentParser(description="Plan available and blocked courses.")
    parser.add_argument("program_json", type=Path)
    parser.add_argument(
        "--completed",
        default="",
        help='Comma-separated course codes, for example "ISLS 101, ARAB101".',
    )
    parser.add_argument("--output", type=Path)
    args = parser.parse_args()

    program = Program.from_dict(json.loads(args.program_json.read_text(encoding="utf-8")))
    result = plan_courses(program, _parse_completed(args.completed))
    output = json.dumps(result, indent=2, ensure_ascii=False)

    if args.output:
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(output + "\n", encoding="utf-8")
        print(f"Wrote course plan: {args.output}")
    else:
        print(output)

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
