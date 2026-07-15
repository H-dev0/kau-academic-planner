from __future__ import annotations

import argparse
import json
from pathlib import Path


def main() -> int:
    parser = argparse.ArgumentParser(description="Write a human-readable validation summary.")
    parser.add_argument("program_json", type=Path)
    parser.add_argument("validation_json", type=Path)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()

    program = json.loads(args.program_json.read_text(encoding="utf-8"))
    report = json.loads(args.validation_json.read_text(encoding="utf-8"))
    duplicate_codes = ", ".join(report["duplicate_course_codes"]) or "none"

    lines = [
        "# KAU Accounting Pilot Validation Report",
        "",
        f"Official source: {program['official_source_url']}",
        f"Source title: {program['source_title']}",
        f"Last checked: {program['last_checked_date']}",
        "",
        "## Extracted Summary",
        "",
        f"- University: {program['university_name']}",
        f"- College: {program['college_name']}",
        f"- Program: {program['program_name']}",
        f"- Degree level: {program['degree_level']}",
        f"- Official total credit hours: {program['total_program_credit_hours']}",
        f"- Extracted course rows: {report['course_count']}",
        "",
        "## Validation Result",
        "",
        f"- Passed: {report['ok']}",
        f"- Errors: {len(report['errors'])}",
        f"- Warnings: {len(report['warnings'])}",
        f"- Duplicate real course codes: {duplicate_codes}",
        f"- Courses missing row-level credit hours: {report['missing_course_credit_hours_count']}",
        "",
        "## Notes",
        "",
        "- The official page states the complete study plan totals 125 credit hours.",
        "- The embedded course rows on the official page do not provide usable per-course "
        "credit hours; these are stored as null rather than guessed.",
        "- Repeated official placeholders ELECTIVE and FREE are treated as placeholders, "
        "not duplicate real course codes.",
    ]
    lines.extend(f"- Warning: {warning}" for warning in report["warnings"])

    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text("\n".join(lines) + "\n", encoding="utf-8")
    print(f"Wrote summary report: {args.output}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
