# Verified planner import validation

Date: 2026-07-21

## Scope and Git state

- Project: `/home/hamed/projects/kau-program-scraper`
- Branch: `verified-plan-import-batch-2`
- Base/HEAD commit: `9606e2acf1ad4f50a1650dda2b5af985e3582684`
- Pre-batch bundle: `/tmp/kau-program-scraper-batch2-preedit-9606e2a.bundle`
- Pre-server-fix working diff: `/tmp/kau-program-scraper-batch2-before-server-fix.patch`
- Batch 2 remains uncommitted and local.
- No browser automation or live university request was used for batch 2.
- No authentication, localStorage, Azure, deployment, or unrelated API behavior changed.
- Nothing was committed, pushed, merged, submitted as a pull request, or deployed.

## Active verified imports

Exactly nine reconciled programs are planner-supported:

| Program | Program ID | Courses | Levels/semesters | Calculated credits | Published prerequisite references |
|---|---|---:|---:|---:|---:|
| Associate Diploma in Applications Development | `catalog-associate-diploma-in-applications-development` | 10 | 2 | 31 | 6 |
| Executive Master in Public Policy | `catalog-executive-master-in-public-policy` | 13 | 4 | 39 | 10 |
| Information Systems Management and Digitalization | `catalog-information-systems-management-and-digitalization` | 14 | 4 | 42 | 9 |
| Executive Master of Health Administration (EMHA) | `catalog-executive-master-of-health-administration-emha` | 15 | 4 | 45 | 0 |
| Master of Science in Engineering Management | `catalog-master-of-science-in-engineering-management` | 14 | 4 | 42 | 0 |
| Master's in Marine Geology | `catalog-masters-in-marine-geology` | 9 | 4 | 34 | 0 |
| Business Economics | `catalog-business-economics` | 10 | 4 | 24 | 0 |
| Master's in Marine Chemistry | `catalog-masters-in-marine-chemistry` | 10 | 4 | 37 | 0 |
| Master's in Marine Physics | `catalog-masters-in-marine-physics` | 9 | 4 | 34 | 0 |

The six programs committed in batch 1 remain semantically unchanged.

## Batch 2 local source evidence

All batch-2 data was copied from `ready_candidate_reconciliation.json`, which classifies each selected record as `VERIFIED_IMPORT_READY`. The saved bilingual source evidence contains these content hashes:

| Program | Arabic evidence SHA-256 | English evidence SHA-256 |
|---|---|---|
| Business Economics | `f3c95c5b40de323c5d7f5f3667f4ca50d860ad8519eb10c9db2cc275dbd9040b` | `ecfe648930fdf293340e8f16f5e5afa46afa714fd83f72dd0e205cc7483c61c5` |
| Master's in Marine Chemistry | `7efe243ed3ca9438a93b4e4b822f1f9e2745e537cd6253177aa5c31edce7dbea` | `6b9ec18bd3bde410ed6df8c9934c2263160d961beab9646428414b04eb47f03b` |
| Master's in Marine Physics | `dbbf93f2dbf4d7b9d5e1b52b8418f30db234c5a1509b156be57fc2ea39e33141` | `57582ff38c67d069542253a0a399fc6f905f345c17ccbb1c6d50b1368d537f16` |

No course, code, translation, credit, level, requisite, or academic rule was inferred.

## Batch 2 program handling

### Business Economics

- Arabic name: `ماجستير ‏اقتصاديات الأعمال التنفيذي`
- English name: `Business Economics`
- 10 exact bilingual course rows across `Levels 1` through `Levels 4`.
- Visible rows independently total 24 calculated credits.
- `official_total_credits` and `total_program_credit_hours` remain `null`.
- No prerequisites or corequisites are published.
- `ECNE 698`, Research Project, remains an explicit 1-credit row in `Levels 4`.

### Master's in Marine Chemistry

- Arabic name: `الماجستير في الكيمياء البحرية`
- English name: `Master's in Marine Chemistry`
- 10 exact bilingual course rows across four levels, totaling 37 calculated credits.
- The official structured total remains `null`.
- No prerequisites or corequisites are published.
- `MC 699`, M.Sc. Thesis, remains an explicit 10-credit row in `Level 4`.

### Master's in Marine Physics

- Arabic name: `الماجستير في الفيزياء البحرية`
- English name: `Master's in Marine Physics`
- 9 exact bilingual course rows across four levels, totaling 34 calculated credits.
- The official structured total remains `null`.
- No prerequisites or corequisites are published.
- `MP 699`, M.Sc. Thesis, remains an explicit 10-credit row in `Level 4`.

## EA common-foundation regression fix

The original `withCommonFoundation` rule treated every Economics and Administration planner record as foundation-eligible unless it belonged to another faculty. It then used exact `level 1`/`level 2` labels to decide whether to prepend nine undergraduate courses and could synthesize a total from the resulting level map.

Business Economics is an EA executive master's program whose official labels are `Levels 1` through `Levels 4`. The old rule therefore changed its API result from 10 to 19 courses and from a null official total to 50.

The server now uses the stable planner award metadata and requires both:

- `faculty_id === "EA"`; and
- `degree_level === "Bachelor's degree"`.

It does not use program-name matching, course count, total-credit nullability, or level labels to determine eligibility. Business Economics now remains 10 courses, 24 calculated credits, and a null official total through the API.

Regression evidence:

- Accounting remains 43 courses, official total 125, and 38 available/5 blocked with no completed courses.
- Finance remains 43 courses, official total 125, and 43 available/0 blocked; its 34 raw rows still receive exactly the same nine foundation courses.
- Marketing also remains 43 courses and receives exactly the same nine foundation courses.
- Executive Master in Public Policy remains 13 courses and now retains its null official total without undergraduate foundation processing.
- The other eight imported pilot/batch programs retain their expected API course counts.

## Changed-file scope

Only these files differ from batch-2 `HEAD`:

- `web/data/additional_programs.json`: adds exactly the three batch-2 planner records.
- `web/data/faculty_catalog.json`: promotes exactly the three matching catalog records.
- `tests/test_pilot_import.py`: validates all nine imports, exact batch-2 diffs, data fidelity, metrics, API behavior, and EA foundation regressions.
- `server.js`: narrows foundation eligibility to EA bachelor's-degree planner records.
- `reports/plan_extraction/pilot_import_validation.md`: records this validation.

No existing planner record, unrelated catalog record, prerequisite, authentication path, localStorage key, Azure setting, or deployment file changed.

## Semantic integrity and counts

- Planner records before/after batch 2: 13 → 16.
- Exactly three new planner records were added.
- All 13 pre-existing planner records, including the previous six imports, are semantically unchanged.
- Exactly three catalog entries changed relative to batch-2 `HEAD`.
- Total catalog programs: 223.
- Planner-supported: 58 → 61.
- Catalog-only / “Plan not added”: 165 → 162.
- Every batch-2 bilingual name, code, credit, level label, and source URL matches the local reconciliation evidence.
- Normalized identities are unique within each program.
- Shared `MS 600` identities are consistent across the marine programs.
- No requisite is unresolved, and the three batch-2 programs have no prerequisites or corequisites.
- No visible imported-program metric serializes as `null` or `NaN`.

## Automated validation

- `PYTHONPATH=src python3 -m unittest tests.test_pilot_import -v`: PASS — 13 tests.
- `PYTHONPATH=src python3 -m unittest discover -s tests -v`: PASS — 46 tests.
- `python3 -m compileall -q src tests`: PASS.
- `node --check server.js`: PASS.
- `node --check web/app.js`: PASS.
- `git diff --check`: PASS.
- Repository JSON validation: PASS for all 16 JSON files.

## Local HTTP/API smoke results

A temporary Node server used a dynamically selected localhost port and was stopped afterward.

- Homepage: HTTP 200.
- All nine imported programs returned HTTP 200 from `GET /api/program?major=<id>`.
- All nine returned successful plans from `POST /api/plan?major=<id>`.
- Business Economics: 10 courses and 24 calculated credits.
- Master's in Marine Chemistry: 10 courses and 37 calculated credits.
- Master's in Marine Physics: 9 courses and 34 calculated credits.
- Accounting: 43 courses, total 125, 38 available, 5 blocked.
- Finance: 43 courses, total 125, 43 available, 0 blocked.
- No planner request failed.

## Browser and visual-review status

Automated data, API, and planner validation passed for batch 2. Codex Desktop Browser testing was attempted twice, but both attempts failed during setup before a browser tab launched with:

`windows sandbox failed: helper_unknown_error: setup refresh had errors`

No visual UI testing is claimed as passed for batch 2. Visual review remains deferred until the final combined pre-merge review.

## Blockers

None. The initial Business Economics API blocker was resolved by the approved award-type gate. The dedicated patch helper could not initialize its Windows filesystem sandbox for this WSL workspace; after failed no-write attempts, equivalent unified diffs were applied through local `git apply`.

## Final status

- Exactly nine verified imports are planner-supported.
- Exactly three planner records and three catalog entries were added/promoted in batch 2.
- Counts are 223 total, 61 planner-supported, and 162 catalog-only.
- All required automated and HTTP validations pass.
- Browser testing was attempted twice and failed before browser launch; visual review remains pending for the final combined pre-merge review.
- Nothing was committed, pushed, merged, submitted as a pull request, or deployed.
