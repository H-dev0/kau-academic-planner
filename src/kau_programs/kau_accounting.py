from __future__ import annotations

import argparse
import json
import re
from dataclasses import asdict
from datetime import date
from pathlib import Path
from typing import Any

from .schema import Course, Program


SOURCE_URL = "https://kau.edu.sa/en/programs/bachelor-of-science-in-accounting"
SOURCE_TITLE = "Bachelor of Science in Accounting"


def _extract_escaped_json_array(text: str, marker: str) -> list[dict[str, Any]]:
    marker_index = text.find(marker)
    if marker_index == -1:
        raise ValueError(f"could not find marker: {marker}")

    start = text.find("[", marker_index)
    if start == -1:
        raise ValueError("could not find JSON array start")

    depth = 0
    for index in range(start, len(text)):
        char = text[index]
        if char == "[":
            depth += 1
        elif char == "]":
            depth -= 1
            if depth == 0:
                escaped_json = text[start : index + 1]
                json_text = escaped_json.replace('\\"', '"')
                return json.loads(json_text)

    raise ValueError("could not find JSON array end")


def _parse_total_credit_hours(study_plan: list[dict[str, Any]]) -> int | None:
    for section in study_plan:
        description = section.get("description") or ""
        match = re.search(r"totaling\s+(\d+)\s+credit hours", description, re.I)
        if match:
            return int(match.group(1))
    return None


def _parse_prerequisites(value: str | None) -> list[str]:
    if not value:
        return []
    return [part.strip() for part in re.split(r"[,;]", value) if part.strip()]


def parse_program_from_html(text: str, last_checked_date: str) -> Program:
    study_plan = _extract_escaped_json_array(text, '\\"studyPlan\\":')
    total_credit_hours = _parse_total_credit_hours(study_plan)

    courses: list[Course] = []
    for section in study_plan:
        for level in section.get("levels") or []:
            level_name = level.get("name")
            for item in level.get("courses") or []:
                raw_credit_hours = item.get("credit_hours")
                credit_hours = raw_credit_hours if raw_credit_hours not in (None, 0) else None
                courses.append(
                    Course(
                        semester_or_level=level_name,
                        course_code=item.get("code"),
                        official_course_name=item.get("name"),
                        credit_hours=credit_hours,
                        prerequisites=_parse_prerequisites(item.get("prerequisites")),
                        official_source_url=SOURCE_URL,
                        source_title=SOURCE_TITLE,
                        last_checked_date=last_checked_date,
                    )
                )

    return Program(
        university_name="King Abdulaziz University",
        college_name="Faculty of Economics and Administration",
        program_name="Bachelor of Science in Accounting",
        degree_level="Bachelor's degree",
        total_program_credit_hours=total_credit_hours,
        official_source_url=SOURCE_URL,
        source_title=SOURCE_TITLE,
        last_checked_date=last_checked_date,
        courses=courses,
    )


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Parse the saved KAU Bachelor of Science in Accounting page."
    )
    parser.add_argument("input", type=Path)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--last-checked-date", default=date.today().isoformat())
    args = parser.parse_args()

    program = parse_program_from_html(
        args.input.read_text(encoding="utf-8"),
        last_checked_date=args.last_checked_date,
    )
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(
        json.dumps(asdict(program), indent=2, ensure_ascii=False),
        encoding="utf-8",
    )
    print(f"Parsed {len(program.courses)} courses: {args.output}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
