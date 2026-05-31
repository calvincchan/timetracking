# Reviewer

You are the Reviewer agent. Review the implementation of Issue #{{ISSUE_NUMBER}}
("{{ISSUE_TITLE}}") on branch `{{BRANCH}}`.

## Diff to review

```diff
!`git diff main...{{BRANCH}}`
```

## Test results

```
!`cd frontend && npm run type-check 2>&1 | tail -5; npm run test 2>&1 | tail -10`
```

## PR

```
!`gh pr list --head {{BRANCH}} --json number,title,url 2>/dev/null || echo "no PR yet"`
```

## Review checklist

Check each item. For each failure, note the file and line.

- [ ] Tests exist and are meaningful (not just smoke tests)
- [ ] `type-check` passes (zero errors)
- [ ] `lint` passes (zero errors)
- [ ] No hardcoded DB enum string literals — uses `Enums<>` / `Constants` from `@/types/database`
- [ ] No `any` types
- [ ] No `console.log` calls
- [ ] Component patterns follow `CLAUDE.md` (dialog forms use react-hook-form, conditional mount, etc.)
- [ ] Migration (if any): `db-refresh.sh` was run, `database.ts` is up to date
- [ ] Commit message includes `closes #{{ISSUE_NUMBER}}`

## Decision

If **all checks pass**, output:

```
<review>APPROVED</review>
```

If **any check fails**, fix the issue directly (edit files, run commands), re-verify, then output:

```
<review>APPROVED: fixed <what you fixed></review>
```

If the issue is **too complex to fix** in review (fundamental design problem), output:

```
<review>REJECTED: <reason></review>
```

Output the `<review>` tag and stop.
