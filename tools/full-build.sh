#!/usr/bin/env bash
# One-shot: python deps in a venv, then compile QC + fetch assets.
set -o pipefail
cd /home/zombie-app
echo "===== full-build start ====="
date -u 2>/dev/null || true

# 1) Python toolchain in an isolated venv (Debian PEP-668 safe)
if [ ! -x /home/zombie-app/.venv/bin/python ]; then
  python3 -m venv /home/zombie-app/.venv || { echo "[ERR] venv failed"; }
fi
source /home/zombie-app/.venv/bin/activate
python -m pip install --quiet --upgrade pip
python -m pip install --quiet pandas fastcrc colorama || { echo "[ERR] pip install failed"; }
python -c "import pandas,fastcrc,colorama; print('[OK] deps', pandas.__version__)" || exit 1

# ensure the build scripts see the venv python as 'python3'
export PATH="/home/zombie-app/.venv/bin:$PATH"

# 2) Compile QuakeC -> progs.pk3
echo "----- build-progs -----"
bash tools/build-progs.sh || { echo "[ERR] build-progs failed"; exit 1; }

# 3) Fetch + verify game.pk3 (~90MB)
echo "----- fetch-assets -----"
bash tools/fetch-assets.sh || { echo "[ERR] fetch-assets failed"; exit 1; }

echo "----- result -----"
ls -la web/nzp/
echo "===== full-build done ====="
