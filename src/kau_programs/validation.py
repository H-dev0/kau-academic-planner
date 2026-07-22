from __future__ import annotations

from dataclasses import asdict

from .schema import Program
from .planner import normalize_course_code


REQUIRED_PROGRAM_FIELDS = (
    "university_name",
    "college_name",
    "program_name",
    "degree_level",
    "official_source_url",
    "source_title",
    "last_checked_date",
)

REQUIRED_COURSE_FIELDS = (
    "semester_or_level",
    "course_code",
    "official_course_name",
    "official_source_url",
    "source_title",
    "last_checked_date",
)

PLACEHOLDER_COURSE_CODES = {"ELECTIVE", "FREE"}
ELECTIVE_CLASSIFICATIONS = {"general", "internal", "external"}


def validate_program(program: Program) -> dict:
    errors: list[str] = []
    warnings: list[str] = []
    course_codes: dict[str, int] = {}
    credit_total = 0
    missing_course_credit_hours = 0

    program_dict = asdict(program)
    for field in REQUIRED_PROGRAM_FIELDS:
        if not program_dict.get(field):
            errors.append(f"missing program field: {field}")

    if not program.courses:
        errors.append("program has no courses")

    for index, course in enumerate(program.courses, start=1):
        course_dict = asdict(course)
        prefix = f"course {index}"
        for field in REQUIRED_COURSE_FIELDS:
            if course_dict.get(field) in (None, ""):
                errors.append(f"{prefix} missing required field: {field}")

        if course.course_code:
            normalized_code = course.course_code.strip().upper()
            if normalized_code not in PLACEHOLDER_COURSE_CODES:
                course_codes[normalized_code] = course_codes.get(normalized_code, 0) + 1

        if course.credit_hours is None:
            missing_course_credit_hours += 1
        elif isinstance(course.credit_hours, int) and course.credit_hours >= 0:
            if course_dict.get("counts_toward_program_credit_total") is not False:
                credit_total += course.credit_hours
        else:
            errors.append(f"{prefix} has malformed credit_hours")

    duplicate_codes = sorted(code for code, count in course_codes.items() if count > 1)
    for code in duplicate_codes:
        errors.append(f"duplicate course code: {code}")

    if program.elective_groups and program.planner_schema_version != 2:
        errors.append("elective_groups require planner_schema_version 2")

    group_ids: set[str] = set()
    elective_memberships: dict[str, str] = {}
    known_codes = {
        normalize_course_code(course.course_code): course
        for course in program.courses
        if course.course_code
    }
    for index, group in enumerate(program.elective_groups, start=1):
        prefix = f"elective group {index}"
        if not group.id or not isinstance(group.id, str):
            errors.append(f"{prefix} missing id")
        elif group.id in group_ids:
            errors.append(f"duplicate elective group id: {group.id}")
        else:
            group_ids.add(group.id)
        if not group.name_ar:
            errors.append(f"{prefix} missing name_ar")
        if not group.name_en:
            errors.append(f"{prefix} missing name_en")
        if group.classification not in ELECTIVE_CLASSIFICATIONS:
            errors.append(f"{prefix} has invalid classification: {group.classification}")
        if not isinstance(group.required, bool):
            errors.append(f"{prefix} required must be boolean")
        if not group.option_course_codes:
            errors.append(f"{prefix} has no option_course_codes")

        count = group.required_course_count
        credits = group.required_credit_hours
        maximum = group.maximum_course_count
        if count is not None and (not isinstance(count, int) or count < 1):
            errors.append(f"{prefix} has invalid required_course_count")
        if credits is not None and (not isinstance(credits, int) or credits < 1):
            errors.append(f"{prefix} has invalid required_credit_hours")
        if maximum is not None and (not isinstance(maximum, int) or maximum < 1):
            errors.append(f"{prefix} has invalid maximum_course_count")
        if group.required and count is None and credits is None:
            errors.append(f"{prefix} required group needs a count or credit constraint")
        if not group.required and maximum is None:
            errors.append(f"{prefix} optional group needs maximum_course_count")
        if count is not None and maximum is not None and maximum < count:
            errors.append(f"{prefix} maximum_course_count is lower than required_course_count")
        if maximum is not None and maximum > len(group.option_course_codes):
            errors.append(f"{prefix} maximum_course_count exceeds available options")

        seen_options: set[str] = set()
        for raw_code in group.option_course_codes:
            normalized = normalize_course_code(raw_code)
            if normalized in seen_options:
                errors.append(f"{prefix} contains duplicate option course code: {raw_code}")
                continue
            seen_options.add(normalized)
            if normalized not in known_codes:
                errors.append(f"{prefix} references unknown course code: {raw_code}")
            previous = elective_memberships.get(normalized)
            if previous is not None:
                errors.append(
                    f"course {raw_code} belongs to multiple elective groups: "
                    f"{previous}, {group.id}"
                )
            else:
                elective_memberships[normalized] = group.id

    if program.total_program_credit_hours is None:
        warnings.append("total_program_credit_hours is missing")
    elif missing_course_credit_hours:
        warnings.append(
            "course credit_hours are missing for some courses; partial known course "
            f"credits total {credit_total}, so cannot compare with "
            f"total_program_credit_hours {program.total_program_credit_hours}"
        )
    elif credit_total and credit_total != program.total_program_credit_hours:
        warnings.append(
            "sum of course credit_hours does not match total_program_credit_hours: "
            f"{credit_total} != {program.total_program_credit_hours}"
        )

    return {
        "ok": not errors,
        "errors": errors,
        "warnings": warnings,
        "course_count": len(program.courses),
        "sum_course_credit_hours": credit_total,
        "missing_course_credit_hours_count": missing_course_credit_hours,
        "duplicate_course_codes": duplicate_codes,
    }
