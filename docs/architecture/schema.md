# Database Schema

Full SQL for all types, tables, the audit trigger, and the frontend snapshot type.

---

## Enum Types

```sql
CREATE TYPE user_role AS ENUM ('Supervisor', 'Member');
CREATE TYPE employment_type AS ENUM ('paid', 'volunteer');
```

---

## Tables

```sql
CREATE TABLE profiles (
  id               uuid PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  full_name        text NOT NULL DEFAULT '',
  role             user_role NOT NULL DEFAULT 'Member',
  employment_type  employment_type NOT NULL DEFAULT 'volunteer', -- hidden in v1 UI
  created_at       timestamptz DEFAULT now(),
  updated_at       timestamptz DEFAULT now()
);

CREATE TABLE invites (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email      text NOT NULL UNIQUE,
  full_name  text NOT NULL DEFAULT '',
  role       user_role NOT NULL DEFAULT 'Member',
  created_at timestamptz DEFAULT now()
);

CREATE TABLE categories (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  is_archived boolean NOT NULL DEFAULT false,
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);

CREATE TABLE time_entries (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  entry_date       date NOT NULL,
  duration_minutes int NOT NULL CHECK (duration_minutes > 0),
  category_id      uuid NOT NULL REFERENCES categories(id),
  note             text NOT NULL DEFAULT '',
  is_locked        boolean NOT NULL DEFAULT false,
  created_at       timestamptz DEFAULT now(),
  updated_at       timestamptz DEFAULT now()
);

-- No FK on entry_id — log survives entry deletion
CREATE TABLE time_entry_audit_logs (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_id    uuid NOT NULL,
  action      text NOT NULL CHECK (action IN ('INSERT','UPDATE','DELETE')),
  old_data    jsonb NOT NULL DEFAULT '{}',
  new_data    jsonb NOT NULL DEFAULT '{}',
  changed_by  uuid NOT NULL REFERENCES profiles(id),
  changed_at  timestamptz DEFAULT now()
);

-- Snapshot stored as JSONB array; typed in frontend as TimeEntrySnapshot[]
CREATE TABLE reports (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  generated_by           uuid NOT NULL REFERENCES profiles(id),
  period_start           date NOT NULL,
  period_end             date NOT NULL,
  time_entries_snapshot  jsonb NOT NULL DEFAULT '[]',
  generated_at           timestamptz DEFAULT now()
);
```

---

## Audit Trigger

```sql
CREATE OR REPLACE FUNCTION log_time_entry_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO time_entry_audit_logs (entry_id, action, old_data, new_data, changed_by)
  VALUES (
    COALESCE(NEW.id, OLD.id),
    TG_OP,
    CASE WHEN OLD IS NULL THEN '{}' ELSE to_jsonb(OLD) END,
    CASE WHEN NEW IS NULL THEN '{}' ELSE to_jsonb(NEW) END,
    auth.uid()
  );
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER time_entries_audit
AFTER INSERT OR UPDATE OR DELETE ON time_entries
FOR EACH ROW EXECUTE FUNCTION log_time_entry_change();
```

---

## Frontend Snapshot Type

```ts
// frontend/src/types/report-snapshot.ts
export interface TimeEntrySnapshot {
  entry_id:         string;
  user_id:          string;
  entry_date:       string; // yyyy-mm-dd
  duration_minutes: number;
  category_id:      string;
  note:             string;
}
// usage: report.time_entries_snapshot as TimeEntrySnapshot[]
```
