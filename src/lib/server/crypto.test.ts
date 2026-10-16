import { describe, expect, it } from "vitest";
import { formatRecoveryKey, hashSecret, parseRecoveryKey, randomToken, sha256Hex, verifySecret } from "./crypto";

const PEPPER = "p".repeat(32);

describe("crypto", () => {
  it("verifies correct secret and rejects wrong one", async () => {
    const stored = await hashSecret("correct-horse-battery-staple", PEPPER);
    expect(await verifySecret("correct-horse-battery-staple", stored, PEPPER)).toBe(true);
    expect(await verifySecret("wrong", stored, PEPPER)).toBe(false);
    expect(await verifySecret("correct-horse-battery-staple", stored, "q".repeat(32))).toBe(false);
  });

  it("rejects when no credential exists", async () => {
    expect(await verifySecret("anything", null, PEPPER)).toBe(false);
  });

  it("round-trips recovery keys and rejects malformed ones", () => {
    const id = "123e4567-e89b-42d3-a456-426614174000";
    const secret = randomToken(24);
    expect(parseRecoveryKey(formatRecoveryKey(id, secret))).toEqual({ memberId: id, secret });
    expect(parseRecoveryKey("nope")).toBeNull();
    expect(parseRecoveryKey(`${id}.short`)).toBeNull();
  });

  it("hashes tokens deterministically and tokens are unique", () => {
    expect(sha256Hex("a")).toBe(sha256Hex("a"));
    expect(randomToken()).not.toBe(randomToken());
  });
});
