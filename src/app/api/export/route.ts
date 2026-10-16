import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { apiError } from "@/lib/server/http";

export const dynamic = "force-dynamic";

/** JSON export of the couple's shared data for the signed-in member. Never includes answers. */
export async function GET() {
  const supabase = await createServerSupabase();
  if (!supabase) return apiError(503, "not_configured", "Aplikasi belum dikonfigurasi.");
  const { data, error } = await supabase.rpc("export_data");
  if (error) return apiError(error.message === "not_member" ? 403 : 500, error.message === "not_member" ? "not_member" : "server_error", "Tidak bisa mengekspor data.");
  return new NextResponse(JSON.stringify(data, null, 2), {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "content-disposition": 'attachment; filename="ayok-kita-ngedate-export.json"',
      "cache-control": "no-store",
    },
  });
}
