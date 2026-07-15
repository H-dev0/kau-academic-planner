from __future__ import annotations

import argparse
import json
from pathlib import Path


def main() -> int:
    parser = argparse.ArgumentParser(description="Write a Markdown preview of parsed program data.")
    parser.add_argument("program_json", type=Path)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()

    program = json.loads(args.program_json.read_text(encoding="utf-8"))
    courses = program["courses"]
    lines = [
        "# KAU Accounting Data Preview",
        "",
        f"Program: {program['program_name']}",
        f"College: {program['college_name']}",
        f"Degree: {program['degree_level']}",
        f"Official total credit hours: {program['total_program_credit_hours']}",
        f"Course rows extracted: {len(courses)}",
        "",
        "| Level | Code | Official course name | Credits | Prerequisites |",
        "|---|---|---|---:|---|",
    ]

    for course in courses:
        prerequisites = ", ".join(course["prerequisites"])
        credits = "" if course["credit_hours"] is None else str(course["credit_hours"])
        name = (course["official_course_name"] or "").replace("|", "\\|")
        lines.append(
            f"| {course['semester_or_level']} | {course['course_code']} | "
            f"{name} | {credits} | {prerequisites} |"
        )

    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text("\n".join(lines) + "\n", encoding="utf-8")
    print(f"Wrote preview: {args.output}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
