-- Add invites:read to permissions enum.
-- Must commit before DML uses the new value (see next migration).

ALTER TYPE public.permissions ADD VALUE IF NOT EXISTS 'invites:read';
