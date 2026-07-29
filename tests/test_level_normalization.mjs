import assert from "node:assert/strict";
import test from "node:test";

import levels from "../web/level-normalization.js";

test("normalizes Arabic ordinal level labels through twelve", () => {
  const labels = [
    "المستوى الأول", "المستوى الثاني", "المستوى الثالث", "المستوى الرابع",
    "المستوى الخامس", "المستوى السادس", "المستوى السابع", "المستوى الثامن",
    "المستوى التاسع", "المستوى العاشر", "المستوى الحادي عشر", "المستوى الثاني عشر",
  ];
  assert.deepEqual(labels.map(levels.parseLevelId), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
});

test("normalizes English ordinal, numeric, semester, and composite labels", () => {
  assert.equal(levels.parseLevelId("Level One"), 1);
  assert.equal(levels.parseLevelId("Seventh Level"), 7);
  assert.equal(levels.parseLevelId("Level 10"), 10);
  assert.equal(levels.parseLevelId("Semester/Level 3 (Total Credit Hours 15 hrs)"), 3);
  assert.equal(levels.parseLevelId("First Level - Fifth Year"), 9);
  assert.equal(levels.parseLevelId("المستوى الثاني - السنة الخامسة"), 10);
});

test("sorts numerically and renders canonical bilingual names", () => {
  const ids = [7, 2, 10, 1].sort(levels.compareLevels);
  assert.deepEqual(ids, [1, 2, 7, 10]);
  assert.equal(levels.localizedLevelName(1, "en"), "Level One");
  assert.equal(levels.localizedLevelName(7, "en"), "Level Seven");
  assert.equal(levels.localizedLevelName(12, "ar"), "المستوى الثاني عشر");
});

test("rejects malformed labels, duplicates, non-monotonic order, and bilingual disagreement", () => {
  assert.equal(levels.parseLevelId("Level"), null);
  assert.equal(levels.parseLevelId("source-tab-72"), null);
  assert.throws(() => levels.normalizeLevelPair("المستوى الأول", "Level Two"), /mismatch/);
  assert.throws(() => levels.validateLevelSequence([{ level_id: 1 }, { level_id: 1 }]), /duplicate/);
  assert.throws(() => levels.validateLevelSequence([{ level_id: 2 }, { level_id: 1 }]), /non-monotonic/);
});
