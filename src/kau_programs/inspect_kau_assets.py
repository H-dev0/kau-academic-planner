from __future__ import annotations

import re
from pathlib import Path
from urllib.parse import urljoin
from urllib.request import Request, urlopen


def main() -> int:
    html = Path(
        "data/raw/kau/accounting/bachelor-of-science-in-accounting.2026-07-05.html"
    ).read_text(encoding="utf-8")
    chunks = sorted(set(re.findall(r"/_next/static/chunks/[^\"<>]+?\.js", html)))
    print(f"chunks {len(chunks)}")
    for path in chunks:
        url = urljoin("https://kau.edu.sa", path)
        text = urlopen(
            Request(url, headers={"User-Agent": "kau-program-scraper-dev/0.1"}),
            timeout=20,
        ).read().decode("utf-8", "replace")
        hits = [
            marker
            for marker in (
                "credit_hours",
                "credits",
                "studyPlan",
                "course_code",
                "prerequisites",
                "api/",
            )
            if marker in text
        ]
        if hits:
            print(path, hits, len(text))
            for marker in hits[:3]:
                index = text.find(marker)
                snippet = text[max(0, index - 180) : index + 300].replace("\n", " ")
                print(snippet[:600])
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
