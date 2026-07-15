from __future__ import annotations

import unittest

from kau_programs.kau_accounting import parse_program_from_html


class KauAccountingParserTests(unittest.TestCase):
    def test_parse_saved_next_study_plan_payload(self) -> None:
        html = (
            '<script>self.__next_f.push([1,"46:[\\"$\\",\\"$L49\\",null,'
            '{\\"studyPlan\\":[{\\"id\\":1902,\\"name\\":\\"Program Requirements\\",'
            '\\"description\\":\\"Graduation requirements stipulate the completion '
            "of the entire study plan and the successful passing of all courses, "
            'totaling 125 credit hours.\\",\\"has_levels\\":false,\\"levels\\":[],'
            '\\"courses\\":[]},{\\"id\\":1903,\\"name\\":\\"Levels\\",'
            '\\"description\\":null,\\"has_levels\\":true,\\"levels\\":[{'
            '\\"id\\":2159,\\"name\\":\\"level 1\\",\\"description\\":null,'
            '\\"courses\\":[{\\"id\\":12552,\\"name\\":\\"English Language 1\\",'
            '\\"description\\":null,\\"hide_course_description\\":false,'
            '\\"code\\":\\"ELIS 110\\",\\"prerequisites\\":null,'
            '\\"credit_hours\\":0,\\"level_id\\":2159}],\\"children\\":[]}],'
            '\\"courses\\":[]}]}]\\n"])</script>'
        )

        program = parse_program_from_html(html, last_checked_date="2026-07-05")

        self.assertEqual(program.total_program_credit_hours, 125)
        self.assertEqual(len(program.courses), 1)
        self.assertEqual(program.courses[0].semester_or_level, "level 1")
        self.assertEqual(program.courses[0].course_code, "ELIS 110")
        self.assertIsNone(program.courses[0].credit_hours)


if __name__ == "__main__":
    unittest.main()
