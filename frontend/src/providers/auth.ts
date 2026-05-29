import { AuthProvider } from "@refinedev/core";
import { acl } from "./access-control";
import { supabaseClient } from "./supabase-client";

interface Profile {
  id: string;
  full_name: string;
  role: string;
}

// In-memory profile cache — avoids repeated DB queries on every check() call.
let profileCache: Profile | null = null;
let cachedUserId: string | null = null;

export function clearProfileCache(): void {
  profileCache = null;
  cachedUserId = null;
}

// Decode a JWT payload without an external library.
function decodeJwtPayload(token: string): Record<string, unknown> {
  try {
    return JSON.parse(atob(token.split(".")[1]));
  } catch {
    return {};
  }
}

const authProvider: AuthProvider = {
  login: async ({ email, otp }: { email: string; otp?: string }) => {
    try {
      if (otp) {
        const { data, error } = await supabaseClient.auth.verifyOtp({
          email,
          token: otp,
          type: "email",
        });

        if (error) return { success: false, error };

        if (data?.user) return { success: true, redirectTo: "/" };
      }
    } catch (error: unknown) {
      return { success: false, error: error as Error };
    }

    return {
      success: false,
      error: { message: "Login failed", name: "Invalid email or code" },
    };
  },

  logout: async () => {
    clearProfileCache();
    acl.reset();

    const { error } = await supabaseClient.auth.signOut();
    if (error) return { success: false, error };
    return { success: true, redirectTo: "/login" };
  },

  onError: async (error) => {
    return { error };
  },

  check: async () => {
    try {
      const { data } = await supabaseClient.auth.getSession();
      const { session } = data;

      if (!session) {
        return {
          authenticated: false,
          error: { message: "Check failed", name: "Session not found" },
          logout: true,
          redirectTo: "/login",
        };
      }

      const userId = session.user.id;

      // Verify profile exists (catches rejected invites / failed trigger).
      // Cache hit skips the DB query on subsequent check() calls.
      if (cachedUserId !== userId) {
        const { data: profile } = await supabaseClient
          .from("profiles")
          .select("id, full_name, role")
          .eq("id", userId)
          .maybeSingle();

        if (!profile) {
          // Session exists but no profile — registration was rejected by trigger.
          await supabaseClient.auth.signOut();
          clearProfileCache();
          acl.reset();
          return {
            authenticated: false,
            error: { message: "Not invited", name: "Account not found" },
            logout: true,
            redirectTo: "/login",
          };
        }

        profileCache = profile as Profile;
        cachedUserId = userId;
      }

      // Load ACL for this role — no-op if already loaded this session.
      const payload = decodeJwtPayload(session.access_token);
      const userRole = payload.user_role as string | undefined;
      if (userRole) await acl.load(userRole);

      return { authenticated: true };
    } catch (error: unknown) {
      return {
        authenticated: false,
        error: (error as Error | null) ?? { message: "Check failed", name: "Not authenticated" },
        logout: true,
        redirectTo: "/login",
      };
    }
  },

  getPermissions: async () => {
    const { data } = await supabaseClient.auth.getSession();
    if (!data.session) return null;
    const payload = decodeJwtPayload(data.session.access_token);
    return (payload.user_role as string) ?? null;
  },

  getIdentity: async () => {
    if (profileCache) {
      return {
        ...profileCache,
        name: profileCache.full_name || profileCache.id,
      };
    }

    const { data } = await supabaseClient.auth.getUser();
    if (data?.user) {
      return { ...data.user, name: data.user.email };
    }

    return null;
  },
};

export default authProvider;
