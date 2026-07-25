# Confirmed prerequisite normalization remediation

Generated: 2026-07-25

## Outcome

Evaluated all **91** confirmed normalization candidates. Corrected **75** and skipped **16** where retained same-program evidence was ambiguous or incomplete.

- Explicit AND expressions corrected: 57
- Bilingual aliases corrected: 12
- Arabic-prefix identity collisions corrected: 6
- Unambiguous OR rules found: 0; no OR semantics were added.

## Behavioral comparison

- Initial availability: unchanged (1378 available, 835 blocked).
- Permanently blocked API rows: 312 → 237 (reduction 75).
- Newly unlockable after valid prerequisites: 76.
- Newly blocked by corrected identity isolation: 1 (`سلم 401`; its previous numeric collision no longer falsely satisfies the chain).
- Accounting and Finance payloads: unchanged.
- OFFICIAL_PLAN_VIEW data and read-only behavior: unchanged.

## Corrected candidates

| Program | Course | Semantics | Current correction |
|---|---|---|---|
| `catalog-computing-information-tech-bachelor-of-science-in-information-systems` | `CIS 221` | AND | {"prerequisites": ["CS 121", "CS 202"], "raw_requisite_notation": "CS121 + CS202"} |
| `catalog-computing-information-tech-bachelor-of-science-in-information-systems` | `CIS 352` | AND | {"prerequisites": ["CIS 221", "CIS 241"], "raw_requisite_notation": "CIS221 + CIS241"} |
| `catalog-computing-information-tech-bachelor-of-science-in-information-systems` | `CIS 361` | AND | {"prerequisites": ["CIS 211", "CS 202"], "raw_requisite_notation": "CIS211 + CS202"} |
| `catalog-computing-information-tech-bachelor-of-science-in-information-systems` | `CIS 333` | AND | {"prerequisites": ["CIS 221", "CIS 241"], "raw_requisite_notation": "CIS221 + CIS241"} |
| `catalog-computing-information-tech-bachelor-of-science-in-information-systems` | `CIS 440` | AND | {"prerequisites": ["CIS 333", "CIS 381"], "raw_requisite_notation": "CIS333 + CIS381"} |
| `catalog-computing-information-tech-bachelor-of-science-in-information-technology` | `IT 472` | AND | {"prerequisites": ["IT 304", "IT 371"], "raw_requisite_notation": "IT 304 + IT 371"} |
| `catalog-computing-information-tech-bachelor-of-science-in-information-technology` | `IT 361` | AND | {"prerequisites": ["IT 211", "IT 203"], "raw_requisite_notation": "IT 211 + IT 203"} |
| `catalog-computing-information-tech-bachelor-of-science-in-information-technology` | `IT 351` | AND | {"prerequisites": ["IT 122", "IT 203"], "raw_requisite_notation": "IT122 + IT 203"} |
| `catalog-science-bachelor-of-biochemistry` | `BIOC 392` | AND | {"prerequisites": ["BIOC 231", "BIOC 312"], "raw_requisite_notation": "BIOC 231 & BIOC 312"} |
| `catalog-science-bachelor-of-biochemistry` | `BIOC 445` | AND | {"prerequisites": ["BIOC 231", "BIOC 343"], "raw_requisite_notation": "BIOC 231 & BIOC 343"} |
| `catalog-environmental-sciences-bachelor-of-science-in-environment` | `ENS361` | AND | {"prerequisites": ["ENS305", "ENS207"], "raw_requisite_notation": "ENS 305\nENS 207"} |
| `catalog-earth-sciences-bachelor-general-geology-structural-geology-and-remote-sensing` | `ISLS 201` | bilingual_alias | {"prerequisites": ["ISLS 101"], "raw_requisite_notation": "سلم 101 | ISLS 101"} |
| `catalog-earth-sciences-bachelor-general-geology-structural-geology-and-remote-sensing` | `ISLS 401` | bilingual_alias | {"prerequisites": ["ISLS 301"], "raw_requisite_notation": "301 | ISLS 301"} |
| `catalog-earth-sciences-bachelor-general-geology-structural-geology-and-remote-sensing` | `ISLS 301` | bilingual_alias | {"prerequisites": ["ISLS 201"], "raw_requisite_notation": "سلم 201 | ISLS 201"} |
| `catalog-earth-sciences-bachelor-of-general-geology-geo-exploration-techniques` | `EGT 399` | AND | {"prerequisites": ["EGT 310", "EGT 332"], "raw_requisite_notation": "EGT 310\nEGT 332"} |
| `catalog-earth-sciences-bachelor-of-general-geology-geo-exploration-techniques` | `EGT 499` | AND | {"prerequisites": ["EGT 352", "EGT 399"], "raw_requisite_notation": "EGT 352\nEGT 399"} |
| `catalog-earth-sciences-bachelor-of-geophysics` | `EGP 399` | AND | {"prerequisites": ["EGP 321", "EGP 331", "EGP 341"], "raw_requisite_notation": "• EGP321. • EGP331. • EGP341."} |
| `catalog-earth-sciences-bachelor-of-geophysics` | `EGP 441` | AND | {"prerequisites": ["EGP 416", "EGP 422"], "raw_requisite_notation": "EGP416. EGP422."} |
| `catalog-earth-sciences-bachelor-of-geophysics` | `EGP 408` | AND | {"prerequisites": ["EGP 321", "EGP 331", "EGP 341"], "raw_requisite_notation": "• EGP321. • EGP331. • EGP341."} |
| `catalog-earth-sciences-bachelor-of-geophysics` | `EGP 416` | AND | {"prerequisites": ["EGP 321", "EGP 331", "EGP 341"], "raw_requisite_notation": "EGP321. • EGP331. • EGP341."} |
| `catalog-earth-sciences-bachelor-of-science-in-engineering-and-environmental-geology` | `EEG 332` | AND | {"prerequisites": ["EEG 311", "EEG 321"], "raw_requisite_notation": "EEG311\nEEG321"} |
| `catalog-earth-sciences-bachelor-of-science-in-engineering-and-environmental-geology` | `ُEEG 341` | AND | {"prerequisites": ["EEG 311", "EEG 321"], "raw_requisite_notation": "EEG311\nEEG321"} |
| `catalog-earth-sciences-bachelor-of-science-in-engineering-and-environmental-geology` | `EEG 444` | AND | {"prerequisites": ["ُEEG 341", "EEG 342"], "raw_requisite_notation": "EEG341\nEEG342"} |
| `catalog-earth-sciences-bachelor-of-science-in-engineering-and-environmental-geology` | `EEG 499` | AND | {"prerequisites": ["ُEEG 399", "EEG 408"], "raw_requisite_notation": "EEG399\nEEG408"} |
| `catalog-earth-sciences-bachelor-of-science-in-engineering-and-environmental-geology` | `EEG 443` | AND | {"prerequisites": ["ُEEG 341", "EEG 342"], "raw_requisite_notation": "EEG341\nEEG342"} |
| `catalog-earth-sciences-bachelor-of-science-in-engineering-and-environmental-geology` | `EEG 442` | AND | {"prerequisites": ["EEG 312", "EEG 322"], "raw_requisite_notation": "EEG312\nEEG322"} |
| `catalog-earth-sciences-hydrogeology-bsc` | `ESR 221` | bilingual_alias | {"prerequisites": ["EMR 110"], "raw_requisite_notation": "EMR 110 | STAT 110"} |
| `catalog-human-sciences-and-design-bacheior-interior-design-and-furniture` | `غ ت 401` | identity | {"normalizer": "Unicode letters plus normalized Arabic/ASCII digits"} |
| `catalog-human-sciences-and-design-bacheior-interior-design-and-furniture` | `ID 222` | AND | {"prerequisites": ["ID 102", "ID 121"], "raw_requisite_notation": "ID 102\nID 121"} |
| `catalog-human-sciences-and-design-bachelor-of-science-b-sc-in-family-sciences` | `عرب 101` | identity | {"normalizer": "Unicode letters plus normalized Arabic/ASCII digits"} |
| `catalog-human-sciences-and-design-bachelor-of-science-b-sc-in-family-sciences` | `FS 391` | AND | {"prerequisites": ["FS 274", "FS300"], "raw_requisite_notation": "FS274\nFS300"} |
| `catalog-human-sciences-and-design-bachelor-of-science-b-sc-in-family-sciences` | `FS 392` | AND | {"prerequisites": ["FS 303", "FS380", "FS 271", "FS 273", "FS170", "FS 390", "FS 391"], "raw_requisite_notation": "FS 303\nFS 380\nFS 271\nFS 273\nFS 170\nFS 390\nFS 391"} |
| `catalog-human-sciences-and-design-bachelor-s-department-of-early-childhood-guide` | `ت ط ف م 111` | identity | {"normalizer": "Unicode letters plus normalized Arabic/ASCII digits"} |
| `catalog-human-sciences-and-design-bachelor-s-department-of-early-childhood-guide` | `إنج 101` | identity | {"normalizer": "Unicode letters plus normalized Arabic/ASCII digits"} |
| `catalog-human-sciences-and-design-bachelor-s-department-of-early-childhood-guide` | `سلم 201` | identity | {"normalizer": "Unicode letters plus normalized Arabic/ASCII digits"} |
| `catalog-human-sciences-and-design-bachelor-s-department-of-early-childhood-guide` | `سلم 301` | identity | {"normalizer": "Unicode letters plus normalized Arabic/ASCII digits"} |
| `catalog-human-sciences-and-design-bachelor-s-department-of-early-childhood-guide` | `ت ط ف م 458` | AND | {"prerequisites": ["ت ط ف م 354", "ت ط ف م 355"], "raw_requisite_notation": "ت ط ف م 354\nت ط ف م 355"} |
| `catalog-human-sciences-and-design-bachelor-s-department-of-early-childhood-guide` | `ت ط ف م 459` | AND | {"prerequisites": ["ت ط ف م 454", "ت ط ف م 455"], "raw_requisite_notation": "ت ط ف م 454\nت ط ف م 455"} |
| `catalog-human-sciences-and-design-bachelor-s-department-of-early-childhood-guide` | `ت ط ف م 251` | AND | {"prerequisites": ["ت ط ف م 112", "ت ط ف م 131"], "raw_requisite_notation": "ت ط ف م 112\nت ط ف م 131"} |
| `catalog-med-rehabilitation-sciences-bachelor-s-degree-of-occupational-therapy` | `سلم ٢٠١ | ISLS 201` | bilingual_alias | {"prerequisites": ["سلم ١٠١ | ISLS 101"], "raw_requisite_notation": "سلم 101 | ISLS 101"} |
| `catalog-med-rehabilitation-sciences-bachelor-s-degree-of-occupational-therapy` | `سلم ٣٠١ | ISLS 301` | bilingual_alias | {"prerequisites": ["سلم ٢٠١ | ISLS 201"], "raw_requisite_notation": "سلم 201 | ISLS 201"} |
| `catalog-med-rehabilitation-sciences-bachelor-s-degree-of-occupational-therapy` | `سلم ٤٠١ | ISLS 401` | bilingual_alias | {"prerequisites": ["سلم ٣٠١ | ISLS 301"], "raw_requisite_notation": "301 | ISLS 301"} |
| `catalog-med-rehabilitation-sciences-bachelor-s-degree-of-occupational-therapy` | `عرب  ٢٠١ | ARAB 201` | bilingual_alias | {"prerequisites": ["عرب  ١٠١ | ARAB 101"], "raw_requisite_notation": "عرب101 | ARAB 101"} |
| `catalog-med-rehabilitation-sciences-bachelor-s-degree-of-occupational-therapy` | `OCTH 351` | AND | {"prerequisites": ["OCTH 221", "OCTH 222", "OCTH 223"], "raw_requisite_notation": "OCTH 221\nOCTH 222\nOCTH 223"} |
| `catalog-med-rehabilitation-sciences-bachelor-s-degree-of-occupational-therapy` | `OCTH 352` | AND | {"prerequisites": ["OCTH 221", "OCTH 222", "OCTH 223"], "raw_requisite_notation": "OCTH 221\nOCTH 222\nOCTH 223"} |
| `catalog-med-rehabilitation-sciences-bachelor-s-degree-of-occupational-therapy` | `OCTH 461` | AND | {"prerequisites": ["OCTH 221", "OCTH 222"], "raw_requisite_notation": "OCTH 221\nOCTH 222"} |
| `catalog-med-rehabilitation-sciences-bachelor-s-degree-of-occupational-therapy` | `OCTH 476` | AND | {"prerequisites": ["OCTH 221", "OCTH 222"], "raw_requisite_notation": "OCTH 221 OCTH 222"} |
| `catalog-med-rehabilitation-sciences-bachelor-s-degree-of-occupational-therapy` | `OCTH 473` | AND | {"prerequisites": ["OCTH 221", "OCTH 222"], "raw_requisite_notation": "OCTH 221 OCTH 222"} |
| `catalog-med-rehabilitation-sciences-bachelor-s-degree-of-occupational-therapy` | `OCTH 475` | AND | {"prerequisites": ["OCTH 221", "OCTH 222"], "raw_requisite_notation": "OCTH 221 OCTH 222"} |
| `catalog-med-rehabilitation-sciences-bachelor-s-degree-of-occupational-therapy` | `OCTH 477` | AND | {"prerequisites": ["OCTH 221", "OCTH 222"], "raw_requisite_notation": "OCTH 221 OCTH 222"} |
| `catalog-med-rehabilitation-sciences-bachelor-s-degree-of-speech-language-pathology-and-aud` | `سلم ٢٠١ | ISLS 201` | bilingual_alias | {"prerequisites": ["سلم ١٠١ | ISLS 101"], "raw_requisite_notation": "سلم 101 | ISLS 101"} |
| `catalog-med-rehabilitation-sciences-bachelor-s-degree-of-speech-language-pathology-and-aud` | `سلم ٣٠١ | ISLS 301` | bilingual_alias | {"prerequisites": ["سلم ٢٠١ | ISLS 201"], "raw_requisite_notation": "سلم 201 | ISLS 201"} |
| `catalog-med-rehabilitation-sciences-bachelor-s-degree-of-speech-language-pathology-and-aud` | `سلم ٤٠١ | ISLS 401` | bilingual_alias | {"prerequisites": ["سلم ٣٠١ | ISLS 301"], "raw_requisite_notation": "301 | ISLS 301"} |
| `catalog-med-rehabilitation-sciences-bachelor-s-degree-of-speech-language-pathology-and-aud` | `عرب  ٢٠١ | ARAB 201` | bilingual_alias | {"prerequisites": ["عرب  ١٠١ | ARAB 101"], "raw_requisite_notation": "عرب101 | ARAB 101"} |
| `catalog-med-rehabilitation-sciences-bachelor-s-degree-of-speech-language-pathology-and-aud` | `SLPA 361` | AND | {"prerequisites": ["SLPA 224", "SLPA 212"], "raw_requisite_notation": "SLPA 224\r\nSLPA 212"} |
| `catalog-med-rehabilitation-sciences-bachelor-s-degree-of-speech-language-pathology-and-aud` | `SLPA 362` | AND | {"prerequisites": ["SLPA 211", "SLPA 220"], "raw_requisite_notation": "SLPA 211\r\nSLPA 220"} |
| `catalog-med-rehabilitation-sciences-bachelor-s-degree-of-speech-language-pathology-and-aud` | `SLPA 363` | AND | {"prerequisites": ["SLPA 211", "SLPA 220"], "raw_requisite_notation": "SLPA 211\r\nSLPA 220"} |
| `catalog-med-rehabilitation-sciences-bachelor-s-degree-of-speech-language-pathology-and-aud` | `SLPA 381` | AND | {"prerequisites": ["SLPA 361", "SLPA 362"], "raw_requisite_notation": "SLPA 361 \r\nSLPA 362"} |
| `catalog-med-rehabilitation-sciences-bachelor-s-degree-of-speech-language-pathology-and-aud` | `SLPA 364` | AND | {"prerequisites": ["SLPA 361", "SLPA 362", "SLPA 363"], "raw_requisite_notation": "SLPA 361\r\nSLPA 362\r\nSLPA 363"} |
| `catalog-med-rehabilitation-sciences-bachelor-s-degree-of-speech-language-pathology-and-aud` | `SLPA 365` | AND | {"prerequisites": ["SLPA 361", "SLPA 362"], "raw_requisite_notation": "SLPA 361\r\nSLPA 362"} |
| `catalog-med-rehabilitation-sciences-bachelor-s-degree-of-speech-language-pathology-and-aud` | `SLPA 472` | AND | {"prerequisites": ["SLPA 364", "SLPA 211"], "raw_requisite_notation": "SLPA 364\r\nSLPA 211"} |
| `catalog-med-rehabilitation-sciences-bachelor-s-degree-of-speech-language-pathology-and-aud` | `SLPA 485` | AND | {"prerequisites": ["SLPA 362", "SLPA 364", "SLPA 365"], "raw_requisite_notation": "SLPA 362\r\nSLPA 364\r\nSLPA 365"} |
| `catalog-med-rehabilitation-sciences-bachelor-s-degree-of-speech-language-pathology-and-aud` | `SLPA 491` | AND | {"prerequisites": ["SLPA 364", "SLPA 365", "SLPA 213"], "raw_requisite_notation": "SLPA364\r\nSLPA 365\r\nSLPA 213"} |
| `catalog-med-rehabilitation-sciences-bachelor-s-degree-of-speech-language-pathology-and-aud` | `SLPA 346` | AND | {"prerequisites": ["SLPA 211", "SLPA 212"], "raw_requisite_notation": "SLPA 211\nSLPA 212"} |
| `catalog-med-rehabilitation-sciences-bachelor-s-degree-of-speech-language-pathology-and-aud` | `SLPA 482` | AND | {"prerequisites": ["SLPA 365", "SLPA 362"], "raw_requisite_notation": "SLPA 365\nSLPA 362"} |
| `catalog-med-rehabilitation-sciences-bachelor-s-degree-of-speech-language-pathology-and-aud` | `SLPA 483` | AND | {"prerequisites": ["SLPA 365", "SLPA 362"], "raw_requisite_notation": "SLPA 365\nSLPA 362"} |
| `catalog-med-rehabilitation-sciences-bachelor-s-degree-of-speech-language-pathology-and-aud` | `SLPA 224` | AND | {"prerequisites": ["SLPA 220", "SLPA 221"], "raw_requisite_notation": "SLPA 220 \r\nSLPA 221"} |
| `catalog-med-rehabilitation-sciences-bachelor-s-degree-of-speech-language-pathology-and-aud` | `SLPA 222` | AND | {"prerequisites": ["SLPA 220", "SLPA 223"], "raw_requisite_notation": "SLPA 220\r\nSLPA 223"} |
| `catalog-med-rehabilitation-sciences-bachelor-s-degree-of-speech-language-pathology-and-aud` | `SLPA 313` | AND | {"prerequisites": ["SLPA 212", "SLPA 213"], "raw_requisite_notation": "SLPA 212\r\nSLPA 213"} |
| `catalog-med-rehabilitation-sciences-bachelor-s-degree-of-speech-language-pathology-and-aud` | `SLPA 341` | AND | {"prerequisites": ["SLPA 223", "SLPA 222", "SLPA 212"], "raw_requisite_notation": "SLPA 223\r\nSLPA 222\r\nSLPA 212"} |
| `catalog-med-rehabilitation-sciences-bachelor-s-degree-of-speech-language-pathology-and-aud` | `SLPA 333` | AND | {"prerequisites": ["SLPA 222", "SLPA 212", "SLPA 221"], "raw_requisite_notation": "SLPA 222\r\nSLPA 212\r\nSLPA 221"} |
| `catalog-med-rehabilitation-sciences-bachelor-s-degree-of-speech-language-pathology-and-aud` | `SLPA 334` | AND | {"prerequisites": ["SLPA 222", "SLPA 212"], "raw_requisite_notation": "SLPA 222\r\nSLPA 212"} |
| `catalog-med-rehabilitation-sciences-bachelor-s-degree-of-speech-language-pathology-and-aud` | `SLPA 344` | AND | {"prerequisites": ["SLPA 211", "SLPA 212"], "raw_requisite_notation": "SLPA 211\r\nSLPA 212"} |
| `catalog-med-rehabilitation-sciences-bachelor-s-degree-of-speech-language-pathology-and-aud` | `SLPA 432` | AND | {"prerequisites": ["SLPA 224", "SLPA 221", "SLPA 212"], "raw_requisite_notation": "SLPA 224\r\nSLPA 221\r\nSLPA 212"} |
| `catalog-med-rehabilitation-sciences-bachelor-s-degree-of-speech-language-pathology-and-aud` | `SLPA 494` | AND | {"prerequisites": ["SLPA 344", "SLPA 343", "SLPA 213"], "raw_requisite_notation": "SLPA 344\r\nSLPA 343\r\nSLPA 213"} |

## Skipped candidates

| Program | Course | Reason |
|---|---|---|
| `catalog-law-bachelor-degree-in-law` | `LAWP 214` | Hyphen meaning is not explicit in retained evidence. |
| `catalog-law-bachelor-degree-in-law` | `LAWP 424` | Hyphen meaning is not explicit in retained evidence. |
| `catalog-law-bachelor-degree-in-law` | `LAWG 432` | Hyphen meaning is not explicit in retained evidence. |
| `catalog-law-bachelor-degree-in-law` | `LAWP 312` | Hyphen meaning is not explicit in retained evidence. |
| `catalog-law-bachelor-degree-in-law` | `LAWP 372` | Hyphen meaning is not explicit in retained evidence. |
| `catalog-law-bachelor-degree-in-law` | `LAWP 415` | Hyphen meaning is not explicit in retained evidence. |
| `catalog-environmental-sciences-bachelor-of-science-in-environment` | `ENS407` | At least one component is absent or ambiguous in the same planner dataset. |
| `catalog-engineering-rabigh-chemical-and-materials-engineering` | `ISLS 301    سلم 301` | Meaningful identities still collide under Unicode-aware normalization; resolving the conflicting official titles requires academic interpretation. |
| `catalog-earth-sciences-bachelor-of-general-geology-geo-exploration-techniques` | `EGT 431` | At least one component is absent or ambiguous in the same planner dataset. |
| `catalog-earth-sciences-bachelor-of-geophysics` | `EGP 321` | At least one component is absent or ambiguous in the same planner dataset. |
| `catalog-earth-sciences-bachelor-of-geophysics` | `EGP 431` | At least one component is absent or ambiguous in the same planner dataset. |
| `catalog-earth-sciences-bachelor-of-geophysics` | `EGP 451` | At least one component is absent or ambiguous in the same planner dataset. |
| `catalog-earth-sciences-bachelor-of-geophysics` | `EGP 422` | At least one component is absent or ambiguous in the same planner dataset. |
| `catalog-earth-sciences-bachelor-of-geophysics` | `EGP 418` | At least one component is absent or ambiguous in the same planner dataset. |
| `catalog-earth-sciences-hydrogeology-bsc` | `ESR 220` | Pipe may express OR or a bilingual alias, but retained same-program evidence does not resolve both sides to one identity. |
| `catalog-human-sciences-and-design-bacheior-interior-design-and-furniture` | `ID 408` | At least one component is absent or ambiguous in the same planner dataset. |

## Validation

- Unit tests: 101 passed, including 7 focused saved-progress migration tests.
- Python compileall: passed.
- Node syntax checks: passed for all four requested files.
- Repository JSON: all 22 files valid.
- API simulation: all 72 FULL_PLANNER programs; no null, NaN, exception, or infinite loop.
- All 15 OFFICIAL_PLAN_VIEW programs remain read-only.
- `git diff --check`: passed.
- Temporary servers stopped.

## Remaining scope

- Evidence-insufficient issue records: 984.
- Stored edges still lacking retained raw support: 858.
- Unsupported gates: 18, unchanged.
- Finance ISLS 201: unchanged and still evidence-insufficient.

Phase 2 remains uncommitted and unpushed.

## Legacy saved-progress migration

The migration is limited to these three affected FULL_PLANNER programs, all of which also exist as active records on local `main`:

- `catalog-human-sciences-and-design-bacheior-interior-design-and-furniture`
- `catalog-human-sciences-and-design-bachelor-of-science-b-sc-in-family-sciences`
- `catalog-human-sciences-and-design-bachelor-s-department-of-early-childhood-guide`

The six ambiguous legacy groups are:

| Program | Old identity | Prefix-preserving candidates |
|---|---:|---|
| Interior Design and Furniture | `401` | `غ ت 401` → `غت401`; `سلم 401` → `سلم401` |
| Family Sciences | `101` | `عرب 101` → `عرب101`; `سلم 101` → `سلم101` |
| Early Childhood | `111` | `ت ط ف م 111` → `تطفم111`; `ص 111` → `ص111`; `ت م 111` → `تم111` |
| Early Childhood | `101` | `إنج 101` → `إنج101`; `سلم 101` → `سلم101`; `عرب 101` → `عرب101` |
| Early Childhood | `201` | `سلم 201` → `سلم201`; `عرب 201` → `عرب201` |
| Early Childhood | `301` | `سلم 301` → `سلم301`; `ت ط ف م 301` → `تطفم301` |

No ambiguous numeric value is guessed. It is removed from active `completed_codes`, backed up with its candidates under additive `course_identity_migration` version 1 metadata in the same saved object, and shown in a non-blocking bilingual reconfirmation notice. Reconfirmation records the selected identity but retains the backup.

Unique same-program mappings are automatic. Interior Design maps `201 → سلم201`, `301 → سلم301`. Family Sciences maps `201 → سلم201`, `111 → ص111`, `401 → غت401`. Early Childhood maps every unique Arabic-only numeric legacy identity to its sole prefix-preserving course; the complete exact mapping list is recorded in `safety_review_manifest.persistence_review.unambiguous_mappings` in the JSON report.

The localStorage key remains `kau-planner-local-progress:<program>`. The migration is versioned, runs once per affected program, is idempotent, preserves modern and unrelated completed values, never resets a program, and never touches an unaffected program. The notice uses the approved English and Arabic text, lists the candidates, and hides only after each ambiguous group is explicitly reconfirmed.

Planner behavior is unchanged by migration until a student explicitly reconfirms a course: initial availability remains 1,378 available / 835 blocked, and permanently blocked API rows remain 237 after the normalization remediation. Accounting, Finance, Finance ISLS 201, all 15 OFFICIAL_PLAN_VIEW programs, progress keys, APIs, authentication, Azure, and deployment behavior are unchanged.

## Final safety review

- Classification: **A. SAFE_TO_COMMIT**.
- Retained runtime changes: targeted normalization in `server.js`, `src/kau_programs/planner.py`, and `web/app.js`; isolated migration logic in `web/progress-migration.js`; bilingual notice wiring in `web/index.html` and `web/styles.css`.
- Reverted runtime change: `web/elective-groups.js`; affected collision programs have no elective groups.
- Machine-readable before/after manifest: `safety_review_manifest` in the JSON report.
- Academic row changes: 69; corrected candidates: 75; skipped candidates: 16.
- Initial availability remains 1,378 available / 835 blocked; permanently blocked API rows remain 312 → 237.
- `سلم 401` remains blocked because the stored chain ultimately references absent `سلم 101`; no academic correction was inferred.

### Persistence decision

The unresolved localStorage ambiguity is handled conservatively without deletion or guessing. Ambiguous legacy selections are backed up and await user reconfirmation; unambiguous legacy identities migrate automatically. No API persistence behavior was changed.
