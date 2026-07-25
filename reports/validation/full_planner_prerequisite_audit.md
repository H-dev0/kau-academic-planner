# Full planner prerequisite-integrity audit

Generated: 2026-07-25

## Executive conclusion

All **72** FULL_PLANNER programs and **963** requisite edges were audited. Same-program retained raw/reconciliation evidence confirms **36** edges; **927** stored edges remain evidence-insufficient. The runtime-equivalent simulations produced **0** exceptions.

Finance ISLS 201: **E. Official evidence insufficient**. It is initially available because the stored array is empty. No retained official Finance text explicitly establishes ISLS 101 as its prerequisite, so correctness cannot be decided without new official evidence. This is not a confirmed planner-logic defect.

## Summary

| Metric | Count |
|---|---:|
| programs audited | 72 |
| courses audited | 2213 |
| prerequisite edges checked | 963 |
| corequisite edges checked | 0 |
| total edges checked | 963 |
| confirmed correct edges | 36 |
| edges with insufficient retained evidence | 927 |
| confirmed academic data defects | 0 |
| normalization alias defects | 91 |
| planner logic defects | 0 |
| unsupported academic rules | 18 |
| evidence insufficient cases | 1053 |
| initially available anomalies | 0 |
| permanently blocked anomalies | 314 |
| programs with never unlock courses | 30 |
| simulation exceptions | 0 |

## Finance ISLS 201

- Planner data key: `finance`
- ISLS 101 effective record: `{"semester_or_level": "level 1", "course_code": "ISLS 101", "official_course_name": "Islamic Studies 1", "credit_hours": 2, "prerequisites": []}`
- ISLS 101 origin: `server.js common-foundation injection`
- ISLS 201 stored record: `{"semester_or_level": "level 3", "course_code": "ISLS 201", "official_course_name": "الثقافة الإسلامية 2", "credit_hours": 2, "prerequisites": []}`
- ISLS 201 prerequisites: `[]`; corequisites: `[]`; retained raw requisite text: `null`.
- Stored plan source: User-provided Finance study plan image (not retained in the repository as official prerequisite evidence)
- Official metadata URL: https://kau.edu.sa/en/programs/bachelor-of-science-in-finance
- Conclusion: Cannot be determined from retained official Finance evidence. The behavior matches stored data; there is no evidence of a planner calculation defect.

## Affected programs and courses

- `catalog-applied-medica-sciences-bachelor-of-clinical-nutrition`: CLN 220 (missing_dependency_code); CLN 231 (missing_dependency_code); CLN233 (missing_dependency_code); CLN345 (missing_dependency_code); CLN460 (missing_dependency_code); ELIS-120 (missing_dependency_code)
- `catalog-computing-information-tech-bachelor-of-science-in-information-systems`: CIS 221 (compound_or_bilingual_requisite_failed_to_normalize); CIS 333 (compound_or_bilingual_requisite_failed_to_normalize); CIS 352 (compound_or_bilingual_requisite_failed_to_normalize); CIS 361 (compound_or_bilingual_requisite_failed_to_normalize); CIS 440 (compound_or_bilingual_requisite_failed_to_normalize); CIS 497 (missing_dependency_code); CIS 499 (missing_dependency_code)
- `catalog-computing-information-tech-bachelor-of-science-in-information-technology`: IT 241 (missing_dependency_code); IT 351 (compound_or_bilingual_requisite_failed_to_normalize); IT 361 (compound_or_bilingual_requisite_failed_to_normalize); IT 472 (compound_or_bilingual_requisite_failed_to_normalize)
- `catalog-earth-sciences-bachelor-general-geology-structural-geology-and-remote-sensing`: CPCS 335 (missing_dependency_code); ESR 399 (missing_dependency_code); ESR 408 (missing_dependency_code); ISLS 201 (compound_or_bilingual_requisite_failed_to_normalize); ISLS 301 (compound_or_bilingual_requisite_failed_to_normalize); ISLS 401 (compound_or_bilingual_requisite_failed_to_normalize)
- `catalog-earth-sciences-bachelor-of-general-geology-geo-exploration-techniques`: CPCS 335 (missing_dependency_code); EGT 322 (missing_dependency_code); EGT 399 (compound_or_bilingual_requisite_failed_to_normalize); EGT 431 (compound_or_bilingual_requisite_failed_to_normalize); EGT 499 (compound_or_bilingual_requisite_failed_to_normalize)
- `catalog-earth-sciences-bachelor-of-geophysics`: CPCS 335 (missing_dependency_code); EGP 321 (compound_or_bilingual_requisite_failed_to_normalize); EGP 331 (missing_dependency_code); EGP 341 (missing_dependency_code); EGP 399 (compound_or_bilingual_requisite_failed_to_normalize); EGP 408 (compound_or_bilingual_requisite_failed_to_normalize); EGP 416 (compound_or_bilingual_requisite_failed_to_normalize); EGP 418 (compound_or_bilingual_requisite_failed_to_normalize); EGP 422 (compound_or_bilingual_requisite_failed_to_normalize); EGP 431 (compound_or_bilingual_requisite_failed_to_normalize); EGP 441 (compound_or_bilingual_requisite_failed_to_normalize); EGP 451 (compound_or_bilingual_requisite_failed_to_normalize); ESR 201 (missing_dependency_code); ESR 202 (missing_dependency_code); ESR 203 (missing_dependency_code)
- `catalog-earth-sciences-bachelor-of-mineral-resources-and-rocks`: CPCS 335 (missing_dependency_code); EMR 337 (missing_dependency_code); EMR 338 (missing_dependency_code); EMR 412 (missing_dependency_code)
- `catalog-earth-sciences-bachelor-of-science-in-engineering-and-environmental-geology`: CPCS 335 (missing_dependency_code); EEG 200 (missing_dependency_code); EEG 332 (compound_or_bilingual_requisite_failed_to_normalize); EEG 442 (compound_or_bilingual_requisite_failed_to_normalize); EEG 443 (compound_or_bilingual_requisite_failed_to_normalize); EEG 444 (compound_or_bilingual_requisite_failed_to_normalize); EEG 499 (compound_or_bilingual_requisite_failed_to_normalize); ُEEG 341 (compound_or_bilingual_requisite_failed_to_normalize)
- `catalog-earth-sciences-hydrogeology-bsc`: EEG 201 (missing_dependency_code); EHG 311 (missing_dependency_code); EHG 312 (missing_dependency_code); EHG 313 (missing_dependency_code); EHG 314 (missing_dependency_code); EHG 413 (missing_dependency_code); EMR 223 (missing_dependency_code); ESR 220 (compound_or_bilingual_requisite_failed_to_normalize); ESR 221 (compound_or_bilingual_requisite_failed_to_normalize)
- `catalog-earth-sciences-petroleum-geology-and-sedimentology-bsc`: CPCS 335 (missing_dependency_code)
- `catalog-engineering-bachelor-of-science-in-chemical-engineering`: ChE 411 (missing_dependency_code); ChE 412 (missing_dependency_code); ChE 413 (missing_dependency_code); ChE 414 (missing_dependency_code); ChE 422 (missing_dependency_code); ChE 452 (missing_dependency_code); ChE 462 (missing_dependency_code); ChE 463 (missing_dependency_code); ChE 464 (missing_dependency_code); ChE 465 (missing_dependency_code); ChE 471 (missing_dependency_code)
- `catalog-engineering-bachelor-of-science-in-industrial-engineering`: IE323 (missing_dependency_code)
- `catalog-engineering-bachelor-of-science-in-mechanical-engineering-production-and-mechanica`: MEP 451 (missing_dependency_code)
- `catalog-engineering-bachelor-of-science-in-nuclear-engineering`: IE 301 (unsupported_academic_rule); NE 321 (missing_dependency_code); NE 330 (missing_dependency_code); NE 361 (missing_dependency_code); NE 450 (missing_dependency_code); NE 475 (missing_dependency_code); NE 478 (missing_dependency_code); NE 497 (unsupported_academic_rule)
- `catalog-engineering-bachelor-of-science-in-nuclear-engineering-medical-physics`: IE 301 (unsupported_academic_rule); NE 461 (missing_dependency_code); NE 462 (missing_dependency_code); NE 463 (missing_dependency_code); NE 494 (unsupported_academic_rule); NE 495 (unsupported_academic_rule)
- `catalog-engineering-bachelor-of-science-in-nuclear-engineering-radiation-protection`: IE 301 (unsupported_academic_rule); ISLS 201 (missing_dependency_code); NE 307 (missing_dependency_code); NE 450 (missing_dependency_code); NE 461 (missing_dependency_code); NE 462 (missing_dependency_code); NE 463 (missing_dependency_code); NE 475 (missing_dependency_code); NE 477 (missing_dependency_code); NE 492 (unsupported_academic_rule); NE 493 (unsupported_academic_rule)
- `catalog-engineering-rabigh-chemical-and-materials-engineering`: ARAB 201   عرب 201 (missing_dependency_code); ELIS 120     نجلع `120 (missing_dependency_code); ISLS 201   سلم 201 (missing_dependency_code); ISLS 301    سلم 301 (duplicate_course_code_conflicting_identity); ISLS 301    سلم 301 (missing_dependency_code)
- `catalog-engineering-rabigh-civil-and-environmental-engineering`: CEN 390      هن مد 390 (unsupported_academic_rule)
- `catalog-environmental-sciences-bachelor-of-science-in-arid-land-agricultural-general-progr`: AGRI302 (missing_dependency_code); AGRI342 (missing_dependency_code); AGRI441 (missing_dependency_code)
- `catalog-environmental-sciences-bachelor-of-science-in-environment`: ENS 464 (missing_dependency_code); ENS 465 (missing_dependency_code); ENS361 (compound_or_bilingual_requisite_failed_to_normalize); ENS407 (compound_or_bilingual_requisite_failed_to_normalize)
- `catalog-human-sciences-and-design-bacheior-interior-design-and-furniture`: ID 222 (compound_or_bilingual_requisite_failed_to_normalize); ID 408 (compound_or_bilingual_requisite_failed_to_normalize); ID 454 (missing_dependency_code); سلم 201 (missing_dependency_code); غ ت 401 (duplicate_course_code_conflicting_identity)
- `catalog-human-sciences-and-design-bachelor-of-science-b-sc-in-family-sciences`: FNU 219 (missing_dependency_code); FNU329 (missing_dependency_code); FS 391 (compound_or_bilingual_requisite_failed_to_normalize); FS 392 (compound_or_bilingual_requisite_failed_to_normalize); عرب 101 (duplicate_course_code_conflicting_identity)
- `catalog-human-sciences-and-design-bachelor-s-department-of-early-childhood-guide`: إنج 101 (duplicate_course_code_conflicting_identity); ت ط ف م 111 (duplicate_course_code_conflicting_identity); ت ط ف م 251 (compound_or_bilingual_requisite_failed_to_normalize); ت ط ف م 253 (missing_dependency_code); ت ط ف م 458 (compound_or_bilingual_requisite_failed_to_normalize); ت ط ف م 459 (compound_or_bilingual_requisite_failed_to_normalize); سلم 201 (duplicate_course_code_conflicting_identity); سلم 301 (duplicate_course_code_conflicting_identity)
- `catalog-law-bachelor-degree-in-law`: LAWG 432 (compound_or_bilingual_requisite_failed_to_normalize); LAWG 491 (unsupported_academic_rule); LAWP 214 (compound_or_bilingual_requisite_failed_to_normalize); LAWP 312 (compound_or_bilingual_requisite_failed_to_normalize); LAWP 372 (compound_or_bilingual_requisite_failed_to_normalize); LAWP 415 (compound_or_bilingual_requisite_failed_to_normalize); LAWP 424 (compound_or_bilingual_requisite_failed_to_normalize)
- `catalog-med-rehabilitation-sciences-bachelor-s-degree-of-occupational-therapy`: ANTM 210 (missing_dependency_code); OCTH 221 (missing_dependency_code); OCTH 222 (missing_dependency_code); OCTH 223 (missing_dependency_code); OCTH 224 (missing_dependency_code); OCTH 351 (compound_or_bilingual_requisite_failed_to_normalize); OCTH 352 (compound_or_bilingual_requisite_failed_to_normalize); OCTH 461 (compound_or_bilingual_requisite_failed_to_normalize); OCTH 473 (compound_or_bilingual_requisite_failed_to_normalize); OCTH 475 (compound_or_bilingual_requisite_failed_to_normalize); OCTH 476 (compound_or_bilingual_requisite_failed_to_normalize); OCTH 477 (compound_or_bilingual_requisite_failed_to_normalize); OCTH 481 (missing_dependency_code); PT 310 (missing_dependency_code); سلم ٢٠١ | ISLS 201 (compound_or_bilingual_requisite_failed_to_normalize); سلم ٣٠١ | ISLS 301 (compound_or_bilingual_requisite_failed_to_normalize); سلم ٤٠١ | ISLS 401 (compound_or_bilingual_requisite_failed_to_normalize); عرب  ٢٠١ | ARAB 201 (compound_or_bilingual_requisite_failed_to_normalize)
- `catalog-med-rehabilitation-sciences-bachelor-s-degree-of-physical-therapy`: ANTM 210 (missing_dependency_code); PT 310 (missing_dependency_code)
- `catalog-med-rehabilitation-sciences-bachelor-s-degree-of-speech-language-pathology-and-aud`: SLPA 222 (compound_or_bilingual_requisite_failed_to_normalize); SLPA 224 (compound_or_bilingual_requisite_failed_to_normalize); SLPA 313 (compound_or_bilingual_requisite_failed_to_normalize); SLPA 333 (compound_or_bilingual_requisite_failed_to_normalize); SLPA 334 (compound_or_bilingual_requisite_failed_to_normalize); SLPA 341 (compound_or_bilingual_requisite_failed_to_normalize); SLPA 344 (compound_or_bilingual_requisite_failed_to_normalize); SLPA 346 (compound_or_bilingual_requisite_failed_to_normalize); SLPA 361 (compound_or_bilingual_requisite_failed_to_normalize); SLPA 362 (compound_or_bilingual_requisite_failed_to_normalize); SLPA 363 (compound_or_bilingual_requisite_failed_to_normalize); SLPA 364 (compound_or_bilingual_requisite_failed_to_normalize); SLPA 365 (compound_or_bilingual_requisite_failed_to_normalize); SLPA 381 (compound_or_bilingual_requisite_failed_to_normalize); SLPA 432 (compound_or_bilingual_requisite_failed_to_normalize); SLPA 472 (compound_or_bilingual_requisite_failed_to_normalize); SLPA 482 (compound_or_bilingual_requisite_failed_to_normalize); SLPA 483 (compound_or_bilingual_requisite_failed_to_normalize); SLPA 485 (compound_or_bilingual_requisite_failed_to_normalize); SLPA 491 (compound_or_bilingual_requisite_failed_to_normalize); SLPA 494 (compound_or_bilingual_requisite_failed_to_normalize); سلم ٢٠١ | ISLS 201 (compound_or_bilingual_requisite_failed_to_normalize); سلم ٣٠١ | ISLS 301 (compound_or_bilingual_requisite_failed_to_normalize); سلم ٤٠١ | ISLS 401 (compound_or_bilingual_requisite_failed_to_normalize); عرب  ٢٠١ | ARAB 201 (compound_or_bilingual_requisite_failed_to_normalize)
- `catalog-medicine-bachelor-s-degree-in-medicine-and-surgery`: CPCS 335 (missing_dependency_code); MEED 632 (missing_dependency_code)
- `catalog-medicine-rabigh-bachelor-of-medicine-and-surgery-mbbs`: ENT 351 (missing_dependency_code); ENT 351 (unsupported_academic_rule)
- `catalog-science-bachelor-of-biochemistry`: BIOC 200 (unsupported_academic_rule); BIOC 380 (unsupported_academic_rule); BIOC 390 (unsupported_academic_rule); BIOC 392 (compound_or_bilingual_requisite_failed_to_normalize); BIOC 445 (compound_or_bilingual_requisite_failed_to_normalize); BIOC 491 (unsupported_academic_rule); Free courses (unsupported_academic_rule)

## Cross-program shared-course audit

The JSON report records **1013** occurrences and **11** differing prerequisite signatures. It includes every ISLS row and every code occurring in at least two planners, with bilingual titles, credits, levels, arrays, raw text, sources, and curriculum context. Differences are not automatically defects.

## Program simulation matrix

| Program | Courses | Edges | Initially available | Initially blocked | Never unlock | Missing codes | Unsupported rules | Exception |
|---|---:|---:|---:|---:|---:|---:|---:|---|
| `catalog-arts-and-humanities-bachelor-of-arabic-language` | 12 | 5 | 7 | 5 | 0 | 0 | 0 | none |
| `catalog-arts-and-humanities-bachelor-of-information-science` | 10 | 4 | 6 | 4 | 0 | 0 | 0 | none |
| `catalog-economics-and-administration-bachelor-of-health-services-and-hospital-administrati` | 4 | 0 | 4 | 0 | 0 | 0 | 0 | none |
| `public-administration` | 43 | 0 | 43 | 0 | 0 | 0 | 0 | none |
| `accounting` | 43 | 5 | 38 | 5 | 0 | 0 | 0 | none |
| `business-administration` | 44 | 0 | 44 | 0 | 0 | 0 | 0 | none |
| `finance` | 43 | 0 | 43 | 0 | 0 | 0 | 0 | none |
| `human-resources` | 43 | 0 | 43 | 0 | 0 | 0 | 0 | none |
| `management-information-systems` | 43 | 0 | 43 | 0 | 0 | 0 | 0 | none |
| `economics` | 41 | 0 | 41 | 0 | 0 | 0 | 0 | none |
| `marketing` | 43 | 0 | 43 | 0 | 0 | 0 | 0 | none |
| `catalog-business-economics` | 10 | 0 | 10 | 0 | 0 | 0 | 0 | none |
| `catalog-executive-master-in-human-resource-management` | 11 | 4 | 8 | 3 | 0 | 0 | 0 | none |
| `catalog-executive-master-in-public-policy` | 13 | 10 | 5 | 8 | 0 | 0 | 0 | none |
| `catalog-executive-master-of-health-administration-emha` | 15 | 0 | 15 | 0 | 0 | 0 | 0 | none |
| `catalog-information-systems-management-and-digitalization` | 14 | 9 | 5 | 9 | 0 | 0 | 0 | none |
| `catalog-associate-diploma-in-applications-development` | 10 | 6 | 6 | 4 | 0 | 0 | 0 | none |
| `catalog-general-associate-diploma-in-digital-transformation` | 10 | 4 | 7 | 3 | 0 | 0 | 0 | none |
| `catalog-intermediate-diploma-in-cybersecurity-distance` | 20 | 2 | 18 | 2 | 0 | 0 | 0 | none |
| `catalog-intermediate-diploma-in-data-science` | 20 | 1 | 19 | 1 | 0 | 0 | 0 | none |
| `catalog-computing-information-tech-bachelor-of-science-in-information-systems` | 44 | 29 | 15 | 29 | 8 | 6 | 0 | none |
| `catalog-computing-information-tech-bachelor-of-science-in-information-technology` | 38 | 26 | 12 | 26 | 9 | 4 | 0 | none |
| `catalog-law-bachelor-degree-in-law` | 51 | 31 | 20 | 31 | 7 | 7 | 1 | none |
| `catalog-maritime-studies-bachelor-of-marine-engineering` | 18 | 4 | 14 | 4 | 0 | 0 | 0 | none |
| `catalog-maritime-studies-bachelor-of-supply-chains-maritime-business` | 18 | 4 | 14 | 4 | 0 | 0 | 0 | none |
| `catalog-maritime-studies-bachelor-of-the-marine-surveying` | 18 | 4 | 14 | 4 | 0 | 0 | 0 | none |
| `catalog-tourism-bachelor-of-hospitality-management` | 4 | 0 | 4 | 0 | 0 | 0 | 0 | none |
| `catalog-medicine-bachelor-s-degree-in-medicine-and-surgery` | 51 | 9 | 44 | 7 | 2 | 3 | 0 | none |
| `catalog-medicine-rabigh-bachelor-of-medicine-and-surgery-mbbs` | 56 | 7 | 52 | 4 | 1 | 4 | 3 | none |
| `catalog-science-bachelor-of-biochemistry` | 51 | 41 | 10 | 41 | 7 | 5 | 5 | none |
| `catalog-environmental-sciences-bachelor-of-science-in-arid-land-agricultural-general-progr` | 77 | 24 | 53 | 24 | 3 | 1 | 0 | none |
| `catalog-environmental-sciences-bachelor-of-science-in-arid-land-agricultural-renewable-nat` | 63 | 27 | 37 | 26 | 0 | 0 | 0 | none |
| `catalog-environmental-sciences-bachelor-of-science-in-environment` | 71 | 58 | 14 | 57 | 4 | 3 | 0 | none |
| `catalog-doctor-of-philosophy-in-meteorology` | 26 | 0 | 26 | 0 | 0 | 0 | 0 | none |
| `catalog-master-of-science-in-environmental-science` | 34 | 0 | 34 | 0 | 0 | 0 | 0 | none |
| `catalog-master-of-science-in-hydrology-and-water-resources-management` | 28 | 0 | 28 | 0 | 0 | 0 | 0 | none |
| `catalog-master-of-science-in-meteorology` | 22 | 0 | 22 | 0 | 0 | 0 | 0 | none |
| `catalog-applied-medica-sciences-bachelor-of-clinical-nutrition` | 40 | 33 | 19 | 21 | 20 | 6 | 0 | none |
| `catalog-applied-medica-sciences-bachelor-of-clinical-psychohlogy` | 2 | 0 | 2 | 0 | 0 | 0 | 0 | none |
| `catalog-applied-medica-sciences-rabigh-bachelor-of-science-in-nursing` | 14 | 3 | 11 | 3 | 0 | 0 | 0 | none |
| `catalog-architecture-and-planning-bachelor-of-architecture` | 14 | 0 | 14 | 0 | 0 | 0 | 0 | none |
| `catalog-engineering-bachelor-of-science-in-chemical-engineering` | 39 | 28 | 16 | 23 | 11 | 5 | 0 | none |
| `catalog-engineering-bachelor-of-science-in-industrial-engineering` | 21 | 4 | 17 | 4 | 1 | 1 | 0 | none |
| `catalog-engineering-bachelor-of-science-in-mechanical-engineering-production-and-mechanica` | 2 | 2 | 1 | 1 | 1 | 2 | 0 | none |
| `catalog-engineering-bachelor-of-science-in-nuclear-engineering` | 61 | 59 | 15 | 46 | 29 | 7 | 2 | none |
| `catalog-engineering-bachelor-of-science-in-nuclear-engineering-medical-physics` | 62 | 62 | 14 | 48 | 23 | 3 | 3 | none |
| `catalog-engineering-bachelor-of-science-in-nuclear-engineering-radiation-protection` | 60 | 59 | 13 | 47 | 32 | 8 | 3 | none |
| `catalog-master-of-science-in-engineering-management` | 14 | 0 | 14 | 0 | 0 | 0 | 0 | none |
| `catalog-master-of-science-in-nuclear-engineering` | 16 | 0 | 16 | 0 | 0 | 0 | 0 | none |
| `catalog-engineering-rabigh-architectural-engineering` | 2 | 0 | 2 | 0 | 0 | 0 | 0 | none |
| `catalog-engineering-rabigh-chemical-and-materials-engineering` | 15 | 4 | 11 | 4 | 4 | 4 | 0 | none |
| `catalog-engineering-rabigh-civil-and-environmental-engineering` | 1 | 1 | 0 | 1 | 1 | 1 | 1 | none |
| `catalog-earth-sciences-bachelor-general-geology-structural-geology-and-remote-sensing` | 42 | 41 | 13 | 29 | 7 | 6 | 0 | none |
| `catalog-earth-sciences-bachelor-of-general-geology-geo-exploration-techniques` | 42 | 34 | 15 | 27 | 5 | 6 | 0 | none |
| `catalog-earth-sciences-bachelor-of-geophysics` | 40 | 36 | 11 | 29 | 17 | 12 | 0 | none |
| `catalog-earth-sciences-bachelor-of-mineral-resources-and-rocks` | 40 | 44 | 11 | 29 | 9 | 3 | 0 | none |
| `catalog-earth-sciences-bachelor-of-science-in-engineering-and-environmental-geology` | 47 | 43 | 13 | 34 | 10 | 7 | 0 | none |
| `catalog-earth-sciences-hydrogeology-bsc` | 28 | 22 | 7 | 21 | 16 | 8 | 0 | none |
| `catalog-earth-sciences-petroleum-geology-and-sedimentology-bsc` | 43 | 25 | 25 | 18 | 1 | 2 | 0 | none |
| `catalog-masters-in-geophysics-by-coursework-and-research-project` | 26 | 0 | 26 | 0 | 0 | 0 | 0 | none |
| `catalog-human-sciences-and-design-bacheior-interior-design-and-furniture` | 23 | 15 | 8 | 15 | 8 | 4 | 0 | none |
| `catalog-human-sciences-and-design-bachelor-of-science-b-sc-in-family-sciences` | 42 | 14 | 28 | 14 | 4 | 4 | 0 | none |
| `catalog-human-sciences-and-design-bachelor-s-department-of-early-childhood-guide` | 62 | 34 | 28 | 34 | 7 | 4 | 0 | none |
| `catalog-masters-in-marine-chemistry` | 10 | 0 | 10 | 0 | 0 | 0 | 0 | none |
| `catalog-masters-in-marine-geology` | 9 | 0 | 9 | 0 | 0 | 0 | 0 | none |
| `catalog-masters-in-marine-physics` | 9 | 0 | 9 | 0 | 0 | 0 | 0 | none |
| `catalog-med-rehabilitation-sciences-bachelor-s-degree-of-occupational-therapy` | 54 | 34 | 20 | 34 | 31 | 10 | 0 | none |
| `catalog-med-rehabilitation-sciences-bachelor-s-degree-of-physical-therapy` | 50 | 6 | 44 | 6 | 2 | 2 | 0 | none |
| `catalog-med-rehabilitation-sciences-bachelor-s-degree-of-prosthetics-and-orthotics` | 20 | 4 | 16 | 4 | 0 | 0 | 0 | none |
| `catalog-med-rehabilitation-sciences-bachelor-s-degree-of-respiratory-therapy` | 20 | 4 | 16 | 4 | 0 | 0 | 0 | none |
| `catalog-med-rehabilitation-sciences-bachelor-s-degree-of-speech-language-pathology-and-aud` | 63 | 38 | 25 | 38 | 34 | 23 | 0 | none |
| `catalog-executive-master-of-science-in-moderation-and-intellectual-security` | 18 | 0 | 18 | 0 | 0 | 0 | 0 | none |

## Recommended fix order

1. Obtain and retain official same-program Finance evidence for ISLS 201; do not change the prerequisite until it explicitly confirms ISLS 101.
2. Resolve high-confidence missing/cyclic/self dependency defects supported by retained same-program official evidence.
3. Recover raw same-program evidence for stored edges currently classified evidence-insufficient, prioritizing permanently blocked courses.
4. Add an explicit academic-rule model for verified OR, credit, level, standing, approval, and corequisite rules before importing them.
5. After data corrections, add regression coverage for normalization and initial/unlock behavior; planner logic itself has no confirmed defect in this audit.

## Evidence and interpretation limits

- User-provided plan image files referenced by several active programs are not retained as official source evidence.
- Most legacy planner edges lack retained raw requisite text; absence of evidence is not classified as a confirmed academic defect.
- Course numbering and cross-program same-code behavior were not used as proof.

The JSON report is the canonical detailed artifact. The CSV is an issue-oriented export; the Markdown is the human-readable summary.
