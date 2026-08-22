#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const catalogPath = path.join(root, "web/data/faculty_catalog.json");
const plannersPath = path.join(root, "web/data/additional_programs.json");
const checkedDate = "2026-08-18";
const retrievedAt = "2026-08-18T00:00:00+03:00";

const warning = (code, messageAr, messageEn, count = null) => ({
  code,
  message_ar: messageAr,
  message_en: messageEn,
  count,
});

const programs = [
  {
    id: "catalog-architecture-and-planning-bachelor-of-urban-and-regional-planning",
    slug: "bachelor-of-urban-and-regional-planning",
    code: "BS-URRP-AP",
    nameAr: "بكالوريوس التخطيط الحضري والإقليمي",
    nameEn: "Bachelor of Urban and Regional Planning",
    sourceAr: "https://kau.edu.sa/ar/programs/bachelor-of-urban-and-regional-planning",
    sourceEn: "https://kau.edu.sa/en/programs/bachelor-of-urban-and-regional-planning",
    officialTotal: 165,
    unresolvedByCode: {
      "URP 204": "URP 233",
      "URP 305": "Studio 6",
      "URP 407": "URP 366",
      "URP 408": "URP 477",
    },
    levels: [
      [
        ["AR 190", "استوديو الأساسيات1", "Foundation Studio 1", 3, null],
        ["Math 101", "رياضيات 1", "Math 1", 3, null],
        ["STAT 101", "إحصاء 1", "Statistics 1", 3, null],
        ["ELIS 111", "إنجليزي 1", "English Language 1", 3, null],
      ],
      [
        ["AR 191", "استديو الأساسيات 2", "Foundation Studio 2", 3, "AR 190"],
        ["PHYS 101", "فيزياء 1", "Physics 1", 3, null],
        ["CPIT 101", "مهارات الحاسوب العامة", "General Comp. Skills", 3, null],
        ["ELIS 113", "اللغة الإنجليزية 3", "English (3) for AP", 3, null],
      ],
      [
        ["URP 101", "استديو 3", "Studio 3", 7, "AR 191"],
        ["AR 110", "التمثيل والتصور المعماري (1)", "Arch. Represent. & Visualiz. I", 3, null],
        ["URP 114", "مدخل إلى التخطيط الحضري", "Intro. to Urban Planning", 2, null],
        ["LA 181", "مدخل إلى التصميم البيئي", "Introduction to Environmental Design", 2, null],
        ["GEOM 104", "أساسيات نظم المعلومات الجغرافية", "Fundamentals of GIS", 2, null],
      ],
      [
        ["URP 102", "استديو 4", "Studio 4", 7, "URP 101"],
        ["AR111", "التمثيل والتصور المعماري (2)", "Arch. Represent. & Visualiz. II", 2, "AR 110"],
        ["URP 135", "التصميم الحضري", "Urban Design", 3, null],
        ["LA 121", "تحليل الموقع والتخطيط", "Site Analysis & Planning", 3, null],
        ["Geom 105", "المساحة للدراسات البيئية", "Surveying for Environmental Studies", 3, null],
      ],
      [
        ["URP 203", "استديو 5", "Studio 5", 7, "URP 114"],
        ["URP 281", "مناهج وأساليب البحث", "Research Methods & Techniques", 2, null],
        ["URP 214", "نظم المعلومات المكانية", "Spatial Information System", 2, null],
        ["ARAB 101", "اللغة العربية 1", "Arabic I", 3, null],
        ["URP 215", "عملية التخطيط ونظرياته", "Planning Process & Theory", 3, null],
        ["ISLS 101", "الدراسات الإسلامية 1", "Islamic Studies I", 2, null],
      ],
      [
        ["URP 204", "استديو 6", "Studio 6", 7, "URP 233"],
        ["URP 251", "تخطيط النقل الحضري", "Urban Transportation Planning", 2, null],
        ["URP 242", "تخطيط الإسكان والمجتمعات", "Housing & Community Planning", 2, null],
        ["ARAB 201", "اللغة العربية 2", "Arabic II", 3, "ARAB 101"],
        ["URP 262", "تخطيط استخدامات الأراضي الحضرية", "Urban Land Use Planning", 2, null],
        ["ISLS 201", "الدراسات الإسلامية 2", "Islamic Studies II", 2, "ISLS 101"],
      ],
      [
        ["URP 305", "استديو 7", "Studio 7", 7, "Studio 6"],
        ["URP 371", "التخطيط الإقليمي", "Regional Planning", 2, null],
        ["URP 391", "البنية التحتية الحضرية", "Urban Infrastructure", 2, null],
        ["ISLS 301", "الدراسات الإسلامية 3", "Islamic Studies III", 2, "ISLS 201"],
        ["URP 322", "الاقتصاد الحضري", "Urban Economics", 2, null],
        ["ELECTIVE", "مقرر اختياري", "Elective", 3, null],
      ],
      [
        ["URP 306", "استديو 8", "Studio 8", 7, "URP 305"],
        ["URP 362", "التنمية الحضرية المستدامة", "Sustainable Urban Development", 2, null],
        ["URP 325", "تنمية الأراضي الحضرية", "Urban Land Development", 2, null],
        ["ISLS 401", "الدراسات الإسلامية 4", "Islamic Studies IV", 3, "ISLS 301"],
        ["KAU", "مقرر حر", "Free Course", 2, null],
        ["ELECTIVE", "مقرر اختياري", "Elective", 3, null],
      ],
      [
        ["URP 407", "استديو 9", "Studio 9", 7, "URP 366"],
        ["URP484", "متطلبات مهارات سوق العمل", "Market Skills Requirments", 3, null],
        ["ELECTIVE", "مقرر اختياري", "Elective", 3, null],
        ["ELECTIVE", "مقرر اختياري", "Elective", 3, null],
        ["KAU", "مقرر حر", "Free Course", 2, null],
      ],
      [
        ["URP 408", "استديو 10", "Studio 10", 7, "URP 477"],
        ["URP 486", "بحث مشروع التخرج", "Grad. Project Research", 3, null],
        ["URP 487", "قانون التخطيط والحوكمة", "Planning Law and Governance", 2, null],
        ["ELECTIVE", "مقرر اختياري", "Elective", 3, null],
        ["KAU", "مقرر حر", "Free Course", 2, null],
      ],
    ],
  },
  {
    id: "catalog-architecture-and-planning-bachelor-of-geomatics",
    slug: "bachelor-of-geomatics",
    code: "BS-GEOM-AP",
    nameAr: "بكالوريوس الجيوماتكس",
    nameEn: "Bachelor of Geomatics",
    sourceAr: "https://kau.edu.sa/ar/programs/bachelor-of-geomatics",
    sourceEn: "https://kau.edu.sa/en/programs/bachelor-of-geomatics",
    officialTotal: null,
    unresolvedByCode: {
      "ISLS 103": "ISLS201",
      "ISLS 104": "ISLS301",
    },
    levels: [
      [
        ["AR 180", "مرسم تأسيسي 1", "Foundation Studio 1", 3, null],
        ["Math 110", "رياضيات", "Math", 3, null],
        ["PHYS 110", "فيزياء عامة 1", "General Physics 1", 3, null],
        ["ELIS 101", "اللغة الانجليزية (1)", "English Language (1)", 3, null],
      ],
      [
        ["AR 181", "مرسم تأسيسي 2", "Foundation Studio 2", 3, "AR180"],
        ["STAT 110", "إحصاء", "Statistics 1", 3, null],
        ["CPIT 110", "البرمجة وحل المشكلات", "Programming & Solving Problems", 3, null],
        ["ELIS 102", "اللغة الانجليزية (2)", "English Language (2)", 3, "ELIS 101"],
      ],
      [
        ["GEOM 191", "مرسم 3 : الرسم الرقمى", "Studio 3: Digital Drafting", 7, null],
        ["LA 120", "تحليل وتخطيط الموقع", "Site Analysis & Planning", 3, "AR181"],
        ["GEOM 120", "اساسيات نظم المعلومات الجغرافية", "Fundamentals of GIS", 2, null],
        ["AR 110", "التمثيل والتصور المعماري (1)", "Arch. Represent. & Visualiz. I", 3, null],
        ["URP 114", "مدخل إلى التخطيط الحضري", "Intro. to Urban Planning", 2, null],
      ],
      [
        ["GEOM 192", "مرسم 4 : رسم الخرائط", "Studio 4: Mapping", 7, "GEOM191"],
        ["GEOM 140", "اساسيات المساحة", "Fundamentals of  Surveying", 3, null],
        ["AR 111", "إظهار معماري 2", "Architectural Representation II", 2, "AR110"],
        ["URP 135", "التصميم الحضري", "Urban Design", 3, null],
        ["LA 180", "مقدمة للتصميم البيئي", "Introduction to Environmental Design", 2, "AR181"],
      ],
      [
        ["GEOM 293", "مرسم 5 : البرمجة والذكاء الاصطناعى", "Studio 5: AI and Programming", 7, "GEOM120"],
        ["GEOM 241", "علم المساحة المتقدم", "Advanced Surveying", 3, "GEOM140"],
        ["GEOM 226", "إدارة قواعد بيانات نظم المعلومات الجغرافية", "Database Management for GIS", 3, "GEOM120"],
        ["GEOM 235", "أساسيات المساحة التصويرية", "Princ. of photo. for Geomatics", 3, null],
        ["ISLS 101", "الدراسات الإسلامية 1", "Islamic Studies I", 2, null],
      ],
      [
        ["GEOM 294", "مرسم 6 : تطبيقات المساحة التصويرية", "Studio 6: Photogrammetry", 7, "GEOM192 , GEOM235."],
        ["GEOM 236", "مبادئ الاستشعار عن بعد", "Principles of Remote Sensing", 3, "GEOM120"],
        ["GEOM 227", "النمذجة و التحليل المكاني", "Modeling and Spatial  Analysis", 3, "GEOM120"],
        ["GEOM 205", "الكادستر وقانون الملكية", "Cadastre and property Law", 3, null],
        ["GEOM 250", "التدريب الميداني (1)", "Training I", null, null],
        ["ISLS 102", "الدراسات الإسلامية 2", "Islamic Studies 2", 2, "ISLS101"],
      ],
      [
        ["GEOM 395", "مرسم 7 : تطبيقات الاستشعار عن بعد", "Studio 7: Remote Sensing", 7, "GEOM192 , GEOM236"],
        ["GEOM 303", "الرياضيات للجيوماتكس", "Mathematics for Geomatics", 3, "GEOM241"],
        ["GEOM 342", "التحديد الجيوديسي", "Geodetic positionning", 3, "GEOM241"],
        ["ELECTIVE", "مقرر اختياري", "Elective", 3, null],
        ["ARAB 101", "اللغة العربية 1", "Arabic I", 3, null],
      ],
      [
        ["GEOM 396", "مرسم 8 :تنفيذ وادارة نظم المعلومات الجغرافية", "Studio 8: GIS Implementation", 7, "GEOM192 , GEOM227 ,GEOM294"],
        ["GEOM 343", "نظم الملاحة العالمية بالاقمار الصناعية", "GPS", 3, "GEOM342"],
        ["GEOM 351", "التدريب الميداني (2)", "Training II", null, "GEOM250"],
        ["ELECTIVE", "مقرر اختياري", "Elective", 3, null],
        ["ISLS 103", "الدراسات الإسلامية 3", "Islamic Studies 3", 2, "ISLS201"],
        ["KAU", "مقرر حر", "Free Course", 2, null],
      ],
      [
        ["GEOM 497", "مرسم 9 :مشروع المساحة", "Studio 9: Surveying Project", 7, "GEOM192 , GEOM303 , GEOM343"],
        ["ELECTIVE", "مقرر اختياري", "Elective", 3, null],
        ["ELECTIVE", "مقرر اختياري", "Elective", 3, null],
        ["ARAB 201", "اللغة العربية 2", "Arabic II", 3, "ARAB 101"],
        ["ISLS 104", "الدراسات الإسلامية 4", "Islamic Studies 4", 2, "ISLS301"],
        ["KAU", "مقرر حر", "Free Course", 2, null],
      ],
      [
        ["GEOM 499", "مرسم 10 :مشروع التخرج", "Studio 10: Graduation", 7, "GEOM293 , GEOM395 , GEOM396 , GEOM497"],
        ["ELECTIVE", "مقرر اختياري", "Elective", 3, null],
        ["ELECTIVE", "مقرر اختياري", "Elective", 3, null],
        ["GEOM 404", "مهارات سوق العمل فى الجيوماتكس", "Labor Market Skills in Geomatics", 3, null],
        ["KAU", "مقرر حر", "Free Course", 2, null],
      ],
    ],
  },
];

const levelNamesAr = ["الأول", "الثاني", "الثالث", "الرابع", "الخامس", "السادس", "السابع", "الثامن", "التاسع", "العاشر"];
const levelNamesEn = ["One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten"];

function normalizedCode(value) {
  const compact = String(value || "").trim().replace(/[.،]/g, "").replace(/\s+/g, " ").toUpperCase();
  const match = compact.match(/^([A-Z]+)\s*(\d+)$/);
  return match ? `${match[1]} ${match[2]}` : compact;
}

function splitPrerequisites(value) {
  if (!value) return [];
  return String(value).split(/[,،]/).map(normalizedCode).filter(Boolean);
}

function build(program) {
  const allCodes = new Set(program.levels.flat().map((row) => normalizedCode(row[0]))
    .filter((code) => !["ELECTIVE", "KAU"].includes(code)));
  const unresolvedRows = [];
  let sourceOrder = 0;
  let flexibleIndex = 0;
  let missingCredits = 0;
  const sections = [];
  const courses = [];

  for (const [levelIndex, rows] of program.levels.entries()) {
    const levelId = levelIndex + 1;
    const titleAr = `المستوى ${levelNamesAr[levelIndex]}`;
    const titleEn = `Level ${levelNamesEn[levelIndex]}`;
    const sectionRows = [];
    for (const [rawCode, nameAr, nameEn, credits, prerequisiteText] of rows) {
      sourceOrder += 1;
      const code = normalizedCode(rawCode);
      const flexible = ["ELECTIVE", "KAU"].includes(code);
      const missingCredit = credits === null;
      if (missingCredit) missingCredits += 1;
      const rawPrerequisites = splitPrerequisites(prerequisiteText);
      const forcedUnresolved = Object.hasOwn(program.unresolvedByCode, code);
      const unresolved = Boolean(prerequisiteText) && (forcedUnresolved || rawPrerequisites.some((item) => !allCodes.has(item)));
      const prerequisites = unresolved ? [] : rawPrerequisites;
      const courseWarnings = [];
      if (unresolved) {
        unresolvedRows.push({
          course_code: code,
          semester_or_level: titleEn,
          prerequisite_text_original: prerequisiteText,
        });
        courseWarnings.push(warning(
          "unresolved_prerequisite",
          "بيانات المتطلب تحتاج إلى تحقق",
          "Prerequisite information requires verification",
        ));
      }
      if (flexible) courseWarnings.push(warning(
        "flexible_requirement",
        "قاعدة الاختيار غير منشورة بالكامل؛ حدّد هذا الصف فقط إذا أكملته فعليًا.",
        "The selection rule is not fully published; mark this row only if you actually completed it.",
      ));
      if (missingCredit) courseWarnings.push(warning(
        "missing_credit",
        "لم تنشر الجامعة قيمة الساعات لهذا الصف؛ لم يتم افتراض قيمة.",
        "The university does not publish a credit value for this row; no value was assumed.",
      ));
      const training = /تدريب|Training/i.test(`${nameAr} ${nameEn}`);
      const project = /مشروع التخرج|Graduation|Grad\. Project/i.test(`${nameAr} ${nameEn}`);
      const course = {
        semester_or_level: titleEn,
        semester_or_level_ar: titleAr,
        semester_or_level_en: titleEn,
        official_level_placement: "scheduled",
        course_code: code,
        official_course_code: rawCode,
        ...(flexible ? { planner_course_id: `AP-${program.code}-${code}-${String(++flexibleIndex).padStart(2, "0")}` } : {}),
        official_course_name: nameAr,
        course_name_ar: nameAr,
        course_name_en: nameEn,
        credit_hours: credits,
        prerequisites,
        corequisites: [],
        prerequisite_text_original: prerequisiteText,
        prerequisite_text_ar: prerequisiteText,
        prerequisite_text_en: prerequisiteText,
        prerequisite_verification_required: unresolved,
        course_type: flexible ? "elective" : training ? "training" : project ? "project" : "required",
        counts_toward_program_credit_total: !flexible,
        ...(flexible ? { credit_total_exclusion_reason: "Flexible published requirement; exact selection rule is not published." } : {}),
        academic_data_warnings: courseWarnings,
        official_source_url: program.sourceEn,
        source_title: "KAU published official study plan",
        last_checked_date: checkedDate,
      };
      courses.push(course);
      sectionRows.push({
        raw_course_code: rawCode,
        display_course_code: code,
        course_name_ar: nameAr,
        course_name_en: nameEn,
        credits,
        original_source_section: titleAr,
        official_level_or_semester: `level ${levelId}`,
        raw_prerequisite_corequisite_text: prerequisiteText,
        prerequisite_text_ar: prerequisiteText,
        prerequisite_text_en: prerequisiteText,
        source_order: sourceOrder,
        visible_order: sourceOrder,
        flags: {
          placeholder: flexible,
          unresolved_requisite: unresolved,
          training,
          project,
          practicum: false,
          cooperative_training: false,
          zero_credit: credits === 0,
          unplaced_requirement: false,
        },
      });
    }
    sections.push({
      id: `scheduled-level-${levelId}`,
      level_id: levelId,
      title_ar: titleAr,
      title_en: titleEn,
      source_label_ar: titleAr,
      source_label_en: `Level ${levelId}`,
      source_section: titleAr,
      source_level_order_ar: levelId,
      source_level_order_en: levelId,
      placement: "scheduled",
      rows: sectionRows,
    });
  }

  const visibleCreditSum = courses.reduce((sum, course) => sum + (Number.isFinite(course.credit_hours) ? course.credit_hours : 0), 0);
  const calculatedPlanCredits = courses.reduce((sum, course) => sum + (
    course.counts_toward_program_credit_total !== false && Number.isFinite(course.credit_hours) ? course.credit_hours : 0
  ), 0);
  const academicWarnings = [];
  if (unresolvedRows.length) academicWarnings.push(warning(
    "unresolved_prerequisite_rows",
    `توجد ${unresolvedRows.length} صفوف بمتطلبات سابقة لا تشير إلى رمز مقرر منشور في الخطة؛ لن تُحجب هذه المقررات تلقائيًا.`,
    `${unresolvedRows.length} row(s) have prerequisites that do not identify a published course code in the plan; these courses are not automatically blocked.`,
    unresolvedRows.length,
  ));
  academicWarnings.push(warning(
    "unresolved_elective_rule",
    "يجب التحقق من عدد المقررات الاختيارية والحرة المطلوبة مع القسم؛ تم حفظ كل صف منشور دون افتراض قاعدة غير منشورة.",
    "The required elective and free-course selections should be verified with the department; every published row is preserved without inventing an unpublished rule.",
  ));
  if (missingCredits) academicWarnings.push(warning(
    "missing_credit_rows",
    `لا تنشر الخطة قيمة الساعات في ${missingCredits} من صفوف التدريب؛ لم تدخل هذه الصفوف في الإجمالي المحسوب.`,
    `${missingCredits} training row(s) have no published credit value and are excluded from the calculated total.`,
    missingCredits,
  ));
  if (program.officialTotal !== null && program.officialTotal !== visibleCreditSum) academicWarnings.push(warning(
    "official_total_differs_from_level_rows",
    `تذكر صفحة البرنامج إجمالي ${program.officialTotal} ساعة، بينما مجموع الساعات الظاهرة في صفوف المستويات ${visibleCreditSum}. عُرض الإجمالي الرسمي مع إبقاء الاختلاف واضحًا.`,
    `The program page states ${program.officialTotal} total credits, while the visible level rows sum to ${visibleCreditSum}. The official total is shown and the discrepancy is disclosed.`,
    Math.abs(program.officialTotal - visibleCreditSum),
  ));
  if (program.officialTotal === null) academicWarnings.push(warning(
    "official_total_not_published",
    `لا تنشر صفحة البرنامج إجمالي ساعات التخرج؛ مجموع الساعات الرقمية الظاهرة في المستويات ${visibleCreditSum} قبل استبعاد المتطلبات المرنة.`,
    `The program page does not publish a graduation-credit total; the numeric credits visible in the levels sum to ${visibleCreditSum} before flexible requirements are excluded.`,
  ));

  const officialPlanView = {
    schema_version: 2,
    extraction_method: "manual_official_levels_review",
    source: {
      url_ar: program.sourceAr,
      url_en: program.sourceEn,
      final_url_ar: program.sourceAr,
      final_url_en: program.sourceEn,
      retrieved_at: retrievedAt,
      sha256_ar: null,
      sha256_en: null,
    },
    warning_ar: "الخطة الرسمية متاحة تفاعليًا، وأي اختلافات أو بيانات ناقصة في المصدر تظهر كتنبيهات غير حاجبة.",
    warning_en: "The official plan is interactive; source discrepancies and missing data are shown as nonblocking warnings.",
    official_level_count: sections.length,
    source_section_count: sections.length,
    visible_course_count: courses.length,
    source_course_row_count: courses.length,
    visible_credit_sum: visibleCreditSum,
    credits_complete: missingCredits === 0,
    missing_credit_count: missingCredits,
    bilingual_identity_match: true,
    unresolved_requisite_codes: [...new Set(unresolvedRows.map((row) => row.prerequisite_text_original))],
    display_notes: [
      "Every published Levels row was preserved. Missing credits and unresolved prerequisite text were not guessed.",
    ],
    program_warning_en: null,
    program_warning_ar: null,
    normalization: {
      rule: "Normalize course-code spacing for planner identity while preserving the published code in official_course_code.",
      removed_exact_duplicate_count: 0,
      removed_source_orders: [],
      removed_duplicate_mappings: [],
    },
    sections,
  };

  const planner = {
    id: program.id,
    faculty_id: "AP",
    program_name: program.nameEn,
    program_name_ar: program.nameAr,
    program_name_en: program.nameEn,
    name_ar: program.nameAr,
    name_en: program.nameEn,
    degree_level: "bachelor",
    degree_level_ar: "بكالوريوس",
    degree_level_en: "Bachelor",
    university_name: "King Abdulaziz University",
    college_name: "ARCHITECTURE AND PLANNING",
    faculty_name_ar: "العمارة والتخطيط",
    faculty_name_en: "ARCHITECTURE AND PLANNING",
    total_program_credit_hours: program.officialTotal,
    official_total_credits: program.officialTotal,
    calculated_plan_credit_hours: calculatedPlanCredits,
    calculated_plan_credits: calculatedPlanCredits,
    published_level_rows_credit_sum: visibleCreditSum,
    credit_total_source: program.officialTotal === null ? "calculated_from_published_plan" : "official_program_description",
    credit_progress_mode: "published_plan_credits",
    allow_incomplete_course_credits: missingCredits > 0,
    published_official_plan_interactive: true,
    conversion_origin: "CURRENT_OFFICIAL_LEVELS_REVIEW",
    official_plan_row_count: courses.length,
    official_plan_level_count: sections.length,
    academic_data_warnings: academicWarnings,
    unresolved_elective_rule: true,
    unresolved_training_rule: missingCredits > 0,
    unresolved_prerequisite_rows: unresolvedRows,
    official_source_url: program.sourceEn,
    source_url_ar: program.sourceAr,
    source_url_en: program.sourceEn,
    source_title: "KAU published official study plan",
    last_checked_date: checkedDate,
    level_required_credit_hours: Object.fromEntries(sections.map((section) => [
      section.title_en,
      courses.filter((course) => course.semester_or_level === section.title_en)
        .reduce((sum, course) => sum + (course.counts_toward_program_credit_total !== false && Number.isFinite(course.credit_hours) ? course.credit_hours : 0), 0),
    ])),
    courses,
  };

  const catalog = {
    id: program.id,
    slug: program.slug,
    faculty_id: "AP",
    faculty_code: "AP",
    faculty_name: "ARCHITECTURE AND PLANNING",
    faculty_name_ar: "العمارة والتخطيط",
    faculty_name_en: "ARCHITECTURE AND PLANNING",
    name_ar: program.nameAr,
    name_en: program.nameEn,
    program_name: program.nameEn,
    program_name_ar: program.nameAr,
    program_name_en: program.nameEn,
    degree_level: "bachelor",
    degree_level_ar: "بكالوريوس",
    degree_level_en: "Bachelor",
    official_degree_label_ar: "Bachelor",
    official_degree_label_en: "Bachelor",
    language: ["en"],
    program_code: program.code,
    official_code: program.code,
    duration_ar: "5 years",
    duration_en: "5 years",
    official_source_url: program.sourceEn,
    source_url_ar: program.sourceAr,
    source_url_en: program.sourceEn,
    source_kind: "central_catalog",
    source_path: `/programs/${program.slug}`,
    source_title: "KAU Program Detail",
    last_checked_date: checkedDate,
    catalog_status: "active",
    catalog_note: "The current official Levels plan is interactive; source uncertainty is shown as nonblocking warnings.",
    catalog_note_ar: "الخطة الحالية المنشورة في تبويب المستويات متاحة في المخطط التفاعلي، وتظهر اختلافات المصدر كتنبيهات غير حاجبة.",
    catalog_note_en: "The current official Levels plan is interactive; source uncertainty is shown as nonblocking warnings.",
    planner_available: true,
    planner_data_key: program.id,
    coverage_state: "FULL_PLANNER",
    official_plan_view: officialPlanView,
    published_official_plan_interactive: true,
    total_program_credit_hours: program.officialTotal,
    calculated_plan_credits: calculatedPlanCredits,
    credit_total_source: planner.credit_total_source,
    conversion_origin: "CURRENT_OFFICIAL_LEVELS_REVIEW",
    courses: [],
  };
  return { catalog, planner };
}

function upsertAfterArchitecture(programsList, value) {
  const existingIndex = programsList.findIndex((item) => item.id === value.id);
  if (existingIndex !== -1) {
    programsList[existingIndex] = value;
    return;
  }
  const anchorIndex = programsList.findLastIndex((item) => item.faculty_id === "AP");
  programsList.splice(anchorIndex === -1 ? programsList.length : anchorIndex + 1, 0, value);
}

const catalogData = JSON.parse(fs.readFileSync(catalogPath, "utf8"));
const plannersData = JSON.parse(fs.readFileSync(plannersPath, "utf8"));
for (const program of programs) {
  const built = build(program);
  upsertAfterArchitecture(catalogData.programs, built.catalog);
  upsertAfterArchitecture(plannersData.programs, built.planner);
}

catalogData.generated_at = retrievedAt;
catalogData.last_checked_date = checkedDate;
catalogData.scope_note = "Bilingual official catalog with the July 2026 manual audit plus current August 2026 Architecture and Planning program verification.";
catalogData.official_central_program_count = 214;

fs.writeFileSync(catalogPath, `${JSON.stringify(catalogData, null, 2)}\n`, "utf8");
fs.writeFileSync(plannersPath, `${JSON.stringify(plannersData, null, 2)}\n`, "utf8");

process.stdout.write(`${JSON.stringify({
  catalog_programs: catalogData.programs.length,
  full_planners: catalogData.programs.filter((program) => program.coverage_state === "FULL_PLANNER").length,
  planner_datasets: plannersData.programs.length,
  added: programs.map((program) => program.id),
})}\n`);
