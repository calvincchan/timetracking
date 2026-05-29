import type { Enums } from "@/types/database";
import { supabaseClient } from "./supabase-client";

// Maps Refine's built-in CRUD actions to the three-verb permission model.
// Refine passes "list"/"show" for reads and "create"/"edit" for writes.
function toDbAction(action: string): string {
  if (action === "list" || action === "show") return "read";
  if (action === "create" || action === "edit") return "write";
  return action; // "read", "write", "delete" pass through unchanged
}

class AccessControl {
  private allowed = new Set<string>();
  private loaded = false;
  private loadPromise: Promise<void> | null = null;

  // Fetches role_permission rows for the current role in a single query.
  // Caches the in-flight promise so concurrent callers share one request.
  async load(role: string): Promise<void> {
    if (this.loaded) return;
    if (!this.loadPromise) {
      this.loadPromise = this._doLoad(role);
    }
    return this.loadPromise;
  }

  private async _doLoad(role: string): Promise<void> {
    const { data, error } = await supabaseClient
      .from("role_permissions")
      .select("permission")
      .eq("role", role as Enums<"user_role">);

    if (error || !data) {
      this.loadPromise = null;
      return;
    }

    for (const row of data as { permission: string; }[]) {
      this.allowed.add(row.permission);
    }

    this.loaded = true;
  }

  // Returns the in-flight load promise so async callers can wait for it.
  // Resolves immediately if load hasn't started yet (deny-by-default still applies).
  ready(): Promise<void> {
    return this.loadPromise ?? Promise.resolve();
  }

  // O(1) permission check. Deny-by-default.
  // - Not loaded yet → false
  // - Permission not granted → false
  // - Permission granted → true
  can(resource: string, action: string): boolean {
    if (!this.loaded) return false;
    const key = `${resource}:${toDbAction(action)}`;
    return this.allowed.has(key);
  }

  // Called on logout to clear state so the next user gets a fresh load.
  reset(): void {
    this.allowed.clear();
    this.loaded = false;
    this.loadPromise = null;
  }
}

// Module-level singleton — shared across the entire app session
export const acl = new AccessControl();
