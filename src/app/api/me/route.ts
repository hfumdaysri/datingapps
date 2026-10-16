import { NextResponse } from "next/server";
import { getMe } from "@/lib/server/session";
import { apiError } from "@/lib/server/http";

export const dynamic = "force-dynamic";

export async function GET() {
  const me = await getMe();
  if (!me) return apiError(403, "not_a_member", "Akses belum dipulihkan.");
  return NextResponse.json({ me });
}
