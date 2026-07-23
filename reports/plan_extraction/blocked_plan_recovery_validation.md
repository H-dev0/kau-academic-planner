# Blocked plan recovery validation

- Retrieval date: 2026-07-22
- Branch: `blocked-plan-recovery-batch`
- Policy: verified official KAU evidence only
- Attempted: 8
- Imported: 0
- Skipped: 8
- Final counts: 223 total, 72 planner-supported, 151 catalog-only
- Raw captures: `data/raw/kau/plan_audit/blocked_plan_recovery_2026-07-22/` (Git-ignored)

## Decisions

| Program | Decision | Evidence and blocker |
|---|---|---|
| Applied Computing and Network Technologies | Skipped | Existing bilingual reconciliation conflicts. `ACNT 110` is Operating Systems/نظم التشغيل in the level plan but Programming Fundamentals/أساسيات البرمجة in descriptions. `ACNT 230` is Windows Server/خادم ويندوز in the level plan but Routing and Switching/التوجيه والتبديل in descriptions. Complete signatures do not agree, so occurrences were not collapsed. |
| Executive Master in Digital Media | Skipped | Official pages place `JCOM 651` (Research Methods in Digital Media, 3 credits) in level 2, while level-4 `JCOM 698` explicitly requires `COM 651`. No authoritative `COM 651` entry was found; correcting it to `JCOM 651` would be inference. |
| General Intermediate Diploma in Law | Skipped | Official pages confirm four levels but do not supply authoritative records for `LAGD 260` or `LAPD 150`; title, credits, placement, and complete requisite metadata remain unresolved. |
| Cybersecurity | Skipped | The official level table references `CS 121`, `CS 351`, `IT 203`, and `IT 211`, but the page contains no authoritative course records or placement for those four shared courses. |
| Academic General Master of Public Law | Skipped | Official text states 5 mandatory courses (15 credits), 2 internal electives (6 credits), and 1 external elective (3 credits), and lists the eight options. It does not assign options to semesters, and the schema cannot encode two elective pools and their counts. |
| Executive Master in Internal Auditing | Skipped | The official level table contains one generic level-3 elective and separately lists `ACCT 617`, `623`, `624`, and `628`. It does not explicitly state the selection count or attach each option to level 3; the schema cannot encode the pool. |
| Master of Science in Information Systems | Skipped | Three official elective options are separate from the four-level plan, with no explicit selection count or placement. The schema cannot encode the pool. |
| Professional Master in Artificial Intelligence | Skipped | The nine requested `EMAI` codes form a non-level elective pool without an explicit count or placement. The schema cannot encode the pool, and the English official record reports `EMAI 661` as 30 credits, which cannot be corrected by inference. |

## Official source captures

| Program | Official URL | Capture SHA-256 |
|---|---|---|
| Digital Media (AR) | https://kau.edu.sa/ar/programs/executive-master-in-digital-media | `aa0068da3e157bd6ff83b820194d958802baadbdb74f8404a315c63ad7d59b72` |
| Digital Media (EN) | https://kau.edu.sa/en/programs/executive-master-in-digital-media | `0271fd1aa505feac87d402c332895979f418f091fdb82506ee03db05ab6bc840` |
| Law diploma (AR) | https://kau.edu.sa/ar/programs/general-intermediate-diploma-in-law | `497ea9eebfea024195b7b0c7c173af27ee9607c9ab5817c89b321e7ec348533e` |
| Law diploma (EN) | https://kau.edu.sa/en/programs/general-intermediate-diploma-in-law | `4ea47a6dc02f8b4fb5f643345e31405fad3b9449d182db352a6fab1efedefd04` |
| Cybersecurity (AR) | https://kau.edu.sa/ar/programs/bachelor-of-science-in-cybersecurity | `ac7b395a1ad658301db200b27e3805b5aab9014331ee2d515bbcbfca49302067` |
| Cybersecurity (EN) | https://kau.edu.sa/en/programs/bachelor-of-science-in-cybersecurity | `79fb7737f537428f86aec558a034cb7baff379efba361e76a158fe9042638245` |
| Public Law (AR) | https://kau.edu.sa/ar/programs/academic-general-master-of-public-law | `9b16c206d322f8306fc2f2a36e2a0679c7e44993a0291c1bedd5ea22e6fc59e7` |
| Public Law (EN) | https://kau.edu.sa/en/programs/academic-general-master-of-public-law | `0824b13eeacbe769553de5cedbb2d2e3f6d06e405e4d5e543d136030feb2fd02` |
| Internal Auditing (AR) | https://kau.edu.sa/ar/programs/executive-master-in-internal-auditing | `945c2c8328f11dac8a54197607c64cc8386e5ff07f8a0251fa70907e5e0e2c5c` |
| Internal Auditing (EN) | https://kau.edu.sa/en/programs/executive-master-in-internal-auditing | `247d74a8f8cfa69c99b87f16e342abf4c2f7d93ff2c52d5bf1d522014d13efc9` |
| Information Systems (AR) | https://kau.edu.sa/ar/programs/master-of-computer-information-systems | `6cb32370428685ae7871fd3cc65128366aecca2cd246b7f3de738819938b7fb6` |
| Information Systems (EN) | https://kau.edu.sa/en/programs/master-of-computer-information-systems | `d84aa426b16b9b7511021b9747b869edcc31fe0b48e33cdbd8543d119ef31a70` |
| Artificial Intelligence (AR) | https://kau.edu.sa/ar/programs/professional-master-in-artificial-intelligence | `70adb6a88764b90a463e9a19bd4d44f4aae22376b80ac7b701342bf5128ecf2c` |
| Artificial Intelligence (EN) | https://kau.edu.sa/en/programs/professional-master-in-artificial-intelligence | `b28759af989489ba551dae8d405d1022eb08d0da171f5d58c3ff8c3ca5f505fc` |

All source titles, capture filenames, retrieval dates, URLs, hashes, and structured blockers are recorded in the JSON report. The four explicitly protected programs remain catalog-only. No planner, server, application, API, or catalog data was changed.
