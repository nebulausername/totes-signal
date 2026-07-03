#!/usr/bin/env bash
# Full web build: fetch assets + compile QuakeC. Afterwards web/ is servable.
set -o errexit

SCRIPT_DIR=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" &> /dev/null && pwd)

"${SCRIPT_DIR}/fetch-assets.sh"
"${SCRIPT_DIR}/build-progs.sh"

echo "[OK] web/ is ready. Start a local server with: tools/serve.sh"
