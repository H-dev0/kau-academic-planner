# Verified bulk import validation

Date: 2026-07-22

## Scope and safety state

- Project root: `/home/hamed/projects/kau-program-scraper`
- Starting branch: `verified-plan-import-batch-2`
- Starting and upstream commit: `44b0b346b7f37f41d2e512c4f41b3058d090cb94`
- Working branch: `verified-plan-import-bulk`, created directly from that tip
- Pre-edit tracked-tree backup: `/tmp/kau-program-scraper-bulk-backup.xr0tpS/repo-at-44b0b346b7f37f41d2e512c4f41b3058d090cb94.tar`
- Starting tree: clean
- Starting counts derived from `faculty_catalog.json`: 223 total, 61 planner-supported, 162 catalog-only
- No live university request or browser automation was used. Only existing local reconciliation evidence, current catalog data, and current planner data were read.
- No server/application logic, API, authentication, localStorage, Azure, deployment, or planner-calculation file was modified.
- Nothing was committed, pushed, merged, submitted as a pull request, or deployed.

## Internal groups and outcome

Group 1 contained:

1. Doctor of Philosophy in Meteorology
2. Executive Master in Human Resource Management
3. General Associate Diploma in Digital Transformation
4. Intermediate Diploma in Cybersecurity (Distance)
5. Intermediate Diploma in Data Science

All five passed revalidation and were imported.

Group 2 contained:

1. Master of Science in Environmental Science
2. Master of Science in Meteorology
3. Master of Science in Nuclear Engineering
4. Master's in Geophysics by coursework and research project
5. Ph.D.’s Degree in Environmental Science

The first four group-2 candidates passed individual revalidation. The fifth failed the required level/semester reconciliation check. Per the controlled-bulk rule, group 1 was preserved, group 2 was not imported, and processing stopped.

## Candidate results

| Candidate | Result | Exact reason |
|---|---|---|
| Doctor of Philosophy in Meteorology | Imported | `VERIFIED_IMPORT_READY`; identifiers, bilingual fields, two row groups, 26 courses, 84 credits, identities, source evidence, and special-course handling revalidated. |
| Executive Master in Human Resource Management | Imported | `VERIFIED_IMPORT_READY`; four levels, 11 courses, 33 credits, and all four requisite references revalidated. |
| General Associate Diploma in Digital Transformation | Imported | `VERIFIED_IMPORT_READY`; two levels, 10 courses, 31 credits, and all four requisite references revalidated. The official English name retains the source's double space after `in`. |
| Intermediate Diploma in Cybersecurity (Distance) | Imported | `VERIFIED_IMPORT_READY`; four levels, 20 courses, 62 credits, and both requisite references revalidated. |
| Intermediate Diploma in Data Science | Imported | `VERIFIED_IMPORT_READY`; four levels, 20 courses, 62 credits, and its single requisite reference revalidated. |
| Master of Science in Environmental Science | Skipped | Individual revalidation passed, but its group was halted because Ph.D.’s Degree in Environmental Science failed revalidation. The task requires preserving group 1 and stopping when group 2 fails. |
| Master of Science in Meteorology | Skipped | Individual revalidation passed, but its group was halted because Ph.D.’s Degree in Environmental Science failed revalidation. |
| Master of Science in Nuclear Engineering | Skipped | Individual revalidation passed, but its group was halted because Ph.D.’s Degree in Environmental Science failed revalidation. |
| Master's in Geophysics by coursework and research project | Skipped | Individual revalidation passed, but its group was halted because Ph.D.’s Degree in Environmental Science failed revalidation. |
| Ph.D.’s Degree in Environmental Science | Skipped/blocker | The reconciliation record reports two levels and says bilingual pages yielded 2 AR/2 EN levels, but all five extracted course rows have `level_number: 1` and the single label `Compulsory courses`. The second level has no preserved row identity. Importing would require inventing or inferring a missing level assignment, which is prohibited. |

## Course, level, credit, and requisite revalidation

| Program | Courses | Reported levels | Distinct row labels | Calculated credits | Official total | Requisite refs | Result |
|---|---:|---:|---:|---:|---|---:|---|
| Doctor of Philosophy in Meteorology | 26 | 2 | 2 | 84 | `null` | 0 | Pass |
| Executive Master in Human Resource Management | 11 | 4 | 4 | 33 | `null` | 4 | Pass |
| General Associate Diploma in Digital Transformation | 10 | 2 | 2 | 31 | `null` | 4 | Pass |
| Intermediate Diploma in Cybersecurity (Distance) | 20 | 4 | 4 | 62 | `null` | 2 | Pass |
| Intermediate Diploma in Data Science | 20 | 4 | 4 | 62 | `null` | 1 | Pass |
| Master of Science in Environmental Science | 34 | 2 | 2 | 100 | `null` | 0 | Individual pass; group skipped |
| Master of Science in Meteorology | 22 | 2 | 2 | 67 | `null` | 0 | Individual pass; group skipped |
| Master of Science in Nuclear Engineering | 16 | 5 | 5 | 52 | `null` | 0 | Individual pass; group skipped |
| Master's in Geophysics by coursework and research project | 26 | 2 | 2 | 70 | `null` | 0 | Individual pass; group skipped |
| Ph.D.’s Degree in Environmental Science | 5 | 2 | 1 | 24 | `null` | 0 | Fail: level structure mismatch |

For every passing candidate, normalized identities are unique, no placeholder or collision is present, bilingual course names are nonempty, reused course codes have consistent bilingual names and credits, all prerequisites/corequisites resolve within the same plan, and no ambiguous elective structure or mechanical-cleanup item was reported. No official total was available for any candidate, so imported `total_program_credit_hours` values remain `null`; calculated visible-row totals were not promoted to official totals.

## Preserved thesis, project, and training requirements

- Doctor of Philosophy in Meteorology: `MET 799`, PhD Thesis, 12 credits.
- Executive Master in Human Resource Management: `EHRM 698`, Research Project, 3 credits.
- General Associate Diploma in Digital Transformation: `ACIT 195`, Practical Training, 3 credits.
- Intermediate Diploma in Cybersecurity (Distance): `CYB 190`, Practical Training 1, 3 credits; and `CYB 290`, Practical Training, 3 credits.
- Intermediate Diploma in Data Science: `ACIT 291`, Practical Training, 3 credits.
- Skipped but revalidated special rows were not imported: `MET 699` Master Thesis (8), `NE 699` Master Thesis (8), `EGP 698` M.Sc. Research Project (4), and `ENS 799` PhD Dissertation (12).
- No elective was converted to required, no unresolved requisite was removed, and no zero-credit or other requirement was synthesized.

## Saved bilingual source evidence

| Program | Arabic SHA-256 | English SHA-256 |
|---|---|---|
| Doctor of Philosophy in Meteorology | `d2ceb4e580668aeb353eb490c0e73ef9020c4ac2ec65db916fe4d3e1a0337e45` | `ef65a822cf228b4739415a723d06e967cd92f121156920f1ddecd7f2ff14a5ae` |
| Executive Master in Human Resource Management | `68016f10e36cc02fdcb62c83937f69a1175395a7238807739ea8f138183912a2` | `d38f768f2577c5354a7b5a76f4351095c172efb5a240d777db85f77d85ecd13b` |
| General Associate Diploma in Digital Transformation | `674c2d8086d8ea682b2555bf40935d7618396a510f709905d3cd8b0e5a0ff1ff` | `484299c8ce25de3b6ab82d4775443411d7cb1a9be95ed95913eb5723677b7be2` |
| Intermediate Diploma in Cybersecurity (Distance) | `1d55a4d0ca8e9a12f4a501a0a170c8b49283eb57fff174196d95ebd9f17b4a4f` | `a7d8a92b7ff43f41103d67620b09405041928e133dff8fb14be172afa60c6549` |
| Intermediate Diploma in Data Science | `f8fbca166700a961a4f6ab2f99095ea0af1e8dcd47ee5562db6eb7796eac3dac` | `a05708b1a313c3a950e1e6d34dec75847dc2b6b8053eba4f72ba9e9945a6bcc8` |
| Master of Science in Environmental Science | `e102b0f299fe7e746f8297adc36d3b43b462d3c1d77d36ebcab2f945c3de4241` | `86e5107ae2561c4f953fcc26a7f216e8444fa274087fd67e35dbb2d09ce1193f` |
| Master of Science in Meteorology | `a1e657cf79a328f9a400ff29636022418486e134bf269449174cd02e5e903db6` | `ef58ce9683afbd219e4a503eda2e48285ec7481bbbe8cd20fd6441a9c19c9db5` |
| Master of Science in Nuclear Engineering | `b14ad0958a7fb00f913fbe2d1bcdc3aeb578631758aa94464bc342c349cab5e9` | `cb681be894f2409e027cdc3d78b01b3e5c94dac4e1cd2cc038114e1eef948fdc` |
| Master's in Geophysics by coursework and research project | `b387d5a9149a4babd3696e6432e4d5f9661089c98987c14cc0819a3c62a4b805` | `9609b16c913abbb284b93e8d57256a116c237bdc8e0433253847c770481fd32b` |
| Ph.D.’s Degree in Environmental Science | `546a7c8f3d0aa44e9cd2d3b9281b039ba5303e3aff0a9a873a5e36b353567b33` | `8a4f680bd04c346a7a5c6753298f657310a89c63c0243256ef8592a4690eec75` |

## Changes and semantic isolation

- `web/data/additional_programs.json`: appended exactly five group-1 planner records.
- `web/data/faculty_catalog.json`: promoted exactly the five matching group-1 catalog records with unique `planner_data_key` values.
- `tests/test_pilot_import.py`: extended exact-source, counts, bilingual names, identity, code reuse, requisite, special-row, metrics, planner, catalog-linkage, semantic-diff, and HTTP/API coverage to the five imported records while retaining all prior coverage.
- `reports/plan_extraction/verified_bulk_import_validation.md`: this report.

All 16 pre-existing planner records, all non-group-1 catalog records, all blocked candidates, and both `READY_AFTER_MECHANICAL_CLEANUP` candidates remain semantically unchanged. Group 2 was not partially promoted.

## Counts

- Before: 223 total, 61 planner-supported, 162 catalog-only.
- After: 223 total, 66 planner-supported, 157 catalog-only.
- The delta of five is derived from the five successful group-1 promotions. Counts were not forced or hardcoded into data files.

## Automated and HTTP validation

After group 1:

- Focused suite: PASS — 13 tests.
- Full suite: PASS — 46 tests.
- Repository JSON validation: PASS — all 16 JSON files.
- Python compileall: PASS.
- `node --check server.js`: PASS.
- `node --check web/app.js`: PASS.
- `git diff --check`: PASS.
- Semantic comparison to `HEAD`: PASS — exactly five planner additions, exactly five catalog promotions, all prior planner records unchanged.
- HTTP/API smoke coverage: PASS — the temporary server returned valid program and plan payloads for the five new imports and all nine previous verified imports. Initial available/blocked counts and prerequisite unlocking matched expectations. The server was terminated by test teardown.

Final validation after this report was added repeated the same checks with the same results: 13 focused tests and 46 full-suite tests passed; all 16 JSON files, Python compilation, both Node syntax checks, and `git diff --check` passed. Combined visual review remains intentionally deferred until before merge/deployment.

## Final status

- Successfully imported: five group-1 programs.
- Skipped: all five group-2 programs because one candidate failed the group revalidation gate.
- Final counts: 223 total, 66 planner-supported, 157 catalog-only.
- No server remains intentionally running.
- Nothing was committed, pushed, merged, submitted as a pull request, or deployed.
