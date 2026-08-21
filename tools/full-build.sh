#!/usr/bin/env bash
# Ein Durchgang: Python-Werkzeuge im venv, QuakeC compilieren, Assets pruefen.
#
# Pfadrelativ -- die Vorgaengerfassung hatte /home/zombie-app viermal fest
# verdrahtet. Dieses Verzeichnis existiert nicht (mehr); das Skript ist am
# `cd` gescheitert und lief danach im falschen Arbeitsverzeichnis weiter, weil
# nur `pipefail` gesetzt war und nicht `errexit`. Beides behoben.
set -o errexit -o nounset -o pipefail

SCRIPT_DIR=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" &> /dev/null && pwd)
REPO_ROOT=$(dirname "${SCRIPT_DIR}")
VENV="${REPO_ROOT}/.venv"
cd "${REPO_ROOT}"

echo "===== full-build start ====="
date -u
echo "Repo: ${REPO_ROOT}"

# 1) Python-Werkzeugkette im eigenen venv (Debian PEP-668-sicher)
if [ ! -x "${VENV}/bin/python" ]; then
  echo "[INFO] Lege venv an ..."
  python3 -m venv "${VENV}"
fi
# shellcheck source=/dev/null
source "${VENV}/bin/activate"
python -m pip install --quiet --upgrade pip
# Versionen bewusst offen: qc_hash_generator.py traegt einen lokalen Fix fuer
# pandas >= 2 (siehe docs/UPSTREAM.md). Bricht ein pandas-Major das erneut,
# soll es hier sichtbar scheitern und nicht still eine alte Version festhalten.
python -m pip install --quiet pandas fastcrc colorama
python -c "import pandas,fastcrc,colorama; print('[OK] deps: pandas', pandas.__version__)"

# Die Build-Skripte muessen das venv-python als 'python3' sehen
export PATH="${VENV}/bin:${PATH}"

# 2) QuakeC -> progs.pk3
echo "----- build-progs -----"
bash "${SCRIPT_DIR}/build-progs.sh"

# 3) game.pk3 pruefen (loescht nie etwas, siehe fetch-assets.sh)
echo "----- fetch-assets -----"
bash "${SCRIPT_DIR}/fetch-assets.sh"

echo "----- Ergebnis -----"
ls -la "${REPO_ROOT}/web/nzp/"
echo "===== full-build done ====="
