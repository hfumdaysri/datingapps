import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerEnv } from "@/lib/env";
import { createAdminSupabase } from "@/lib/server/admin";
import { formatRecoveryKey, hashSecret, randomToken, sha256Hex } from "@/lib/server/crypto";
import { allow, apiError, clientIp } from "@/lib/server/http";
import { getAuthUser } from "@/lib/server/session";

export const dynamic = "force-dynamic";
const body = z.object({ token: z.string().min(20).max(200) });

export async function POST(req: Request) {
  const user = await getAuthUser();
  if (!user) return apiError(401, "unauthenticated", "Sesi tidak ditemukan.");

  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return apiError(400, "invalid_request", "Permintaan tidak valid.");

  if (!(await allow(`invite:ip:${clientIp(req)}`, 10, 600)) || !(await allow(`invite:uid:${user.id}`, 10, 600))) {
    return apiError(429, "rate_limited", "Terlalu banyak percobaan. Coba lagi nanti.");
  }

  const admin = createAdminSupabase();
  const { data: memberId, error } = await admin.rpc("redeem_invite", {
    p_hash: sha256Hex(parsed.data.token),
    p_uid: user.id,
  });
  if (error || !memberId) return apiError(403, "invalid_invite", "Undangan tidak valid atau sudah dipakai.");

  const { RECOVERY_PEPPER } = getServerEnv();
  const secret = randomToken(32);
  const { error: recErr } = await admin.rpc("set_recovery", {
    p_member: memberId,
    p_hash: await hashSecret(secret, RECOVERY_PEPPER),
  });
  if (recErr) return apiError(500, "server_error", "Gagal membuat kunci pemulihan.");

  const { data: member } = await admin.from("members").select("seat").eq("id", memberId).single();
  return NextResponse.json({ seat: member?.seat, recoveryKey: formatRecoveryKey(memberId, secret) });
}
