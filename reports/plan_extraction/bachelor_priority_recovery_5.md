# Bachelor Priority Recovery 5

Generated from branch `bachelor-priority-recovery-5` at base commit `b3b4f4cf9b1427a984ce879aead672411bc2de94`. This was a targeted official-source recovery and safe-import pass. It made no academic-data or runtime change.

## Outcome

| Classification | Count |
|---|---:|
| A. IMPORT_READY | 0 |
| B. SKIPPED_MISSING_SOURCE | 0 |
| C. SKIPPED_UNRESOLVED_DEPENDENCY | 1 |
| D. SKIPPED_ELECTIVE_AMBIGUITY | 1 |
| E. SKIPPED_CODE_OR_IDENTITY_CONFLICT | 3 |
| F. SKIPPED_REQUIRES_PLANNER_CHANGE | 0 |
| G. SKIPPED_REQUIRES_ACADEMIC_CONFIRMATION | 0 |

All five programs remain catalog-only. Counts remain 223 total, 72 planner-supported, and 151 catalog-only.

## Targeted source search

The Arabic and English CIS, Applied Medical Sciences-Rabigh, and Communication and Media faculty pages were captured. Their visible and embedded navigation exposed regulations but no curriculum PDF, handbook, course-description table, or elective-option document for the named blockers.

A direct official KAU search for `JCOM 211` returned HTTP 200, but the code appeared only in the query state and no course result was published. The official legacy host `fcit.kau.edu.sa` resolved but timed out over HTTP and HTTPS; no content from it was captured or used. No unofficial content was used as academic evidence.

The useful new evidence came from other bilingual KAU curricula:

- Computer Science supplied `CS 121` and `CS 351`.
- Information Technology supplied `IT 203` and `IT 211`.
- Rabigh Nursing supplied `BIO 112`, `CHEM 112`, and an independent `ARAB 201` comparison.
- Visual and Audio Production supplied a fourth official media-plan comparison.

All captures are under the Git-ignored `data/raw/kau/plan_audit/bachelor_priority_recovery_5/` directory.

## New official captures

| Evidence | Lang | Retrieved UTC | Bytes | SHA-256 |
|---|---|---|---:|---|
| [CIS faculty](https://kau.edu.sa/faculty/ar/cis) | ar | 2026-07-24T20:52:42Z | 147385 | `aefafa196edb08cd06ea7bf0900b3b811e557439b8336b3105cb49f4a8a05bad` |
| [CIS faculty](https://kau.edu.sa/faculty/en/cis) | en | 2026-07-24T20:52:43Z | 139028 | `86589030c5d7c5689b7abbec2b50312939e60c54e0fde1c84f9722cc85eb62d2` |
| [Applied Medical Sciences-Rabigh faculty](https://kau.edu.sa/faculty/ar/applied-medical-sciences-rabigh) | ar | 2026-07-24T20:52:43Z | 125138 | `b67ffb3a28817ffb6786cc51f57255e0ebac3e2597c8aa7b30780557a99ddc22` |
| [Applied Medical Sciences-Rabigh faculty](https://kau.edu.sa/faculty/en/applied-medical-sciences-rabigh) | en | 2026-07-24T20:52:44Z | 117575 | `c94cdd3daff3631cd6563144ecbde228a37d3afd1787f7329106bed04a775d14` |
| [Communication and Media faculty](https://kau.edu.sa/faculty/ar/communication-media) | ar | 2026-07-24T20:52:44Z | 124896 | `6c2426255b7acda551e3a797b3c7204c42d1875703af50797896b5de28628411` |
| [Communication and Media faculty](https://kau.edu.sa/faculty/en/communication-media) | en | 2026-07-24T20:52:45Z | 117938 | `b1aa6ffd03a6e0aa7cbae1f1b8ba88feb21e748aca152116102b3758121f94b7` |
| [KAU search: JCOM 211](https://kau.edu.sa/en/search?search=JCOM%20211) | en | 2026-07-24T21:03:29Z | 144752 | `80dbb2f7d85e6eb2907e69eaf80724f0b80704a9e71f9effed5960920a17c612` |
| [Computer Science](https://kau.edu.sa/en/programs/bachelor-of-science-in-computer-science) | en | 2026-07-25T10:16:08Z | 207890 | `698827f523c7e240327486fe4b45dafa80f51f9222bcc746d79719849f3efa89` |
| [Computer Science](https://kau.edu.sa/ar/programs/bachelor-of-science-in-computer-science) | ar | 2026-07-25T10:16:09Z | 221982 | `c57e4554a20f83032020a9941c4c9104487e7c41882842446996c98f48dc9a04` |
| [Information Technology](https://kau.edu.sa/en/programs/bachelor-of-science-in-information-technology) | en | 2026-07-25T10:16:09Z | 219035 | `081c9b997733e5216c10f5da13c0e1f6327c19a609a6dfe5ce288bbf533c5f80` |
| [Information Technology](https://kau.edu.sa/ar/programs/bachelor-of-science-in-information-technology) | ar | 2026-07-25T10:16:09Z | 239406 | `fed39b3c0146e6062cbf26216316f687ef97491c4104489b495bec2c3f978203` |
| [Rabigh Nursing](https://kau.edu.sa/en/programs/bachelor-of-science-in-nursing) | en | 2026-07-25T10:16:10Z | 218386 | `5203257c5a8e6ce02cb051050e901a32fd17ce6e658f154f331a819ffde19b86` |
| [Rabigh Nursing](https://kau.edu.sa/ar/programs/bachelor-of-science-in-nursing) | ar | 2026-07-25T10:16:11Z | 238575 | `bb622a064466f7c80c55f9dce534195c49d6bf546f426d9d0a09208dd020664a` |
| [Visual and Audio Production](https://kau.edu.sa/en/programs/bachelor-of-visual-and-audio-production-program) | en | 2026-07-25T10:16:11Z | 227805 | `428806d46b4447375c89541148fcccd42a0edbb3d2c420473415b61918a7556a` |
| [Visual and Audio Production](https://kau.edu.sa/ar/programs/bachelor-of-visual-and-audio-production-program) | ar | 2026-07-25T10:16:12Z | 245614 | `3ad765a308bddc38b08966cd9e2bdbc786df16399caf634e9592a6b5d9a3b62e` |

The five target program pages and their hashes remain documented in the Phase 1 report. They were not recaptured or altered in Phase 2.

## Program decisions

### 1. Bachelor of Science in Cybersecurity

- Arabic: بكالوريوس العلوم في الامن السيبراني
- Faculty: الحاسبات وتقنية المعلومات / computing & information tech. (`IT`)
- Plan: 42 courses, 10 levels, 127 calculated credits; no official total published.
- Decision: `C. SKIPPED_UNRESOLVED_DEPENDENCY`

The new plans establish these identities in their own official curriculum contexts:

| Code | Arabic / English title | Credits | Official placement | Requisite | Context |
|---|---|---:|---|---|---|
| CS 121 | رياضيات الحوسبة / Mathematics for Computing | 3 | Second Level | MATH 110 | Computer Science and Information Technology |
| CS 351 | هندسة البرمجيات / Software Engineering | 3 | Fifth Level | CS 203 | Computer Science |
| IT 203 | لغات البرمجة / Programming Languages | 4 | Fourth Level | CS 202 | Information Technology |
| IT 211 | تنظيم ومعمارية الحاسوب / Computer Architecture & Organization | 3 | Fourth Level | IT 121 | Information Technology |

This resolves the four identities but not the target-plan dependency. The Cybersecurity level rows and named requirement groups omit all four courses. The supporting curricula do not establish their Cybersecurity placement, requirement status, or inclusion in its 127 calculated credits. Adding all four would add 13 credits and require academic interpretation.

The explicit project rows remain `SEC 498` Senior Project I (3 credits, Level 9) and `SEC 499` Senior Project II (3 credits, Level 10). No training row was published. Generic elective/free rows were not converted into option pools.

Safest action: keep catalog-only until an official Cybersecurity curriculum or faculty requirement table places and requires all four courses.

### 2. Bachelor of Medical Laboratories Science — Rabigh

- Arabic: بكالوريوس علوم المختبرات الطبية
- Faculty: العلوم الطبية التطبيقية- رابغ / Applied Medica.Sciences-rabigh (`RA`)
- Plan: 47 courses, 8 levels, 124 calculated credits; no official total published.
- Decision: `D. SKIPPED_ELECTIVE_AMBIGUITY`

Rabigh Nursing confirms `BIO 112` General Biology / الاحياء العامة and `CHEM 112` General Chemistry / الكيمياء العامة as 3-credit Level 1 shared-faculty rows with no prerequisite.

For `ARAB 201`, the scheduled Medical Laboratories row controls placement: Level 4, 3 credits, prerequisite `ARAB 101`, Arabic title اللغة العربية 2, and English title Arabic II. The supporting university-requirement wording Arabic Language 2 and its Arabic typographical variant do not add another row; code, credits, prerequisite, and academic meaning agree. Rabigh Nursing independently publishes the same identity and prerequisite.

`MLT 497` remains unresolved. The official target plan publishes it at Level 8 as a 2-credit row titled Electives / مواد اختيارية, but publishes no option codes, bilingual option names, membership, selection count, or selection-credit rule. The evidence does not establish whether it is a real standalone course or a group placeholder.

The explicit project row is `MLT 493` Student Research Project (2 credits, Level 7). No training row was published.

Safest action: keep catalog-only until an official MLT elective table defines `MLT 497` and the selection rule.

### 3. Journalism and Digital Media

- Arabic: برنامج بكالوريوس الصحافة والإعلام الرقمي
- Faculty: الاتصال والإعلام / communications&media (`CM`)
- Plan: 44 courses, 8 levels, 132 calculated credits; no official total published.
- Decision: `E. SKIPPED_CODE_OR_IDENTITY_CONFLICT`

Unresolved requisite-only codes remain `AVP 202` (used by `JCOM 321`), `JCOM 121` (used by `JCOM 342`), `JCOM 211` (used by `JCOM 343`), and `MRKC 213` (used by `JCOM 311`). None has an authoritative course row in the target plan, faculty pages, official KAU search result, or Visual and Audio Production comparison.

The plan also contains four 3-credit placeholders: elective at Level 4 (`xxx`), free at Level 4 (`x xx`), elective at Level 6 (`xx x`), and free at Level 6 (`x.xx`). They collapse to an unstable XXX-like identity, and no official option table or selection rule was found.

Explicit special rows remain `JCOM 446` Practical Training (6 credits, Level 8) and `JCOM 447` Graduation Project (4 credits, Level 8).

### 4. Marketing Communication

- Arabic: برنامج بكالوريوس الاتصال التسويقي
- Faculty: الاتصال والإعلام / communications&media (`CM`)
- Plan: 44 courses, 8 levels, 125 calculated credits; no official total published.
- Decision: `E. SKIPPED_CODE_OR_IDENTITY_CONFLICT`

`MRKC 213` remains a requisite-only identity used by `JCOM 311`; no authoritative course row was found in any compared media plan. The same four Level 4/6 elective/free placeholders remain without option membership or a selection rule.

The source explicitly publishes two zero-credit rows, and they were not reinterpreted: `MRKC 421` E-Marketing / الإيسام at Level 7 and `MRKC 435` Graduation Project / مشروع التخرج at Level 8. `MRKC 434` Cooperative Training is an explicit 6-credit Level 8 row.

### 5. Public Relations

- Arabic: برنامج بكالوريوس العلاقات العامة
- Faculty: الاتصال والإعلام / communications&media (`CM`)
- Plan: 44 courses, 8 levels, 130 calculated credits; no official total published.
- Decision: `E. SKIPPED_CODE_OR_IDENTITY_CONFLICT`

Unresolved requisite-only codes remain `JCOM 211` (used by `PR 331`), `MRKC 213` (used by `JCOM 311` and `PR 432`), and `PR 211` (used by `PR 322`). No compared official media plan supplies their course rows.

The plan contains four 3-credit Level 4/6 elective/free placeholders with colliding XXX-like identities and no option or selection table. The explicit zero-credit row `PR 327` Public Relations in Crisis Management / العلاقات العامة في الأزمات remains supported as published. `PR 435` Cooperative Training is 6 credits at Level 8, and `PR 436` Graduation Project is 5 credits at Level 8.

## Media cross-program reconciliation

The bilingual Journalism, Marketing Communication, Public Relations, and Visual and Audio Production plans agree on code, Arabic/English title, credits, and prerequisite notation for these scheduled shared rows:

`ARAB 101`, `ARAB 201`, `ISLS 101`, `ISLS 201`, `ISLS 301`, `ISLS 401`, `AVP 103`, `AVP 108`, `AVP 212`, `AVP 214`, `JCOM 105`, `JCOM 107`, `JCOM 213`, `JCOM 311`, `JCOM 313`, `MRKC 215`, `MRKC 312`, `MRKC 410`, `PR 104`, `PR 109`, `PR 216`, and `PR 219`.

`JCOM 105` is duplicated in one Visual and Audio supporting section with the same academic identity; it is not counted twice.

The unresolved set is `AVP 202`, `JCOM 121`, `JCOM 211`, `MRKC 213`, and `PR 211`. These occur only as prerequisite references in the scoped plans. Similar elective-placeholder shape across programs is not evidence that option membership is shared. None of the retrieved pages publishes a curriculum version or effective date, so no missing identity was transferred between programs.

## Import and safety result

No program met all import criteria. No planner record was added, no catalog entry was promoted, no elective option was converted into a required course, and no course, prerequisite, level, credit, zero-credit row, training row, or project row was invented. The current planner schema could represent these plans if authoritative missing data were later supplied; no planner, schema, API, authentication, localStorage, or Azure change was required or made.
