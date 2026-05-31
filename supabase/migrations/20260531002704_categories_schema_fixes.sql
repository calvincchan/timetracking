-- PRD-02 schema fixes for categories.
--
-- 1. Partial unique index on name for active (non-archived) categories.
--    Allows archived names to be reused while blocking duplicate active names.
-- 2. NOT NULL on categories timestamps — aligns with zero-null convention.
-- 3. time_entries.category_id nullable — category is optional; null renders
--    as "Uncategorized" in all views.

-- 1. Partial unique index on active category names
CREATE UNIQUE INDEX categories_name_active_unique
    ON public.categories (name)
    WHERE is_archived = false;

-- 2. NOT NULL timestamps on categories
ALTER TABLE public.categories
    ALTER COLUMN created_at SET NOT NULL,
    ALTER COLUMN updated_at SET NOT NULL;

-- 3. category_id optional on time_entries
ALTER TABLE public.time_entries
    ALTER COLUMN category_id DROP NOT NULL;
