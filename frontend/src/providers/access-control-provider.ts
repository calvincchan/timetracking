import { AccessControlProvider } from "@refinedev/core";
import { acl } from "./access-control";

// Resources nested under the "settings" nav group.
// Update this list when adding new settings pages.
const SETTINGS_RESOURCES: string[] = [];

// Maps resource names to the DB permission resource they share.
// "members" is backed by the members view but gated by profiles:read.
const RESOURCE_ALIASES: Record<string, string> = {
  members: "profiles",
  analytics: "reports",
};

export const accessControlProvider: AccessControlProvider = {
  can: async ({ resource, action }) => {
    await acl.ready();

    if (resource === "settings") {
      const hasAny = SETTINGS_RESOURCES.some((r) => acl.can(r, action));
      return hasAny
        ? { can: true }
        : { can: false, reason: "No settings resources accessible." };
    }

    const effectiveResource = RESOURCE_ALIASES[resource ?? ""] ?? resource ?? "";
    const result = acl.can(effectiveResource, action);
    if (result) return { can: true };

    return {
      can: false,
      reason: `Your role does not have permission to perform "${resource}:${action}".`,
    };
  },
};
