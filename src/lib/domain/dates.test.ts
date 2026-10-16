import { describe, expect, it } from "vitest";
import { daysTogether, jakartaDateString } from "./dates";

describe("daysTogether", () => {
  it("counts calendar days, not 24h blocks", () => {
    const late = new Date("2026-01-01T16:30:00Z"); // 23:30 Jakarta
    const early = new Date("2026-01-01T17:10:00Z"); // 00:10 next day Jakarta
    expect(daysTogether("2026-01-01", late)).toBe(0);
    expect(daysTogether("2026-01-01", early)).toBe(1);
  });

  it("never returns negative", () => {
    expect(daysTogether("2030-01-01", new Date("2026-01-01T00:00:00Z"))).toBe(0);
  });

  it("formats in Jakarta timezone", () => {
    expect(jakartaDateString(new Date("2026-01-01T17:00:00Z"))).toBe("2026-01-02");
  });
});
