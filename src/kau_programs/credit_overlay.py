from __future__ import annotations

import argparse
import json
from pathlib import Path

from .planner import normalize_course_code


def apply_credit_overlay(program: dict, overlay: dict) -> dict:
    credits = {
        normalize_course_code(code): value
        for code, value in overlay.get("credits", {}).items()
    }
    credit_total_exclusions = {
        normalize_course_code(code): reason
        for code, reason in overlay.get("credit_total_exclusions", {}).items()
    }
    updated = json.loads(json.dumps(program, ensure_ascii=False))

    for course in updated.get("courses", []):
        code = course.get("course_code")
        if not code:
            continue
        credit_hours = credits.get(normalize_course_code(code))
        if credit_hours is not None:
            course["credit_hours"] = credit_hours
        exclusion_reason = credit_total_exclusions.get(normalize_course_code(code))
        if exclusion_reason:
            course["counts_toward_program_credit_total"] = False
            course["credit_total_exclusion_reason"] = exclusion_reason

    updated["credit_overlay_source"] = overlay.get("source")
    updated["credit_overlay_received_date"] = overlay.get("received_date")
    updated["elective_options"] = overlay.get("elective_options", {})
    return updated


def main() -> int:
    parser = argparse.ArgumentParser(description="Apply reviewed course-credit overlay.")
    parser.add_argument("program_json", type=Path)
    parser.add_argument("overlay_json", type=Path)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()

    program = json.loads(args.program_json.read_text(encoding="utf-8"))
    overlay = json.loads(args.overlay_json.read_text(encoding="utf-8"))
    updated = apply_credit_overlay(program, overlay)

    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(
        json.dumps(updated, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )
    print(f"Wrote credit-updated data: {args.output}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
