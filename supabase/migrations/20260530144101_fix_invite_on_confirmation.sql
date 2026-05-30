-- Fix: defer profile creation and invite deletion until email is confirmed.
--
-- Previously, handle_new_user() ran entirely on INSERT into auth.users, which
-- fires the moment signInWithOtp() creates the (unconfirmed) user row.  That
-- caused the invite row to be deleted before the Supervisor could see it in
-- the list.
--
-- New behaviour:
--   INSERT  → first user: create Supervisor profile immediately (unchanged).
--             other users: validate invite exists (security gate only).
--   UPDATE  → when email_confirmed_at transitions NULL → NOT NULL:
--             create profile + delete invite (formerly done on INSERT).

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT OR UPDATE ON auth.users
    FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
