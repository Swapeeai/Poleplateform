#!/usr/bin/env bash
# Applies every migration to a throwaway Postgres database and runs the
# permission checks. Needs a local Postgres you can reach with psql.
#
#   PGHOST=localhost PGUSER=postgres bash supabase/tests/run.sh
set -euo pipefail

here="$(cd "$(dirname "$0")" && pwd)"
db="app_name_test_$$"

createdb "$db"
trap 'dropdb --if-exists "$db"' EXIT

psql -v ON_ERROR_STOP=1 -q -d "$db" -f "$here/supabase-stub.sql"
for file in "$here"/../migrations/*.sql; do
  psql -v ON_ERROR_STOP=1 -q -d "$db" -f "$file"
done
psql -v ON_ERROR_STOP=1 -q -d "$db" -f "$here/permissions.sql"
