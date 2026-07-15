# Local Web Preview

Run from WSL:

```bash
cd ~/projects/kau-program-scraper/web
python3 -m http.server 8765 --bind 0.0.0.0
```

Open:

```text
http://localhost:8765
```

Current features:

- Mark completed courses
- Search by course code or name
- Filter by level
- See recommended next-semester courses
- See blocked courses and missing prerequisites
- See course progress
- Export the current plan as JSON
- Login with a local demo name
- Save completed courses locally in SQLite through the local backend

Credit note:

The official KAU embedded course rows do not currently provide usable per-course
credit hours. The app therefore shows completed and remaining credits as unknown
once selected courses need row-level credits.

The official program total is still shown because KAU states the full study plan
totals 125 credit hours.

Backend preview:

```bash
cd ~/projects/kau-program-scraper
PYTHONPATH=src python -m kau_programs.server --port 8766
```

Open:

```text
http://localhost:8766
```
