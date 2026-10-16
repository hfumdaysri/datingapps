import { NextResponse } from "next/server";
import { getServerEnv } from "@/lib/env";
import { createAdminSupabase } from "@/lib/server/admin";
import { formatRecoveryKey, hashSecret, randomToken } from "@/lib/server/crypto";
import { allow, apiError } from "@/lib/server/http";
import { getMe } from "@/lib/server/session";

export const dynamic = "force-dynamic";

/** A signed-in member generates a fresh recovery key (old one stops working). Shown once. */
export async function POST() {
  const me = await getMe();
  if (!me) return apiError(403, "not_member", "Akses belum dipulihkan.");
  if (!(await allow(`rotate:${me.memberId}`, 5, 3600))) return apiError(429, "rate_limited", "Terlalu sering. Coba lagi nanti.");

  const secret = randomToken(32);
  const { error } = await createAdminSupabase().rpc("set_recovery", {
    p_member: me.memberId,
    p_hash: await hashSecret(secret, getServerEnv().RECOVERY_PEPPER),
  });
  if (error) return apiError(500, "server_error", "Gagal membuat kunci baru.");
  return NextResponse.json({ data: { recoveryKey: formatRecoveryKey(me.memberId, secret) } });
}
