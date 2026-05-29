---
globs: frontend/src/**/*.tsx, frontend/src/**/*.ts
---

# Frontend Component Patterns

## Shared display components

Before writing a small UI helper (label/value pair, badge cell, empty state), check `frontend/src/components/refine-ui/`.
If the pattern appears in 2+ page files with no shared abstraction, extract it first.

Currently shared:
- `InfoRow` (label + value dt/dd) → `@/components/refine-ui/info-row`
- `EmptyCell` (muted em dash for empty table cells) → `@/components/refine-ui/empty-cell`

## DataTableSorter — isMulti must be false

`DataTableSorter` calls `column.toggleSorting(undefined, false)`.
Do NOT change the second argument to `true`: multi-sort (additive) mode keeps any
`refineCoreProps.sorters.initial` sort as the primary sort, so user-triggered sorts
have no visible effect. `false` replaces all active sorters with the clicked column.

## Types and enums

`frontend/src/types/database.ts` is the single source of truth for all database-backed types and enums. Use the generated helpers — never hardcode DB enum values as string literals.

```ts
// Wrong — duplicates the DB schema
status: "paid" | "volunteer";
const ROLE_OPTIONS = ["Supervisor", "Member"];

// Correct
import { Enums, Tables, Constants } from "@/types/database";
status: Enums<'employment_type'>;
const ROLE_OPTIONS = Constants.public.Enums.user_role; // readonly string[]
```

Applies to: type annotations, prop types, `<Select>` option arrays, switch statements — anywhere a DB enum value appears.

For types not in the DB schema (UI-only state, composite shapes, local domain types), define them in `frontend/src/types/` and export from there.

## Shared constants

Display constants (badge variants, status maps, colour maps) live in `frontend/src/constants/`. Import; don't re-declare inline.

## Dialog/modal forms — use react-hook-form with conditional mount

Dialog/modal/sheet/drawer components with 2+ form fields seeded from props must use
`useForm` from `react-hook-form`, not arrays of `useState`. Seed with `defaultValues`.
Use `<Controller>` for Shadcn controlled components (Select, Switch, etc.).

**Always render any wrapper component with an `open` prop using conditional mount at the call site:**

```tsx
// Correct — component mounts fresh on open; defaultValues auto-seeds the form
{open && <SomeDialog open onOpenChange={setOpen} ... />}

// Wrong — component stays mounted; requires explicit useEffect reset
<SomeDialog open={open} onOpenChange={setOpen} ... />
```

Applies to all `*Dialog`, `*Sheet`, `*Drawer`, `*Modal` wrappers.

Exception: inline `AlertDialog` with derived-state open (e.g. `open={!!deleteId}`) — no wrapper, no form state, conditional mount doesn't apply.

Conditional mounting guarantees clean state on every open.
Never add `useEffect` to reset form state in a conditionally-mounted component.
