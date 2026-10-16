import { NextResponse } from "next/server";
import { createAdminSupabase } from "./admin";

export function apiError(status: number, code: string, message: string) {
  return NextResponse.json({ error: { code, message } }, { status });
}

export function clientIp(req: Request): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}

/** Returns true when the request is allowed. Fails closed on DB errors. */
export async function allow(key: string, max: number, windowSeconds: number): Promise<boolean> {
  const { data, error } = await createAdminSupabase().rpc("check_rate_limit", {
    p_key: key,
    p_max: max,
    p_window: `${windowSeconds} seconds`,
  });
  return !error && data === true;
}
