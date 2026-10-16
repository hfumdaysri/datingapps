import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerEnv } from "@/lib/env";
import { createAdminSupabase } from "@/lib/server/admin";
import { formatRecoveryKey, hashSecret, parseRecoveryKey, randomToken, verifySecret } from "@/lib/server/crypto";
import { allow, apiError, clientIp } from "@/lib/server/http";
import { getAuthUser } from "@/lib/server/session";

export const dynamic = "force-dynamic";
const body = z.object({ key: z.string().min(1).max(300) });

const DENIED = () => apiError(403, "invalid_recovery", "Kunci pemulihan tidak valid.");

export async function POST(req: Request) {
  const user = await getAuthUser();
  if (!user) return apiError(401, "unauthenticated", "Sesi tidak ditemukan.");

  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return apiError(400, "invalid_request", "Permintaan tidak valid.");

  if (!(await allow(`recover:ip:${clientIp(req)}`, 5, 900)) || !(await allow(`recover:uid:${user.id}`, 5, 900))) {
    return apiError(429, "rate_limited", "Terlalu banyak percobaan. Coba lagi nanti.");
  }

  const { RECOVERY_PEPPER } = getServerEnv();
  const admin = createAdminSupabase();
  const parsedKey = parseRecoveryKey(parsed.data.key.trim());

  // Same work and same response whether the key is malformed, unknown, or wrong.
  const stored = parsedKey
    ? ((await admin.rpc("get_recovery_hash", { p_member: parsedKey.memberId })).data as string | null)
    : null;
  const ok = await verifySecret(parsedKey?.secret ?? "x".repeat(20), stored ?? null, RECOVERY_PEPPER);
  if (!ok || !parsedKey) return DENIED();

  const { error } = await admin.rpc("rebind_member", { p_member: parsedKey.memberId, p_uid: user.id });
  if (error) return DENIED();

  const secret = randomToken(32);
  const { error: recErr } = await admin.rpc("set_recovery", {
    p_member: parsedKey.memberId,
    p_hash: await hashSecret(secret, RECOVERY_PEPPER),
  });
  if (recErr) return apiError(500, "server_error", "Gagal memutar kunci pemulihan.");

  return NextResponse.json({ recoveryKey: formatRecoveryKey(parsedKey.memberId, secret) });
}
