import { describe, expect, it } from "vitest";
import { EMAIL_VALIDATION, normalizeEmail } from "./email-utils";

describe("normalizeEmail", () => {
  it("lowercases the input", () => {
    expect(normalizeEmail("User@Example.COM")).toBe("user@example.com");
  });

  it("strips disallowed characters", () => {
    expect(normalizeEmail("user name@example.com")).toBe("username@example.com");
    expect(normalizeEmail("üser@example.com")).toBe("ser@example.com");
    expect(normalizeEmail("user!@example.com")).toBe("user@example.com");
  });

  it("preserves valid email characters", () => {
    expect(normalizeEmail("user.name+tag-x_y@sub.example.com")).toBe(
      "user.name+tag-x_y@sub.example.com"
    );
  });

  it("empty string returns empty string", () => {
    expect(normalizeEmail("")).toBe("");
  });
});

describe("EMAIL_VALIDATION.pattern", () => {
  const { value: re } = EMAIL_VALIDATION.pattern;

  it("accepts standard addresses", () => {
    expect(re.test("user@example.com")).toBe(true);
    expect(re.test("user.name+tag@sub.example.co.uk")).toBe(true);
  });

  it("rejects missing @", () => {
    expect(re.test("userexample.com")).toBe(false);
  });

  it("rejects missing TLD", () => {
    expect(re.test("user@example")).toBe(false);
  });

  it("rejects empty string", () => {
    expect(re.test("")).toBe(false);
  });
});
