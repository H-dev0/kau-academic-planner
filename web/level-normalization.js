(function initLevelNormalization(root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.KAULevels = api;
}(typeof globalThis !== "undefined" ? globalThis : this, function levelNormalizationFactory() {
  "use strict";

  const ARABIC_LEVEL_NAMES = [
    null,
    "المستوى الأول",
    "المستوى الثاني",
    "المستوى الثالث",
    "المستوى الرابع",
    "المستوى الخامس",
    "المستوى السادس",
    "المستوى السابع",
    "المستوى الثامن",
    "المستوى التاسع",
    "المستوى العاشر",
    "المستوى الحادي عشر",
    "المستوى الثاني عشر",
  ];

  const ENGLISH_LEVEL_NAMES = [
    null,
    "Level One",
    "Level Two",
    "Level Three",
    "Level Four",
    "Level Five",
    "Level Six",
    "Level Seven",
    "Level Eight",
    "Level Nine",
    "Level Ten",
    "Level Eleven",
    "Level Twelve",
  ];

  const ENGLISH_ORDINALS = new Map([
    ["one", 1], ["first", 1],
    ["two", 2], ["second", 2],
    ["three", 3], ["third", 3],
    ["four", 4], ["fourth", 4], ["forth", 4],
    ["five", 5], ["fifth", 5],
    ["six", 6], ["sixth", 6],
    ["seven", 7], ["seventh", 7],
    ["eight", 8], ["eighth", 8],
    ["nine", 9], ["ninth", 9],
    ["ten", 10], ["tenth", 10],
    ["eleven", 11], ["eleventh", 11],
    ["twelve", 12], ["twelfth", 12],
  ]);

  const ARABIC_ORDINALS = new Map([
    ["الاول", 1], ["الاولى", 1], ["اول", 1], ["اولى", 1],
    ["الثاني", 2], ["الثانية", 2], ["ثاني", 2], ["ثانية", 2],
    ["الثالث", 3], ["الثالثة", 3], ["ثالث", 3], ["ثالثة", 3],
    ["الرابع", 4], ["الرابعة", 4], ["رابع", 4], ["رابعة", 4],
    ["الخامس", 5], ["الخامسة", 5], ["خامس", 5], ["خامسة", 5],
    ["السادس", 6], ["السادسة", 6], ["سادس", 6], ["سادسة", 6],
    ["السابع", 7], ["السابعة", 7], ["سابع", 7], ["سابعة", 7],
    ["الثامن", 8], ["الثامنة", 8], ["ثامن", 8], ["ثامنة", 8],
    ["التاسع", 9], ["التاسعة", 9], ["تاسع", 9], ["تاسعة", 9],
    ["العاشر", 10], ["العاشرة", 10], ["عاشر", 10], ["عاشرة", 10],
    ["الحادي عشر", 11], ["الحادية عشرة", 11], ["حادي عشر", 11], ["حادية عشرة", 11],
    ["الثاني عشر", 12], ["الثانية عشرة", 12], ["ثاني عشر", 12], ["ثانية عشرة", 12],
  ]);

  function clean(value) {
    return String(value ?? "")
      .normalize("NFKC")
      .replace(/\u00a0/g, " ")
      .replace(/[\u0640\u064b-\u065f\u0670]/gu, "")
      .replace(/[٠-٩]/g, (digit) => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit)))
      .replace(/[۰-۹]/g, (digit) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit)))
      .replace(/[أإآٱ]/gu, "ا")
      .replace(/[ـ_–—-]+/gu, " ")
      .replace(/\s+/gu, " ")
      .trim()
      .toLocaleLowerCase("en");
  }

  function validLevelId(value) {
    return Number.isInteger(value) && value >= 1 && value <= 12;
  }

  function numericMatch(value) {
    const match = value.match(/^(?:semester\s*\/\s*level|level|semester)\s*(?:no\.?\s*)?(\d{1,2})(?:st|nd|rd|th)?(?:\b|\s|\()/iu)
      || value.match(/^(?:الفصل\s*\/\s*)?(?:المستوى|المستوي|الفصل(?: الدراسي)?)\s*(\d{1,2})(?:\b|\s|\()/u);
    if (!match) return null;
    const id = Number(match[1]);
    return validLevelId(id) ? id : null;
  }

  function parseEnglish(value) {
    const composite = value.match(/^([a-z]+)\s+(?:level|semester)\s+([a-z]+)\s+year$/iu);
    if (composite) {
      const term = ENGLISH_ORDINALS.get(composite[1]);
      const year = ENGLISH_ORDINALS.get(composite[2]);
      const id = term && year && term <= 2 ? ((year - 1) * 2) + term : null;
      return validLevelId(id) ? id : null;
    }
    const leading = value.match(/^(?:level|semester|year)\s+([a-z]+)(?:\b|\s|\()/iu);
    if (leading) return ENGLISH_ORDINALS.get(leading[1]) || null;
    const trailing = value.match(/^([a-z]+)\s+(?:level|semester|year)(?:\b|\s|\()/iu);
    return trailing ? (ENGLISH_ORDINALS.get(trailing[1]) || null) : null;
  }

  function parseArabic(value) {
    const composite = value.match(/^(?:الفصل\s*\/\s*)?(?:المستوى|المستوي|الفصل(?: الدراسي)?)\s+(.+?)\s+(?:السنه|السنة)\s+(.+)$/u);
    if (composite) {
      const term = ARABIC_ORDINALS.get(composite[1]);
      const year = ARABIC_ORDINALS.get(composite[2]);
      const id = term && year && term <= 2 ? ((year - 1) * 2) + term : null;
      return validLevelId(id) ? id : null;
    }
    const match = value.match(/^(?:الفصل\s*\/\s*)?(?:المستوى|المستوي|الفصل(?: الدراسي)?|السنه|السنة)\s+(.+)$/u);
    if (!match) return null;
    const remainder = match[1];
    for (const [ordinal, id] of [...ARABIC_ORDINALS].sort((left, right) => right[0].length - left[0].length)) {
      if (remainder === ordinal || remainder.startsWith(`${ordinal} `) || remainder.startsWith(`${ordinal}(`)) return id;
    }
    return null;
  }

  function parseLevelId(label) {
    const value = clean(label);
    if (!value) return null;
    return numericMatch(value) || parseEnglish(value) || parseArabic(value);
  }

  function localizedLevelName(levelId, locale) {
    if (!validLevelId(levelId)) throw new Error(`unknown level ID: ${levelId}`);
    return locale === "ar" ? ARABIC_LEVEL_NAMES[levelId] : ENGLISH_LEVEL_NAMES[levelId];
  }

  function internalLevelKey(levelId) {
    if (!validLevelId(levelId)) throw new Error(`unknown level ID: ${levelId}`);
    return `level ${levelId}`;
  }

  function normalizeLevelPair(sourceLabelAr, sourceLabelEn) {
    const arId = parseLevelId(sourceLabelAr);
    const enId = parseLevelId(sourceLabelEn);
    if (arId && enId && arId !== enId) {
      throw new Error(`Arabic/English level identity mismatch: ${sourceLabelAr} / ${sourceLabelEn}`);
    }
    const levelId = arId || enId;
    if (!levelId) {
      throw new Error(`unknown official level label: ${sourceLabelAr || "—"} / ${sourceLabelEn || "—"}`);
    }
    return {
      level_id: levelId,
      level_key: internalLevelKey(levelId),
      title_ar: localizedLevelName(levelId, "ar"),
      title_en: localizedLevelName(levelId, "en"),
      source_label_ar: sourceLabelAr || null,
      source_label_en: sourceLabelEn || null,
      source_label_ar_parsed: arId,
      source_label_en_parsed: enId,
    };
  }

  function courseLevelId(course) {
    if (validLevelId(course?.level_id)) return course.level_id;
    const candidates = [
      course?.semester_or_level_ar,
      course?.semester_or_level_en,
      course?.semester_or_level,
    ].map(parseLevelId).filter(Boolean);
    if (!candidates.length) return null;
    if (new Set(candidates).size !== 1) throw new Error("course level labels disagree");
    return candidates[0];
  }

  function compareLevels(left, right) {
    const leftId = typeof left === "number" ? left : parseLevelId(left);
    const rightId = typeof right === "number" ? right : parseLevelId(right);
    if (!leftId || !rightId) throw new Error(`cannot sort unknown levels: ${left} / ${right}`);
    return leftId - rightId;
  }

  function validateLevelSequence(levels) {
    const ids = levels.map((level) => (
      validLevelId(level?.level_id)
        ? level.level_id
        : parseLevelId(level?.title_ar || level?.title_en || level?.semester_or_level || level)
    ));
    if (ids.some((id) => !id)) throw new Error("unknown level label in sequence");
    if (new Set(ids).size !== ids.length) throw new Error("duplicate level ID");
    for (let index = 1; index < ids.length; index += 1) {
      if (ids[index] <= ids[index - 1]) throw new Error("non-monotonic level order");
    }
    return ids;
  }

  return {
    ARABIC_LEVEL_NAMES,
    ENGLISH_LEVEL_NAMES,
    clean,
    compareLevels,
    courseLevelId,
    internalLevelKey,
    localizedLevelName,
    normalizeLevelPair,
    parseLevelId,
    validLevelId,
    validateLevelSequence,
  };
}));
