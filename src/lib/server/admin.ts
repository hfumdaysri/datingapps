import { createClient } from "@supabase/supabase-js";
import { getPublicEnv, getServerEnv } from "@/lib/env";

/** Service-role client. Server-only; bypasses RLS, so callers must authorize first. */
export function createAdminSupabase() {
  const pub = getPublicEnv();
  if (!pub) throw new Error("Supabase is not configured");
  const { SUPABASE_SERVICE_ROLE_KEY } = getServerEnv();
  return createClient(pub.NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
