"""Synchronize the bilingual KAU faculty/program catalog without touching courses."""

from __future__ import annotations

import argparse
import csv
import hashlib
import html
import json
import math
import re
import shutil
import time
import unicodedata
from collections import Counter, defaultdict
from datetime import datetime, timezone
from difflib import SequenceMatcher
from pathlib import Path
from typing import Any, Iterable
from urllib.parse import quote, urlencode, urlparse
from urllib.request import Request, urlopen


ROOT = Path(__file__).resolve().parents[2]
BASE_URL = "https://kau.edu.sa"
PAGE_SIZE = 15
USER_AGENT = "kau-program-scraper-catalog/0.1 (local academic catalog validation)"
OFFICIAL_LEVELS = {
    "Bachelor": "bachelor",
    "Advanced Studies - General Master": "master",
    "Special Master": "master",
    "Executive Master": "executive_master",
    "Executive Master Advanced Studies - General Master": "executive_master",
    "PHD": "doctorate",
    "Distance Diploma": "intermediate_diploma",
    "Evening Diplomas": "intermediate_diploma",
    "Executive Diploma": "diploma",
    "Full-time Diploma (Morning)": "diploma",
    "Distance Learning Diploma": "diploma",
}
LEVEL_LABELS = {
    "bachelor": ("بكالوريوس", "Bachelor"),
    "diploma": ("دبلوم", "Diploma"),
    "intermediate_diploma": ("دبلوم متوسط", "Intermediate Diploma"),
    "higher_diploma": ("دبلوم عالٍ", "Higher Diploma"),
    "master": ("ماجستير", "Master"),
    "executive_master": ("ماجستير تنفيذي", "Executive Master"),
    "doctorate": ("دكتوراه", "Doctorate"),
    "other": ("أخرى", "Other"),
}
FACULTY_SLUGS = {
    "CM": "communication-media", "AH": "arts-humanities", "RB": "business-rabigh",
    "EA": "economics-administration", "ED": "education", "AL": "applied-college",
    "NR": "nursing", "IT": "computing-information-technology",
    "RI": "computing-information-technology-rabigh", "LA": "law",
    "MS": "maritime-studies", "PR": "preparatory-year", "TU": "tourism",
    "PH": "pharmacy", "MD": "medicine", "RM": "medicine-rabigh", "SC": "science",
    "FE": "environmental-sciences", "AM": "applied-medical-sciences",
    "RA": "applied-medical-sciences-rabigh", "RS": "science-arts-rabigh",
    "AP": "architecture-planning", "EN": "engineering", "RE": "engineering-rabigh",
    "EV": "environmental-design", "DN": "dentistry", "ER": "earth-sciences",
    "HD": "human-sciences-design", "MR": "marine-sciences",
    "RH": "medical-rehabilitation-sciences", "IE": "islamic-economics-institute",
    "PK": "prince-khaled-al-faisal-moderation-institute",
    "EI": "english-language-institute", "AI": "arabic-language-institute",
}
FACULTY_TYPES = {"IE": "institute", "PK": "institute", "EI": "institute", "AI": "institute", "PR": "other"}
FACULTY_EN_OVERRIDES = {
    "PR": "Preparatory Year Program",
    "EV": "Faculty of Environmental Design",
    "ER": "Faculty of Earth Sciences",
    "AI": "Arabic Language Institute for Non-Native Speakers",
}
FACULTY_EN_NAME_SOURCES = {
    "PR": f"{BASE_URL}/en/page/preparatory-year-program",
    "EV": f"{BASE_URL}/faculty/en/architecture-planning",
    "ER": f"{BASE_URL}/faculty/en/earth-sciences",
    "AI": f"{BASE_URL}/faculty/en/arabic-language-institute/page/applied-linguistics-department",
}


# These programs are explicitly confirmed by current official faculty pages but are
# absent from the central /programs faculty filter. Their source text is verified on
# every refresh. Ambiguous or merely planned programs are intentionally not included.
SUPPLEMENTAL_PROGRAMS = [
    {
        "id": "ri-bachelor-computer-science", "faculty_id": "RI",
        "name_ar": "بكالوريوس علوم الحاسبات", "name_en": "Bachelor of Computer Science",
        "degree_level": "bachelor", "official_code": None,
        "source_url_ar": f"{BASE_URL}/faculty/ar/computing-it-rabigh",
        "source_url_en": f"{BASE_URL}/faculty/en/computing-it-rabigh",
        "evidence_ar": "ثلاثة برامج أكاديمية للبكالوريوس في علوم الحاسبات، نظم المعلومات، وتقنية المعلومات",
        "evidence_en": "three undergraduate programs in Computer Science, Information Systems, and Information Technology",
    },
    {
        "id": "ri-bachelor-information-systems", "faculty_id": "RI",
        "name_ar": "بكالوريوس نظم المعلومات", "name_en": "Bachelor of Information Systems",
        "degree_level": "bachelor", "official_code": None,
        "source_url_ar": f"{BASE_URL}/faculty/ar/computing-it-rabigh",
        "source_url_en": f"{BASE_URL}/faculty/en/computing-it-rabigh",
        "evidence_ar": "ثلاثة برامج أكاديمية للبكالوريوس في علوم الحاسبات، نظم المعلومات، وتقنية المعلومات",
        "evidence_en": "three undergraduate programs in Computer Science, Information Systems, and Information Technology",
    },
    {
        "id": "ri-bachelor-information-technology", "faculty_id": "RI",
        "name_ar": "بكالوريوس تقنية المعلومات", "name_en": "Bachelor of Information Technology",
        "degree_level": "bachelor", "official_code": None,
        "source_url_ar": f"{BASE_URL}/faculty/ar/computing-it-rabigh",
        "source_url_en": f"{BASE_URL}/faculty/en/computing-it-rabigh",
        "evidence_ar": "ثلاثة برامج أكاديمية للبكالوريوس في علوم الحاسبات، نظم المعلومات، وتقنية المعلومات",
        "evidence_en": "three undergraduate programs in Computer Science, Information Systems, and Information Technology",
    },
    {
        "id": "ed-master-special-education", "faculty_id": "ED",
        "name_ar": "ماجستير التربية الخاصة", "name_en": "Master's Program in Special Education",
        "degree_level": "master", "official_code": None,
        "source_url_ar": f"{BASE_URL}/faculty/ar/education/page/department-of-special-education",
        "source_url_en": f"{BASE_URL}/faculty/en/education/page/department-of-special-education",
        "evidence_ar": "يقدّم القسم حاليًا برنامج الماجستير في التربية الخاصة",
        "evidence_en": "currently offers a Master’s Program in Special Education",
    },
    {
        "id": "ed-professional-master-special-education", "faculty_id": "ED",
        "name_ar": "الماجستير المهني في التربية الخاصة", "name_en": "Professional Master's Program in Special Education",
        "degree_level": "executive_master", "official_code": None,
        "source_url_ar": f"{BASE_URL}/faculty/ar/education/page/department-of-special-education",
        "source_url_en": f"{BASE_URL}/faculty/en/education/page/department-of-special-education",
        "evidence_ar": "برنامج الماجستير المهني في التربية الخاصة",
        "evidence_en": "Professional Master’s Program in Special Education",
    },
    {
        "id": "ed-master-educational-guidance-counseling", "faculty_id": "ED",
        "name_ar": "ماجستير التوجيه والإرشاد التربوي", "name_en": "Master's Program in Educational Guidance and Counseling",
        "degree_level": "master", "official_code": None,
        "source_url_ar": f"{BASE_URL}/faculty/ar/education/page/department-of%20psychology",
        "source_url_en": f"{BASE_URL}/faculty/en/education/page/department-of%20psychology",
        "evidence_ar": "برنامج الماجستير في التوجيه والإرشاد التربوي",
        "evidence_en": "Master’s Program in Educational Guidance and Counseling",
    },
    {
        "id": "ed-doctorate-psychological-educational-counseling", "faculty_id": "ED",
        "name_ar": "دكتوراه الإرشاد النفسي والتربوي", "name_en": "PhD in Psychological and Educational Counseling",
        "degree_level": "doctorate", "official_code": None,
        "source_url_ar": f"{BASE_URL}/faculty/ar/education/page/department-of%20psychology",
        "source_url_en": f"{BASE_URL}/faculty/en/education/page/department-of%20psychology",
        "evidence_ar": "استحداث برنامج الدكتوراه في الإرشاد النفسي والتربوي",
        "evidence_en": "PhD program in Psychological and Educational Counseling was established",
    },
    {
        "id": "ph-doctor-of-pharmacy", "faculty_id": "PH",
        "name_ar": "دكتور صيدلي", "name_en": "Doctor of Pharmacy (PharmD)",
        "degree_level": "other", "official_code": None,
        "source_url_ar": "https://admission.kau.edu.sa/Default-166-AR",
        "source_url_en": f"{BASE_URL}/en/student-achievement/80e897dc-bcf4-444c-9f14-cfc67c008b03",
        "evidence_ar": None, "evidence_en": "PharmD internship students from the Faculty of Pharmacy",
    },
    {
        "id": "ph-master-pharmacology-toxicology", "faculty_id": "PH",
        "name_ar": "ماجستير العلوم في علم الأدوية والسموم", "name_en": "MSc in Pharmacology and Toxicology",
        "degree_level": "master", "official_code": None,
        "source_url_ar": f"{BASE_URL}/faculty/ar/pharmacy",
        "source_url_en": f"{BASE_URL}/faculty/en/pharmacy",
        "evidence_ar": "ماجستير العلوم في علم الأدوية والسموم", "evidence_en": "MSc in Pharmacology and Toxicology",
    },
    {
        "id": "ph-master-pharmaceutics", "faculty_id": "PH",
        "name_ar": "ماجستير العلوم في الصيدلانيات", "name_en": "MSc in Pharmaceutics",
        "degree_level": "master", "official_code": None,
        "source_url_ar": f"{BASE_URL}/faculty/ar/pharmacy",
        "source_url_en": f"{BASE_URL}/faculty/en/pharmacy",
        "evidence_ar": "ماجستير العلوم في الصيدلانيات", "evidence_en": "MSc in Pharmaceutics",
    },
    {
        "id": "ph-master-molecular-drug-discovery-development", "faculty_id": "PH",
        "name_ar": "ماجستير العلوم في الاكتشاف والتطوير الجزيئي للأدوية",
        "name_en": "MSc in Molecular Drug Discovery and Development",
        "degree_level": "master", "official_code": None,
        "source_url_ar": f"{BASE_URL}/faculty/ar/pharmacy",
        "source_url_en": f"{BASE_URL}/faculty/en/pharmacy",
        "evidence_ar": "ماجستير العلوم في الإكتشاف والتطوير الجزيئي للأدوية",
        "evidence_en": "MSc in Molecular Drug Discovery and Development",
    },
]


def utc_now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def read_json(path: Path, fallback: Any) -> Any:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return fallback


def write_json(path: Path, value: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def visible_text(source: str) -> str:
    return " ".join(re.sub(r"<[^>]+>", " ", html.unescape(source)).split())


def cache_name(url: str) -> str:
    parsed = urlparse(url)
    query = re.sub(r"[^A-Za-z0-9]+", "-", parsed.query).strip("-")
    stem = re.sub(r"[^A-Za-z0-9]+", "-", parsed.path).strip("-") or "home"
    return f"{stem}{'-' + query if query else ''}.html"


def fetch(url: str, cache_dir: Path, *, refresh: bool, delay: float, log: list[dict[str, Any]]) -> str:
    target = cache_dir / cache_name(url)
    if target.exists() and not refresh:
        source = target.read_text(encoding="utf-8", errors="ignore")
        log.append({"url": url, "cache": str(target.relative_to(ROOT)) if target.is_relative_to(ROOT) else str(target), "status": "cached"})
        return source
    request = Request(url, headers={"User-Agent": USER_AGENT, "Accept": "text/html"})
    try:
        with urlopen(request, timeout=45) as response:
            source = response.read().decode("utf-8", errors="ignore")
    except Exception as exc:  # network errors are reported with the URL for auditability
        raise RuntimeError(f"failed to fetch official source {url}: {exc}") from exc
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(source, encoding="utf-8")
    log.append({"url": url, "cache": str(target.relative_to(ROOT)) if target.is_relative_to(ROOT) else str(target), "status": "fetched"})
    time.sleep(max(0.0, delay))
    return source


def extract_faculties(source: str) -> list[dict[str, str]]:
    select = re.search(r'<select[^>]+name="faculty_code"[^>]*>(.*?)</select>', html.unescape(source), re.S | re.I)
    if not select:
        raise ValueError("official faculty filter not found")
    return [
        {"id": code.strip(), "name": re.sub(r"<[^>]+>", "", label).strip()}
        for code, label in re.findall(r'<option value="([^"]*)"[^>]*>(.*?)</option>', select.group(1), re.S | re.I)
        if code.strip()
    ]


def flight_records(source: str) -> dict[str, Any]:
    records: dict[str, Any] = {}
    pattern = r'<script>self\.__next_f\.push\((\[.*?\])\)</script>'
    for match in re.finditer(pattern, source, re.S):
        try:
            packet = json.loads(match.group(1))
        except json.JSONDecodeError:
            continue
        if len(packet) < 2 or not isinstance(packet[1], str):
            continue
        for line in packet[1].splitlines():
            record = re.match(r"^([0-9a-f]+):(.*)$", line, re.S)
            if not record:
                continue
            try:
                records[record.group(1)] = json.loads(record.group(2))
            except json.JSONDecodeError:
                continue
    return records


def walk(value: Any) -> Iterable[list[Any]]:
    if isinstance(value, list):
        yield value
        for item in value:
            yield from walk(item)
    elif isinstance(value, dict):
        for item in value.values():
            yield from walk(item)


def resolve(value: Any, records: dict[str, Any], seen: frozenset[str] = frozenset()) -> Any:
    if isinstance(value, str) and re.fullmatch(r"\$L?[0-9a-f]+", value):
        key = value[2:] if value.startswith("$L") else value[1:]
        if key in records and key not in seen:
            return resolve(records[key], records, seen | {key})
        return value
    if isinstance(value, list):
        return [resolve(item, records, seen) for item in value]
    if isinstance(value, dict):
        return {key: resolve(item, records, seen) for key, item in value.items()}
    return value


def node_text(value: Any) -> str:
    if isinstance(value, str):
        return "" if value.startswith("$") else value
    if isinstance(value, list):
        if len(value) >= 4 and value[0] == "$" and isinstance(value[3], dict):
            return node_text(value[3].get("children", ""))
        return " ".join(filter(None, (node_text(item) for item in value)))
    if isinstance(value, dict):
        return node_text(value.get("children", ""))
    return ""


def find_nodes(value: Any, *, tag: str | None = None, class_part: str | None = None) -> Iterable[list[Any]]:
    for node in walk(value):
        if len(node) < 4 or node[0] != "$" or not isinstance(node[3], dict):
            continue
        if tag is not None and node[1] != tag:
            continue
        if class_part is not None and class_part not in node[3].get("className", ""):
            continue
        yield node


def parse_article(article: list[Any], records: dict[str, Any]) -> dict[str, Any]:
    article = resolve(article, records)
    title = next((node_text(node).strip() for node in find_nodes(article, tag="h3")), None)
    badge_node = next(find_nodes(article, tag="div", class_part="mb-2 flex flex-wrap"), None)
    badge = node_text(badge_node).strip() if badge_node else None
    detail = next(find_nodes(article, tag="div", class_part="space-y-2 text-sm"), None)
    single_rows: list[str] = []
    duration = language = None
    if detail:
        children = detail[3].get("children", [])
        for row in children if isinstance(children, list) else []:
            if not isinstance(row, list) or len(row) < 4 or not isinstance(row[3], dict):
                continue
            if "gap-4" in row[3].get("className", ""):
                parts = [node_text(item).strip() for item in row[3].get("children", []) if isinstance(item, list)]
                duration = parts[0] if parts else None
                language = parts[1] if len(parts) > 1 else None
            else:
                text = node_text(row).strip()
                if text:
                    single_rows.append(text)
    faculty = single_rows[0] if len(single_rows) > 1 else None
    degree = single_rows[-1] if single_rows else None
    footer = next(find_nodes(article, tag="div", class_part="mt-4 flex items-center"), None)
    code = path = None
    if footer:
        spans = list(find_nodes(footer, tag="span"))
        code = node_text(spans[0]).strip() if spans else None
        for node in walk(footer):
            if len(node) >= 4 and node[0] == "$" and isinstance(node[3], dict):
                href = node[3].get("href", "")
                if href.startswith("/programs/"):
                    path = href
                    break
    return {
        "title": title, "official_type": badge, "faculty": faculty, "official_degree": degree,
        "duration": duration, "language": language, "official_code": code, "path": path,
    }


def parse_program_page(source: str) -> list[dict[str, Any]]:
    records = flight_records(source)
    programs: dict[str, dict[str, Any]] = {}
    for value in records.values():
        for node in walk(value):
            if len(node) > 1 and node[0] == "$" and node[1] == "article":
                program = parse_article(node, records)
                if program["path"]:
                    programs[program["path"]] = program
    return list(programs.values())


def reported_count(source: str) -> int:
    decoded = html.unescape(source)
    match = re.search(r"Showing(?:<!--.*?-->)*\s*(\d+)(?:<!--.*?-->)*\s*Programs", decoded, re.S | re.I)
    if match:
        return int(match.group(1))
    match = re.search(r"عرض(?:<!--.*?-->)*\s*(\d+)(?:<!--.*?-->)*\s*برامج", decoded, re.S)
    if match:
        return int(match.group(1))
    if re.search(r"No programs found", decoded, re.I):
        return 0
    raise ValueError("official program result count not found")


def language_values(label: str | None) -> list[str]:
    if not label:
        return []
    value = label.casefold()
    languages = []
    if "arab" in value or "عرب" in value:
        languages.append("ar")
    if "english" in value or "انجلي" in value or "إنجلي" in label:
        languages.append("en")
    return languages


def slugify(value: str) -> str:
    normalized = unicodedata.normalize("NFKD", value)
    ascii_value = normalized.encode("ascii", "ignore").decode("ascii").lower()
    return re.sub(r"[^a-z0-9]+", "-", ascii_value).strip("-") or hashlib.sha1(value.encode()).hexdigest()[:12]


def normalized_text(value: Any) -> str:
    text = unicodedata.normalize("NFKC", str(value or "")).casefold()
    text = re.sub(r"bachelor(?:’s|'s)?(?: degree| of science)?(?: in)?", "", text)
    text = re.sub(r"[^\w\u0600-\u06ff]+", " ", text)
    return " ".join(text.split())


def normalized_code(value: Any) -> str:
    return re.sub(r"[^A-Z0-9]", "", str(value or "").upper())


def official_path(value: Any) -> str | None:
    path = urlparse(str(value or "")).path
    match = re.search(r"/programs/([^/?#]+)", path)
    return f"/programs/{match.group(1)}" if match else None


def load_planner_ids() -> set[str]:
    ids = {"accounting"}
    additional = read_json(ROOT / "web/data/additional_programs.json", {"programs": []})
    ids.update(item.get("id") for item in additional.get("programs", []) if item.get("id") and item.get("courses"))
    return ids


def find_legacy(program: dict[str, Any], legacy: list[dict[str, Any]], used: set[str]) -> dict[str, Any] | None:
    path_matches = [item for item in legacy if item.get("id") not in used and official_path(item.get("official_source_url")) == program.get("path") and program.get("path") is not None]
    if len(path_matches) == 1:
        return path_matches[0]
    exact_code = str(program.get("official_code") or "").strip().casefold()
    code_matches = [
        item for item in legacy if item.get("id") not in used
        and str(item.get("program_code") or "").strip().casefold() == exact_code and exact_code
    ]
    if len(code_matches) == 1:
        return code_matches[0]
    loose_code = normalized_code(program.get("official_code"))
    loose_matches = [
        item for item in legacy if item.get("id") not in used
        and normalized_code(item.get("program_code")) == loose_code and loose_code
    ]
    if len(loose_matches) == 1:
        return loose_matches[0]
    title = normalized_text(program["name_en"])
    candidates = [item for item in legacy if item.get("id") not in used and item.get("faculty_id") == program["faculty_id"]]
    scored = sorted(
        ((SequenceMatcher(None, title, normalized_text(item.get("program_name"))).ratio(), item) for item in candidates),
        key=lambda pair: pair[0], reverse=True,
    )
    return scored[0][1] if scored and scored[0][0] >= 0.82 else None


def source_program(program_en: dict[str, Any], program_ar: dict[str, Any], faculty_id: str) -> dict[str, Any]:
    level = OFFICIAL_LEVELS.get(program_en.get("official_type"), "other")
    level_ar, level_en = LEVEL_LABELS[level]
    path = program_en["path"]
    slug = path.rsplit("/", 1)[-1]
    languages = sorted(set(language_values(program_en.get("language")) + language_values(program_ar.get("language"))))
    return {
        "id": f"catalog-{slug}", "slug": slug, "faculty_id": faculty_id,
        "name_ar": program_ar["title"], "name_en": re.sub(r"^[\u064b-\u065f\u0670]+", "", program_en["title"]).strip(),
        "degree_level": level, "degree_level_ar": level_ar, "degree_level_en": level_en,
        "official_degree_label_ar": program_ar.get("official_type"),
        "official_degree_label_en": program_en.get("official_type"),
        "language": languages, "official_code": program_en.get("official_code"),
        "duration_ar": program_ar.get("duration"), "duration_en": program_en.get("duration"),
        "source_url_ar": f"{BASE_URL}/ar{path}", "source_url_en": f"{BASE_URL}/en{path}",
        "source_kind": "central_catalog", "source_path": path,
    }


def enrich_supplement(program: dict[str, Any]) -> dict[str, Any]:
    value = {key: item for key, item in program.items() if not key.startswith("evidence_")}
    level_ar, level_en = LEVEL_LABELS[value["degree_level"]]
    value.update({
        "slug": value["id"], "degree_level_ar": level_ar, "degree_level_en": level_en,
        "official_degree_label_ar": level_ar, "official_degree_label_en": level_en,
        "language": [], "duration_ar": None, "duration_en": None,
        "source_kind": "faculty_page", "source_path": None,
    })
    return value


def merge_legacy(programs: list[dict[str, Any]], old_catalog: dict[str, Any]) -> tuple[list[dict[str, Any]], list[str]]:
    legacy = old_catalog.get("programs", [])
    planner_ids = load_planner_ids()
    used: set[str] = set()
    output = []
    for program in programs:
        match = find_legacy(program, legacy, used)
        base = dict(match or {})
        if match:
            used.add(match["id"])
        program_id = match.get("id") if match else program["id"]
        planner_available = bool(base.get("courses")) or program_id in planner_ids
        faculty_name_en = next((f["name_en"] for f in old_catalog["_new_faculties"] if f["id"] == program["faculty_id"]), program["faculty_id"])
        base.update(program)
        base.update({
            "id": program_id, "program_name": program["name_en"], "program_name_ar": program["name_ar"],
            "program_name_en": program["name_en"], "faculty_name": faculty_name_en,
            "program_code": program.get("official_code"),
            "official_source_url": program["source_url_en"],
            "planner_available": planner_available,
            "planner_data_key": program_id if planner_available else None,
            "catalog_status": "active" if planner_available else "catalog-only",
            "catalog_note_ar": "الخطة الدراسية متاحة في المخطط." if planner_available else "الخطة غير متاحة حاليًا.",
            "catalog_note_en": "The detailed study plan is available." if planner_available else "The detailed study plan has not been added yet.",
        })
        output.append(base)
    return output, [item["id"] for item in legacy if item.get("id") not in used]


def extract_catalog(cache_dir: Path, *, refresh: bool, delay: float) -> tuple[dict[str, Any], dict[str, Any]]:
    checked: list[dict[str, Any]] = []
    pages: dict[str, list[str]] = {"en": [], "ar": []}
    totals: dict[str, int] = {}
    faculties_by_language: dict[str, list[dict[str, str]]] = {}
    for language in ("en", "ar"):
        first_url = f"{BASE_URL}/{language}/programs"
        first = fetch(first_url, cache_dir / language / "central", refresh=refresh, delay=delay, log=checked)
        totals[language] = reported_count(first)
        faculties_by_language[language] = extract_faculties(first)
        pages[language].append(first)
        for page in range(2, math.ceil(totals[language] / PAGE_SIZE) + 1):
            url = f"{BASE_URL}/{language}/programs?{urlencode({'page': page})}"
            pages[language].append(fetch(url, cache_dir / language / "central", refresh=refresh, delay=delay, log=checked))
    if totals["en"] != totals["ar"]:
        raise ValueError(f"Arabic/English totals differ: {totals}")
    if [f["id"] for f in faculties_by_language["en"]] != [f["id"] for f in faculties_by_language["ar"]]:
        raise ValueError("Arabic/English faculty option codes differ")

    parsed: dict[str, dict[str, dict[str, Any]]] = {}
    for language in ("en", "ar"):
        records: dict[str, dict[str, Any]] = {}
        for source in pages[language]:
            for program in parse_program_page(source):
                records[program["path"]] = program
        parsed[language] = records
        if len(records) != totals[language]:
            raise ValueError(f"{language} extracted {len(records)} of {totals[language]} official programs")
    if set(parsed["en"]) != set(parsed["ar"]):
        raise ValueError("Arabic/English official program paths do not align")

    faculty_lookup: dict[str, dict[str, str]] = {}
    for en_item, ar_item in zip(faculties_by_language["en"], faculties_by_language["ar"]):
        code = en_item["id"]
        faculty_lookup[code] = {
            "id": code, "code": code, "slug": FACULTY_SLUGS[code],
            "name": FACULTY_EN_OVERRIDES.get(code, en_item["name"]), "name_ar": ar_item["name"], "name_en": FACULTY_EN_OVERRIDES.get(code, en_item["name"]),
            "official_filter_label_ar": ar_item["name"], "official_filter_label_en": en_item["name"],
            "name_source_url_en": FACULTY_EN_NAME_SOURCES.get(code),
            "type": FACULTY_TYPES.get(code, "faculty"),
            "source_url_ar": f"{BASE_URL}/ar/programs?{urlencode({'faculty_code': code})}",
            "source_url_en": f"{BASE_URL}/en/programs?{urlencode({'faculty_code': code})}",
        }

    filter_audit: dict[str, Any] = {}
    path_to_faculty: dict[str, str] = {}
    for code in faculty_lookup:
        base_query = {"faculty_code": code}
        first_url = f"{BASE_URL}/en/programs?{urlencode(base_query)}"
        first = fetch(first_url, cache_dir / "en" / "faculties", refresh=refresh, delay=delay, log=checked)
        count = reported_count(first)
        paths = {program["path"] for program in parse_program_page(first)}
        for page in range(2, math.ceil(count / PAGE_SIZE) + 1):
            query = {"faculty_code": code, "page": page}
            source = fetch(f"{BASE_URL}/en/programs?{urlencode(query)}", cache_dir / "en" / "faculties", refresh=refresh, delay=delay, log=checked)
            paths.update(program["path"] for program in parse_program_page(source))
        if len(paths) != count:
            raise ValueError(f"faculty {code}: extracted {len(paths)} of {count} filtered programs")
        filter_audit[code] = {"official_count": count, "paths": sorted(paths), "pages_checked": max(1, math.ceil(count / PAGE_SIZE))}
        for path in paths:
            if path in path_to_faculty and path_to_faculty[path] != code:
                raise ValueError(f"program {path} is returned for conflicting faculties")
            path_to_faculty[path] = code

    # Some English cards omit the faculty row; the authoritative per-faculty query assigns them.
    missing_assignment = set(parsed["en"]) - set(path_to_faculty)
    if missing_assignment:
        raise ValueError(f"central programs not assigned by any official faculty filter: {sorted(missing_assignment)}")
    programs = [source_program(parsed["en"][path], parsed["ar"][path], path_to_faculty[path]) for path in sorted(parsed["en"])]

    source_texts: dict[str, str] = {}
    for supplement in SUPPLEMENTAL_PROGRAMS:
        for language in ("ar", "en"):
            url = supplement[f"source_url_{language}"]
            evidence = supplement.get(f"evidence_{language}")
            if not evidence or "admission.kau.edu.sa" in url:
                continue
            if url not in source_texts:
                source_texts[url] = visible_text(fetch(url, cache_dir / language / "supplemental", refresh=refresh, delay=delay, log=checked))
            if normalized_text(evidence) not in normalized_text(source_texts[url]):
                raise ValueError(f"supplemental evidence not found at {url}: {evidence}")
        programs.append(enrich_supplement(supplement))

    unresolved = {
        "PR": {
            "status": "verified_non_degree_unit", "checked_at": utc_now(),
            "pages_checked": [faculty_lookup["PR"]["source_url_en"], faculty_lookup["PR"]["source_url_ar"]],
            "note_en": "The official filter returns no programs; Preparatory Year is retained as a non-degree unit.",
            "note_ar": "لا يعرض المرشح الرسمي برامج، والسنة التحضيرية محفوظة كوحدة غير مانحة لدرجة مستقلة.",
        },
        "EV": {
            "status": "confirmed_legacy_alias", "checked_at": utc_now(),
            "pages_checked": [faculty_lookup["EV"]["source_url_en"], faculty_lookup["EV"]["source_url_ar"], f"{BASE_URL}/faculty/en/architecture-planning"],
            "note_en": "The official dropdown retains this former faculty name; KAU confirms it was renamed Faculty of Architecture and Planning in 2020, so programs remain under AP rather than this legacy EV filter.",
            "note_ar": "تحتفظ القائمة الرسمية بهذا الاسم السابق؛ وتؤكد الجامعة تغيير الاسم إلى كلية العمارة والتخطيط عام 2020، لذلك تبقى البرامج تحت AP لا مرشح EV القديم.",
        },
    }
    for faculty_id, note in unresolved.items():
        faculty_lookup[faculty_id].update({
            "audit_status": note["status"],
            "audit_note_ar": note["note_ar"],
            "audit_note_en": note["note_en"],
        })
    audit = {
        "generated_at": utc_now(), "official_central_total": totals["en"],
        "official_faculty_option_total": len(faculty_lookup), "processed_faculty_option_total": len(filter_audit),
        "filter_audit": filter_audit, "unresolved_faculties": unresolved, "pages_checked": checked,
    }
    return {"faculties": list(faculty_lookup.values()), "programs": programs}, audit


def duplicate_values(values: Iterable[Any]) -> list[Any]:
    counts = Counter(value for value in values if value not in (None, ""))
    return sorted(value for value, count in counts.items() if count > 1)


def course_hash(program: dict[str, Any]) -> str:
    raw = json.dumps(program.get("courses", []), ensure_ascii=False, sort_keys=True, separators=(",", ":"))
    return hashlib.sha256(raw.encode()).hexdigest()


def validate_catalog(catalog: dict[str, Any], old_catalog: dict[str, Any], audit: dict[str, Any], unmatched_legacy: list[str]) -> dict[str, Any]:
    faculties = catalog["faculties"]
    programs = catalog["programs"]
    external_planner_ids = load_planner_ids()
    errors: list[str] = []
    warnings: list[str] = []
    checks = {
        "duplicate_faculty_ids": duplicate_values(f["id"] for f in faculties),
        "duplicate_faculty_slugs": duplicate_values(f["slug"] for f in faculties),
        "duplicate_program_ids": duplicate_values(p["id"] for p in programs),
        "duplicate_program_slugs_within_faculty": duplicate_values((p["faculty_id"], p["slug"]) for p in programs),
        "missing_arabic_faculty_names": [f["id"] for f in faculties if not f.get("name_ar")],
        "missing_english_faculty_names": [f["id"] for f in faculties if not f.get("name_en")],
        "missing_arabic_program_names": [p["id"] for p in programs if not p.get("name_ar")],
        "missing_english_program_names": [p["id"] for p in programs if not p.get("name_en")],
        "arabic_faculty_names_without_arabic": [f["id"] for f in faculties if not re.search(r"[\u0600-\u06ff]", f.get("name_ar", ""))],
        "english_faculty_names_with_arabic": [f["id"] for f in faculties if re.search(r"[\u0600-\u06ff]", f.get("name_en", ""))],
        "arabic_program_names_without_arabic": [p["id"] for p in programs if not re.search(r"[\u0600-\u06ff]", p.get("name_ar", ""))],
        "english_program_names_with_arabic": [p["id"] for p in programs if re.search(r"[\u0600-\u06ff]", p.get("name_en", ""))],
        "missing_degree_levels": [p["id"] for p in programs if p.get("degree_level") not in LEVEL_LABELS],
        "missing_source_urls": [p["id"] for p in programs if not p.get("source_url_ar") or not p.get("source_url_en")],
        "planner_without_data": [p["id"] for p in programs if p.get("planner_available") and not p.get("planner_data_key")],
        "planner_data_key_missing": [p["id"] for p in programs if p.get("planner_available") and not p.get("courses") and p.get("planner_data_key") not in external_planner_ids],
        "existing_planner_datasets_missing": sorted(external_planner_ids - {p["id"] for p in programs}),
        "unmatched_existing_programs": unmatched_legacy,
        "faculties_with_zero_programs": [],
        "course_data_changed": [],
    }
    old_by_id = {p["id"]: p for p in old_catalog.get("programs", [])}
    new_by_id = {p["id"]: p for p in programs}
    for program_id, old in old_by_id.items():
        if program_id in new_by_id and course_hash(old) != course_hash(new_by_id[program_id]):
            checks["course_data_changed"].append(program_id)
    counts = Counter(p["faculty_id"] for p in programs)
    for faculty in faculties:
        if not counts[faculty["id"]]:
            checks["faculties_with_zero_programs"].append(faculty["id"])
            if faculty["id"] not in audit["unresolved_faculties"]:
                errors.append(f"faculty {faculty['id']} has zero programs without an audit explanation")
    for name, values in checks.items():
        if values and name not in {"faculties_with_zero_programs"}:
            errors.append(f"{name}: {values}")
    if audit["processed_faculty_option_total"] != audit["official_faculty_option_total"]:
        errors.append("not every official faculty dropdown option was processed")
    for faculty_id, item in audit["filter_audit"].items():
        central_count = sum(p["faculty_id"] == faculty_id and p.get("source_kind") == "central_catalog" for p in programs)
        if central_count != item["official_count"]:
            errors.append(f"faculty {faculty_id}: candidate central count {central_count} != official {item['official_count']}")
    if checks["faculties_with_zero_programs"]:
        warnings.append(f"audited zero-program faculties: {checks['faculties_with_zero_programs']}")
    return {"generated_at": utc_now(), "ok": not errors, "errors": errors, "warnings": warnings, "checks": checks}


def build_comparison(old_catalog: dict[str, Any], catalog: dict[str, Any], validation: dict[str, Any]) -> dict[str, Any]:
    old_faculties = {f["id"]: f for f in old_catalog.get("faculties", [])}
    new_faculties = {f["id"]: f for f in catalog["faculties"]}
    old_programs = {p["id"]: p for p in old_catalog.get("programs", [])}
    new_programs = {p["id"]: p for p in catalog["programs"]}
    added = [p for key, p in new_programs.items() if key not in old_programs]
    added_by_faculty = Counter(p["faculty_id"] for p in added)
    return {
        "generated_at": utc_now(),
        "faculties_before": len(old_faculties), "faculties_after": len(new_faculties),
        "programs_before": len(old_programs), "programs_after": len(new_programs),
        "new_faculties": [new_faculties[key] for key in new_faculties.keys() - old_faculties.keys()],
        "new_programs": [{key: p.get(key) for key in ("id", "faculty_id", "name_ar", "name_en", "degree_level", "source_url_ar", "source_url_en")} for p in added],
        "removed_programs": [old_programs[key] for key in old_programs.keys() - new_programs.keys()],
        "renamed_faculties": [
            {"id": key, "before": old_faculties[key].get("name"), "after_ar": new_faculties[key].get("name_ar"), "after_en": new_faculties[key].get("name_en")}
            for key in old_faculties.keys() & new_faculties.keys()
            if old_faculties[key].get("name") != new_faculties[key].get("name_en") or not old_faculties[key].get("name_ar")
        ],
        "renamed_programs": [
            {"id": key, "before": old_programs[key].get("program_name"), "after_ar": new_programs[key].get("name_ar"), "after_en": new_programs[key].get("name_en")}
            for key in old_programs.keys() & new_programs.keys()
            if old_programs[key].get("program_name") != new_programs[key].get("name_en")
        ],
        "programs_with_arabic_names_added": sum(bool(p.get("name_ar")) and not old_programs.get(p["id"], {}).get("name_ar") for p in catalog["programs"]),
        "programs_with_english_names_added": sum(bool(p.get("name_en")) and not old_programs.get(p["id"], {}).get("name_en") for p in catalog["programs"]),
        "planner_supported_programs": sum(bool(p.get("planner_available")) for p in catalog["programs"]),
        "catalog_only_programs": sum(not p.get("planner_available") for p in catalog["programs"]),
        "unresolved_faculties": validation["checks"]["faculties_with_zero_programs"],
        "top_ten_faculties_by_new_programs": added_by_faculty.most_common(10),
    }


def write_reports(report_dir: Path, old_catalog: dict[str, Any], catalog: dict[str, Any], audit: dict[str, Any], validation: dict[str, Any], comparison: dict[str, Any]) -> None:
    report_dir.mkdir(parents=True, exist_ok=True)
    write_json(report_dir / "catalog_audit.json", audit)
    write_json(report_dir / "catalog_candidate.json", catalog)
    write_json(report_dir / "catalog_validation.json", validation)
    write_json(report_dir / "catalog_comparison.json", comparison)
    old_faculties = old_catalog.get("faculties", [])
    old_programs = old_catalog.get("programs", [])
    additional_supplier = read_json(ROOT / "web/data/additional_programs.json", {"programs": []}).get("programs", [])
    accounting_supplier = read_json(ROOT / "data/validated/kau_accounting.json", {})
    supplier_programs = list(additional_supplier) + ([accounting_supplier] if accounting_supplier else [])
    old_counts = Counter(p.get("faculty_id") for p in old_programs)
    official_counts = {key: item["official_count"] for key, item in audit["filter_audit"].items()}
    missing_urls = [p.get("id") for p in old_programs if not p.get("official_source_url")]
    existing_audit = {
        "generated_at": utc_now(),
        "faculties": len(old_faculties),
        "programs": len(old_programs),
        "faculties_with_zero_programs": [f.get("id") for f in old_faculties if not old_counts[f.get("id")]],
        "faculties_with_partial_program_data": [f.get("id") for f in old_faculties if old_counts[f.get("id")] < official_counts.get(f.get("id"), 0)],
        "duplicate_faculty_ids": duplicate_values(f.get("id") for f in old_faculties),
        "duplicate_program_ids": duplicate_values(p.get("id") for p in old_programs),
        "arabic_mode_english_only_faculties": [f.get("id") for f in old_faculties if not f.get("name_ar")],
        "arabic_mode_english_only_programs": [p.get("id") for p in old_programs if not p.get("name_ar") and not p.get("program_name_ar")],
        "english_mode_arabic_only_faculties": [f.get("id") for f in old_faculties if re.search(r"[\u0600-\u06ff]", f.get("name", ""))],
        "suspicious_faculty_labels": [f.get("name") for f in old_faculties if f.get("name") and (f.get("name").isupper() or "&" in f.get("name") or "-" in f.get("name"))],
        "missing_source_urls": missing_urls,
        "supplier_records_missing_source_urls": [p.get("id", "accounting") for p in supplier_programs if not p.get("official_source_url")],
        "degree_level_counts": dict(Counter(p.get("degree_level") or "missing" for p in old_programs)),
        "supplier_degree_level_counts": dict(Counter(p.get("degree_level") or "missing" for p in supplier_programs)),
        "catalog_status_counts": dict(Counter(p.get("catalog_status") or "missing" for p in old_programs)),
        "root_cause": "The previous file was a partial Bachelor/course-plan snapshot with no complete pagination or catalog-only extraction pipeline; it omitted postgraduate and unsupported-plan programs and had no bilingual display fields.",
    }
    write_json(report_dir / "existing_catalog_audit.json", existing_audit)
    counts = Counter(p["faculty_id"] for p in catalog["programs"])
    bachelors = Counter(p["faculty_id"] for p in catalog["programs"] if p["degree_level"] == "bachelor")
    postgraduates = Counter(p["faculty_id"] for p in catalog["programs"] if p["degree_level"] in {"master", "executive_master", "doctorate"})
    planner = Counter(p["faculty_id"] for p in catalog["programs"] if p.get("planner_available"))
    with (report_dir / "faculty_coverage.csv").open("w", encoding="utf-8", newline="") as handle:
        writer = csv.writer(handle, lineterminator="\n")
        writer.writerow(["official_label_ar", "official_label_en", "faculty_id", "faculty_source_url", "programs", "bachelors", "postgraduates", "planner_supported", "catalog_only", "extraction_status", "verification_notes"])
        for faculty in catalog["faculties"]:
            note = audit["unresolved_faculties"].get(faculty["id"], {})
            writer.writerow([
                faculty.get("official_filter_label_ar", faculty["name_ar"]), faculty.get("official_filter_label_en", faculty["name_en"]), faculty["id"], faculty["source_url_en"], counts[faculty["id"]],
                bachelors[faculty["id"]], postgraduates[faculty["id"]], planner[faculty["id"]], counts[faculty["id"]] - planner[faculty["id"]],
                note.get("status", "complete"), note.get("note_en", "Official central catalog and faculty filter reconciled."),
            ])
    summary = [
        "# KAU catalog validation summary", "",
        f"- Generated: {validation['generated_at']}",
        f"- Result: {'PASS' if validation['ok'] else 'FAIL'}",
        f"- Faculties: {len(catalog['faculties'])}",
        f"- Programs: {len(catalog['programs'])}",
        f"- Planner-supported: {comparison['planner_supported_programs']}",
        f"- Catalog-only: {comparison['catalog_only_programs']}",
        f"- Errors: {len(validation['errors'])}",
        f"- Warnings: {len(validation['warnings'])}", "",
        "## Errors", "", *(f"- {item}" for item in validation["errors"] or ["None"]), "",
        "## Warnings", "", *(f"- {item}" for item in validation["warnings"] or ["None"]), "",
        "## Before / after", "",
        f"- Faculties: {comparison['faculties_before']} -> {comparison['faculties_after']}",
        f"- Programs: {comparison['programs_before']} -> {comparison['programs_after']}",
    ]
    (report_dir / "catalog_validation.md").write_text("\n".join(summary) + "\n", encoding="utf-8")


def run(args: argparse.Namespace) -> int:
    catalog_path = ROOT / "web/data/faculty_catalog.json"
    old_catalog = read_json(catalog_path, {"faculties": [], "programs": []})
    extracted, audit = extract_catalog(args.cache_dir, refresh=args.refresh, delay=args.delay)
    old_catalog["_new_faculties"] = extracted["faculties"]
    programs, unmatched = merge_legacy(extracted["programs"], old_catalog)
    old_catalog.pop("_new_faculties", None)
    catalog = {
        "generated_at": utc_now(), "source": "King Abdulaziz University official website",
        "source_title": "King Abdulaziz University Official Academic Program Catalog",
        "official_source_url": f"{BASE_URL}/en/programs", "source_url_ar": f"{BASE_URL}/ar/programs",
        "source_url_en": f"{BASE_URL}/en/programs", "last_checked_date": datetime.now(timezone.utc).date().isoformat(),
        "scope_note": "Bilingual faculty and academic-program discovery catalog. Course-plan data is preserved separately and unchanged.",
        "official_central_program_count": audit["official_central_total"],
        "official_faculty_option_count": audit["official_faculty_option_total"],
        "faculties": extracted["faculties"], "programs": programs,
        "faculty_audit_notes": audit["unresolved_faculties"],
    }
    order = {faculty["id"]: index for index, faculty in enumerate(catalog["faculties"])}
    catalog["programs"].sort(key=lambda p: (order.get(p["faculty_id"], 999), p["degree_level"], p["name_en"].casefold(), p["id"]))
    validation = validate_catalog(catalog, old_catalog, audit, unmatched)
    comparison_baseline = read_json(args.baseline_catalog, old_catalog) if args.baseline_catalog else old_catalog
    comparison = build_comparison(comparison_baseline, catalog, validation)
    write_reports(args.report_dir, comparison_baseline, catalog, audit, validation, comparison)
    print(json.dumps({
        "ok": validation["ok"], "faculties": len(catalog["faculties"]), "programs": len(catalog["programs"]),
        "planner_supported": comparison["planner_supported_programs"], "catalog_only": comparison["catalog_only_programs"],
        "errors": validation["errors"], "warnings": validation["warnings"], "candidate": str(args.report_dir / "catalog_candidate.json"),
    }, ensure_ascii=False, indent=2))
    if not validation["ok"]:
        return 1
    if args.apply:
        timestamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
        backup = ROOT / "data/backups/catalog" / f"faculty_catalog.{timestamp}.json"
        backup.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(catalog_path, backup)
        write_json(catalog_path, catalog)
        print(f"Applied validated catalog; backup: {backup}")
    return 0


def parser() -> argparse.ArgumentParser:
    value = argparse.ArgumentParser(description=__doc__)
    mode = value.add_mutually_exclusive_group(required=True)
    mode.add_argument("--dry-run", action="store_true", help="fetch, compare, and report without changing the live catalog")
    mode.add_argument("--apply", action="store_true", help="apply only after validation succeeds and create a timestamped backup")
    value.add_argument("--refresh", action="store_true", help="refresh cached official pages")
    value.add_argument("--delay", type=float, default=0.6, help="delay between official requests in seconds")
    value.add_argument("--cache-dir", type=Path, default=ROOT / "data/raw/kau/catalog")
    value.add_argument("--report-dir", type=Path, default=ROOT / "reports/catalog")
    value.add_argument("--baseline-catalog", type=Path, help="optional pre-refresh catalog used for before/after reporting")
    return value


def main() -> int:
    return run(parser().parse_args())


if __name__ == "__main__":
    raise SystemExit(main())
