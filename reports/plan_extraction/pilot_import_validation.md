# Pilot verified-plan import validation

Date: 2026-07-21

## Scope and Git state

- Project: `/home/hamed/projects/kau-program-scraper`
- Branch: `pilot-verified-plan-import`
- Base/HEAD commit: `e2f62c478a288b76854f63e5c89239e4ed2016c4`
- Pre-edit backup: `/tmp/kau-program-scraper-backup-20260720-7f1c9a`
  - `tracked.patch`
  - `pilot_import_validation.md`
  - `test_pilot_import.py`
- Before finalization, the pilot changes were uncommitted and local.
- No browser automation was used. No merge, pull request, deployment, Azure operation, production write, or change to planner/authentication/API/localStorage logic was performed.

## Active pilot programs

Exactly six verified pilot programs are active:

| Program | Program ID | Courses | Levels/semesters | Calculated credits | Published prerequisites |
|---|---|---:|---:|---:|---:|
| Associate Diploma in Applications Development | `catalog-associate-diploma-in-applications-development` | 10 | 2 | 31 | 6 |
| Executive Master in Public Policy | `catalog-executive-master-in-public-policy` | 13 | 4 | 39 | 10 |
| Information Systems Management and Digitalization | `catalog-information-systems-management-and-digitalization` | 14 | 4 | 42 | 9 |
| Executive Master of Health Administration (EMHA) | `catalog-executive-master-of-health-administration-emha` | 15 | 4 | 45 | 0 |
| Master of Science in Engineering Management | `catalog-master-of-science-in-engineering-management` | 14 | 4 | 42 | 0 |
| Master's in Marine Geology | `catalog-masters-in-marine-geology` | 9 | 4 | 34 | 0 |

The three earlier uncommitted imports were preserved semantically unchanged.

## Newly imported verified programs

### Executive Master of Health Administration (EMHA)

- Exact bilingual program and course names, course codes, levels, credits, and bilingual source URLs were copied from `ready_candidate_reconciliation.json`.
- 15 courses across four levels total 45 calculated plan credits.
- No prerequisite or corequisite information was published; all lists remain empty.
- `HSAE 698`, Applied Research Project, remains an explicit 3-credit row in level 3.
- The structured official source does not provide an official program-credit total, so `total_program_credit_hours` is `null`.

### Master of Science in Engineering Management

- Exact bilingual program and course names, course codes, semester labels, credits, and bilingual source URLs were copied from `ready_candidate_reconciliation.json`.
- 14 courses across four semesters total 42 calculated plan credits.
- No prerequisite or corequisite information was published; all lists remain empty.
- `IEEM 698`, Research Project, remains an explicit 3-credit row in the third semester.
- The structured official source does not provide an official program-credit total, so `total_program_credit_hours` is `null`.

### Master's in Marine Geology

- Exact bilingual program and course names, course codes, levels, credits, and bilingual source URLs were copied from `ready_candidate_reconciliation.json`.
- 9 courses across four levels total 34 calculated plan credits.
- No prerequisite or corequisite information was published; all lists remain empty.
- `MG 699`, Master's Thesis, remains an explicit 10-credit row in level 4.
- `total_program_credit_hours` remains `null` because the structured plan did not publish a machine-readable official total.
- The official Arabic narrative confirms the student must complete “ما لا يقل عن (34) وحدة دراسية معتمدة” (at least 34 approved credit units), including 10 units for the master's thesis. This narrative corroborates the 34-credit visible-row calculation without converting the structured official-total field from `null`.

## Files changed

The pilot import files remain changed, with these focused presentation files added or updated by the null-display fix:

- `web/data/additional_programs.json`
  - Preserves the existing three pilot records and appends exactly the three newly requested records.
- `web/data/faculty_catalog.json`
  - Promotes exactly the six pilot entries relative to `HEAD`; the three earlier promotions remain intact and only the three newly requested entries were added in this pass.
- `tests/test_pilot_import.py`
  - Extends data-integrity, exact-source, catalog-diff, special-course, planner, and local HTTP/API coverage to all six pilots.
- `reports/plan_extraction/pilot_import_validation.md`
  - Records this validation.
- `web/credit-display.js`
  - Selects the official or calculated display value and its bilingual presentation label without changing program data.
- `web/app.js`
  - Uses the presentation result in the total-credit metric and header metadata.
- `web/index.html`
  - Loads the presentation helper before the existing application script.
- `tests/test_credit_display.py`
  - Covers official totals, null totals, fallback behavior, bilingual labels, and suppression of visible `null`.

## Semantic integrity and final counts

- Additional planner records: 7 in `HEAD`, 13 now; the six additions are exactly the six pilot IDs.
- All seven pre-existing planner records are semantically unchanged.
- Catalog entries changed relative to `HEAD`: exactly the six pilot IDs.
- Every non-pilot catalog entry remains semantically unchanged.
- Planner-supported catalog entries: 58.
- Catalog-only entries: 165.
- Every imported code, bilingual name, credit value, and level/semester label matches the local verified reconciliation record.
- All normalized course identities are unique within each pilot.
- Every recorded prerequisite/corequisite resolves within its plan.
- No other program was imported.

## Automated validation

- `PYTHONPATH=src python3 -m unittest tests.test_pilot_import -v`: PASS — 7 tests.
- `PYTHONPATH=src python3 -m unittest discover -s tests -v`: PASS — 43 tests.
- `python3 -m compileall -q src tests`: PASS.
- `node --check server.js`: PASS.
- `node --check web/app.js`: PASS.
- `git diff --check`: PASS.
- Repository JSON validation: PASS for all 16 JSON files.
- Semantic comparison against `HEAD`: PASS for exact six planner additions, exact six catalog changes, unchanged base planner records, and final 58/165 counts.

## Null official-total presentation review

- Manual UI review found that Master of Science in Engineering Management and Master's in Marine Geology displayed the literal `null` for the total-credit metric even though their calculated visible-course totals are 42 and 34 respectively.
- Root cause: the metric rendered `total_program_credit_hours` directly through string conversion. Unlike the nearby header fallback, that conversion did not treat JavaScript `null` as unavailable.
- Fix: presentation now preserves valid numeric official totals and, only when the official total is null, displays the existing `calculated_plan_credit_hours` value with “Calculated credits” in English or “الساعات المحتسبة” in Arabic. If neither value is available, it displays the localized unavailable text and never `null`.
- This is display-only. No planner calculation or academic data changed. `total_program_credit_hours` remains `null` for both affected programs; 42 and 34 remain explicitly calculated totals, not invented official totals.

## Remaining-progress metric review

- Manual review found that checking courses in Master of Science in Engineering Management and Master's in Marine Geology did not reduce the remaining-credit metric, despite the total-credit display correctly showing 42 and 34.
- Root cause: the remaining-credit calculation still read nullable `total_program_credit_hours` directly. It did not use the calculated fallback already used by the total-credit presentation.
- Fix: planner metrics now share one effective total. A valid numeric official total remains authoritative; otherwise the effective total is the sum of the program's credit-bearing course rows. Remaining credits are the effective total minus completed course credits, clamped to zero.
- Completed credits, remaining credits, course-based completion percentage, completed-course count, and remaining-course count are derived together on every render. The existing course-based percentage behavior is preserved for Accounting and all previously supported programs.
- Validation covers all six pilots, including Engineering Management transitions 42 → 39 → 42 for a 3-credit course and Marine Geology transitions 34 → 24 → 34 for the 10-credit thesis. No metric result displays `null` or `NaN`.
- No academic data, official total, planner prerequisites, API, authentication behavior, or localStorage key changed.

## Final manual browser validation

- All six imported programs can be selected in the planner.
- None of the six programs displays “Plan not added.”
- The calculated-credit fallback works for programs whose official structured total remains `null`; Engineering Management displays 42 calculated credits and Marine Geology displays 34 calculated credits.
- Remaining credits decrease when courses are checked and return to the prior value when those courses are unchecked.
- No visible credit metric displays `null` or `NaN` in the tested states.
- Final manual browser review passed for the tested selection, credit-display, and check/uncheck behavior.

## Local HTTP/API smoke results

The focused suite started the existing Node server on a dynamically selected localhost port and required HTTP 200 plus valid JSON responses.

- `GET /api/programs`: HTTP 200; all six pilot summaries report planner availability and the expected course counts.
- For each of the six pilot IDs:
  - `GET /api/program?major=<program-id>`: HTTP 200 with the expected complete course plan.
  - `POST /api/plan?major=<program-id>` with no completed courses: HTTP 200 with expected available/blocked counts.
  - `POST /api/plan?major=<program-id>` with the program's focused completion scenario: HTTP 200 with expected unlock behavior.
- The test teardown terminated the local server. A subsequent process check found no `node server.js` process.

## Blockers

None. The dedicated patch helper could not initialize its Windows filesystem sandbox for this WSL workspace; after two failed no-write attempts, the same unified diffs were applied through local `git apply`. This did not alter scope or validation.

## Final status

- Exactly six pilot programs are active.
- Exactly six catalog entries differ from the original catalog.
- Counts are 58 planner-supported and 165 catalog-only.
- All required checks pass.
- No server remains running.
- Final manual browser review passed for the tested behavior.
- Nothing was merged, submitted as a pull request, or deployed.
