#!/usr/bin/env bash
# Setzt TS_BUILD, SW_VERSION und version.json in EINEM Schritt.
#
# Warum ein Skript: die Regel lautet "bei jeder Aenderung an index.html, sw.js
# oder den Icons alle DREI hochzaehlen" -- sonst liefern installierte
# PWA-Clients eine veraltete Shell aus. Drei Stellen von Hand zu pflegen geht
# irgendwann schief, und der Fehler faellt erst beim Spieler auf.
#
#   tools/bump-shell.sh              -> heutiges Datum, naechster Buchstabe
#   tools/bump-shell.sh 2026-08-21c  -> expliziter Build
#   tools/bump-shell.sh --check      -> nur pruefen, nichts aendern
set -o errexit -o nounset -o pipefail

SCRIPT_DIR=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" &> /dev/null && pwd)
REPO_ROOT=$(dirname "${SCRIPT_DIR}")
IDX="${REPO_ROOT}/web/index.html"
SW="${REPO_ROOT}/web/sw.js"
VJ="${REPO_ROOT}/web/version.json"

cur_build() { grep -oP "var TS_BUILD = '\K[^']+" "${IDX}"; }
cur_sw()    { grep -oP "const SW_VERSION = '\K[^']+" "${SW}"; }
cur_vj()    { python3 -c "import json;print(json.load(open('${VJ}'))['build'])"; }

check() {
    local b s v
    b=$(cur_build); s=$(cur_sw); v=$(cur_vj)
    printf 'TS_BUILD     : %s\nSW_VERSION   : %s\nversion.json : %s\n' "$b" "$s" "$v"
    if [[ "$b" != "$v" ]]; then
        echo "[FEHLER] TS_BUILD und version.json weichen ab." >&2
        return 1
    fi
    echo "[OK] TS_BUILD und version.json stimmen ueberein."
}

if [[ "${1:-}" == "--check" ]]; then check; exit $?; fi

if [[ -n "${1:-}" ]]; then
    NEW="$1"
else
    TODAY=$(date -u +%Y-%m-%d)
    OLD=$(cur_build)
    if [[ "${OLD}" == "${TODAY}"* ]]; then
        # heutiges Datum -> naechster Buchstabe
        SUF="${OLD##${TODAY}}"
        NEXT=$(python3 -c "print(chr(ord('${SUF:-a}')+1) if '${SUF}' else 'a')")
        NEW="${TODAY}${NEXT}"
    else
        NEW="${TODAY}a"
    fi
fi

OLD_SW=$(cur_sw)
NEW_SW="v$(( ${OLD_SW#v} + 1 ))"

python3 - "$IDX" "$SW" "$VJ" "$NEW" "$NEW_SW" <<'PY'
import sys, re, pathlib, json
idx, sw, vj, new, new_sw = sys.argv[1:6]
p = pathlib.Path(idx); s = p.read_text(encoding='utf-8')
s = re.sub(r"var TS_BUILD = '[^']+';", f"var TS_BUILD = '{new}';", s, count=1)
p.write_text(s, encoding='utf-8')
p = pathlib.Path(sw); s = p.read_text(encoding='utf-8')
s = re.sub(r"const SW_VERSION = '[^']+';", f"const SW_VERSION = '{new_sw}';", s, count=1)
p.write_text(s, encoding='utf-8')
pathlib.Path(vj).write_text(json.dumps({"build": new}, separators=(',', ':')), encoding='utf-8')
PY

echo "[OK] Shell gebumpt:"
check
echo
echo "HINWEIS: Der DATA-Cachename in sw.js bleibt bewusst auf 'totes-data-v12'"
echo "         eingefroren. Dort liegen die 90 MB game.pk3 -- ein Bump dort"
echo "         kostet jeden installierten Spieler einen Neu-Download."
