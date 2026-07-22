from __future__ import annotations

from copy import deepcopy


def synthetic_program() -> dict:
    source = "https://example.edu/official-synthetic-plan"
    courses = []
    specs = [
        ("SYN 100", 3, []),
        ("SYN 101", 3, []), ("SYN 102", 3, []),
        ("SYN 201", 3, []), ("SYN 202", 3, []), ("SYN 203", 3, []),
        ("SYN 301", 2, []), ("SYN 302", 4, []), ("SYN 303", 5, []),
        ("SYN 401", 3, []), ("SYN 402", 3, []),
        ("SYN 411", 3, []), ("SYN 412", 3, []),
        ("SYN 501", 3, ["SYN 100"]), ("SYN 502", 3, []),
        ("SYN 601", 1, []), ("SYN 602", 1, []),
    ]
    for code, credits, prerequisites in specs:
        courses.append({
            "semester_or_level": "Synthetic Level",
            "course_code": code,
            "official_course_name": f"Synthetic {code}",
            "course_name_ar": f"مقرر تجريبي {code}",
            "course_name_en": f"Synthetic {code}",
            "credit_hours": credits,
            "prerequisites": prerequisites,
            "corequisites": [],
            "official_source_url": source,
            "source_title": "Synthetic test fixture",
            "last_checked_date": "2026-07-22",
        })
    return {
        "id": "synthetic-elective-program",
        "university_name": "Synthetic University",
        "college_name": "Synthetic College",
        "program_name": "Synthetic Elective Program",
        "degree_level": "Synthetic",
        "total_program_credit_hours": 25,
        "official_source_url": source,
        "source_title": "Synthetic test fixture",
        "last_checked_date": "2026-07-22",
        "planner_schema_version": 2,
        "courses": courses,
        "elective_groups": [
            {
                "id": "choose-one",
                "name_ar": "اختر مقرراً واحداً",
                "name_en": "Choose one",
                "option_course_codes": ["SYN 101", "SYN 102"],
                "required": True,
                "required_course_count": 1,
                "required_credit_hours": 3,
                "maximum_course_count": 1,
                "semester_or_level": "Synthetic Level",
                "classification": "general",
            },
            {
                "id": "choose-two",
                "name_ar": "اختر مقررين",
                "name_en": "Choose two",
                "option_course_codes": ["SYN 201", "SYN 202", "SYN 203"],
                "required": True,
                "required_course_count": 2,
                "required_credit_hours": 6,
                "maximum_course_count": 2,
                "semester_or_level": "Synthetic Level",
                "classification": "general",
            },
            {
                "id": "credit-based",
                "name_ar": "مجموعة بالساعات",
                "name_en": "Credit-based group",
                "option_course_codes": ["SYN 301", "SYN 302", "SYN 303"],
                "required": True,
                "required_course_count": None,
                "required_credit_hours": 5,
                "maximum_course_count": 2,
                "semester_or_level": None,
                "classification": "general",
            },
            {
                "id": "internal",
                "name_ar": "اختياري داخلي",
                "name_en": "Internal elective",
                "option_course_codes": ["SYN 401", "SYN 402"],
                "required": True,
                "required_course_count": 1,
                "required_credit_hours": 3,
                "maximum_course_count": 1,
                "semester_or_level": "Synthetic Level",
                "classification": "internal",
            },
            {
                "id": "external",
                "name_ar": "اختياري خارجي",
                "name_en": "External elective",
                "option_course_codes": ["SYN 411", "SYN 412"],
                "required": True,
                "required_course_count": 1,
                "required_credit_hours": 3,
                "maximum_course_count": 1,
                "semester_or_level": "Synthetic Level",
                "classification": "external",
            },
            {
                "id": "with-prerequisite",
                "name_ar": "اختياري بمتطلب",
                "name_en": "Elective with prerequisite",
                "option_course_codes": ["SYN 501", "SYN 502"],
                "required": True,
                "required_course_count": 1,
                "required_credit_hours": 3,
                "maximum_course_count": 1,
                "semester_or_level": "Synthetic Level",
                "classification": "general",
            },
            {
                "id": "optional",
                "name_ar": "مجموعة اختيارية",
                "name_en": "Optional group",
                "option_course_codes": ["SYN 601", "SYN 602"],
                "required": False,
                "required_course_count": None,
                "required_credit_hours": None,
                "maximum_course_count": 1,
                "semester_or_level": "Synthetic Level",
                "classification": "general",
            },
        ],
    }


def fixture_copy() -> dict:
    return deepcopy(synthetic_program())
