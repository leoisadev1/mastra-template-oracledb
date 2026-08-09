#!/usr/bin/env bash
# Prepare the Railway volume, then start Oracle as the oracle user.
#
# Railway mounts the volume as root and keeps a lost+found directory in it.
# The Oracle image refuses to initialize into a directory it cannot write, and
# it treats leftover files from a failed first boot as a corrupt database.
set -Eeuo pipefail

# Guard the wipe below: an empty ORACLE_SID would make the check miss an
# initialized database and delete it.
: "${ORACLE_BASE:?ORACLE_BASE must be set by the image}"
: "${ORACLE_SID:?ORACLE_SID must be set by the image}"

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

# Drop to the oracle user. Railway's runtime does not grant CAP_SYS_CHROOT, so
# `chroot --userspec` fails here; use the plain privilege-drop tools instead.
if command -v setpriv > /dev/null 2>&1; then
  exec setpriv --reuid=oracle --regid=oinstall --init-groups /opt/oracle/container-entrypoint.sh "$@"
elif command -v runuser > /dev/null 2>&1; then
  exec runuser -u oracle -g oinstall -- /opt/oracle/container-entrypoint.sh "$@"
else
  exec su -s /bin/bash -c '/opt/oracle/container-entrypoint.sh' oracle
fi
