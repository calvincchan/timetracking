npx -y supabase db dump --local -o pretty > supabase/schema.sql;
npx -y supabase gen types --local -o pretty > frontend/src/types/database.ts;
