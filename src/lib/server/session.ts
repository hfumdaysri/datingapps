import { createServerSupabase } from "@/lib/supabase/server";

export type Me = {
  memberId: string;
  seat: "A" | "B";
  displayName: string;
  space: { id: string; name: string; anniversaryDate: string };
};

/** Authenticated Supabase user (anonymous or not), or null. */
export async function getAuthUser() {
  const supabase = await createServerSupabase();
  if (!supabase) return null;
  const { data } = await supabase.auth.getUser();
  return data.user ?? null;
}

/**
 * The member bound to the current session, read through RLS.
 * Binding is checked live, so a rebound seat loses access immediately.
 */
export async function getMe(): Promise<Me | null> {
  const supabase = await createServerSupabase();
  if (!supabase) return null;
  const user = await getAuthUser();
  if (!user) return null;
  const { data: member } = await supabase
    .from("members")
    .select("id, seat, display_name, space_id")
    .eq("auth_user_id", user.id)
    .maybeSingle();
  if (!member) return null;
  const { data: space } = await supabase
    .from("couple_spaces")
    .select("id, name, anniversary_date")
    .eq("id", member.space_id)
    .maybeSingle();
  if (!space) return null;
  return {
    memberId: member.id,
    seat: member.seat as "A" | "B",
    displayName: member.display_name,
    space: { id: space.id, name: space.name, anniversaryDate: space.anniversary_date },
  };
}

/** Both members of the space, read through RLS as the signed-in member. */
export async function getSpaceMembers(spaceId: string) {
  const supabase = await createServerSupabase();
  if (!supabase) return [];
  const { data } = await supabase.from("members").select("id, seat, display_name").eq("space_id", spaceId).order("seat");
  return (data ?? []).map((m) => ({ id: m.id, seat: m.seat as "A" | "B", name: m.display_name }));
}
