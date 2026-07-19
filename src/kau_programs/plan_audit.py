"""Audit catalog-only KAU programs for official, structured study plans.

This module is deliberately read-only with respect to the production catalog and
course datasets.  It fetches only the Arabic and English detail pages already
recorded for catalog-only programs, stores local source snapshots, and writes
dry-run discovery reports.
"""

from __future__ import annotations

import argparse
import csv
import html
import json
import re
import time
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Iterable
from urllib.error import HTTPError, URLError
from urllib.parse import urljoin, urlparse
from urllib.request import Request, urlopen

from .catalog_sync import ROOT, flight_records


USER_AGENT = "kau-program-scraper-plan-audit/0.1 (local academic validation)"
PRIORITY = {
    "bachelor": 0,
    "diploma": 1,
    "intermediate_diploma": 1,
    "higher_diploma": 1,
    "master": 2,
    "executive_master": 2,
    "doctorate": 3,
    "other": 4,
}
STATUS_ORDER = {
    "ready_to_import": 0,
    "requires_manual_review": 1,
    "insufficient_data": 2,
    "broken_source": 3,
    "no_plan_found": 4,
}
PLAN_TERMS = (
    "study plan", "curriculum", "courses", "program structure", "academic plan",
    "الخطة الدراسية", "خطة دراسية", "المقررات", "المستويات",
)
ELECTIVE_TERMS = ("elective", "optional", "اختياري", "اختيارية")
DATE_PATTERNS = (
    r"\b20\d{2}[-/]\d{1,2}[-/]\d{1,2}\b",
    r"\b\d{1,2}[-/]\d{1,2}[-/]20\d{2}\b",
    r"\b14\d{2}\s*(?:هـ|AH)\b",
)


def utc_now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def read_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def write_json(path: Path, value: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def is_official_url(url: str) -> bool:
    host = (urlparse(url).hostname or "").lower()
    return host == "kau.edu.sa" or host.endswith(".kau.edu.sa")


def valid_credit_hours(value: Any) -> bool:
    return isinstance(value, (int, float)) and not isinstance(value, bool) and value > 0


def implied_degree_level(name: str) -> str | None:
    value = name.casefold()
    if "doctor of philosophy" in value or "phd" in value or "ph.d" in value:
        return "doctorate"
    if "bachelor" in value:
        return "bachelor"
    if "master" in value or "msc" in value or "m.sc" in value:
        return "master"
    return None


def plausible_plan_size(degree_level: str, levels: int, courses: int) -> bool:
    ranges = {
        "bachelor": (6, 14, 20, 120),
        "diploma": (2, 8, 5, 80),
        "intermediate_diploma": (2, 8, 5, 80),
        "higher_diploma": (2, 8, 5, 80),
        "master": (2, 8, 5, 80),
        "executive_master": (2, 8, 5, 80),
        "doctorate": (2, 8, 5, 80),
    }
    limits = ranges.get(degree_level)
    if limits is None:
        return False
    min_levels, max_levels, min_courses, max_courses = limits
    return min_levels <= levels <= max_levels and min_courses <= courses <= max_courses


def iter_values(value: Any) -> Iterable[Any]:
    yield value
    if isinstance(value, dict):
        for child in value.values():
            yield from iter_values(child)
    elif isinstance(value, list):
        for child in value:
            yield from iter_values(child)


def embedded_plan(source: str) -> dict[str, Any] | None:
    """Return the rendered program-detail study-plan payload, if present."""
    records = flight_records(source)
    candidates: list[dict[str, Any]] = []
    for record in records.values():
        for value in iter_values(record):
            if isinstance(value, dict) and isinstance(value.get("studyPlan"), list):
                candidates.append(value)
    if not candidates:
        return None
    return max(candidates, key=lambda item: count_plan_rows(item.get("studyPlan", [])))


def count_plan_rows(study_plan: list[dict[str, Any]]) -> int:
    return sum(
        len(level.get("courses") or [])
        for group in study_plan
        for level in (group.get("levels") or [])
    )


def plan_levels(study_plan: list[dict[str, Any]]) -> list[dict[str, Any]]:
    levels: list[dict[str, Any]] = []
    for group in study_plan:
        if group.get("has_levels") or group.get("levels"):
            levels.extend(level for level in (group.get("levels") or []) if isinstance(level, dict))
    return levels


def plan_courses(study_plan: list[dict[str, Any]]) -> list[dict[str, Any]]:
    return [
        course
        for level in plan_levels(study_plan)
        for course in (level.get("courses") or [])
        if isinstance(course, dict)
    ]


def linked_official_sources(source: str, page_url: str, payload: dict[str, Any] | None) -> list[str]:
    urls: set[str] = set()
    if payload:
        direct = payload.get("studyPlanLink")
        if isinstance(direct, str) and direct.strip():
            urls.add(urljoin(page_url, html.unescape(direct.strip())))
    for href, label in re.findall(
        r'<a\b[^>]*href=["\']([^"\']+)["\'][^>]*>(.*?)</a>', source, re.I | re.S
    ):
        label_text = " ".join(re.sub(r"<[^>]+>", " ", html.unescape(label)).split())
        candidate = urljoin(page_url, html.unescape(href).strip())
        haystack = f"{label_text} {candidate}".casefold()
        if any(term.casefold() in haystack for term in PLAN_TERMS) or candidate.lower().endswith(".pdf"):
            urls.add(candidate)
    return sorted(url for url in urls if is_official_url(url))


def visible_source_date(source: str) -> str | None:
    text = " ".join(re.sub(r"<[^>]+>", " ", html.unescape(source)).split())
    markers = ("last modified", "last updated", "آخر تحديث", "تاريخ التحديث", "version", "إصدار")
    for marker in markers:
        position = text.casefold().find(marker.casefold())
        if position < 0:
            continue
        window = text[position:position + 180]
        for pattern in DATE_PATTERNS:
            match = re.search(pattern, window, re.I)
            if match:
                return match.group(0)
    return None


def cache_path(cache_dir: Path, program_id: str, language: str) -> Path:
    safe_id = re.sub(r"[^A-Za-z0-9_.-]+", "-", program_id).strip("-")
    return cache_dir / language / f"{safe_id}.html"


def fetch_page(
    url: str,
    target: Path,
    *,
    refresh: bool,
    delay: float,
) -> tuple[str | None, dict[str, Any]]:
    if target.exists() and not refresh:
        return target.read_text(encoding="utf-8", errors="ignore"), {
            "url": url, "status": "cached", "http_status": 200, "cache_path": str(target.relative_to(ROOT)),
        }
    if not is_official_url(url):
        return None, {"url": url, "status": "rejected_non_official", "http_status": None, "error": "non-KAU host"}
    request = Request(url, headers={"User-Agent": USER_AGENT, "Accept": "text/html,application/xhtml+xml"})
    try:
        with urlopen(request, timeout=45) as response:
            body = response.read().decode("utf-8", errors="ignore")
            status = int(response.status)
            final_url = response.geturl()
    except HTTPError as exc:
        return None, {"url": url, "status": "http_error", "http_status": exc.code, "error": str(exc)}
    except (URLError, TimeoutError, OSError) as exc:
        return None, {"url": url, "status": "network_error", "http_status": None, "error": str(exc)}
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(body, encoding="utf-8")
    time.sleep(max(delay, 0.0))
    return body, {
        "url": url, "final_url": final_url, "status": "fetched", "http_status": status,
        "cache_path": str(target.relative_to(ROOT)),
    }


def language_audit(source: str | None, page_url: str) -> dict[str, Any]:
    if source is None:
        return {
            "plan_found": False, "levels_found": 0, "course_rows_found": 0,
            "course_codes_available": False, "credit_hours_available": False,
            "prerequisites_available": False, "electives_identified": False,
            "study_plan_link": None, "additional_official_urls": [], "source_date_version": None,
        }
    payload = embedded_plan(source)
    study_plan = payload.get("studyPlan", []) if payload else []
    levels = plan_levels(study_plan)
    courses = plan_courses(study_plan)
    codes = [str(course.get("code") or "").strip() for course in courses]
    credits = [course.get("credit_hours") for course in courses]
    names = [str(course.get("name") or "").strip() for course in courses]
    searchable = " ".join(
        str(value or "")
        for group in study_plan
        for value in (group.get("name"), group.get("description"))
    )
    searchable += " " + " ".join(names)
    links = linked_official_sources(source, page_url, payload)
    return {
        "plan_found": bool(levels or courses),
        "source_type": "rendered_html_embedded_structured_data" if payload else None,
        "levels_found": len(levels),
        "course_rows_found": len(courses),
        "course_codes_available": bool(courses) and all(codes),
        "credit_hours_available": bool(courses) and all(valid_credit_hours(value) for value in credits),
        "course_names_available": bool(courses) and all(names),
        "prerequisites_available": any(
            course.get("prerequisites") not in (None, "", [], {}) for course in courses
        ),
        "electives_identified": any(term.casefold() in searchable.casefold() for term in ELECTIVE_TERMS),
        "study_plan_link": payload.get("studyPlanLink") if payload else None,
        "additional_official_urls": links,
        "source_date_version": visible_source_date(source),
        "level_names": [level.get("name") for level in levels],
        "course_codes": codes,
        "duplicate_course_codes": sorted(
            code for code in set(codes) if code and codes.count(code) > 1
        ),
        "credit_hours": credits,
    }


def reconcile_languages(ar: dict[str, Any], en: dict[str, Any]) -> dict[str, Any]:
    plan_found = ar["plan_found"] or en["plan_found"]
    levels = max(ar["levels_found"], en["levels_found"])
    courses = max(ar["course_rows_found"], en["course_rows_found"])
    valid_ar = ar["course_codes_available"] and ar["credit_hours_available"] and ar.get("course_names_available", False)
    valid_en = en["course_codes_available"] and en["credit_hours_available"] and en.get("course_names_available", False)
    counts_match = (
        ar["course_rows_found"] == en["course_rows_found"]
        and ar["levels_found"] == en["levels_found"]
    )
    codes_match = bool(ar.get("course_codes")) and ar.get("course_codes") == en.get("course_codes")

    if not plan_found:
        status = "no_plan_found"
        confidence = "high"
        notes = ["Both official language pages were reachable but contained no structured level/course plan."]
    elif levels and courses and (valid_ar or valid_en) and counts_match and codes_match:
        status = "ready_to_import"
        confidence = "high"
        notes = ["Arabic and English structured plans agree on levels, course rows, codes, and credit hours."]
    elif levels and courses and (valid_ar or valid_en):
        status = "requires_manual_review"
        confidence = "medium"
        notes = ["A structured plan exists, but Arabic/English coverage or row alignment requires review."]
    else:
        status = "insufficient_data"
        confidence = "low"
        notes = ["Plan-like content exists without a complete set of levels, codes, names, and credit hours."]
    if not (ar["prerequisites_available"] or en["prerequisites_available"]):
        notes.append("Official prerequisite data was not published; a later import must use empty prerequisite lists.")
    if not (ar["electives_identified"] or en["electives_identified"]):
        notes.append("No explicit elective classification was detected in the rendered plan.")
    return {
        "plan_found": plan_found,
        "source_type": next((x.get("source_type") for x in (en, ar) if x.get("source_type")), None),
        "levels_found": levels,
        "courses_found": courses,
        "course_codes_available": ar["course_codes_available"] or en["course_codes_available"],
        "credit_hours_available": ar["credit_hours_available"] or en["credit_hours_available"],
        "prerequisites_available": ar["prerequisites_available"] or en["prerequisites_available"],
        "electives_identified": ar["electives_identified"] or en["electives_identified"],
        "bilingual_counts_match": counts_match,
        "bilingual_course_codes_match": codes_match,
        "duplicate_course_codes": sorted(set(
            ar.get("duplicate_course_codes", []) + en.get("duplicate_course_codes", [])
        )),
        "extraction_confidence": confidence,
        "recommended_status": status,
        "audit_notes": notes,
    }


def audit_program(
    program: dict[str, Any],
    faculty: dict[str, Any],
    cache_dir: Path,
    *,
    refresh: bool,
    delay: float,
) -> dict[str, Any]:
    sources: dict[str, Any] = {}
    language_results: dict[str, Any] = {}
    failed = 0
    for language in ("ar", "en"):
        url = program.get(f"source_url_{language}")
        if not url:
            sources[language] = {"url": None, "status": "missing_url", "http_status": None}
            language_results[language] = language_audit(None, "")
            failed += 1
            continue
        source, fetch_result = fetch_page(
            url,
            cache_path(cache_dir, program["id"], language),
            refresh=refresh,
            delay=delay,
        )
        sources[language] = fetch_result
        language_results[language] = language_audit(source, url)
        if source is None:
            failed += 1
    result = reconcile_languages(language_results["ar"], language_results["en"])
    if failed == 2:
        result.update({
            "plan_found": False,
            "extraction_confidence": "low",
            "recommended_status": "broken_source",
            "audit_notes": ["Neither official language page could be retrieved."],
        })
    elif failed:
        result["recommended_status"] = "requires_manual_review" if result["plan_found"] else "broken_source"
        result["extraction_confidence"] = "low"
        result["audit_notes"].append("One official language source could not be retrieved.")
    if result["recommended_status"] == "ready_to_import":
        review_reasons = []
        if result["duplicate_course_codes"]:
            review_reasons.append(
                f"Duplicate course codes occur across rendered levels: {', '.join(result['duplicate_course_codes'][:12])}."
            )
        if not plausible_plan_size(
            program.get("degree_level", "other"), result["levels_found"], result["courses_found"]
        ):
            review_reasons.append("Level or course count falls outside the conservative range for this degree level.")
        implied = implied_degree_level(program.get("name_en", ""))
        catalog_level = program.get("degree_level")
        if implied and not (implied == catalog_level or implied == "master" and catalog_level == "executive_master"):
            review_reasons.append(
                f"Program title implies {implied}, while the catalog classifies it as {catalog_level}."
            )
        if review_reasons:
            result["recommended_status"] = "requires_manual_review"
            result["extraction_confidence"] = "medium"
            result["audit_notes"].extend(review_reasons)
    result.update({
        "program_id": program["id"],
        "faculty_id": program["faculty_id"],
        "faculty_name_ar": faculty.get("name_ar"),
        "faculty_name_en": faculty.get("name_en"),
        "program_name_ar": program.get("name_ar"),
        "program_name_en": program.get("name_en"),
        "degree_level": program.get("degree_level"),
        "existing_official_urls": [
            url for url in (program.get("source_url_ar"), program.get("source_url_en")) if url
        ],
        "additional_official_urls": sorted(set(
            language_results["ar"]["additional_official_urls"]
            + language_results["en"]["additional_official_urls"]
        )),
        "source_date_version": next((
            value for value in (
                language_results["ar"].get("source_date_version"),
                language_results["en"].get("source_date_version"),
            ) if value
        ), None),
        "source_access": sources,
        "language_audit": language_results,
        "accessed_at": utc_now(),
    })
    return result


def human_report(report: dict[str, Any]) -> str:
    summary = report["summary"]
    lines = [
        "# KAU catalog-only study-plan discovery audit",
        "",
        f"Generated: {report['generated_at']}",
        "",
        "This is a dry-run discovery report. No catalog flag, course dataset, or planner logic was changed.",
        "",
        "## Summary",
        "",
        f"- Catalog-only programs audited: {summary['catalog_only_programs_audited']}",
        f"- Official plan pages found: {summary['official_plan_pages_found']}",
        f"- Ready to import: {summary['ready_to_import']}",
        f"- Requires manual review: {summary['requires_manual_review']}",
        f"- Insufficient data: {summary['insufficient_data']}",
        f"- No plan found: {summary['no_plan_found']}",
        f"- Broken source: {summary['broken_source']}",
        "",
        "## Proposed first Bachelor batch (maximum 10)",
        "",
    ]
    for item in report["proposed_first_batch"]:
        lines.extend([
            f"### {item['program_name_en']}",
            "",
            f"- Arabic: {item['program_name_ar']}",
            f"- Faculty: {item['faculty_name_en']} / {item['faculty_name_ar']}",
            f"- Levels: {item['levels_found']}; courses: {item['courses_found']}",
            f"- Arabic source: {item['existing_official_urls'][0]}",
            f"- English source: {item['existing_official_urls'][1]}",
            "",
        ])
    lines.extend(["## Program audit", ""])
    for item in report["programs"]:
        lines.extend([
            f"### {item['program_name_en']}",
            "",
            f"- ID: `{item['program_id']}`",
            f"- Faculty: {item['faculty_name_en']} / {item['faculty_name_ar']}",
            f"- Arabic name: {item['program_name_ar']}",
            f"- Degree: `{item['degree_level']}`",
            f"- Result: `{item['recommended_status']}` ({item['extraction_confidence']} confidence)",
            f"- Plan/levels/courses: {str(item['plan_found']).lower()} / {item['levels_found']} / {item['courses_found']}",
            f"- Codes/hours/prerequisites/electives: {item['course_codes_available']} / {item['credit_hours_available']} / {item['prerequisites_available']} / {item['electives_identified']}",
            f"- Arabic source: {item['existing_official_urls'][0] if item['existing_official_urls'] else 'missing'}",
            f"- English source: {item['existing_official_urls'][1] if len(item['existing_official_urls']) > 1 else 'missing'}",
            f"- Notes: {' '.join(item['audit_notes'])}",
            "",
        ])
    return "\n".join(lines).rstrip() + "\n"


def write_csv_report(path: Path, programs: list[dict[str, Any]]) -> None:
    fields = [
        "program_id", "faculty_id", "faculty_name_ar", "faculty_name_en", "program_name_ar",
        "program_name_en", "degree_level", "plan_found", "source_type", "levels_found",
        "courses_found", "course_codes_available", "credit_hours_available",
        "prerequisites_available", "electives_identified", "source_date_version",
        "extraction_confidence", "recommended_status", "source_url_ar", "source_url_en",
    ]
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=fields, lineterminator="\n")
        writer.writeheader()
        for item in programs:
            urls = item["existing_official_urls"]
            row = {field: item.get(field) for field in fields}
            row["source_url_ar"] = urls[0] if urls else None
            row["source_url_en"] = urls[1] if len(urls) > 1 else None
            writer.writerow(row)


def run_audit(catalog_path: Path, cache_dir: Path, report_dir: Path, *, refresh: bool, delay: float) -> dict[str, Any]:
    catalog = read_json(catalog_path)
    faculties = {item["id"]: item for item in catalog.get("faculties", [])}
    programs = [item for item in catalog.get("programs", []) if not item.get("planner_available")]
    programs.sort(key=lambda item: (PRIORITY.get(item.get("degree_level"), 99), item.get("faculty_id", ""), item.get("name_en", "")))
    output: list[dict[str, Any]] = []
    for number, program in enumerate(programs, start=1):
        print(f"[{number:03d}/{len(programs):03d}] {program['degree_level']}: {program['name_en']}", flush=True)
        output.append(audit_program(
            program, faculties[program["faculty_id"]], cache_dir, refresh=refresh, delay=delay
        ))
    output.sort(key=lambda item: (
        PRIORITY.get(item["degree_level"], 99), STATUS_ORDER[item["recommended_status"]],
        item["faculty_id"], item["program_name_en"],
    ))
    counts = Counter(item["recommended_status"] for item in output)
    plan_pages = sum(item["plan_found"] for item in output)
    first_batch = sorted([
        item for item in output
        if item["degree_level"] == "bachelor" and item["recommended_status"] == "ready_to_import"
    ], key=lambda item: (item["courses_found"], item["program_name_en"]))[:10]
    report = {
        "generated_at": utc_now(),
        "mode": "dry_run",
        "source": "King Abdulaziz University official program detail pages",
        "catalog_path": str(catalog_path.relative_to(ROOT)),
        "summary": {
            "catalog_only_programs_audited": len(output),
            "official_plan_pages_found": plan_pages,
            "ready_to_import": counts["ready_to_import"],
            "requires_manual_review": counts["requires_manual_review"],
            "insufficient_data": counts["insufficient_data"],
            "no_plan_found": counts["no_plan_found"],
            "broken_source": counts["broken_source"],
            "degree_levels": dict(sorted(Counter(item["degree_level"] for item in output).items())),
        },
        "proposed_first_batch": first_batch,
        "programs": output,
    }
    report_dir.mkdir(parents=True, exist_ok=True)
    write_json(report_dir / "catalog_only_plan_audit.json", report)
    write_csv_report(report_dir / "catalog_only_plan_audit.csv", output)
    (report_dir / "catalog_only_plan_audit.md").write_text(human_report(report), encoding="utf-8")
    return report


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--catalog", type=Path, default=ROOT / "web/data/faculty_catalog.json")
    parser.add_argument("--cache-dir", type=Path, default=ROOT / "data/raw/kau/plan_audit")
    parser.add_argument("--report-dir", type=Path, default=ROOT / "reports/plan_extraction")
    parser.add_argument("--delay", type=float, default=0.35, help="Delay after each live official-source request")
    parser.add_argument("--refresh", action="store_true", help="Refresh existing local source snapshots")
    args = parser.parse_args()
    report = run_audit(args.catalog, args.cache_dir, args.report_dir, refresh=args.refresh, delay=args.delay)
    print(json.dumps(report["summary"], ensure_ascii=False, indent=2))
    print(f"Reports written under {args.report_dir}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
