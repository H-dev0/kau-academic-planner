"""Conservatively reconcile catalog-only programs previously marked ready.

The analyzer reads the existing discovery audit, revisits only the official URLs
recorded for its ready candidates, compares the structured plans with the local
production course data, and writes new reports.  It never mutates catalog or
course data.
"""

from __future__ import annotations

import argparse
import csv
import hashlib
import html
import json
import re
import time
import unicodedata
from collections import Counter, defaultdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Iterable
from urllib.error import HTTPError, URLError
from urllib.parse import urlparse
from urllib.request import Request, urlopen

from .catalog_sync import ROOT
from .plan_audit import embedded_plan, is_official_url, plan_levels


USER_AGENT = "kau-program-scraper-reconciliation/0.1 (local academic validation)"
CLASSIFICATIONS = (
    "VERIFIED_IMPORT_READY",
    "READY_AFTER_MECHANICAL_CLEANUP",
    "BLOCKED_MISSING_DEPENDENCIES",
    "BLOCKED_PLACEHOLDER_OR_COLLIDING_CODES",
    "BLOCKED_AMBIGUOUS_STRUCTURE",
    "BLOCKED_SOURCE_QUALITY",
    "MISCLASSIFIED",
)
ARABIC_DIGITS = str.maketrans("٠١٢٣٤٥٦٧٨٩۰۱۲۳۴۵۶۷۸۹", "01234567890123456789")
ELECTIVE_TERMS = ("elective", "optional", "اختياري", "اختيارية")
LETTER = r"[^\W\d_]"
CODE_PATTERN = re.compile(
    rf"(?:{LETTER}){{1,12}}\s*[-.]?\s*[0-9]{{2,4}}(?:{LETTER})?",
    re.UNICODE,
)
SPECIAL_TERMS = (
    "internship", "cooperative training", "practical training", "field training",
    "graduation project", "research project", "thesis", "dissertation",
    "تدريب", "مشروع تخرج", "مشروع بحث", "رسالة",
)
COREQUISITE_TERMS = ("corequisite", "co-requisite", "concurrent", "متزامن")
DESCRIPTION_TERMS = ("description", "وصف المقررات", "توصيف المقررات")


def utc_now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def clean_text(value: Any) -> str:
    text = unicodedata.normalize("NFKC", str(value or "")).translate(ARABIC_DIGITS)
    return " ".join(text.split())


def normalized_text(value: Any) -> str:
    return clean_text(value).casefold()


def normalized_code(value: Any) -> str:
    return "".join(character for character in clean_text(value).upper() if character.isalnum())


def display_code(value: Any) -> str:
    compact = normalized_code(value)
    match = re.fullmatch(rf"(({LETTER})+)([0-9]+(?:{LETTER})?)", compact, re.UNICODE)
    return f"{match.group(1)} {match.group(3)}" if match else clean_text(value).upper()


def is_placeholder_or_unstable_code(value: Any) -> bool:
    compact = normalized_code(value)
    if not compact or compact in {"TBA", "NA", "NONE", "NOCODE"}:
        return True
    if set(compact) <= {"X"}:
        return True
    return not (
        compact.isalnum()
        and any(character.isalpha() for character in compact)
        and any(character.isdigit() for character in compact)
    )


def read_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def write_json(path: Path, value: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def fetch_official_page(url: str, *, timeout: float = 45.0) -> tuple[str | None, dict[str, Any]]:
    if not is_official_url(url):
        return None, {"url": url, "status": "rejected_non_official", "error": "non-KAU host"}
    request = Request(url, headers={"User-Agent": USER_AGENT, "Accept": "text/html,application/xhtml+xml"})
    try:
        with urlopen(request, timeout=timeout) as response:
            source = response.read().decode("utf-8", errors="ignore")
            return source, {
                "url": url,
                "final_url": response.geturl(),
                "status": "fetched",
                "http_status": int(response.status),
                "content_sha256": hashlib.sha256(source.encode("utf-8")).hexdigest(),
            }
    except HTTPError as exc:
        return None, {"url": url, "status": "http_error", "http_status": exc.code, "error": str(exc)}
    except (URLError, TimeoutError, OSError) as exc:
        return None, {"url": url, "status": "network_error", "http_status": None, "error": str(exc)}


def iter_group_courses(payload: dict[str, Any]) -> Iterable[tuple[str, dict[str, Any]]]:
    for group in payload.get("studyPlan") or []:
        group_name = clean_text(group.get("name")) or "Unnamed group"
        for course in group.get("courses") or []:
            if isinstance(course, dict):
                yield group_name, course


def level_rows(payload: dict[str, Any]) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    for level_number, level in enumerate(plan_levels(payload.get("studyPlan") or []), start=1):
        level_name = clean_text(level.get("name")) or f"Level {level_number}"
        for course_number, course in enumerate(level.get("courses") or [], start=1):
            if isinstance(course, dict):
                rows.append({
                    "level": level_name,
                    "level_number": level_number,
                    "course_number": course_number,
                    "raw": course,
                })
    return rows


def group_summary(payload: dict[str, Any]) -> list[dict[str, Any]]:
    return [{
        "name": clean_text(group.get("name")),
        "description": clean_text(group.get("description")) or None,
        "has_levels": bool(group.get("has_levels")),
        "level_count": len(group.get("levels") or []),
        "course_count": len(group.get("courses") or []),
    } for group in payload.get("studyPlan") or []]




def source_identity_conflicts(payload: dict[str, Any], language: str) -> list[dict[str, Any]]:
    occurrences: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for group in payload.get("studyPlan") or []:
        group_name = clean_text(group.get("name")) or "Unnamed group"
        grouped_courses = list(group.get("courses") or [])
        for level in group.get("levels") or []:
            grouped_courses.extend(level.get("courses") or [])
        for course in grouped_courses:
            if not isinstance(course, dict):
                continue
            code = normalized_code(course.get("code"))
            if code:
                occurrences[code].append({
                    "group": group_name,
                    "course_code": clean_text(course.get("code")),
                    "course_name": clean_text(course.get("name")),
                    "credit_hours": course.get("credit_hours"),
                })
    conflicts: list[dict[str, Any]] = []
    for code, rows in occurrences.items():
        identities = {
            (normalized_text(row["course_name"]), row["credit_hours"])
            for row in rows
        }
        if len(identities) > 1:
            conflicts.append({
                "type": "conflicting_course_code_reuse",
                "language": language,
                "normalized_course_code": code,
                "canonical_course_code": display_code(rows[0]["course_code"]),
                "raw_codes": sorted({row["course_code"] for row in rows}),
                "occurrences": rows,
            })
    return sorted(conflicts, key=lambda item: item["normalized_course_code"])


def parse_requisite_references(raw_value: Any) -> tuple[list[dict[str, str]], list[str]]:
    raw = clean_text(raw_value)
    if not raw:
        return [], []
    kind = "corequisite" if any(term in raw.casefold() for term in COREQUISITE_TERMS) else "prerequisite"
    matches = list(CODE_PATTERN.finditer(raw))
    references = [{
        "raw": match.group(0),
        "normalized_code": normalized_code(match.group(0)),
        "course_code": display_code(match.group(0)),
        "kind": kind,
    } for match in matches]
    ambiguities: list[str] = []
    if not matches:
        ambiguities.append(f"Unparsed requisite notation: {raw}")
    if re.search(r"[?????*??]", raw):
        ambiguities.append(f"Ambiguous requisite symbol or footnote marker: {raw}")
    residual = CODE_PATTERN.sub(" ", raw)
    residual = re.sub(
        r"(?i)prerequisites?|pre-?requisites?|corequisites?|co-?requisites?|concurrent|and|or|with|"
        r"\u0645\u062a\u0637\u0644\u0628(?:\u0627\u062a)?|\u0633\u0627\u0628\u0642|\u0645\u062a\u0632\u0627\u0645\u0646|\u0648|\u0623\u0648|[,&;/+()\[\]:.-]",
        " ",
        residual,
    )
    residual = residual.replace(chr(0x060C), " ")
    if clean_text(residual):
        ambiguities.append(f"Unresolved requisite annotation: {raw}")
    return references, sorted(set(ambiguities))


def official_total_credits(payloads: Iterable[dict[str, Any]]) -> int | float | None:
    candidates: set[int | float] = set()
    for payload in payloads:
        for key, value in payload.items():
            folded = str(key).casefold()
            if "total" in folded and "credit" in folded and isinstance(value, (int, float)) and not isinstance(value, bool):
                candidates.add(value)
    return next(iter(candidates)) if len(candidates) == 1 else None


def production_course_index(paths: Iterable[Path]) -> dict[str, list[dict[str, Any]]]:
    index: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for path in paths:
        document = read_json(path)
        programs: list[dict[str, Any]]
        if isinstance(document, dict) and isinstance(document.get("programs"), list):
            programs = document["programs"]
        elif isinstance(document, dict) and isinstance(document.get("courses"), list):
            programs = [document]
        else:
            continue
        for program in programs:
            program_id = clean_text(program.get("id") or program.get("program_id") or path.stem)
            for course in program.get("courses") or []:
                raw_code = course.get("course_code") or course.get("code")
                code = normalized_code(raw_code)
                if not code:
                    continue
                course_name = clean_text(
                    course.get("official_course_name") or course.get("course_name_ar")
                    or course.get("name_ar") or course.get("name")
                )
                name_language = "en" if path.name == "kau_accounting.json" else "ar"
                index[code].append({
                    "dataset": str(path.relative_to(ROOT)),
                    "program_id": program_id,
                    "course_code": clean_text(raw_code),
                    "course_name_ar": course_name if name_language == "ar" else None,
                    "course_name_en": course_name if name_language == "en" else None,
                    "credit_hours": course.get("credit_hours"),
                })
    return dict(index)


def align_bilingual_rows(ar_rows: list[dict[str, Any]], en_rows: list[dict[str, Any]]) -> tuple[list[dict[str, Any]], list[str]]:
    ambiguities: list[str] = []
    if len(ar_rows) != len(en_rows):
        ambiguities.append(f"Arabic/English course-row count differs: {len(ar_rows)} versus {len(en_rows)}.")
    rows: list[dict[str, Any]] = []
    for position in range(max(len(ar_rows), len(en_rows))):
        ar = ar_rows[position] if position < len(ar_rows) else None
        en = en_rows[position] if position < len(en_rows) else None
        ar_course = ar["raw"] if ar else {}
        en_course = en["raw"] if en else {}
        ar_code = normalized_code(ar_course.get("code"))
        en_code = normalized_code(en_course.get("code"))
        if ar_code and en_code and ar_code != en_code:
            ambiguities.append(
                f"Arabic/English row {position + 1} code mismatch: {clean_text(ar_course.get('code'))} versus {clean_text(en_course.get('code'))}."
            )
        ar_credit = ar_course.get("credit_hours")
        en_credit = en_course.get("credit_hours")
        if ar is not None and en is not None and ar_credit != en_credit:
            ambiguities.append(
                f"Arabic/English credit mismatch for {clean_text(en_course.get('code') or ar_course.get('code'))}: {ar_credit} versus {en_credit}."
            )
        primary = en or ar
        assert primary is not None
        raw_code = en_course.get("code") or ar_course.get("code")
        raw_requisite = en_course.get("prerequisites") if en else ar_course.get("prerequisites")
        references, requisite_ambiguities = parse_requisite_references(raw_requisite)
        ambiguities.extend(
            f"{display_code(raw_code)}: {message}" for message in requisite_ambiguities
        )
        rows.append({
            "level_or_semester": primary["level"],
            "level_number": primary["level_number"],
            "course_code": clean_text(raw_code),
            "normalized_course_code": normalized_code(raw_code),
            "canonical_course_code": display_code(raw_code),
            "course_name_ar": clean_text(ar_course.get("name")) or None,
            "course_name_en": clean_text(en_course.get("name")) or None,
            "credit_hours": en_credit if en_credit is not None else ar_credit,
            "raw_prerequisite_notation": clean_text(raw_requisite) or None,
            "requisite_references": references,
        })
    return rows, sorted(set(ambiguities))


def compatible_with_production(
    courses: list[dict[str, Any]], index: dict[str, list[dict[str, Any]]]
) -> tuple[list[dict[str, Any]], list[dict[str, Any]], list[dict[str, Any]], list[str]]:
    exact: list[dict[str, Any]] = []
    aliases: list[dict[str, Any]] = []
    conflicts: list[dict[str, Any]] = []
    absent: list[str] = []
    for course in courses:
        code = course["normalized_course_code"]
        records = index.get(code, [])
        if not records:
            absent.append(course["canonical_course_code"])
            continue
        matching: list[dict[str, Any]] = []
        conflicting: list[dict[str, Any]] = []
        for record in records:
            same_credit = record["credit_hours"] == course["credit_hours"]
            comparable_names = []
            for language in ("ar", "en"):
                production_name = record.get(f"course_name_{language}")
                candidate_name = course.get(f"course_name_{language}")
                if production_name and candidate_name:
                    comparable_names.append(normalized_text(production_name) == normalized_text(candidate_name))
            same_name = bool(comparable_names) and all(comparable_names)
            (matching if same_credit and same_name else conflicting).append(record)
        evidence = {
            "course_code": course["canonical_course_code"],
            "course_name_ar": course.get("course_name_ar"),
            "credit_hours": course["credit_hours"],
        }
        if matching:
            evidence["production_records"] = matching
            raw_exact = any(record["course_code"] == course["course_code"] for record in matching)
            (exact if raw_exact else aliases).append(evidence)
        if conflicting:
            conflict = dict(evidence)
            conflict["production_records"] = conflicting
            conflicts.append(conflict)
    return exact, aliases, conflicts, sorted(set(absent))


def classify_program(
    *, source_issues: list[str], placeholders: list[dict[str, Any]], collisions: list[dict[str, Any]],
    missing: list[dict[str, Any]], structural: list[str], production_conflicts: list[dict[str, Any]],
    mechanical: list[str],
) -> str:
    if source_issues:
        return "BLOCKED_SOURCE_QUALITY"
    if placeholders or collisions:
        return "BLOCKED_PLACEHOLDER_OR_COLLIDING_CODES"
    if missing:
        return "BLOCKED_MISSING_DEPENDENCIES"
    if structural:
        return "BLOCKED_AMBIGUOUS_STRUCTURE"
    if production_conflicts:
        return "MISCLASSIFIED"
    if mechanical:
        return "READY_AFTER_MECHANICAL_CLEANUP"
    return "VERIFIED_IMPORT_READY"


def recommended_action(classification: str) -> str:
    return {
        "VERIFIED_IMPORT_READY": "Eligible for a future reviewed import batch; no import was performed by this audit.",
        "READY_AFTER_MECHANICAL_CLEANUP": "Apply only the documented deterministic normalization, rerun this reconciliation, and review the diff before import.",
        "BLOCKED_MISSING_DEPENDENCIES": "Obtain an official shared-requirement source for every missing requisite course; do not remove or infer requisites.",
        "BLOCKED_PLACEHOLDER_OR_COLLIDING_CODES": "Obtain stable official codes and resolve every normalized collision before import.",
        "BLOCKED_AMBIGUOUS_STRUCTURE": "Obtain an authoritative plan or academic clarification for the documented structural ambiguity.",
        "BLOCKED_SOURCE_QUALITY": "Refresh or replace the official source with a complete authoritative plan and rerun the audit.",
        "MISCLASSIFIED": "Resolve the documented production-data identity conflicts before reconsidering import readiness.",
    }[classification]


def reconcile_candidate(
    previous: dict[str, Any], sources: dict[str, str | None], source_evidence: dict[str, dict[str, Any]],
    production_index: dict[str, list[dict[str, Any]]],
) -> dict[str, Any]:
    payloads = {language: embedded_plan(source) if source else None for language, source in sources.items()}
    source_issues: list[str] = []
    for language in ("ar", "en"):
        if sources.get(language) is None:
            source_issues.append(f"{language.upper()} official source could not be retrieved: {source_evidence[language].get('status')}.")
        elif payloads[language] is None:
            source_issues.append(f"{language.upper()} official source contains no extractable structured study plan.")
    ar_payload = payloads.get("ar") or {"studyPlan": []}
    en_payload = payloads.get("en") or {"studyPlan": []}
    ar_levels = plan_levels(ar_payload.get("studyPlan") or [])
    en_levels = plan_levels(en_payload.get("studyPlan") or [])
    if len(ar_levels) != previous.get("levels_found") or len(en_levels) != previous.get("levels_found"):
        source_issues.append(
            f"Current level counts ({len(ar_levels)} AR/{len(en_levels)} EN) do not match the original audit ({previous.get('levels_found')})."
        )
    courses, structural = align_bilingual_rows(level_rows(ar_payload), level_rows(en_payload))
    if len(courses) != previous.get("courses_found"):
        source_issues.append(
            f"Current course-row count ({len(courses)}) does not match the original audit ({previous.get('courses_found')})."
        )

    all_group_codes: dict[str, list[str]] = defaultdict(list)
    for payload in (ar_payload, en_payload):
        for group_name, course in iter_group_courses(payload):
            code = normalized_code(course.get("code"))
            if code:
                all_group_codes[code].append(group_name)
    level_codes = {course["normalized_course_code"] for course in courses}

    placeholders = [{
        "course_code": course["course_code"],
        "canonical_course_code": course["canonical_course_code"],
        "level_or_semester": course["level_or_semester"],
        "reason": "Code is missing, placeholder-only, or lacks a stable letter-and-number identity.",
    } for course in courses if is_placeholder_or_unstable_code(course["course_code"])]

    by_code: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for course in courses:
        by_code[course["normalized_course_code"]].append(course)
    collisions: list[dict[str, Any]] = []
    duplicates: list[dict[str, Any]] = []
    for code, rows in by_code.items():
        if code and len(rows) > 1:
            raw_codes = sorted({row["course_code"] for row in rows})
            identity_values = sorted({
                (normalized_text(row.get("course_name_ar")), normalized_text(row.get("course_name_en")), row.get("credit_hours"))
                for row in rows
            })
            detail = {
                "normalized_course_code": code,
                "canonical_course_code": rows[0]["canonical_course_code"],
                "raw_codes": raw_codes,
                "occurrences": len(rows),
                "levels": [row["level_or_semester"] for row in rows],
            }
            if len(raw_codes) > 1 or len(identity_values) > 1:
                collisions.append(detail)
            else:
                duplicates.append(detail)
    collisions.extend(source_identity_conflicts(ar_payload, "ar"))
    collisions.extend(source_identity_conflicts(en_payload, "en"))

    requisite_references: list[dict[str, Any]] = []
    missing_by_code: dict[str, dict[str, Any]] = {}
    for course in courses:
        for reference in course["requisite_references"]:
            code = reference["normalized_code"]
            if code in level_codes:
                resolution = "same_plan_level"
                datasets = []
            elif code in all_group_codes:
                resolution = "official_shared_requirement_group"
                datasets = sorted(set(all_group_codes[code]))
            else:
                resolution = "missing"
                datasets = []
            item = {
                "from_course": course["canonical_course_code"],
                "raw_notation": course["raw_prerequisite_notation"],
                "kind": reference["kind"],
                "referenced_course": reference["course_code"],
                "resolution": resolution,
                "shared_dataset_groups": datasets,
            }
            requisite_references.append(item)
            if resolution == "missing":
                missing = missing_by_code.setdefault(code, {
                    "course_code": reference["course_code"],
                    "referenced_by": [],
                    "reason": "Referenced requisite is absent from level rows and named official requirement groups on both source pages.",
                })
                missing["referenced_by"].append(course["canonical_course_code"])
    missing_dependencies = sorted(missing_by_code.values(), key=lambda item: item["course_code"])
    for item in missing_dependencies:
        item["referenced_by"] = sorted(set(item["referenced_by"]))

    for course in courses:
        names = " ".join(filter(None, [course.get("course_name_ar"), course.get("course_name_en")]))
        if any(term.casefold() in names.casefold() for term in ELECTIVE_TERMS):
            structural.append(
                f"{course['canonical_course_code']} at {course['level_or_semester']} is an elective placeholder, not a selected coded course."
            )
    for summary in group_summary(en_payload):
        name = summary["name"] or "Unnamed group"
        if any(term in name.casefold() for term in ELECTIVE_TERMS) and summary["course_count"]:
            structural.append(
                f"Official group '{name}' contains {summary['course_count']} elective options without a machine-verifiable selection rule."
            )
        if not summary["has_levels"] and summary["course_count"] and not any(
            term in name.casefold() for term in DESCRIPTION_TERMS
        ):
            group_codes = {
                normalized_code(course.get("code"))
                for group_name, course in iter_group_courses(en_payload)
                if group_name == name
            }
            extras = sorted(display_code(code) for code in group_codes - level_codes)
            if extras:
                structural.append(
                    f"Official non-level group '{name}' contains courses not assigned to a visible level: {', '.join(extras)}."
                )
    if not ar_levels or not en_levels:
        structural.append("One or both official languages do not represent any visible levels or semesters.")
    if duplicates:
        structural.append("One or more normalized course identities repeat across visible levels.")

    special_courses = [{
        "course_code": course["canonical_course_code"],
        "course_name_ar": course.get("course_name_ar"),
        "course_name_en": course.get("course_name_en"),
        "credit_hours": course["credit_hours"],
        "level_or_semester": course["level_or_semester"],
        "handling": "Retained as an explicit plan row; no equivalence or credit exclusion was inferred.",
    } for course in courses if course.get("credit_hours") == 0 or any(
        term.casefold() in " ".join(filter(None, [course.get("course_name_ar"), course.get("course_name_en")])).casefold()
        for term in SPECIAL_TERMS
    )]

    mechanical: list[str] = []
    for course in courses:
        if not is_placeholder_or_unstable_code(course["course_code"]) and course["course_code"] != course["canonical_course_code"]:
            mechanical.append(f"Normalize course code '{course['course_code']}' to '{course['canonical_course_code']}'.")
    exact, aliases, production_conflicts, absent = compatible_with_production(courses, production_index)
    structural = sorted(set(structural))
    mechanical = sorted(set(mechanical))
    classification = classify_program(
        source_issues=source_issues,
        placeholders=placeholders,
        collisions=collisions,
        missing=missing_dependencies,
        structural=structural,
        production_conflicts=production_conflicts,
        mechanical=mechanical,
    )
    calculated = sum(
        course["credit_hours"] for course in courses
        if isinstance(course.get("credit_hours"), (int, float)) and not isinstance(course.get("credit_hours"), bool)
    )
    official_total = official_total_credits(payload for payload in payloads.values() if payload)
    evidence = [
        f"Original audit selected this program as ready_to_import with {previous.get('levels_found')} levels and {previous.get('courses_found')} course rows.",
        f"Current official bilingual pages yielded {len(ar_levels)} AR/{len(en_levels)} EN levels and {len(courses)} aligned course rows.",
        f"Checked {len(requisite_references)} explicit requisite references; {len(missing_dependencies)} referenced identities remain absent.",
        f"Detected {len(placeholders)} placeholder/unstable rows, {len(collisions)} normalized collisions, and {len(structural)} structural ambiguities.",
        f"Compared {len(courses)} candidate identities with {sum(len(values) for values in production_index.values())} local production course records.",
    ]
    if source_issues:
        evidence.extend(source_issues)
    if missing_dependencies:
        evidence.append("Missing requisite codes: " + ", ".join(item["course_code"] for item in missing_dependencies) + ".")
    if placeholders or collisions:
        collision_codes = {
            item.get("course_code") or item.get("canonical_course_code") or item.get("normalized_course_code")
            for item in placeholders + collisions
        }
    if production_conflicts:
        evidence.append("Existing-data conflicts require identity review for: " + ", ".join(item["course_code"] for item in production_conflicts) + ".")

    return {
        "program_id": previous["program_id"],
        "faculty_id": previous["faculty_id"],
        "faculty_name_ar": previous.get("faculty_name_ar"),
        "faculty_name_en": previous.get("faculty_name_en"),
        "program_name_ar": previous.get("program_name_ar"),
        "program_name_en": previous.get("program_name_en"),
        "degree_level": previous.get("degree_level"),
        "source_url_or_document": previous.get("existing_official_urls", []),
        "source_evidence": source_evidence,
        "previous_classification": previous.get("recommended_status"),
        "new_classification": classification,
        "course_count": len(courses),
        "level_or_semester_count": max(len(ar_levels), len(en_levels)),
        "official_total_credits": official_total,
        "calculated_credits": calculated,
        "credit_total_reconciliation": (
            "not_available_from_structured_source" if official_total is None
            else "matches" if official_total == calculated
            else f"does_not_match: official={official_total}, calculated={calculated}"
        ),
        "courses": courses,
        "plan_groups_ar": group_summary(ar_payload),
        "plan_groups_en": group_summary(en_payload),
        "prerequisite_references": requisite_references,
        "missing_dependencies": missing_dependencies,
        "placeholder_or_colliding_codes": placeholders + collisions,
        "duplicate_identities": duplicates,
        "structural_ambiguities": structural,
        "special_course_handling": special_courses,
        "mechanical_cleanup": mechanical,
        "existing_data_matches": exact,
        "existing_data_safe_aliases": aliases,
        "existing_data_conflicts": production_conflicts,
        "existing_data_absent_codes": absent,
        "classification_evidence": evidence,
        "recommended_next_action": recommended_action(classification),
    }


def markdown_report(report: dict[str, Any]) -> str:
    summary = report["summary"]
    lines = [
        "# Ready-candidate reconciliation audit",
        "",
        f"Generated: {report['generated_at']}",
        "",
        "## Executive summary",
        "",
        f"The original audit marked {summary['candidate_count']} catalog-only programs as `ready_to_import`. This reconciliation applied course-code, prerequisite, structure, source-quality, and local production-compatibility checks to exactly those candidates.",
        "",
    ]
    for classification in CLASSIFICATIONS:
        lines.append(f"- {classification}: {summary['classification_counts'].get(classification, 0)}")
    lines.extend([
        "",
        "No production program or course data, planner logic, application code, Git history, GitHub resource, or Azure resource was modified.",
        "",
        "## All 36 candidates",
        "",
        "| Program | Faculty | Previous | New | Courses | Levels | Official / calculated credits | Primary evidence |",
        "|---|---|---|---|---:|---:|---|---|",
    ])
    for item in report["programs"]:
        reason = item["classification_evidence"][-1].replace("|", "\\|")
        credits = f"{item['official_total_credits'] if item['official_total_credits'] is not None else 'not provided'} / {item['calculated_credits']}"
        lines.append(
            f"| {item['program_name_en']} | {item['faculty_name_en']} | {item['previous_classification']} | {item['new_classification']} | {item['course_count']} | {item['level_or_semester_count']} | {credits} | {reason} |"
        )
    lines.extend(["", "## Detailed blockers", ""])
    blocked = [item for item in report["programs"] if item["new_classification"].startswith("BLOCKED_") or item["new_classification"] == "MISCLASSIFIED"]
    if not blocked:
        lines.extend(["No candidates are blocked.", ""])
    for item in blocked:
        lines.extend([
            f"### {item['program_name_en']}",
            "",
            f"- Classification: `{item['new_classification']}`",
            f"- Official sources: {'; '.join(item['source_url_or_document'])}",
        ])
        if item["missing_dependencies"]:
            lines.append("- Missing dependencies: " + ", ".join(
                f"{entry['course_code']} (referenced by {', '.join(entry['referenced_by'])})" for entry in item["missing_dependencies"]
            ))
        if item["placeholder_or_colliding_codes"]:
            lines.append("- Placeholder/colliding codes: " + "; ".join(
                entry.get("course_code") or f"{entry['canonical_course_code']} from {', '.join(entry['raw_codes'])}"
                for entry in item["placeholder_or_colliding_codes"]
            ))
        if item["structural_ambiguities"]:
            lines.append("- Structural ambiguities: " + " ".join(item["structural_ambiguities"]))
        if item["existing_data_conflicts"]:
            lines.append("- Existing-data conflicts: " + ", ".join(
                entry["course_code"] for entry in item["existing_data_conflicts"]
            ))
        source_problems = [e for e in item["classification_evidence"] if "official source" in e.casefold() or "current level" in e.casefold()]
        if source_problems:
            lines.append("- Source evidence: " + " ".join(source_problems))
        lines.extend([f"- Next action: {item['recommended_next_action']}", ""])
    lines.extend(["## Mechanical-cleanup candidates", ""])
    cleanup = [item for item in report["programs"] if item["new_classification"] == "READY_AFTER_MECHANICAL_CLEANUP"]
    if not cleanup:
        lines.extend(["None.", ""])
    for item in cleanup:
        lines.extend([f"### {item['program_name_en']}", ""])
        lines.extend(f"- {change}" for change in item["mechanical_cleanup"])
        lines.append("")
    lines.extend(["## Proposed first import batch", ""])
    verified = [item for item in report["programs"] if item["new_classification"] == "VERIFIED_IMPORT_READY"]
    if verified:
        for item in verified:
            lines.append(f"- {item['program_name_en']} (`{item['program_id']}`)")
    else:
        lines.append("No program meets the conservative `VERIFIED_IMPORT_READY` threshold.")
    lines.extend([
        "",
        "This is a proposal only. No plans were imported and no production data was modified.",
        "",
        "## Method and limitations",
        "",
        "- Candidate membership is the exact set selected as `ready_to_import` in `catalog_only_plan_audit.json`.",
        "- Only official KAU URLs already recorded in that audit were requested.",
        "- A requisite is resolved only by a visible plan row or a named requirement group in the same official structured payload.",
        "- Missing official totals remain `null`; calculated credits are the sum of visible level/semester rows and do not imply an official program total.",
        "- Existing-data conflicts are reported but no merge, alias, or production edit was performed.",
        "",
    ])
    return "\n".join(lines)


def write_csv(path: Path, programs: list[dict[str, Any]]) -> None:
    fields = [
        "program_id", "faculty_id", "faculty_name_ar", "faculty_name_en", "program_name_ar",
        "program_name_en", "degree_level", "source_url_or_document", "previous_classification",
        "new_classification", "course_count", "level_or_semester_count", "official_total_credits",
        "calculated_credits", "prerequisite_references", "missing_dependencies",
        "placeholder_or_colliding_codes", "duplicate_identities", "structural_ambiguities",
        "mechanical_cleanup", "existing_data_matches", "existing_data_safe_aliases",
        "existing_data_conflicts", "existing_data_absent_codes", "classification_evidence",
        "recommended_next_action",
    ]
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=fields, lineterminator="\n")
        writer.writeheader()
        for item in programs:
            row: dict[str, Any] = {}
            for field in fields:
                value = item.get(field)
                row[field] = json.dumps(value, ensure_ascii=False, separators=(",", ":")) if isinstance(value, (list, dict)) else value
            writer.writerow(row)


def run_reconciliation(
    audit_path: Path, production_paths: list[Path], report_dir: Path, *, delay: float,
) -> dict[str, Any]:
    original = read_json(audit_path)
    candidates = [item for item in original.get("programs", []) if item.get("recommended_status") == "ready_to_import"]
    if len(candidates) != 36:
        raise ValueError(f"Expected exactly 36 original ready candidates, found {len(candidates)}")
    identifiers = [item["program_id"] for item in candidates]
    if len(set(identifiers)) != len(identifiers):
        raise ValueError("Original ready candidate identifiers are not unique")
    production_index = production_course_index(production_paths)
    programs: list[dict[str, Any]] = []
    for number, previous in enumerate(candidates, start=1):
        print(f"[{number:02d}/{len(candidates):02d}] {previous['program_name_en']}", flush=True)
        urls = previous.get("existing_official_urls") or []
        source_evidence: dict[str, dict[str, Any]] = {}
        sources: dict[str, str | None] = {}
        for language, position in (("ar", 0), ("en", 1)):
            if position >= len(urls):
                sources[language] = None
                source_evidence[language] = {"url": None, "status": "missing_url"}
                continue
            source, evidence = fetch_official_page(urls[position])
            sources[language] = source
            source_evidence[language] = evidence
            time.sleep(max(delay, 0.0))
        programs.append(reconcile_candidate(previous, sources, source_evidence, production_index))
    programs.sort(key=lambda item: item["program_id"])
    counts = Counter(item["new_classification"] for item in programs)
    report = {
        "generated_at": utc_now(),
        "mode": "analysis_only_reconciliation",
        "source_audit": str(audit_path.relative_to(ROOT)),
        "candidate_selection": "recommended_status == ready_to_import",
        "summary": {
            "candidate_count": len(programs),
            "classification_counts": {classification: counts.get(classification, 0) for classification in CLASSIFICATIONS},
            "verified_import_ready_program_ids": [
                item["program_id"] for item in programs if item["new_classification"] == "VERIFIED_IMPORT_READY"
            ],
        },
        "production_data_modified": False,
        "programs": programs,
    }
    report_dir.mkdir(parents=True, exist_ok=True)
    write_json(report_dir / "ready_candidate_reconciliation.json", report)
    write_csv(report_dir / "ready_candidate_reconciliation.csv", programs)
    (report_dir / "ready_candidate_reconciliation.md").write_text(markdown_report(report), encoding="utf-8")
    return report


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--audit", type=Path, default=ROOT / "reports/plan_extraction/catalog_only_plan_audit.json")
    parser.add_argument(
        "--production-data", type=Path, action="append",
        default=[ROOT / "web/data/additional_programs.json", ROOT / "web/data/kau_accounting.json"],
    )
    parser.add_argument("--report-dir", type=Path, default=ROOT / "reports/plan_extraction")
    parser.add_argument("--delay", type=float, default=0.4, help="Delay after each official-source request")
    args = parser.parse_args()
    report = run_reconciliation(args.audit, args.production_data, args.report_dir, delay=args.delay)
    print(json.dumps(report["summary"], ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
