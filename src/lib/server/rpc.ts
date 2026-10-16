import { NextResponse } from "next/server";
import { z } from "zod";
import { createServerSupabase } from "@/lib/supabase/server";
import { apiError } from "./http";

const STATUS: Record<string, [number, string]> = {
  not_member: [403, "Akses belum dipulihkan."],
  not_found: [404, "Tidak ditemukan."],
  version_conflict: [409, "Status sudah berubah. Memuat ulang."],
  illegal_phase: [409, "Aksi ini tidak tersedia sekarang."],
  game_active: [409, "Sudah ada permainan yang berjalan."],
  not_your_turn: [403, "Bukan giliranmu."],
  exhausted: [409, "Pertanyaan di kategori ini sudah habis. Ubah kategori atau ganti permainan."],
  invalid_request: [400, "Permintaan tidak valid."],
};

export const uuid = z.string().uuid();

/** Calls a membership-checked RPC as the signed-in user and maps domain errors to HTTP codes. */
export async function callRpc(name: string, args: Record<string, unknown> = {}) {
  const supabase = await createServerSupabase();
  if (!supabase) return apiError(503, "not_configured", "Aplikasi belum dikonfigurasi.");
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return apiError(401, "unauthenticated", "Sesi tidak ditemukan.");

  const { data, error } = await supabase.rpc(name, args);
  if (error) {
    const hit = STATUS[error.message];
    if (hit) return apiError(hit[0], error.message, hit[1]);
    console.error(`rpc ${name} failed`, error.code); // no payloads logged
    return apiError(500, "server_error", "Terjadi kesalahan di server.");
  }
  return NextResponse.json({ data });
}

export async function readJson<T extends z.ZodTypeAny>(req: Request, schema: T) {
  const parsed = schema.safeParse(await req.json().catch(() => null));
  return parsed.success ? (parsed.data as z.infer<T>) : null;
}

export const bad = () => apiError(400, "invalid_request", "Permintaan tidak valid.");
