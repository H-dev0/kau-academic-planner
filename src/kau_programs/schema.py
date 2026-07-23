from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any


@dataclass(frozen=True)
class Course:
    semester_or_level: str | None
    course_code: str | None
    official_course_name: str | None
    credit_hours: int | None
    prerequisites: list[str] = field(default_factory=list)
    corequisites: list[str] = field(default_factory=list)
    official_source_url: str | None = None
    source_title: str | None = None
    last_checked_date: str | None = None
    counts_toward_program_credit_total: bool | None = None
    credit_total_exclusion_reason: str | None = None

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> "Course":
        return cls(
            semester_or_level=data.get("semester_or_level"),
            course_code=data.get("course_code"),
            official_course_name=data.get("official_course_name"),
            credit_hours=data.get("credit_hours"),
            prerequisites=list(data.get("prerequisites") or []),
            corequisites=list(data.get("corequisites") or []),
            official_source_url=data.get("official_source_url"),
            source_title=data.get("source_title"),
            last_checked_date=data.get("last_checked_date"),
            counts_toward_program_credit_total=data.get(
                "counts_toward_program_credit_total"
            ),
            credit_total_exclusion_reason=data.get("credit_total_exclusion_reason"),
        )


@dataclass(frozen=True)
class ElectiveGroup:
    id: str
    name_ar: str
    name_en: str
    option_course_codes: list[str]
    required: bool
    required_course_count: int | None
    required_credit_hours: int | None
    maximum_course_count: int | None
    semester_or_level: str | None
    classification: str

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> "ElectiveGroup":
        return cls(
            id=data.get("id"),
            name_ar=data.get("name_ar"),
            name_en=data.get("name_en"),
            option_course_codes=list(data.get("option_course_codes") or []),
            required=data.get("required"),
            required_course_count=data.get("required_course_count"),
            required_credit_hours=data.get("required_credit_hours"),
            maximum_course_count=data.get("maximum_course_count"),
            semester_or_level=data.get("semester_or_level"),
            classification=data.get("classification"),
        )


@dataclass(frozen=True)
class Program:
    university_name: str | None
    college_name: str | None
    program_name: str | None
    degree_level: str | None
    total_program_credit_hours: int | None
    official_source_url: str | None
    source_title: str | None
    last_checked_date: str | None
    courses: list[Course]
    planner_schema_version: int | None = None
    elective_groups: list[ElectiveGroup] = field(default_factory=list)

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> "Program":
        return cls(
            university_name=data.get("university_name"),
            college_name=data.get("college_name"),
            program_name=data.get("program_name"),
            degree_level=data.get("degree_level"),
            total_program_credit_hours=data.get("total_program_credit_hours"),
            official_source_url=data.get("official_source_url"),
            source_title=data.get("source_title"),
            last_checked_date=data.get("last_checked_date"),
            courses=[Course.from_dict(item) for item in data.get("courses", [])],
            planner_schema_version=data.get("planner_schema_version"),
            elective_groups=[
                ElectiveGroup.from_dict(item) for item in data.get("elective_groups", [])
            ],
        )
