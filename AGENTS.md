# Agent Instructions

This project extracts and validates official university program data. Work must stay local, reversible, and respectful of source websites.

## Safety Rules

- Do not use sudo, install system-wide software, change Windows or WSL settings, open ports, or change firewall/network settings without explicit approval.
- Do not delete, move, overwrite user data, change file permissions, modify Git history, or remove dependencies without explicit approval.
- Do not expose secrets, cookies, tokens, private URLs, or personal information.
- Do not bypass authentication, CAPTCHA, robots.txt, rate limits, access restrictions, or website protections.
- Do not perform aggressive scraping. Prefer official structured sources and saved local snapshots.
- Ask before using browser automation against live university sites.

## Repository and deployment safety

- Do not commit, push, merge, deploy, or modify cloud resources unless the user explicitly requests that exact action in the current conversation.
- Before any commit, push, merge, or deployment, verify the branch, Git status, intended files, target repository, and target cloud resource.
- Stop and report any unexpected file, conflict, test failure, authentication issue, or target mismatch.
- Never modify secrets, authentication settings, environment variables, subscriptions, resource groups, domains, or production configuration without separate explicit approval.
- Deployment of an approved build to an explicitly named existing Azure App Service is allowed after the user explicitly approves it.
- Do not delete branches, deployment history, backups, cloud resources, or repositories without explicit approval.

## Development Rules

- Prefer local fixtures under `data/raw/` during development.
- Keep original source files separate from parsed and validated outputs.
- Do not invent missing official information. Use `null` for missing structured fields.
- Keep official text separate from simplified explanations.
- Do not write to production databases during pilot work.
- Start with one pilot only: King Abdulaziz University, Bachelor's degree, one college, Accounting program.

## Expected Workflow

1. Save official source material under `data/raw/kau/accounting/`.
2. Parse raw files into normalized JSON under `data/parsed/`.
3. Validate parsed data and write reports under `reports/`.
4. Export only validated data under `data/validated/`.

