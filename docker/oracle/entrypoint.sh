#!/usr/bin/env bash
# Prepare the Railway volume, then start Oracle as the oracle user.
#
# Railway mounts the volume as root and keeps a lost+found directory in it.
# The Oracle image refuses to initialize into a directory it cannot write, and
# it treats leftover files from a failed first boot as a corrupt database.
set -Eeuo pipefail

DATA_DIR="${ORACLE_BASE}/oradata"

echo "RAILWAY: preparing ${DATA_DIR}"
chown oracle:oinstall "${DATA_DIR}"
chmod 750 "${DATA_DIR}"

if [ -d "${DATA_DIR}/dbconfig/${ORACLE_SID}" ]; then
  echo "RAILWAY: initialized database found"
  chown -R oracle:oinstall "${DATA_DIR}"
else
  echo "RAILWAY: no initialized database, clearing partial data files"
  find "${DATA_DIR}" -mindepth 1 -maxdepth 1 ! -name lost+found -exec rm -rf {} +
fi

export HOME=/home/oracle
exec chroot --userspec=oracle:oinstall --skip-chdir / /opt/oracle/container-entrypoint.sh "$@"
