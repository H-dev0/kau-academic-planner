from __future__ import annotations

import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


class InitialSelectorLoadingTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.app = (ROOT / "web/app.js").read_text(encoding="utf-8")
        start_at = cls.app.index("async function start()")
        end_at = cls.app.index("start().catch", start_at)
        cls.start = cls.app[start_at:end_at]

    def test_arabic_and_english_placeholders_are_available_immediately(self) -> None:
        self.assertIn('chooseFaculty: "اختر الكلية"', self.app)
        self.assertIn('chooseMajor: "اختر التخصص"', self.app)
        self.assertIn('chooseFacultyFirst: "اختر الكلية أولاً"', self.app)
        self.assertIn('chooseFaculty: "Choose a Faculty"', self.app)
        self.assertIn('chooseMajor: "Choose a Major"', self.app)
        self.assertIn('chooseFacultyFirst: "Choose a Faculty first"', self.app)

        initial_faculty_setup = self.start.index("setupFacultySelect();")
        initial_major_setup = self.start.index("setupMajorSelect();")
        registry_request = self.start.index('await api("/api/programs")')
        self.assertLess(initial_faculty_setup, registry_request)
        self.assertLess(initial_major_setup, registry_request)

    def test_registry_populates_selectors_without_waiting_for_program_details(self) -> None:
        summary_insert = self.start.index(
            "state.programs.set(summary.id, { ...summary, courses: [] });"
        )
        populated_faculty_setup = self.start.index("setupFacultySelect();", summary_insert)
        populated_major_setup = self.start.index("setupMajorSelect();", summary_insert)
        self.assertLess(summary_insert, populated_faculty_setup)
        self.assertLess(summary_insert, populated_major_setup)
        self.assertNotIn("/api/program?major=", self.start)
        self.assertNotIn("setTimeout(", self.start)

    def test_program_details_load_only_after_major_selection(self) -> None:
        loader_at = self.app.index("async function loadProgramDetails(majorId)")
        chooser_at = self.app.index("async function chooseMajor(majorId)")
        chooser_end = self.app.index('majorSelect.addEventListener("change"', chooser_at)
        chooser = self.app[chooser_at:chooser_end]

        self.assertLess(loader_at, chooser_at)
        self.assertIn("program = await loadProgramDetails(majorId);", chooser)
        self.assertIn("if (state.major !== requestedMajor) return;", chooser)
        self.assertIn("state.programDetailRequests.has(majorId)", self.app)
        self.assertIn("state.programDetailRequests.delete(majorId)", self.app)

    def test_language_switch_refreshes_even_before_registry_arrives(self) -> None:
        refresh_at = self.app.index("function refreshSelectLanguageText()")
        refresh_end = self.app.index("function applyUiLanguage", refresh_at)
        refresh = self.app[refresh_at:refresh_end]

        self.assertIn("setupFacultySelect();", refresh)
        self.assertIn("setupMajorSelect();", refresh)
        self.assertNotIn("!state.faculties.length", refresh)


if __name__ == "__main__":
    unittest.main()
