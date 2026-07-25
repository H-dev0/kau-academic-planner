# Bachelor Priority Faculties Wave

## Outcome

- In-scope bachelor programs: 36 across faculty IDs EA, AH, SC, IT, EN.
- Added as FULL_PLANNER: 0.
- Added as OFFICIAL_PLAN_VIEW: 8 (all eight previously catalog-only Engineering programs).
- Skipped: 2 (Geography/GIS and Sharia).
- Coverage: {'total': 223, 'FULL_PLANNER': 72, 'OFFICIAL_PLAN_VIEW': 15, 'CATALOG_ONLY': 136} → {'total': 223, 'FULL_PLANNER': 72, 'OFFICIAL_PLAN_VIEW': 23, 'CATALOG_ONLY': 128}.
- Planner datasets, planner calculations, progress/localStorage, APIs, authentication, Azure, and deployment configuration were not changed.

## Decision model

- B. OFFICIAL_PLAN_VIEW_READY: 8
- C. NEEDS_DETERMINISTIC_DISPLAY_NORMALIZATION: 1
- E. UNRESOLVED_ACADEMIC_RULES: 1
- F. ALREADY_SUPPORTED: 26

## Inventory

| Faculty | Program | Before | Decision | After | Levels AR/EN | Scheduled rows AR/EN |
|---|---|---|---|---|---:|---:|
| EA | Bachelor of Health Services and Hospital Administration (BA-HSA) (`catalog-economics-and-administration-bachelor-of-health-services-and-hospital-administrati`) | FULL_PLANNER | F. ALREADY_SUPPORTED | FULL_PLANNER | 8/8 | 30/30 |
| EA | Bachelor of Public Administration (`public-administration`) | FULL_PLANNER | F. ALREADY_SUPPORTED | FULL_PLANNER | 8/8 | 42/42 |
| EA | Bachelor of Science in Accounting (`accounting`) | FULL_PLANNER | F. ALREADY_SUPPORTED | FULL_PLANNER | 8/8 | 43/43 |
| EA | Bachelor of Science in Business Administration (`business-administration`) | FULL_PLANNER | F. ALREADY_SUPPORTED | FULL_PLANNER | 8/8 | 43/43 |
| EA | Bachelor of Science in Finance (`finance`) | FULL_PLANNER | F. ALREADY_SUPPORTED | FULL_PLANNER | 8/8 | 44/44 |
| EA | Bachelor of Science in Human Resource Management (`human-resources`) | FULL_PLANNER | F. ALREADY_SUPPORTED | FULL_PLANNER | 8/8 | 42/42 |
| EA | Bachelor of Science in Management Information Systems (`management-information-systems`) | FULL_PLANNER | F. ALREADY_SUPPORTED | FULL_PLANNER | 8/8 | 43/43 |
| EA | Bachelors of Economics (`economics`) | FULL_PLANNER | F. ALREADY_SUPPORTED | FULL_PLANNER | 8/8 | 37/37 |
| EA | Bachelor’s Degree in Marketing (`marketing`) | FULL_PLANNER | F. ALREADY_SUPPORTED | FULL_PLANNER | 8/8 | 43/43 |
| EA | Political Science (`catalog-political-science`) | OFFICIAL_PLAN_VIEW | F. ALREADY_SUPPORTED | OFFICIAL_PLAN_VIEW | 8/8 | 46/46 |
| AH | Bachelor in French Language & Translation (`catalog-bachelor-in-french-language-translation`) | OFFICIAL_PLAN_VIEW | F. ALREADY_SUPPORTED | OFFICIAL_PLAN_VIEW | 12/12 | 139/139 |
| AH | Bachelor of Arabic Language (`catalog-arts-and-humanities-bachelor-of-arabic-language`) | FULL_PLANNER | F. ALREADY_SUPPORTED | FULL_PLANNER | 12/12 | 98/98 |
| AH | Bachelor of Chinese Language (`catalog-chinese-language`) | OFFICIAL_PLAN_VIEW | F. ALREADY_SUPPORTED | OFFICIAL_PLAN_VIEW | 10/10 | 76/76 |
| AH | Bachelor of Counseling Psychology (`catalog-counseling-psychology`) | OFFICIAL_PLAN_VIEW | F. ALREADY_SUPPORTED | OFFICIAL_PLAN_VIEW | 10/10 | 72/72 |
| AH | Bachelor of Geography and Geographic Information Systems (`catalog-geography-and-geographic-information-systems`) | CATALOG_ONLY | C. NEEDS_DETERMINISTIC_DISPLAY_NORMALIZATION | CATALOG_ONLY | 10/10 | 94/94 |
| AH | Bachelor of Information Science (`catalog-arts-and-humanities-bachelor-of-information-science`) | FULL_PLANNER | F. ALREADY_SUPPORTED | FULL_PLANNER | 18/18 | 92/92 |
| AH | Bachelor of Sharia (`catalog-bachelor-of-sharia`) | CATALOG_ONLY | E. UNRESOLVED_ACADEMIC_RULES | CATALOG_ONLY | 18/18 | 206/206 |
| SC | Bachelor of Biochemistry (`catalog-science-bachelor-of-biochemistry`) | FULL_PLANNER | F. ALREADY_SUPPORTED | FULL_PLANNER | 10/10 | 71/71 |
| IT | Bachelor of Science in Computer Science (`catalog-bachelor-of-science-in-computer-science`) | OFFICIAL_PLAN_VIEW | F. ALREADY_SUPPORTED | OFFICIAL_PLAN_VIEW | 10/10 | 50/50 |
| IT | Bachelor of Science in Cybersecurity (`catalog-bachelor-of-science-in-cybersecurity`) | OFFICIAL_PLAN_VIEW | F. ALREADY_SUPPORTED | OFFICIAL_PLAN_VIEW | 10/10 | 42/42 |
| IT | Bachelor of Science in Information Systems (`catalog-computing-information-tech-bachelor-of-science-in-information-systems`) | FULL_PLANNER | F. ALREADY_SUPPORTED | FULL_PLANNER | 10/10 | 45/45 |
| IT | Bachelor of Science in Information Technology (`catalog-computing-information-tech-bachelor-of-science-in-information-technology`) | FULL_PLANNER | F. ALREADY_SUPPORTED | FULL_PLANNER | 10/10 | 50/50 |
| EN | Bachelor of Science in Chemical Engineering (`catalog-engineering-bachelor-of-science-in-chemical-engineering`) | FULL_PLANNER | F. ALREADY_SUPPORTED | FULL_PLANNER | 13/13 | 88/88 |
| EN | Bachelor of Science in Civil Engineering (`catalog-engineering-bachelor-of-science-in-civil-engineering`) | CATALOG_ONLY | B. OFFICIAL_PLAN_VIEW_READY | OFFICIAL_PLAN_VIEW | 14/14 | 91/91 |
| EN | Bachelor of Science in Electrical Engineering (Biomedical) (`catalog-engineering-bachelor-of-science-in-electrical-engineering-biomedical`) | CATALOG_ONLY | B. OFFICIAL_PLAN_VIEW_READY | OFFICIAL_PLAN_VIEW | 13/13 | 88/88 |
| EN | Bachelor of Science in Electrical Engineering (Computer) (`catalog-engineering-bachelor-of-science-in-electrical-engineering-computer`) | CATALOG_ONLY | B. OFFICIAL_PLAN_VIEW_READY | OFFICIAL_PLAN_VIEW | 13/13 | 88/88 |
| EN | Bachelor of Science in Electrical Engineering (Electronics and Communications) (`catalog-engineering-bachelor-of-science-in-electrical-engineering-electronics-and-communic`) | CATALOG_ONLY | B. OFFICIAL_PLAN_VIEW_READY | OFFICIAL_PLAN_VIEW | 13/13 | 87/87 |
| EN | Bachelor of Science in Electrical Engineering (Power and Machines) (`catalog-engineering-bachelor-of-science-in-electrical-engineering-power-and-machines`) | CATALOG_ONLY | B. OFFICIAL_PLAN_VIEW_READY | OFFICIAL_PLAN_VIEW | 13/13 | 92/92 |
| EN | Bachelor of Science in Industrial Engineering (`catalog-engineering-bachelor-of-science-in-industrial-engineering`) | FULL_PLANNER | F. ALREADY_SUPPORTED | FULL_PLANNER | 0/0 | 0/0 |
| EN | Bachelor of Science in Mechanical Engineering (Aeronautical) (`catalog-engineering-bachelor-of-science-in-mechanical-engineering-aeronautical`) | CATALOG_ONLY | B. OFFICIAL_PLAN_VIEW_READY | OFFICIAL_PLAN_VIEW | 13/13 | 93/93 |
| EN | Bachelor of Science in Mechanical Engineering (Production and Mechanical Systems Design) (`catalog-engineering-bachelor-of-science-in-mechanical-engineering-production-and-mechanica`) | FULL_PLANNER | F. ALREADY_SUPPORTED | FULL_PLANNER | 0/0 | 0/0 |
| EN | Bachelor of Science in Mechanical Engineering (Thermal Engineering and Desalination Technology) (`catalog-engineering-bachelor-of-science-in-mechanical-engineering-thermal-engineering-and-`) | CATALOG_ONLY | B. OFFICIAL_PLAN_VIEW_READY | OFFICIAL_PLAN_VIEW | 14/14 | 104/104 |
| EN | Bachelor of Science in Mining Engineering (`catalog-engineering-bachelor-of-science-in-mining-engineering`) | CATALOG_ONLY | B. OFFICIAL_PLAN_VIEW_READY | OFFICIAL_PLAN_VIEW | 14/14 | 89/89 |
| EN | Bachelor of Science in Nuclear Engineering (`catalog-engineering-bachelor-of-science-in-nuclear-engineering`) | FULL_PLANNER | F. ALREADY_SUPPORTED | FULL_PLANNER | 13/13 | 98/98 |
| EN | Bachelor of Science in Nuclear Engineering (Medical Physics) (`catalog-engineering-bachelor-of-science-in-nuclear-engineering-medical-physics`) | FULL_PLANNER | F. ALREADY_SUPPORTED | FULL_PLANNER | 13/13 | 98/98 |
| EN | Bachelor of Science in Nuclear Engineering (Radiation Protection) (`catalog-engineering-bachelor-of-science-in-nuclear-engineering-radiation-protection`) | FULL_PLANNER | F. ALREADY_SUPPORTED | FULL_PLANNER | 13/13 | 96/96 |

## New read-only official plan views

### Bachelor of Science in Civil Engineering

- ID: `catalog-engineering-bachelor-of-science-in-civil-engineering`
- Displayed rows / visible credits: 66 / 196
- Scheduled / unplaced sections: 12 / 1
- Exact duplicate occurrences consolidated: 53
- Published placeholders retained: 2
- Unresolved requisite rows retained: 6
- Official sources: https://www.kau.edu.sa/ar/programs/bachelor-of-science-in-civil-engineering ; https://www.kau.edu.sa/en/programs/bachelor-of-science-in-civil-engineering

### Bachelor of Science in Electrical Engineering (Biomedical)

- ID: `catalog-engineering-bachelor-of-science-in-electrical-engineering-biomedical`
- Displayed rows / visible credits: 67 / 200
- Scheduled / unplaced sections: 11 / 3
- Exact duplicate occurrences consolidated: 49
- Published placeholders retained: 3
- Unresolved requisite rows retained: 8
- Official sources: https://www.kau.edu.sa/ar/programs/bachelor-of-science-in-electrical-engineering-biomedical ; https://www.kau.edu.sa/en/programs/bachelor-of-science-in-electrical-engineering-biomedical

### Bachelor of Science in Electrical Engineering (Computer)

- ID: `catalog-engineering-bachelor-of-science-in-electrical-engineering-computer`
- Displayed rows / visible credits: 67 / 200
- Scheduled / unplaced sections: 11 / 2
- Exact duplicate occurrences consolidated: 48
- Published placeholders retained: 4
- Unresolved requisite rows retained: 7
- Official sources: https://www.kau.edu.sa/ar/programs/bachelor-of-science-in-electrical-engineering-computer ; https://www.kau.edu.sa/en/programs/bachelor-of-science-in-electrical-engineering-computer

### Bachelor of Science in Electrical Engineering (Electronics and Communications)

- ID: `catalog-engineering-bachelor-of-science-in-electrical-engineering-electronics-and-communic`
- Displayed rows / visible credits: 63 / 187
- Scheduled / unplaced sections: 11 / 2
- Exact duplicate occurrences consolidated: 52
- Published placeholders retained: 3
- Unresolved requisite rows retained: 7
- Official sources: https://www.kau.edu.sa/ar/programs/bachelor-of-science-in-electrical-engineering-electronics-and-communications ; https://www.kau.edu.sa/en/programs/bachelor-of-science-in-electrical-engineering-electronics-and-communications

### Bachelor of Science in Electrical Engineering (Power and Machines)

- ID: `catalog-engineering-bachelor-of-science-in-electrical-engineering-power-and-machines`
- Displayed rows / visible credits: 68 / 195
- Scheduled / unplaced sections: 11 / 3
- Exact duplicate occurrences consolidated: 54
- Published placeholders retained: 1
- Unresolved requisite rows retained: 8
- Official sources: https://www.kau.edu.sa/ar/programs/bachelor-of-science-in-electrical-engineering-power-and-machines ; https://www.kau.edu.sa/en/programs/bachelor-of-science-in-electrical-engineering-power-and-machines

### Bachelor of Science in Mechanical Engineering (Aeronautical)

- ID: `catalog-engineering-bachelor-of-science-in-mechanical-engineering-aeronautical`
- Displayed rows / visible credits: 66 / 183
- Scheduled / unplaced sections: 11 / 1
- Exact duplicate occurrences consolidated: 55
- Published placeholders retained: 3
- Unresolved requisite rows retained: 5
- Official sources: https://www.kau.edu.sa/ar/programs/bachelor-of-science-in-mechanical-engineering-aeronautical ; https://www.kau.edu.sa/en/programs/bachelor-of-science-in-mechanical-engineering-aeronautical

### Bachelor of Science in Mechanical Engineering (Thermal Engineering and Desalination Technology)

- ID: `catalog-engineering-bachelor-of-science-in-mechanical-engineering-thermal-engineering-and-`
- Displayed rows / visible credits: 75 / 218
- Scheduled / unplaced sections: 12 / 1
- Exact duplicate occurrences consolidated: 57
- Published placeholders retained: 1
- Unresolved requisite rows retained: 9
- Official sources: https://www.kau.edu.sa/ar/programs/bachelor-of-science-in-mechanical-engineering-thermal-engineering-and-desalination-technology ; https://www.kau.edu.sa/en/programs/bachelor-of-science-in-mechanical-engineering-thermal-engineering-and-desalination-technology

### Bachelor of Science in Mining Engineering

- ID: `catalog-engineering-bachelor-of-science-in-mining-engineering`
- Displayed rows / visible credits: 64 / 185
- Scheduled / unplaced sections: 12 / 1
- Exact duplicate occurrences consolidated: 53
- Published placeholders retained: 2
- Unresolved requisite rows retained: 4
- Official sources: https://www.kau.edu.sa/ar/programs/bachelor-of-science-in-mining-engineering ; https://www.kau.edu.sa/en/programs/bachelor-of-science-in-mining-engineering

## Skipped

### Bachelor of Geography and Geographic Information Systems

- Classification: C. NEEDS_DETERMINISTIC_DISPLAY_NORMALIZATION
- Blocker: The current bilingual source exposes 94 level-like row occurrences plus 109 direct requirement/description rows, but four visible semester slots are empty and 72 courses are nested under a separate Required Courses level-like section. Exact-signature consolidation yields 92 identities / 266 visible credits, inconsistent with the committed 64-row / 183-credit expectation; unsafe deduplication was not attempted.

### Bachelor of Sharia

- Classification: E. UNRESOLVED_ACADEMIC_RULES
- Blocker: The official narrative states 72 courses / 166 credits, while the structured payload exposes 18 level-like sections, 206 scheduled row occurrences, and 81 direct rows. The named eight-level schedule contains 71 rows / 128 credits and exact-signature consolidation yields 73 identities / 134 credits; elective-choice and zero-credit discrepancies require academic confirmation.

## Validation

- `PYTHONPATH=src python3 -m unittest discover -s tests -v`: 105 tests passed.
- Python compile and JavaScript syntax checks passed; `git diff --check` passed.
- All 22 repository JSON files, 8 CSV files, 15 report Markdown files, and the ignored 88-entry capture manifest validated.
- All 72 FULL_PLANNER programs loaded and completed level-by-level simulation: 2,213 rows, 1,378 initially available, 835 initially blocked, and 237 permanently blocked after valid closure. No null, NaN, exception, or infinite loop occurred.
- Accounting remained 43 courses / 38 initially available / 5 blocked. Finance remained 43 / 43 / 0, including unchanged Finance ISLS 201 behavior.
- All 23 OFFICIAL_PLAN_VIEW programs passed read-only API checks: `/api/plan`, progress GET, and progress POST each rejected every view.
- Ten Playwright Chromium cases covered all eight new views across Arabic/English, RTL/LTR, desktop/mobile, and light/dark themes. All showed the bilingual read-only warning, official rows and source links, no planner controls or progress keys, no horizontal overflow, and no console/page errors.
- Screenshots are retained locally under `data/raw/kau/plan_audit/bachelor_priority_faculties_wave/visual/` and remain ignored with the official captures.
- All temporary server and browser processes were stopped.

## Evidence

- Capture manifest: `data/raw/kau/plan_audit/bachelor_priority_faculties_wave/manifest.json` (ignored local evidence).
- The JSON report contains per-language feature counts, URLs, sizes, timestamps, and SHA-256 hashes for all 36 programs.
