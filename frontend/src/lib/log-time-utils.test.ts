import { describe, expect, it } from "vitest";
import {
  HOUR_OPTIONS,
  MINUTE_OPTIONS,
  DEFAULT_HOURS,
  DEFAULT_MINUTES,
  resolveMinutes,
  calcDurationMinutes,
  validateDuration,
  resolveInitialHoursMinutes,
} from "./log-time-utils";

describe("HOUR_OPTIONS", () => {
  it("contains 25 entries from 0 to 24", () => {
    expect(HOUR_OPTIONS).toHaveLength(25);
    expect(HOUR_OPTIONS[0]).toBe(0);
    expect(HOUR_OPTIONS[24]).toBe(24);
  });
});

describe("MINUTE_OPTIONS", () => {
  it("contains exactly 0, 15, 30, 45", () => {
    expect(MINUTE_OPTIONS).toEqual([0, 15, 30, 45]);
  });
});

describe("defaults", () => {
  it("DEFAULT_HOURS is 1", () => {
    expect(DEFAULT_HOURS).toBe(1);
  });
  it("DEFAULT_MINUTES is 0", () => {
    expect(DEFAULT_MINUTES).toBe(0);
  });
});

describe("resolveMinutes", () => {
  it("returns minutes unchanged when hours < 24", () => {
    expect(resolveMinutes(0, 15)).toBe(15);
    expect(resolveMinutes(1, 30)).toBe(30);
    expect(resolveMinutes(23, 45)).toBe(45);
  });

  it("returns 0 when hours = 24", () => {
    expect(resolveMinutes(24, 15)).toBe(0);
    expect(resolveMinutes(24, 45)).toBe(0);
  });
});

describe("calcDurationMinutes", () => {
  it("calculates correctly", () => {
    expect(calcDurationMinutes(0, 15)).toBe(15);
    expect(calcDurationMinutes(1, 30)).toBe(90);
    expect(calcDurationMinutes(24, 0)).toBe(1440);
    expect(calcDurationMinutes(0, 0)).toBe(0);
  });
});

describe("validateDuration", () => {
  it("returns null when total > 0", () => {
    expect(validateDuration(0, 15)).toBeNull();
    expect(validateDuration(1, 0)).toBeNull();
    expect(validateDuration(24, 0)).toBeNull();
  });

  it("returns an error string when total is 0", () => {
    expect(validateDuration(0, 0)).toBe("Duration must be greater than 0.");
  });

  it("treats hours=24 as 1440 minutes, ignoring any non-zero minute value", () => {
    expect(validateDuration(24, 30)).toBeNull();
  });
});

describe("resolveInitialHoursMinutes", () => {
  it("splits whole hours and minutes", () => {
    expect(resolveInitialHoursMinutes(90)).toEqual({ hours: 1, minutes: 30 });
  });

  it("handles minutes-only duration", () => {
    expect(resolveInitialHoursMinutes(15)).toEqual({ hours: 0, minutes: 15 });
  });

  it("handles full-day (1440 minutes)", () => {
    expect(resolveInitialHoursMinutes(1440)).toEqual({ hours: 24, minutes: 0 });
  });

  it("handles exact hours with no remainder", () => {
    expect(resolveInitialHoursMinutes(60)).toEqual({ hours: 1, minutes: 0 });
  });

  it("handles 45-minute block", () => {
    expect(resolveInitialHoursMinutes(105)).toEqual({ hours: 1, minutes: 45 });
  });
});
