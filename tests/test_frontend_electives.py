from __future__ import annotations

import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


class FrontendElectiveStaticTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.app = (ROOT / "web/app.js").read_text(encoding="utf-8")
        cls.html = (ROOT / "web/index.html").read_text(encoding="utf-8")
        cls.css = (ROOT / "web/styles.css").read_text(encoding="utf-8")

    def test_local_storage_key_is_unchanged(self) -> None:
        self.assertIn('const localProgressPrefix = "kau-planner-local-progress";', self.app)
        self.assertIn('`${localProgressPrefix}:${major}`', self.app)
        self.assertIn("state.selected.clear();\n  state.electiveSelections = {};", self.app)

    def test_semantic_selection_and_completion_controls_exist(self) -> None:
        self.assertIn("document.createElement(\"fieldset\")", self.app)
        self.assertIn("document.createElement(\"legend\")", self.app)
        self.assertIn('choose.type = group.maximum_course_count === 1 ? "radio" : "checkbox"', self.app)
        self.assertIn('complete.type = "checkbox"', self.app)
        self.assertIn('id="electiveGroups"', self.html)
        self.assertIn("renderChecklist(plan);\n  renderElectiveGroups(plan);", self.app)
        self.assertNotIn("renderChecklist();\n  renderElectiveGroups(plan);", self.app)

    def test_bilingual_rtl_ltr_and_classification_labels_exist(self) -> None:
        for text in ("Select", "اختيار", "Completed", "مجتاز", "Internal", "داخلي", "External", "خارجي"):
            self.assertIn(text, self.app)
        self.assertIn('dir="rtl"', self.html)
        self.assertIn("document.documentElement.dir = text.dir", self.app)

    def test_responsive_styles_use_existing_theme_variables(self) -> None:
        self.assertIn(".electiveOptionRow", self.css)
        self.assertIn("@media (max-width: 700px)", self.css)
        self.assertIn("var(--color-surface)", self.css)
        self.assertIn("var(--color-border)", self.css)
        self.assertNotIn("#fff; /* elective", self.css)

    def test_total_courses_metric_still_uses_all_course_records(self) -> None:
        self.assertIn("if (totalCourseCount) totalCourseCount.textContent = total;", self.app)
        self.assertIn('id="totalCourseCount"', self.html)


if __name__ == "__main__":
    unittest.main()
