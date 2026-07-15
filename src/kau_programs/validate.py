from __future__ import annotations

import argparse
import json
from pathlib import Path

from .schema import Program
from .validation import validate_program


def main() -> int:
    parser = argparse.ArgumentParser(description="Validate a parsed program JSON file.")
    parser.add_argument("input", type=Path)
    parser.add_argument("--report", type=Path, required=True)
    args = parser.parse_args()

    data = json.loads(args.input.read_text(encoding="utf-8"))
    report = validate_program(Program.from_dict(data))

    args.report.parent.mkdir(parents=True, exist_ok=True)
    args.report.write_text(json.dumps(report, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"Validation {'passed' if report['ok'] else 'failed'}: {args.report}")
    return 0 if report["ok"] else 1


if __name__ == "__main__":
    raise SystemExit(main())

