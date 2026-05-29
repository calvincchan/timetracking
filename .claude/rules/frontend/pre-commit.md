# Frontend Pre-Commit / Pre-Push Gates

## Before every commit — hard blocks

```bash
cd frontend
npm run type-check   # tsc --noEmit; zero errors required
npm run lint         # eslint src; zero errors required (warnings OK)
```

Both must pass clean. Do not commit if either fails.

## Before push — additional check

```bash
npm run build        # full tsc + bundle; catches tree-shaking and import issues
```

## Code rules enforced by ESLint (errors, not warnings)

- **`any` banned** — `@typescript-eslint/no-explicit-any` is set to error. Use `unknown` + narrowing, or the specific type from `@/types/database`. No `@ts-ignore` without a one-line comment explaining why.
- **`console.log` banned** — `no-console` warns on `log`/`debug`/`info`. `console.error` and `console.warn` are allowed (error boundaries, unexpected states).

## DB enum rule (not ESLint-enforced — code review)

No hardcoded DB enum string literals anywhere. Use `Enums<'name'>`, `Constants.public.Enums.name`, or `Tables<'name'>` from `@/types/database`. See `component-patterns.md`.
