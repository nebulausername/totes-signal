#!/usr/bin/env bash
# Compile the QuakeC game logic and pack it into web/nzp/progs.pk3.
# Requirements: bash, python3 (+ pandas, fastcrc, colorama), zip.
set -o errexit

SCRIPT_DIR=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" &> /dev/null && pwd)
REPO_ROOT=$(dirname "${SCRIPT_DIR}")

cd "${REPO_ROOT}/quakec"
chmod +x bin/fteqcc-cli-lin tools/qc-compiler-gnu.sh
./tools/qc-compiler-gnu.sh

mkdir -p "${REPO_ROOT}/web/nzp"
rm -f "${REPO_ROOT}/web/nzp/progs.pk3"
cd build/fte
zip -9 "${REPO_ROOT}/web/nzp/progs.pk3" ./*.dat ./*.lno

echo "[OK] web/nzp/progs.pk3:"
unzip -l "${REPO_ROOT}/web/nzp/progs.pk3"
