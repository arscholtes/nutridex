#!/usr/bin/env bash
# db-local.sh — a project-local Postgres 16 for development, in .pgdata on port 54329.
# Idempotent: initialises the cluster once, starts it if stopped, creates the database once.
# Supabase replaces this when DATABASE_URL points there; nothing else changes.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DATA="$ROOT/.pgdata"
PORT=54329
DB=foodi_dex
PG_BIN="$(brew --prefix postgresql@16)/bin"

if [ ! -x "$PG_BIN/pg_ctl" ]; then
  echo "db-local: Postgres 16 not found at $PG_BIN — brew install postgresql@16" >&2
  exit 1
fi

if [ ! -f "$DATA/PG_VERSION" ]; then
  "$PG_BIN/initdb" --pgdata="$DATA" --auth=trust --encoding=UTF8 --locale=C --username="$USER" >/dev/null
  echo "db-local: initialised $DATA"
fi

if ! "$PG_BIN/pg_ctl" status --pgdata="$DATA" >/dev/null 2>&1; then
  "$PG_BIN/pg_ctl" start --pgdata="$DATA" --log="$DATA/server.log" --wait \
    --options="-p $PORT -c listen_addresses=localhost" >/dev/null
  echo "db-local: started on port $PORT"
fi

if ! "$PG_BIN/psql" -p "$PORT" -h localhost -d postgres -tAc "select 1 from pg_database where datname = '$DB'" | grep -q 1; then
  "$PG_BIN/createdb" -p "$PORT" -h localhost "$DB"
  echo "db-local: created database $DB"
fi

echo "db-local: postgres://localhost:$PORT/$DB"
