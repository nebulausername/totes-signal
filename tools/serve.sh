#!/usr/bin/env bash
# Serve the web build locally at http://localhost:8080
set -o errexit

SCRIPT_DIR=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" &> /dev/null && pwd)
REPO_ROOT=$(dirname "${SCRIPT_DIR}")

exec python3 -m http.server "${PORT:-8080}" -d "${REPO_ROOT}/web"
