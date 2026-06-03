---
name: pick-issue
description: Pick a GitHub issue (first "ready-for-agent" or by issue number), clarify scope, then implement in an isolated git worktree and submit a PR.
model: sonnet
---

# pick-issue

Automate the full cycle: select issue → clarify → worktree → implement → PR.

## Phase 1 — Select Issue

If args contain a number, use it:
```bash
gh issue view {number} --json number,title,body,labels,comments
```

Otherwise pick the first `ready-for-agent` issue:
```bash
gh issue list --label ready-for-agent --limit 1 --json number,title,body,labels,comments
```

Read the full issue: title, body, all comments. Note any linked issues or acceptance criteria.

## Phase 2 — Interview

Read `CLAUDE.md` and `CONTEXT.md` for project conventions.

Identify ambiguities in the issue before writing any code:
- Missing acceptance criteria
- Scope creep risks
- Conflicts with existing code or recent changes

Ask clarifying questions **one at a time** using AskUserQuestion. Stop when the implementation plan is clear and unambiguous.

Then ask:
> "Ready to start implementation. Enable auto-accept permission mode so edits apply without prompting? (Recommended for implementation phase)"

Wait for the user's answer before continuing.

## Phase 3 — Worktree Setup

Derive branch name from the issue:
1. Take issue title, lowercase, replace non-alphanumeric with `-`, collapse multiple `-`, strip leading/trailing `-`, truncate to 40 chars.
2. Branch: `feat/issue-{number}-{slug}`

Create the worktree at the project root's `.claude/worktrees/` dir:
```bash
git worktree add .claude/worktrees/feat/issue-{number}-{slug} -b feat/issue-{number}-{slug}
```

Use `EnterWorktree` to switch into `.claude/worktrees/feat/issue-{number}-{slug}`.

All subsequent file edits and commands operate inside the worktree.

## Phase 4 — Implement

Follow all project CLAUDE.md rules. Key gates before committing:
- `npm run type-check` — zero errors
- `npm run lint` — zero errors
- Run pgTAP tests if any `supabase/` files changed: `npx supabase test db --local`

Commit incrementally as logical units. Commit messages: imperative mood, concise.

## Phase 5 — Submit

Push the branch:
```bash
git push -u origin feat/issue-{number}-{slug}
```

Invoke the `create-pr` skill to open the PR (it auto-detects the closing issue from the branch name). Capture the PR URL returned.

Use `ExitWorktree`.

Spawn a **background** Agent with this prompt (substitute the actual PR URL):
> Run `/review` on PR {PR URL}. After the review completes, run `/receiving-code-review` in this same session to process the findings. No handoff needed.

The review and receiving-code-review run async in the same BG session.

## Rules

- Never skip type-check or lint gates.
- Never commit directly to `main`.
- Worktree path: always `.claude/worktrees/{branch-name}` relative to project root.
- If issue has no `ready-for-agent` label and no number was provided, stop and report to user.
