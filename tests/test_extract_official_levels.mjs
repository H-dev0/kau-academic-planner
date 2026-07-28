import assert from "node:assert/strict";
import test from "node:test";

import {
  clean,
  extractEmbeddedLevelTables,
  parseCredits,
  summarizeLevels,
} from "../scripts/extract-official-levels.mjs";

test("normalizes rendered text without losing prerequisite line breaks", () => {
  assert.equal(clean("  CLAN 335 \n  CLAN 325  "), "CLAN 335\nCLAN 325");
});

test("parses only exact integer credits including Arabic digits", () => {
  assert.equal(parseCredits("٣"), 3);
  assert.equal(parseCredits(" 12 "), 12);
  assert.equal(parseCredits("–"), null);
  assert.equal(parseCredits("3+0"), null);
});

test("summarizes exact levels, rows, credits, and missing values", () => {
  const summary = summarizeLevels([
    {
      official_level_name: "المستوى الأول",
      rows: [
        { course_code: "A 101", course_name: "Course A", credits: 3 },
        { course_code: "B 101", course_name: "Course B", credits: null },
      ],
    },
  ]);
  assert.equal(summary.level_count, 1);
  assert.equal(summary.row_count, 2);
  assert.equal(summary.credit_sum, 3);
  assert.deepEqual(summary.issues, ["one or more credit values are not exact integers"]);
});

test("extracts exact official rows from embedded KAU studyPlan data", () => {
  const studyPlan = [{
    name: "Levels",
    has_levels: true,
    levels: [{
      name: "Level 1 (15)",
      courses: [{
        code: "TEST 101",
        name: "Published course",
        credit_hours: 3,
        prerequisites: "TEST 100",
      }],
    }],
  }];
  const chunk = `0:{"studyPlan":${JSON.stringify(studyPlan)}}`;
  const html = `<script>self.__next_f.push([1,${JSON.stringify(chunk)}])</script>`;

  assert.deepEqual(extractEmbeddedLevelTables(html), [{
    official_level_name: "Level 1 (15)",
    source_level_order: 1,
    headers: ["Course Code", "Course", "Credits", "Prerequisites"],
    rows: [{
      course_code: "TEST 101",
      course_name: "Published course",
      credits: 3,
      credits_text: "3",
      prerequisite_text: "TEST 100",
      source_order: 1,
      source_cells: ["TEST 101", "Published course", "3", "TEST 100"],
    }],
  }]);
});
