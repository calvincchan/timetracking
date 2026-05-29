---
globs: frontend/src/**/*.tsx, frontend/src/**/*.ts
---

# Refine + Tailwind Gotchas

## Tailwind v4 — use OKLch, not hex/HSL

Theme tokens use OKLch (`oklch(...)`). Writing hex or HSL values works syntactically but silently breaks theme coherence. No `tailwind.config.js` — theme is configured in `src/App.css` via `@theme` + CSS custom properties.

## Mutation hooks — no loading state

`useCreate`, `useUpdate`, `useDelete` expose no accessible `isLoading` due to a TS 5.9 + Refine v5 type incompatibility. Track loading manually:

```ts
const [saving, setSaving] = useState(false);
mutate(payload, {
  onSettled: () => setSaving(false),
});
setSaving(true);
```

## useList — return shape

`useList` returns `{ result: { data, total }, query }`, not `{ data, query }`:

```ts
const { result, query } = useList({ resource: "..." });
// result.data — the rows
// query.isLoading — loading state
```
