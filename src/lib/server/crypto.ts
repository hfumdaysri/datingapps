import { createHash, randomBytes, scrypt as scryptCb, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(scryptCb) as (pw: string, salt: Buffer, len: number, opts: object) => Promise<Buffer>;
const SCRYPT = { N: 2 ** 15, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };

export function randomToken(bytes = 32): string {
  return randomBytes(bytes).toString("base64url");
}

export function sha256Hex(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

/** Slow, salted, peppered hash. Format: scrypt$<salt b64>$<hash b64>. */
export async function hashSecret(secret: string, pepper: string): Promise<string> {
  const salt = randomBytes(16);
  const hash = await scrypt(secret + pepper, salt, 32, SCRYPT);
  return `scrypt$${salt.toString("base64")}$${hash.toString("base64")}`;
}

export async function verifySecret(secret: string, stored: string | null, pepper: string): Promise<boolean> {
  // Always do the slow work so a missing credential is not distinguishable by timing.
  const [, saltB64, hashB64] = (stored ?? `scrypt$${Buffer.alloc(16).toString("base64")}$${Buffer.alloc(32).toString("base64")}`).split("$");
  const salt = Buffer.from(saltB64 ?? "", "base64");
  const expected = Buffer.from(hashB64 ?? "", "base64");
  const actual = await scrypt(secret + pepper, salt, 32, SCRYPT);
  return stored !== null && expected.length === actual.length && timingSafeEqual(expected, actual);
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Recovery key = `<memberId>.<secret>`. */
export function formatRecoveryKey(memberId: string, secret: string): string {
  return `${memberId}.${secret}`;
}

export function parseRecoveryKey(key: string): { memberId: string; secret: string } | null {
  const i = key.indexOf(".");
  if (i < 0) return null;
  const memberId = key.slice(0, i);
  const secret = key.slice(i + 1);
  if (!UUID.test(memberId) || secret.length < 20 || secret.length > 128) return null;
  return { memberId: memberId.toLowerCase(), secret };
}
