from __future__ import annotations

import argparse
import json
import re
from pathlib import Path


def main() -> int:
    parser = argparse.ArgumentParser(description="Audit saved KAU source coverage.")
    parser.add_argument("program_json", type=Path)
    parser.add_argument("raw_html", type=Path)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()

    program = json.loads(args.program_json.read_text(encoding="utf-8"))
    html = args.raw_html.read_text(encoding="utf-8")
    courses = program["courses"]
    courses_with_credits = [
        course for course in courses if isinstance(course.get("credit_hours"), int)
    ]
    courses_with_prerequisites = [
        course for course in courses if course.get("prerequisites")
    ]
    study_plan_link_match = re.search(r'\\"studyPlanLink\\":([^,}]+)', html)
    study_plan_link = study_plan_link_match.group(1) if study_plan_link_match else "not found"

    lines = [
        "# KAU Accounting Source Audit",
        "",
        f"Official source: {program['official_source_url']}",
        f"Source title: {program['source_title']}",
        f"Last checked: {program['last_checked_date']}",
        "",
        "## Coverage",
        "",
        f"- Course rows extracted: {len(courses)}",
        f"- Courses with usable per-course credits: {len(courses_with_credits)}",
        f"- Courses with prerequisites: {len(courses_with_prerequisites)}",
        f"- Official total program credits: {program['total_program_credit_hours']}",
        f"- Embedded detailed study plan link: {study_plan_link}",
        "",
        "## Gap",
        "",
        "The official KAU program page provides the total program credit hours, but its "
        "embedded course rows currently contain no usable per-course credit hours.",
        "",
        "The app must not calculate completed or remaining credits until another "
        "official course-credit source is found or a manually reviewed source is added.",
    ]

    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text("\n".join(lines) + "\n", encoding="utf-8")
    print(f"Wrote source audit: {args.output}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
