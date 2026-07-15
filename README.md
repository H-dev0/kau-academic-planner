# KAU Program Scraper

Local-only pilot project for extracting official university program data.

Initial scope:

- University: King Abdulaziz University
- Degree level: Bachelor's degree
- Pilot program: Accounting
- Pilot size: one college, one program only

No live scraping is performed by the current setup. Development starts with saved official source files.

## Current Environment

The active development copy is intended to run inside WSL:

```bash
cd ~/projects/kau-program-scraper
source .venv/bin/activate
PYTHONPATH=src python -m unittest discover -s tests
```

The original Windows-side starter copy may still exist under the Codex workspace, but WSL is preferred for day-to-day development.

## Folder Structure

```text
data/
  raw/          Original official source files, unchanged
  parsed/       Normalized extracted JSON before validation
  validated/    Data that passed validation
reports/        Validation reports
src/
  kau_programs/ Parser and validation code
tests/          Tests using local fixtures or synthetic test data
```

## Setup

From the WSL project folder:

```bash
cd ~/projects/kau-program-scraper
source .venv/bin/activate
python --version
PYTHONPATH=src python -m unittest discover -s tests
```

If `.venv` does not exist yet, create it with:

```bash
python3 -m venv .venv
```

Do not install global Python packages for this project.

## Data Source Rules

- Check for official APIs, JSON, CSV, static HTML tables, or downloadable official documents before browser automation.
- Prefer official structured sources when available.
- Use saved raw snapshots for parser development.
- Preserve official source URL, source title, and last-checked date.
- Respect robots.txt, terms of use, authentication boundaries, and reasonable request rates.
- Do not bypass CAPTCHA or access controls.

## Pilot Data Fields

Program-level fields:

- university_name
- college_name
- program_name
- degree_level
- total_program_credit_hours
- official_source_url
- source_title
- last_checked_date

Course-level fields:

- semester_or_level
- course_code
- official_course_name
- credit_hours
- prerequisites
- official_source_url
- source_title
- last_checked_date

Missing official information must be represented as `null`, not guessed.

## Test Command

```bash
PYTHONPATH=src python -m unittest discover -s tests
```

## Scraping And Parsing Commands

Use saved official snapshots for parser development. For the Accounting pilot, the official source page is:

```text
https://kau.edu.sa/en/programs/bachelor-of-science-in-accounting
```

Parse the saved snapshot:

```bash
PYTHONPATH=src python -m kau_programs.kau_accounting \
  data/raw/kau/accounting/bachelor-of-science-in-accounting.2026-07-05.html \
  --output data/parsed/kau_accounting.json \
  --last-checked-date 2026-07-05
```

## Validation Command

```bash
PYTHONPATH=src python -m kau_programs.validate \
  data/parsed/kau_accounting.json \
  --report reports/kau_accounting_validation.json
```

Write a readable report after validation:

```bash
cp data/parsed/kau_accounting.json data/validated/kau_accounting.json
PYTHONPATH=src python -m kau_programs.report \
  data/validated/kau_accounting.json \
  reports/kau_accounting_validation.json \
  --output reports/kau_accounting_summary.md
```

Audit source coverage:

```bash
PYTHONPATH=src python -m kau_programs.source_audit \
  data/validated/kau_accounting.json \
  data/raw/kau/accounting/bachelor-of-science-in-accounting.2026-07-05.html \
  --output reports/kau_accounting_source_audit.md
```

Apply the reviewed credit overlay from the supplied Accounting table image:

```bash
PYTHONPATH=src python -m kau_programs.credit_overlay \
  data/parsed/kau_accounting.json \
  data/credits/kau_accounting_credit_overlay.json \
  --output data/validated/kau_accounting.json
cp data/validated/kau_accounting.json web/data/kau_accounting.json
```

## Planner Command

Show which courses are available or blocked after a student enters completed courses:

```bash
PYTHONPATH=src python -m kau_programs.planner \
  data/validated/kau_accounting.json \
  --completed "ISLS 101, ARAB101" \
  --output reports/kau_accounting_plan_example.json
```

This is the first local version of the app logic. It does not use a database yet.

## Local Web Preview

From WSL:

```bash
cd ~/projects/kau-program-scraper/web
python3 -m http.server 8765
```

Open:

```text
http://localhost:8765
```

Run the backend-powered preview with local demo login:

```bash
PYTHONPATH=src python -m kau_programs.server --port 8766
```

Open:

```text
http://localhost:8766
```

This command expects a parsed JSON file to exist. It does not fetch live data.

## Adding Another Program Later

Do not add another university, college, or program until the KAU Accounting pilot is extracted and validated successfully.

After the pilot passes validation:

1. Add saved raw official sources for the next program.
2. Add or update parser tests using those fixtures.
3. Parse to `data/parsed/`.
4. Validate and review the report.
5. Export to `data/validated/` only after validation passes.
