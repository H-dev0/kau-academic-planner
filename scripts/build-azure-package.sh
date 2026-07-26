#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'EOF'
Usage: scripts/build-azure-package.sh [--allow-dirty]

Builds and validates a local Azure deployment ZIP. It never deploys anything.
By default the Git working tree must be clean. --allow-dirty is intended only
for reviewing an uncommitted build-script change; runtime allowlist files must
still match HEAD exactly.
EOF
}

allow_dirty=false
case "${1:-}" in
  "") ;;
  --allow-dirty) allow_dirty=true ;;
  -h|--help) usage; exit 0 ;;
  *) usage >&2; exit 2 ;;
esac
[[ $# -le 1 ]] || { usage >&2; exit 2; }

script_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd -P)"
expected_root="$(cd -- "$script_dir/.." && pwd -P)"
repo_root="$(git -C "$expected_root" rev-parse --show-toplevel 2>/dev/null)" || {
  echo "Not inside the expected Git repository." >&2
  exit 1
}
[[ "$repo_root" == "$expected_root" ]] || {
  echo "Refusing unexpected repository root: $repo_root" >&2
  exit 1
}
[[ "$(node -p "require('$repo_root/package.json').name")" == "kau-course-planner" ]] || {
  echo "Refusing repository with an unexpected package identity." >&2
  exit 1
}

allowlist=(
  server.js
  azure-iisnode-entrypoint.js
  package.json
  web.config
  data/validated/kau_accounting.json
  web/index.html
  web/styles.css
  web/app.js
  web/progress-migration.js
  web/credit-display.js
  web/elective-groups.js
  web/data/kau_accounting.json
  web/data/additional_programs.json
  web/data/faculty_catalog.json
)

source_commit="$(git -C "$repo_root" rev-parse HEAD)"
source_short="$(git -C "$repo_root" rev-parse --short=8 HEAD)"
source_epoch="$(git -C "$repo_root" show -s --format=%ct HEAD)"
if ! $allow_dirty && [[ -n "$(git -C "$repo_root" status --porcelain)" ]]; then
  echo "Working tree is not clean. Commit/stash changes or use --allow-dirty for script review." >&2
  exit 1
fi

for file in "${allowlist[@]}"; do
  [[ -f "$repo_root/$file" ]] || { echo "Missing allowlisted file: $file" >&2; exit 1; }
  git -C "$repo_root" ls-files --error-unmatch -- "$file" >/dev/null
done
git -C "$repo_root" diff --quiet -- "${allowlist[@]}" || {
  echo "A runtime allowlist file differs from HEAD." >&2
  exit 1
}
git -C "$repo_root" diff --cached --quiet -- "${allowlist[@]}" || {
  echo "A staged runtime allowlist file differs from HEAD." >&2
  exit 1
}

for command in node python3 curl sha256sum; do
  command -v "$command" >/dev/null || { echo "Required command not found: $command" >&2; exit 1; }
done

output_dir="$repo_root/build/deployment"
artifact_name="kau-academic-planner-${source_short}.zip"
manifest_name="kau-academic-planner-${source_short}.manifest.json"
artifact_path="$output_dir/$artifact_name"
manifest_path="$output_dir/$manifest_name"
temp_root="$(mktemp -d /tmp/kau-azure-package.XXXXXX)"
stage_dir="$temp_root/stage"
expected_list="$temp_root/expected-files.txt"
server_log="$temp_root/staged-server.log"
server_pid=""

cleanup() {
  status=$?
  trap - EXIT INT TERM
  if [[ -n "$server_pid" ]] && kill -0 "$server_pid" 2>/dev/null; then
    kill "$server_pid" 2>/dev/null || true
    wait "$server_pid" 2>/dev/null || true
  fi
  rm -rf -- "$temp_root"
  exit "$status"
}
trap cleanup EXIT INT TERM

mkdir -p "$stage_dir" "$output_dir"
printf '%s\n' "${allowlist[@]}" | LC_ALL=C sort > "$expected_list"
for file in "${allowlist[@]}"; do
  install -D -m 0644 -- "$repo_root/$file" "$stage_dir/$file"
done

node --check "$stage_dir/server.js"
node --check "$stage_dir/azure-iisnode-entrypoint.js"
node --check "$stage_dir/web/app.js"
node --check "$stage_dir/web/progress-migration.js"
node --check "$stage_dir/web/credit-display.js"
node --check "$stage_dir/web/elective-groups.js"
[[ -f "$stage_dir/web.config" ]] || { echo "Staged web.config is missing." >&2; exit 1; }

STAGE_DIR="$stage_dir" EXPECTED_LIST="$expected_list" python3 - <<'PY'
import json
import os
from pathlib import Path

stage = Path(os.environ["STAGE_DIR"])
expected = Path(os.environ["EXPECTED_LIST"]).read_text(encoding="utf-8").splitlines()
actual = sorted(str(path.relative_to(stage)) for path in stage.rglob("*") if path.is_file())
if actual != expected:
    raise SystemExit(f"staged allowlist mismatch\nexpected={expected}\nactual={actual}")
for path in stage.rglob("*.json"):
    with path.open(encoding="utf-8") as handle:
        json.load(handle)
package = json.loads((stage / "package.json").read_text(encoding="utf-8"))
if package.get("name") != "kau-course-planner":
    raise SystemExit("unexpected staged package identity")
catalog = json.loads((stage / "web/data/faculty_catalog.json").read_text(encoding="utf-8"))
programs = catalog["programs"]
coverage = {
    state: sum(program.get("coverage_state") == state for program in programs)
    for state in ("FULL_PLANNER", "OFFICIAL_PLAN_VIEW", "CATALOG_ONLY")
}
counts = (len(programs), coverage["FULL_PLANNER"], coverage["OFFICIAL_PLAN_VIEW"], coverage["CATALOG_ONLY"])
if counts != (223, 72, 26, 125):
    raise SystemExit(f"unexpected program counts: {counts}")
PY

port="$(python3 - <<'PY'
import socket
with socket.socket() as sock:
    sock.bind(("127.0.0.1", 0))
    print(sock.getsockname()[1])
PY
)"
(
  cd "$stage_dir"
  PORT="$port" node -e "require('./azure-iisnode-entrypoint.js')" >"$server_log" 2>&1
) &
server_pid=$!
base_url="http://127.0.0.1:$port"
for _ in $(seq 1 100); do
  if curl --silent --fail --output /dev/null "$base_url/"; then break; fi
  if ! kill -0 "$server_pid" 2>/dev/null; then
    cat "$server_log" >&2
    echo "Staged server exited before becoming ready." >&2
    exit 1
  fi
  sleep 0.1
done
curl --silent --fail --output /dev/null "$base_url/" || {
  cat "$server_log" >&2
  echo "Staged homepage did not become ready." >&2
  exit 1
}

BASE_URL="$base_url" python3 - <<'PY'
import json
import math
import os
from urllib.error import HTTPError
from urllib.parse import quote
from urllib.request import Request, urlopen

base = os.environ["BASE_URL"]

def request(path, payload=None):
    body = None if payload is None else json.dumps(payload).encode("utf-8")
    req = Request(base + path, data=body, headers={"Content-Type": "application/json"})
    with urlopen(req, timeout=10) as response:
        if response.status != 200:
            raise AssertionError((path, response.status))
        return response.read(), response.headers.get_content_type()

def assert_finite(value):
    if isinstance(value, float) and not math.isfinite(value):
        raise AssertionError("non-finite numeric API value")
    if isinstance(value, str) and value.strip().lower() in {"nan", "null", "undefined"}:
        raise AssertionError(f"unexpected sentinel string: {value}")
    if isinstance(value, dict):
        for item in value.values():
            assert_finite(item)
    elif isinstance(value, list):
        for item in value:
            assert_finite(item)

homepage, _ = request("/")
home_text = homepage.decode("utf-8").lower()
if "nan" in home_text or ">null<" in home_text:
    raise AssertionError("visible null/NaN marker in homepage")
registry_raw, _ = request("/api/programs")
registry = json.loads(registry_raw)
supported = [program for program in registry["programs"] if program.get("planner_available")]
if len(supported) != 72:
    raise AssertionError(f"expected 72 supported programs, got {len(supported)}")

details = {}
plans = {}
for summary in supported:
    program_id = summary["id"]
    detail_raw, _ = request("/api/program?major=" + quote(program_id))
    detail = json.loads(detail_raw)
    if not detail.get("courses"):
        raise AssertionError(f"supported program has no courses: {program_id}")
    plan_raw, _ = request(
        "/api/plan?major=" + quote(program_id),
        {"completed_codes": []},
    )
    plan = json.loads(plan_raw)
    assert_finite(detail)
    assert_finite(plan)
    details[program_id] = detail
    plans[program_id] = plan

expected_twenty = {
    "catalog-associate-diploma-in-applications-development",
    "catalog-executive-master-in-public-policy",
    "catalog-information-systems-management-and-digitalization",
    "catalog-executive-master-of-health-administration-emha",
    "catalog-master-of-science-in-engineering-management",
    "catalog-masters-in-marine-geology",
    "catalog-business-economics",
    "catalog-masters-in-marine-chemistry",
    "catalog-masters-in-marine-physics",
    "catalog-doctor-of-philosophy-in-meteorology",
    "catalog-executive-master-in-human-resource-management",
    "catalog-general-associate-diploma-in-digital-transformation",
    "catalog-intermediate-diploma-in-cybersecurity-distance",
    "catalog-intermediate-diploma-in-data-science",
    "catalog-master-of-science-in-environmental-science",
    "catalog-master-of-science-in-meteorology",
    "catalog-master-of-science-in-nuclear-engineering",
    "catalog-masters-in-geophysics-by-coursework-and-research-project",
    "catalog-executive-master-of-science-in-moderation-and-intellectual-security",
    "catalog-master-of-science-in-hydrology-and-water-resources-management",
}
if not expected_twenty <= details.keys():
    raise AssertionError(f"missing newly imported programs: {sorted(expected_twenty - details.keys())}")

for program_id, expected in {
    "accounting": (43, 38, 5),
    "finance": (43, 43, 0),
}.items():
    detail = details[program_id]
    plan = plans[program_id]
    actual = (len(detail["courses"]), len(plan["available_courses"]), len(plan["blocked_courses"]))
    if actual != expected:
        raise AssertionError(f"{program_id} expected {expected}, got {actual}")

module, content_type = request("/elective-groups.js")
if b"electivePlan" not in module or content_type != "application/javascript":
    raise AssertionError("elective-group module was not served correctly")

try:
    request("/.auth/me")
except HTTPError as error:
    if error.code != 404:
        raise
else:
    raise AssertionError("local /.auth/me should return 404 without Easy Auth")

print("Staged smoke: homepage 200; registry 200; 72 details and 72 plans passed")
print("Staged smoke: Accounting 43/38/5; Finance 43/43/0; 20 imports passed; /.auth/me 404 accepted")
PY

kill "$server_pid"
wait "$server_pid" 2>/dev/null || true
server_pid=""

STAGE_DIR="$stage_dir" EXPECTED_LIST="$expected_list" python3 - <<'PY'
import os
from pathlib import Path
stage = Path(os.environ["STAGE_DIR"])
expected = Path(os.environ["EXPECTED_LIST"]).read_text(encoding="utf-8").splitlines()
actual = sorted(str(path.relative_to(stage)) for path in stage.rglob("*") if path.is_file())
if actual != expected:
    raise SystemExit(f"staged files changed during smoke test: {actual}")
PY

rm -f -- "$artifact_path" "$manifest_path"
STAGE_DIR="$stage_dir" ARTIFACT_PATH="$artifact_path" SOURCE_EPOCH="$source_epoch" python3 - <<'PY'
import datetime
import os
import zipfile
from pathlib import Path

stage = Path(os.environ["STAGE_DIR"])
artifact = Path(os.environ["ARTIFACT_PATH"])
epoch = int(os.environ["SOURCE_EPOCH"])
stamp = datetime.datetime.fromtimestamp(epoch, datetime.timezone.utc)
stamp = stamp.replace(second=stamp.second - stamp.second % 2)
date_time = max(stamp.timetuple()[:6], (1980, 1, 1, 0, 0, 0))
with zipfile.ZipFile(artifact, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=9) as archive:
    for path in sorted(item for item in stage.rglob("*") if item.is_file()):
        relative = path.relative_to(stage).as_posix()
        info = zipfile.ZipInfo(relative, date_time=date_time)
        info.create_system = 3
        info.external_attr = 0o100644 << 16
        info.compress_type = zipfile.ZIP_DEFLATED
        archive.writestr(info, path.read_bytes(), compresslevel=9)
PY

SOURCE_COMMIT="$source_commit" SOURCE_SHORT="$source_short" STAGE_DIR="$stage_dir" \
ARTIFACT_PATH="$artifact_path" MANIFEST_PATH="$manifest_path" python3 - <<'PY'
import datetime
import hashlib
import json
import os
from pathlib import Path

stage = Path(os.environ["STAGE_DIR"])
artifact = Path(os.environ["ARTIFACT_PATH"])
catalog = json.loads((stage / "web/data/faculty_catalog.json").read_text(encoding="utf-8"))
programs = catalog["programs"]
files = []
for path in sorted(item for item in stage.rglob("*") if item.is_file()):
    data = path.read_bytes()
    files.append({
        "path": path.relative_to(stage).as_posix(),
        "size_bytes": len(data),
        "sha256": hashlib.sha256(data).hexdigest(),
    })
artifact_data = artifact.read_bytes()
manifest = {
    "schema_version": 1,
    "source_commit": os.environ["SOURCE_COMMIT"],
    "source_commit_short": os.environ["SOURCE_SHORT"],
    "build_timestamp_utc": datetime.datetime.now(datetime.timezone.utc).isoformat(),
    "artifact": {
        "filename": artifact.name,
        "size_bytes": len(artifact_data),
        "sha256": hashlib.sha256(artifact_data).hexdigest(),
    },
    "program_counts": {
        "total": len(programs),
        "full_planner": sum(program.get("coverage_state") == "FULL_PLANNER" for program in programs),
        "official_plan_view": sum(program.get("coverage_state") == "OFFICIAL_PLAN_VIEW" for program in programs),
        "catalog_only": sum(program.get("coverage_state") == "CATALOG_ONLY" for program in programs),
    },
    "files": files,
}
Path(os.environ["MANIFEST_PATH"]).write_text(
    json.dumps(manifest, indent=2, ensure_ascii=False) + "\n",
    encoding="utf-8",
)
PY

ARTIFACT_PATH="$artifact_path" EXPECTED_LIST="$expected_list" python3 - <<'PY'
import os
import zipfile
from pathlib import Path
expected = Path(os.environ["EXPECTED_LIST"]).read_text(encoding="utf-8").splitlines()
with zipfile.ZipFile(os.environ["ARTIFACT_PATH"]) as archive:
    actual = sorted(name for name in archive.namelist() if not name.endswith("/"))
    if actual != expected:
        raise SystemExit(f"ZIP allowlist mismatch: {actual}")
    bad = archive.testzip()
    if bad:
        raise SystemExit(f"corrupt ZIP member: {bad}")
PY

echo "Artifact: $artifact_path"
echo "Manifest: $manifest_path"
echo "ZIP SHA-256: $(sha256sum "$artifact_path" | cut -d' ' -f1)"
echo "ZIP size: $(stat -c '%s' "$artifact_path") bytes"
echo "Source commit: $source_commit"
