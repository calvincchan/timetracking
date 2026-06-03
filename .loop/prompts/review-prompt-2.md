Read the handoff file. It describes a completed code review with a worktree path, target files, and a findings table.

1. Read every file listed under "Files to Review" from the worktree path in the handoff.
2. Plan fixes for all findings. Severity guide: Medium = must fix, Low = fix unless invasive.
3. Apply fixes to the worktree. Run `npm run type-check && npm run lint` from the worktree's `frontend/` dir — both must pass clean.
4. Commit to the branch with a conventional commit message listing each fix.
5. Push the branch.
6. Post a PR comment to the PR number in the handoff summarising each fix (severity + one-line description).

Do not modify files outside the worktree. Do not push if type-check or lint fails.