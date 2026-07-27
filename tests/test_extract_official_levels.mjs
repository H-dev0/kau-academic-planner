import assert from "node:assert/strict";
import test from "node:test";

import { clean, parseCredits, summarizeLevels } from "../scripts/extract-official-levels.mjs";

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
