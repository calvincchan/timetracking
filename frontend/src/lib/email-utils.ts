export function normalizeEmail(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9@._+-]/g, "");
}

export const EMAIL_VALIDATION = {
  pattern: {
    value: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
    message: "Enter a valid email address",
  },
} as const;
