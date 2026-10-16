import { createBrowserSupabase } from "./browser";

/** Ensures an (anonymous) Supabase session exists in this browser. Returns an error message or null. */
export async function ensureAnonymousSession(): Promise<string | null> {
  const supabase = createBrowserSupabase();
  if (!supabase) return "Aplikasi belum dikonfigurasi.";
  const { data } = await supabase.auth.getSession();
  if (data.session) return null;
  const { error } = await supabase.auth.signInAnonymously();
  return error ? "Tidak bisa memulai sesi. Coba lagi nanti." : null;
}
