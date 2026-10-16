import { describe, expect, it } from "vitest";
import { SEED_QUESTIONS } from "./questions";

const count = (type: string) => SEED_QUESTIONS.filter((q) => q.gameType === type).length;

describe("seed content", () => {
  it("meets PRD minimums", () => {
    expect(count("truth_or_truth")).toBeGreaterThanOrEqual(60);
    expect(SEED_QUESTIONS.filter((q) => q.gameType === "deep_talk" && q.depth !== "vulnerable").length).toBeGreaterThanOrEqual(60);
    expect(SEED_QUESTIONS.filter((q) => q.depth === "vulnerable").length).toBeGreaterThanOrEqual(10);
    expect(count("would_you_rather")).toBeGreaterThanOrEqual(50);
    expect(count("most_likely")).toBeGreaterThanOrEqual(50);
    expect(count("know_me")).toBeGreaterThanOrEqual(50);
    expect(SEED_QUESTIONS.length).toBeGreaterThanOrEqual(280);
  });

  it("has unique seed keys and well-formed pairs", () => {
    const keys = new Set(SEED_QUESTIONS.map((q) => q.seedKey));
    expect(keys.size).toBe(SEED_QUESTIONS.length);
    for (const q of SEED_QUESTIONS.filter((x) => x.gameType === "would_you_rather")) {
      expect(q.optionA && q.optionB).toBeTruthy();
    }
  });

  it("keeps vulnerable content out of every game except deep talk", () => {
    for (const q of SEED_QUESTIONS.filter((x) => x.depth === "vulnerable")) expect(q.gameType).toBe("deep_talk");
  });
});
