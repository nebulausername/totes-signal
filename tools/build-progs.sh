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
# Ship our configs (e.g. autoexec.cfg with touch-overlay binds) in the same pk3.
cd "${REPO_ROOT}/config"
zip -9 "${REPO_ROOT}/web/nzp/progs.pk3" ./*.cfg

# Ship custom art overrides (menu backgrounds, portraits) in the same pk3.
# pk3s merge in the VFS and progs.pk3 sorts after game.pk3 -> same-path files
# here OVERRIDE the pinned game.pk3 without touching it.
if [ -d "${REPO_ROOT}/assets" ]; then
    cd "${REPO_ROOT}/assets"
    zip -9 -r "${REPO_ROOT}/web/nzp/progs.pk3" gfx maps
fi

echo "[OK] web/nzp/progs.pk3:"
unzip -l "${REPO_ROOT}/web/nzp/progs.pk3"
