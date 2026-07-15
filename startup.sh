#!/usr/bin/env bash
set -euo pipefail

export PYTHONPATH=src
python -m kau_programs.server --host 0.0.0.0
