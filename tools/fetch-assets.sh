#!/usr/bin/env bash
# Download the vanilla game assets (game.pk3) into web/nzp/ and verify
# their integrity. The pinned sha256 is also documented in docs/UPSTREAM.md.
set -o errexit

SCRIPT_DIR=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" &> /dev/null && pwd)
REPO_ROOT=$(dirname "${SCRIPT_DIR}")
DEST="${REPO_ROOT}/web/nzp/game.pk3"

GAME_PK3_SHA256="c7b812cebef842d7ad4d010ccb8b30f85ae92a81febf8d449642d5abb24ccb46"

# Primary: the file as committed in the nzp.gay site repository.
# (nzp.gay itself rejects non-browser downloads with 403.)
PRIMARY_URL="${GAME_PK3_URL:-https://raw.githubusercontent.com/nzp-team/nzp-team.github.io/main/nzp/game.pk3}"

verify()
{
    echo "${GAME_PK3_SHA256}  ${DEST}" | sha256sum -c -
}

if [[ -f "${DEST}" ]]; then
    if verify; then
        echo "[OK] ${DEST} already present and verified."
        exit 0
    fi
    echo "[WARN] Existing ${DEST} failed verification, re-downloading."
    rm -f "${DEST}"
fi

mkdir -p "${REPO_ROOT}/web/nzp"
echo "[INFO] Downloading game.pk3 ..."
curl -fL --retry 3 -o "${DEST}" "${PRIMARY_URL}"

if ! verify; then
    echo "[ERROR] game.pk3 checksum mismatch - upstream changed the file." >&2
    echo "        Inspect it, then update GAME_PK3_SHA256 here and in docs/UPSTREAM.md." >&2
    exit 1
fi
echo "[OK] $(du -h "${DEST}" | cut -f1) downloaded and verified."
