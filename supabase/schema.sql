


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE EXTENSION IF NOT EXISTS "pg_net" WITH SCHEMA "extensions";






COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE TYPE "public"."employment_type" AS ENUM (
    'paid',
    'volunteer'
);


ALTER TYPE "public"."employment_type" OWNER TO "postgres";


CREATE TYPE "public"."permissions" AS ENUM (
    'time_entries:read',
    'time_entries:write',
    'time_entries:delete',
    'time_entries:amend',
    'categories:read',
    'categories:write',
    'reports:read',
    'reports:write',
    'invites:write',
    'profiles:read'
);


ALTER TYPE "public"."permissions" OWNER TO "postgres";


CREATE TYPE "public"."user_role" AS ENUM (
    'Supervisor',
    'Member'
);


ALTER TYPE "public"."user_role" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."custom_access_token_hook"("_event" "jsonb") RETURNS "jsonb"
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
    _claims    jsonb;
    _user_role user_role;
BEGIN
    SELECT COALESCE(
        (SELECT role FROM public.profiles WHERE id = (_event->>'user_id')::uuid),
        (SELECT role FROM public.invites  WHERE email = _event->'claims'->>'email')
    ) INTO _user_role;

    _claims := _event->'claims';

    IF _user_role IS NOT NULL THEN
        _claims := jsonb_set(_claims, '{user_role}', to_jsonb(_user_role::text));
    ELSE
        _claims := jsonb_set(_claims, '{user_role}', 'null');
    END IF;

    _event := jsonb_set(_event, '{claims}', _claims);
    RETURN _event;
END;
$$;


ALTER FUNCTION "public"."custom_access_token_hook"("_event" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
    is_first_user     BOOLEAN;
    invited_role      user_role;
    invited_full_name TEXT;
BEGIN
    IF TG_OP = 'INSERT' THEN
        SELECT NOT EXISTS (SELECT 1 FROM public.profiles) INTO is_first_user;

        IF is_first_user THEN
            INSERT INTO public.profiles (id, full_name, role)
            VALUES (
                new.id,
                COALESCE(NULLIF(new.raw_user_meta_data->>'full_name', ''), new.email),
                'Supervisor'
            );
        ELSE
            IF NOT EXISTS (SELECT 1 FROM public.invites WHERE email = new.email) THEN
                RAISE EXCEPTION 'Registration rejected: Email not invited.';
            END IF;
        END IF;

    ELSIF TG_OP = 'UPDATE'
          AND OLD.email_confirmed_at IS NULL
          AND NEW.email_confirmed_at IS NOT NULL THEN

        -- Skip if profile already exists (first-user path created it on INSERT)
        IF EXISTS (SELECT 1 FROM public.profiles WHERE id = new.id) THEN
            RETURN new;
        END IF;

        SELECT role, full_name
          FROM public.invites
         WHERE email = new.email
          INTO invited_role, invited_full_name;

        IF invited_role IS NULL THEN
            RAISE EXCEPTION 'Registration rejected: Email not invited.';
        END IF;

        INSERT INTO public.profiles (id, full_name, role)
        VALUES (new.id, invited_full_name, invited_role);

        DELETE FROM public.invites WHERE email = new.email;
    END IF;

    RETURN new;
END;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."has_role_permission"("p_permission" "public"."permissions") RETURNS boolean
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.role_permissions
        WHERE role = (auth.jwt() ->> 'user_role')::user_role
          AND permission = p_permission
    );
END;
$$;


ALTER FUNCTION "public"."has_role_permission"("p_permission" "public"."permissions") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_email_allowed"("p_email" "text") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT
    NOT EXISTS (SELECT 1 FROM public.profiles)   -- no users yet → first-user setup
    OR EXISTS (
      SELECT 1 FROM public.invites WHERE email = lower(p_email)
      UNION ALL
      SELECT 1 FROM auth.users     WHERE email = lower(p_email)
    );
$$;


ALTER FUNCTION "public"."is_email_allowed"("p_email" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_email_invitable"("p_email" "text") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT NOT EXISTS (
    SELECT 1 FROM auth.users WHERE email = lower(p_email)
  );
$$;


ALTER FUNCTION "public"."is_email_invitable"("p_email" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."log_time_entry_change"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    INSERT INTO public.time_entry_audit_logs (entry_id, action, old_data, new_data, changed_by)
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


ALTER FUNCTION "public"."log_time_entry_change"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_modified_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_modified_column"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."categories" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "is_archived" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."categories" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."invites" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "email" "text" NOT NULL,
    "full_name" "text" DEFAULT ''::"text" NOT NULL,
    "role" "public"."user_role" DEFAULT 'Member'::"public"."user_role" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."invites" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "full_name" "text" DEFAULT ''::"text" NOT NULL,
    "role" "public"."user_role" DEFAULT 'Member'::"public"."user_role" NOT NULL,
    "employment_type" "public"."employment_type" DEFAULT 'volunteer'::"public"."employment_type" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."reports" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "generated_by" "uuid" NOT NULL,
    "period_start" "date" NOT NULL,
    "period_end" "date" NOT NULL,
    "time_entries_snapshot" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "generated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."reports" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."role_permissions" (
    "role" "public"."user_role" NOT NULL,
    "permission" "public"."permissions" NOT NULL
);


ALTER TABLE "public"."role_permissions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."time_entries" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "entry_date" "date" NOT NULL,
    "duration_minutes" integer NOT NULL,
    "category_id" "uuid" NOT NULL,
    "note" "text" DEFAULT ''::"text" NOT NULL,
    "is_locked" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "time_entries_duration_minutes_check" CHECK (("duration_minutes" > 0))
);


ALTER TABLE "public"."time_entries" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."time_entry_audit_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "entry_id" "uuid" NOT NULL,
    "action" "text" NOT NULL,
    "old_data" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "new_data" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "changed_by" "uuid" NOT NULL,
    "changed_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "time_entry_audit_logs_action_check" CHECK (("action" = ANY (ARRAY['INSERT'::"text", 'UPDATE'::"text", 'DELETE'::"text"])))
);


ALTER TABLE "public"."time_entry_audit_logs" OWNER TO "postgres";


ALTER TABLE ONLY "public"."categories"
    ADD CONSTRAINT "categories_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."invites"
    ADD CONSTRAINT "invites_email_key" UNIQUE ("email");



ALTER TABLE ONLY "public"."invites"
    ADD CONSTRAINT "invites_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."reports"
    ADD CONSTRAINT "reports_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."role_permissions"
    ADD CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("role", "permission");



ALTER TABLE ONLY "public"."time_entries"
    ADD CONSTRAINT "time_entries_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."time_entry_audit_logs"
    ADD CONSTRAINT "time_entry_audit_logs_pkey" PRIMARY KEY ("id");



CREATE INDEX "idx_audit_logs_entry_id" ON "public"."time_entry_audit_logs" USING "btree" ("entry_id");



CREATE INDEX "idx_time_entries_entry_date" ON "public"."time_entries" USING "btree" ("entry_date");



CREATE INDEX "idx_time_entries_user_id" ON "public"."time_entries" USING "btree" ("user_id");



CREATE OR REPLACE TRIGGER "time_entries_audit" AFTER INSERT OR DELETE OR UPDATE ON "public"."time_entries" FOR EACH ROW EXECUTE FUNCTION "public"."log_time_entry_change"();



CREATE OR REPLACE TRIGGER "update_categories_modtime" BEFORE UPDATE ON "public"."categories" FOR EACH ROW EXECUTE FUNCTION "public"."update_modified_column"();



CREATE OR REPLACE TRIGGER "update_profiles_modtime" BEFORE UPDATE ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."update_modified_column"();



CREATE OR REPLACE TRIGGER "update_time_entries_modtime" BEFORE UPDATE ON "public"."time_entries" FOR EACH ROW EXECUTE FUNCTION "public"."update_modified_column"();



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."reports"
    ADD CONSTRAINT "reports_generated_by_fkey" FOREIGN KEY ("generated_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."time_entries"
    ADD CONSTRAINT "time_entries_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id");



ALTER TABLE ONLY "public"."time_entries"
    ADD CONSTRAINT "time_entries_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."time_entry_audit_logs"
    ADD CONSTRAINT "time_entry_audit_logs_changed_by_fkey" FOREIGN KEY ("changed_by") REFERENCES "public"."profiles"("id");



CREATE POLICY "audit_logs_select" ON "public"."time_entry_audit_logs" FOR SELECT TO "authenticated" USING (("public"."has_role_permission"('time_entries:read'::"public"."permissions") AND (("auth"."jwt"() ->> 'user_role'::"text") = 'Supervisor'::"text")));



ALTER TABLE "public"."categories" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "categories_insert" ON "public"."categories" FOR INSERT TO "authenticated" WITH CHECK ("public"."has_role_permission"('categories:write'::"public"."permissions"));



CREATE POLICY "categories_select" ON "public"."categories" FOR SELECT TO "authenticated" USING ("public"."has_role_permission"('categories:read'::"public"."permissions"));



CREATE POLICY "categories_update" ON "public"."categories" FOR UPDATE TO "authenticated" USING ("public"."has_role_permission"('categories:write'::"public"."permissions"));



ALTER TABLE "public"."invites" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "invites_all" ON "public"."invites" TO "authenticated" USING ("public"."has_role_permission"('invites:write'::"public"."permissions")) WITH CHECK ("public"."has_role_permission"('invites:write'::"public"."permissions"));



ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "profiles_select" ON "public"."profiles" FOR SELECT TO "authenticated" USING ((("id" = "auth"."uid"()) OR "public"."has_role_permission"('profiles:read'::"public"."permissions")));



CREATE POLICY "profiles_update" ON "public"."profiles" FOR UPDATE TO "authenticated" USING (("id" = "auth"."uid"()));



ALTER TABLE "public"."reports" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "reports_insert" ON "public"."reports" FOR INSERT TO "authenticated" WITH CHECK ("public"."has_role_permission"('reports:write'::"public"."permissions"));



CREATE POLICY "reports_select" ON "public"."reports" FOR SELECT TO "authenticated" USING ("public"."has_role_permission"('reports:read'::"public"."permissions"));



ALTER TABLE "public"."role_permissions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "role_permissions_read" ON "public"."role_permissions" FOR SELECT TO "authenticated" USING (true);



ALTER TABLE "public"."time_entries" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "time_entries_delete" ON "public"."time_entries" FOR DELETE TO "authenticated" USING (("public"."has_role_permission"('time_entries:delete'::"public"."permissions") AND ("user_id" = "auth"."uid"()) AND ((("auth"."jwt"() ->> 'user_role'::"text") = 'Supervisor'::"text") OR (NOT "is_locked"))));



CREATE POLICY "time_entries_insert" ON "public"."time_entries" FOR INSERT TO "authenticated" WITH CHECK ("public"."has_role_permission"('time_entries:write'::"public"."permissions"));



CREATE POLICY "time_entries_select" ON "public"."time_entries" FOR SELECT TO "authenticated" USING (("public"."has_role_permission"('time_entries:read'::"public"."permissions") AND ((("auth"."jwt"() ->> 'user_role'::"text") = 'Supervisor'::"text") OR ("user_id" = "auth"."uid"()))));



CREATE POLICY "time_entries_update_amend" ON "public"."time_entries" FOR UPDATE TO "authenticated" USING ("public"."has_role_permission"('time_entries:amend'::"public"."permissions"));



CREATE POLICY "time_entries_update_write" ON "public"."time_entries" FOR UPDATE TO "authenticated" USING (("public"."has_role_permission"('time_entries:write'::"public"."permissions") AND ("user_id" = "auth"."uid"()) AND (NOT "is_locked")));



ALTER TABLE "public"."time_entry_audit_logs" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";









GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";




























































































































































REVOKE ALL ON FUNCTION "public"."custom_access_token_hook"("_event" "jsonb") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."custom_access_token_hook"("_event" "jsonb") TO "service_role";
GRANT ALL ON FUNCTION "public"."custom_access_token_hook"("_event" "jsonb") TO "supabase_auth_admin";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."has_role_permission"("p_permission" "public"."permissions") TO "anon";
GRANT ALL ON FUNCTION "public"."has_role_permission"("p_permission" "public"."permissions") TO "authenticated";
GRANT ALL ON FUNCTION "public"."has_role_permission"("p_permission" "public"."permissions") TO "service_role";



GRANT ALL ON FUNCTION "public"."is_email_allowed"("p_email" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."is_email_allowed"("p_email" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_email_allowed"("p_email" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."is_email_invitable"("p_email" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."is_email_invitable"("p_email" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_email_invitable"("p_email" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."log_time_entry_change"() TO "anon";
GRANT ALL ON FUNCTION "public"."log_time_entry_change"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."log_time_entry_change"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_modified_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_modified_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_modified_column"() TO "service_role";


















GRANT ALL ON TABLE "public"."categories" TO "anon";
GRANT ALL ON TABLE "public"."categories" TO "authenticated";
GRANT ALL ON TABLE "public"."categories" TO "service_role";



GRANT ALL ON TABLE "public"."invites" TO "anon";
GRANT ALL ON TABLE "public"."invites" TO "authenticated";
GRANT ALL ON TABLE "public"."invites" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."reports" TO "anon";
GRANT ALL ON TABLE "public"."reports" TO "authenticated";
GRANT ALL ON TABLE "public"."reports" TO "service_role";



GRANT ALL ON TABLE "public"."role_permissions" TO "anon";
GRANT ALL ON TABLE "public"."role_permissions" TO "authenticated";
GRANT ALL ON TABLE "public"."role_permissions" TO "service_role";



GRANT ALL ON TABLE "public"."time_entries" TO "anon";
GRANT ALL ON TABLE "public"."time_entries" TO "authenticated";
GRANT ALL ON TABLE "public"."time_entries" TO "service_role";



GRANT ALL ON TABLE "public"."time_entry_audit_logs" TO "anon";
GRANT ALL ON TABLE "public"."time_entry_audit_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."time_entry_audit_logs" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";































