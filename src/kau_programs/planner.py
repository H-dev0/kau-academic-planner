from __future__ import annotations

import argparse
import json
import re
from dataclasses import asdict
from pathlib import Path

from .schema import Course, Program


def normalize_course_code(code: str) -> str:
    return re.sub(r"[^A-Z0-9]", "", code.upper())


def _course_summary(course: Course) -> dict:
    data = asdict(course)
    data["normalized_course_code"] = (
        normalize_course_code(course.course_code) if course.course_code else None
    )
    return data


def plan_courses(program: Program, completed_codes: list[str]) -> dict:
    completed_normalized = {normalize_course_code(code) for code in completed_codes}
    courses_by_code = {
        normalize_course_code(course.course_code): course
        for course in program.courses
        if course.course_code
    }

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

    return {
        "program_name": program.program_name,
        "total_courses": total_courses,
        "completed_count": completed_count,
        "progress_percent": progress_percent,
        "completed_courses": known_completed,
        "unknown_completed_codes": unknown_completed_codes,
        "available_courses": available,
        "blocked_courses": blocked,
    }


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
