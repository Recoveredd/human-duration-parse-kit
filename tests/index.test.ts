import { describe, expect, it } from "vitest";
import {
  humanDurationMilliseconds,
  isHumanDuration,
  parseHumanDuration
} from "../src/index.js";

describe("parseHumanDuration", () => {
  it("parses compact numeric duration terms", () => {
    const result = parseHumanDuration("1h 30m");

    expect(result.ok).toBe(true);
    expect(result.milliseconds).toBe(5_400_000);
    expect(result.tokens).toEqual([
      expect.objectContaining({ value: 1, unit: "hour", milliseconds: 3_600_000, start: 0, end: 2 }),
      expect.objectContaining({ value: 30, unit: "minute", milliseconds: 1_800_000, start: 3, end: 6 })
    ]);
  });

  it("parses whole number words and hyphenated words", () => {
    expect(humanDurationMilliseconds("two hours and twenty-five minutes")).toBe(8_700_000);
  });

  it("supports subtraction when negative terms are enabled", () => {
    expect(humanDurationMilliseconds("1 week - 2 days 6 hours")).toBe(453_600_000);
  });

  it("rejects negative terms when disabled", () => {
    const result = parseHumanDuration("1 hour - 15 minutes", { allowNegative: false });

    expect(result.ok).toBe(false);
    expect(result.issues.map((item) => item.code)).toContain("negative-disabled");
  });

  it("rejects empty input unless emptyIsZero is enabled", () => {
    expect(parseHumanDuration("").ok).toBe(false);
    expect(parseHumanDuration("   ", { emptyIsZero: true })).toEqual({
      ok: true,
      input: "   ",
      milliseconds: 0,
      tokens: [],
      issues: []
    });
  });

  it("reports calendar units unless explicitly enabled", () => {
    const rejected = parseHumanDuration("1 month");
    const accepted = parseHumanDuration("1 month", { allowCalendarUnits: true });

    expect(rejected.ok).toBe(false);
    expect(rejected.issues[0]?.code).toBe("calendar-unit-disabled");
    expect(accepted.ok).toBe(true);
    expect(accepted.milliseconds).toBe(2_592_000_000);
  });

  it("reports unknown text with spans", () => {
    const result = parseHumanDuration("five fortnights");

    expect(result.ok).toBe(false);
    expect(result.issues).toEqual([
      expect.objectContaining({
        code: "unknown-unit",
        start: 5,
        end: 15,
        text: "fortnights"
      })
    ]);
  });

  it("applies the max input length guard before scanning", () => {
    const result = parseHumanDuration("123456", { maxInputLength: 3 });

    expect(result.ok).toBe(false);
    expect(result.issues[0]?.code).toBe("input-too-long");
  });

  it("offers boolean validation", () => {
    expect(isHumanDuration("45 seconds")).toBe(true);
    expect(isHumanDuration("soon")).toBe(false);
  });
});
