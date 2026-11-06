#!/usr/bin/env bash
# db-test.sh — the database `npm run test:db` runs against: the 15 hand-pinned foods and nothing a person has played.
# Idempotent: creates it once, then migrates and seeds it. TEST_DATABASE_URL in .env.local names it.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
TEST_DATABASE_URL="$(grep -E '^TEST_DATABASE_URL=' .env.local | cut -d= -f2-)"
if [ -z "$TEST_DATABASE_URL" ]; then
  echo "db-test: TEST_DATABASE_URL is not set in .env.local" >&2
  exit 1
fi
NAME="${TEST_DATABASE_URL##*/}"
SERVER="${TEST_DATABASE_URL%/*}/postgres"

if ! psql "$SERVER" -tAc "select 1 from pg_database where datname = '$NAME'" | grep -q 1; then
  psql "$SERVER" -qc "create database $NAME"
  echo "db-test: created database $NAME"
fi

# A variable already set wins over --env-file, so these reach the test database and not DATABASE_URL.
export DATABASE_URL="$TEST_DATABASE_URL"
npm run --silent db:migrate
npm run --silent seed
