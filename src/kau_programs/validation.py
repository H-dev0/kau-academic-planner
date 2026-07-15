from __future__ import annotations

from dataclasses import asdict

from .schema import Program


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
