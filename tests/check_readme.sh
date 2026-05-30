#!/usr/bin/env bash
# Verifies README.md at repo root meets issue-4 acceptance criteria.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
README="$ROOT/README.md"
PASS=0
FAIL=0

check() {
  local desc="$1"
  local result="$2"
  if [ "$result" = "0" ]; then
    echo "  PASS: $desc"
    ((PASS++)) || true
  else
    echo "  FAIL: $desc"
    ((FAIL++)) || true
  fi
}

echo "=== README.md acceptance checks ==="

# 1. File exists
[ -f "$README" ]
check "README.md exists at repo root" $?

# 2. Contains custom_access_token_hook
grep -q "custom_access_token_hook" "$README" 2>/dev/null
check "Contains custom_access_token_hook reference" $?

# 3. Contains user_role JWT claim
grep -q "user_role" "$README" 2>/dev/null
check "Contains user_role JWT claim" $?

# 4. Contains prerequisites section
grep -qi "prerequisite\|Node\|Docker\|Supabase CLI" "$README" 2>/dev/null
check "Contains prerequisites (Node/Docker/Supabase CLI)" $?

# 5. Contains what silently breaks note
grep -q "has_role_permission\|silently\|RLS\|blocked" "$README" 2>/dev/null
check "Contains note on what breaks if hook is skipped" $?

# 6. Contains setup steps keywords
grep -qi "supabase start\|migration\|npm run dev\|db-refresh" "$README" 2>/dev/null
check "Contains local setup steps (supabase start, migrations, npm run dev)" $?

echo ""
echo "Results: $PASS passed, $FAIL failed"
[ "$FAIL" -eq 0 ]
