import { AccessControlProvider } from "@refinedev/core";
import { acl } from "./access-control";

// Resources nested under the "settings" nav group.
// Update this list when adding new settings pages.
const SETTINGS_RESOURCES: string[] = [];

export const accessControlProvider: AccessControlProvider = {
  can: async ({ resource, action }) => {
    await acl.ready();

    if (resource === "settings") {
      const hasAny = SETTINGS_RESOURCES.some((r) => acl.can(r, action));
      return hasAny
        ? { can: true }
        : { can: false, reason: "No settings resources accessible." };
    }

    const result = acl.can(resource ?? "", action);
    if (result) return { can: true };

    return {
      can: false,
      reason: `Your role does not have permission to perform "${resource}:${action}".`,
    };
  },
};
