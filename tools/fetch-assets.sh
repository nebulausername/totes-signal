#!/usr/bin/env bash
# Beschafft die Spiel-Assets (game.pk3) nach web/nzp/ und prueft sie.
#
# WICHTIG -- diese Datei ist NICHT reproduzierbar.
# Upstream (nzp-team) hat game.pk3 nach unserem Vendoring geaendert. Unser
# lokaler Stand ist der Referenzstand; ein Neu-Download von Upstream liefert
# etwas anderes. Deshalb gilt hier die eiserne Regel:
#
#     Wir loeschen diese Datei NIE. Wir ueberschreiben sie ausschliesslich
#     nach erfolgreicher Verifikation eines VOLLSTAENDIGEN Downloads.
#
# Die Vorgaengerfassung hat bei Hash-Abweichung `rm -f "${DEST}"` gerufen und
# danach neu geladen -- mit dem falschen Pin also die einzige gute Kopie
# vernichtet. Das ist der Grund fuer den Umbau (Masterplan v4, B7).
#
# Kanonische Kopie ausserhalb des Repos: /srv/totersignal/assets/game.pk3
# (chattr +i). Siehe dort game.pk3.provenance.txt.
set -o errexit -o nounset -o pipefail

SCRIPT_DIR=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" &> /dev/null && pwd)
REPO_ROOT=$(dirname "${SCRIPT_DIR}")
DEST="${REPO_ROOT}/web/nzp/game.pk3"

# Der tatsaechliche Stand, mit dem das Spiel laeuft (2026-08-21 verifiziert).
GAME_PK3_SHA256="7a79969908e60e668aebb9b791dc435b44917ae1766e69f7dfd35de163d27889"

# Historischer Upstream-Pin. NUR zur Dokumentation -- Upstream hat die Datei
# seither geaendert, dieser Hash ist dort nicht mehr zu bekommen.
GAME_PK3_SHA256_HISTORIC="c7b812cebef842d7ad4d010ccb8b30f85ae92a81febf8d449642d5abb24ccb46"

# Primaerquelle: unsere eigene Auslieferung. Diese Bytes liegen ohnehin
# oeffentlich, und nur sie sind der Referenzstand.
LOCAL_STORE="/srv/totersignal/assets/game.pk3"
PRIMARY_URL="${GAME_PK3_URL:-https://totersignal.de/nzp/game.pk3}"
HISTORIC_URL="https://raw.githubusercontent.com/nzp-team/nzp-team.github.io/main/nzp/game.pk3"

DIFF_MODE=0
[[ "${1:-}" == "--diff" ]] && DIFF_MODE=1

hash_of() { sha256sum "$1" | cut -d' ' -f1; }

# --- Fall 1: Datei da und korrekt -> fertig -------------------------------
if [[ -f "${DEST}" ]]; then
    have=$(hash_of "${DEST}")
    if [[ "${have}" == "${GAME_PK3_SHA256}" ]]; then
        echo "[OK] ${DEST} vorhanden und verifiziert."
        exit 0
    fi

    # --- Fall 2: Datei da, Hash falsch -> LAUT melden, NICHTS anfassen ----
    echo "[FEHLER] ${DEST} stimmt nicht mit dem Pin ueberein." >&2
    echo "         erwartet: ${GAME_PK3_SHA256}" >&2
    echo "         gefunden: ${have}" >&2
    echo "" >&2
    echo "         Diese Datei wird NICHT geloescht und NICHT ueberschrieben." >&2
    echo "         Vergleichsstand: ${LOCAL_STORE}" >&2
    echo "         Upstream zum Vergleich holen: $0 --diff" >&2
    exit 1
fi

# --- Fall 3: Datei fehlt -> in .part laden, pruefen, DANN verschieben -----
mkdir -p "${REPO_ROOT}/web/nzp"

if [[ ${DIFF_MODE} -eq 1 ]]; then
    echo "[INFO] Lade Upstream-Fassung zum Vergleich nach ${DEST}.upstream ..."
    curl -fL --retry 3 -o "${DEST}.upstream" "${HISTORIC_URL}"
    echo "[INFO] Upstream-Hash:  $(hash_of "${DEST}.upstream")"
    echo "[INFO] Unser Pin:      ${GAME_PK3_SHA256}"
    echo "[INFO] Historischer Pin: ${GAME_PK3_SHA256_HISTORIC}"
    echo "[INFO] ${DEST} wurde nicht angefasst."
    exit 0
fi

# Erst aus dem lokalen Speicher -- schnell und garantiert richtig.
if [[ -r "${LOCAL_STORE}" ]]; then
    echo "[INFO] Kopiere aus dem lokalen Asset-Speicher ..."
    cp "${LOCAL_STORE}" "${DEST}.part"
else
    echo "[INFO] Lade game.pk3 von ${PRIMARY_URL} ..."
    curl -fL --retry 3 -o "${DEST}.part" "${PRIMARY_URL}"
fi

got=$(hash_of "${DEST}.part")
if [[ "${got}" != "${GAME_PK3_SHA256}" ]]; then
    echo "[FEHLER] Heruntergeladene Datei hat den falschen Hash." >&2
    echo "         erwartet: ${GAME_PK3_SHA256}" >&2
    echo "         gefunden: ${got}" >&2
    rm -f "${DEST}.part"          # nur das Fragment -- ${DEST} gab es nie
    exit 1
fi

mv "${DEST}.part" "${DEST}"
echo "[OK] $(du -h "${DEST}" | cut -f1) geladen und verifiziert."
