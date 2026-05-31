export const HOUR_OPTIONS = Array.from({ length: 25 }, (_, i) => i); // 0–24

export const MINUTE_OPTIONS = [0, 15, 30, 45] as const;
export type MinuteOption = (typeof MINUTE_OPTIONS)[number];

export const DEFAULT_HOURS = 1;
export const DEFAULT_MINUTES: MinuteOption = 0;

// When hours = 24, the minute must be 0 (full-day cap).
export function resolveMinutes(hours: number, minutes: number): number {
  return hours === 24 ? 0 : minutes;
}

export function calcDurationMinutes(hours: number, minutes: number): number {
  return hours * 60 + minutes;
}

// Splits a stored duration_minutes value back into hours and minutes for form seeding.
export function resolveInitialHoursMinutes(duration_minutes: number): {
  hours: number;
  minutes: number;
} {
  const hours = Math.floor(duration_minutes / 60);
  const minutes = duration_minutes % 60;
  return { hours, minutes };
}

// Returns null when valid, an error string when total is 0.
export function validateDuration(hours: number, minutes: number): string | null {
  const effective = resolveMinutes(hours, minutes);
  const total = calcDurationMinutes(hours, effective);
  return total > 0 ? null : "Duration must be greater than 0.";
}
