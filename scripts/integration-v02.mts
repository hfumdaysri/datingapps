// v0.2 engine tests: know_me, retention, custom prompts, rename, export, mutual-consent deletion.
// Runs against the real space: temporarily rebinds both seats to throwaway users, then removes all
// data it created, restores display names and releases the seats (issue fresh recovery keys afterwards).
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const admin = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });

let failed = 0;
const check = (label: string, ok: boolean, extra = "") => {
  console.log(`${ok ? "PASS" : "FAIL"} ${label}${ok ? "" : ` :: ${extra}`}`);
  if (!ok) failed++;
};

type Client = { supa: SupabaseClient; userId: string };
const userIds: string[] = [];
async function newUser(): Promise<Client> {
  const supa = createClient(url, anon, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await supa.auth.signInAnonymously();
  if (error || !data.user) throw new Error(`anon sign-in failed: ${error?.message}`);
  userIds.push(data.user.id);
  return { supa, userId: data.user.id };
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Json = any;
async function rpc(c: Client, name: string, args: Record<string, unknown> = {}): Promise<{ data: Json; error: string | null }> {
  const { data, error } = await c.supa.rpc(name, args);
  return { data, error: error ? error.message : null };
}

const { data: original } = await admin.from("members").select("id, seat, display_name").order("seat");
const createdQuestionIds: string[] = [];

async function main() {
  if (!original || original.length !== 2) throw new Error("expected a provisioned space with 2 members");
  const A = await newUser(), B = await newUser(), C = await newUser();
  for (const [m, u] of [[original[0]!, A], [original[1]!, B]] as const) {
    const { error } = await admin.rpc("rebind_member", { p_member: m.id, p_uid: u.userId });
    if (error) throw new Error(error.message);
  }
  const idA = original[0]!.id, idB = original[1]!.id;
  const byId: Record<string, Client> = { [idA]: A, [idB]: B };

  const date = (await rpc(A, "start_date")).data;
  const g = (await rpc(A, "start_game", { p_date: date.id, p_type: "know_me", p_settings: {}, p_replace: false })).data;
  const gid = g.game.id as string;

  // ---- know_me ----
  const owner = byId[g.round.turnMemberId]!, guesser = owner === A ? B : A;
  const ownerId = g.round.turnMemberId as string;
  check("KM round starts in answering with a prompt", g.round.phase === "answering" && !!g.round.prompt);
  check("KM empty answer rejected", (await rpc(owner, "submit_answer", { p_game: gid, p_text: "   " })).error === "invalid_request");
  const ownerSub = await rpc(owner, "submit_answer", { p_game: gid, p_text: "rahasiaOwner123" });
  check("KM owner answer stored; own answer visible to self", ownerSub.data.round.myAnswer === "rahasiaOwner123");
  const gView = (await rpc(guesser, "get_game_state", { p_game: gid })).data;
  check("KM guesser cannot see the owner answer before reveal",
    gView.round.partnerSubmitted === true && gView.round.answers === undefined && !JSON.stringify(gView).includes("rahasiaOwner123"));
  const direct = await guesser.supa.from("game_responses").select("*");
  check("KM answers not readable via PostgREST", !!direct.error || (direct.data?.length ?? 0) === 0);
  const edit = await rpc(owner, "submit_answer", { p_game: gid, p_text: "diubah" });
  check("KM answer cannot be edited after submitting (idempotent)", !edit.error && edit.data.round.myAnswer === "rahasiaOwner123");
  const gSub = await rpc(guesser, "submit_answer", { p_game: gid, p_text: "tebakanGuesser456" });
  check("KM second answer reveals both", gSub.data.round.phase === "revealed" &&
    gSub.data.round.answers[ownerId] === "rahasiaOwner123" && Object.keys(gSub.data.round.answers).length === 2);
  const v1 = gSub.data.game.version;
  check("KM next blocked until the owner judges", (await rpc(A, "advance_round", { p_game: gid, p_expected: v1, p_action: "next" })).error === "illegal_phase");
  check("KM only the owner may judge", (await rpc(guesser, "judge_round", { p_game: gid, p_expected: v1, p_judgment: "correct" })).error === "not_your_turn");
  check("KM invalid judgment rejected", (await rpc(owner, "judge_round", { p_game: gid, p_expected: v1, p_judgment: "wow" })).error === "invalid_request");
  const judged = await rpc(owner, "judge_round", { p_game: gid, p_expected: v1, p_judgment: "close" });
  check("KM judgment recorded: guesser earns 1 point", judged.data.round.judgment === "close" && judged.data.scores[guesser === A ? idA : idB] === 1, JSON.stringify(judged));
  const rejudge = await rpc(owner, "judge_round", { p_game: gid, p_expected: judged.data.game.version, p_judgment: "correct" });
  check("KM judgment cannot be changed (score idempotent)", rejudge.error === "illegal_phase");
  const round1 = judged.data.round.id as string;
  const nx = await Promise.all([
    rpc(A, "advance_round", { p_game: gid, p_expected: judged.data.game.version, p_action: "next" }),
    rpc(B, "advance_round", { p_game: gid, p_expected: judged.data.game.version, p_action: "next" }),
  ]);
  check("KM concurrent Next advances once", nx.filter((x) => !x.error).length === 1);
  const r2 = (await rpc(A, "get_game_state", { p_game: gid })).data;
  check("KM roles swap next round", r2.round.turnMemberId !== ownerId && r2.round.number === 2);
  const old = await admin.from("game_responses").select("id").eq("round_id", round1);
  check("KM answer text deleted when the round ends", (old.data?.length ?? 0) === 0);

  // no-score mode
  const g2 = (await rpc(A, "start_game", { p_date: date.id, p_type: "know_me", p_settings: { noScore: true }, p_replace: true })).data;
  check("KM no-score mode hides scores", g2.scores === null || g2.scores === undefined);

  // retention at date end
  const g3 = (await rpc(A, "start_game", { p_date: date.id, p_type: "know_me", p_settings: {}, p_replace: true })).data;
  await rpc(A, "submit_answer", { p_game: g3.game.id, p_text: "sisaTeks" });
  const left = await admin.from("game_responses").select("id").eq("response_json->>text", "sisaTeks");
  check("KM (sanity) answer exists mid-round", (left.data?.length ?? 0) === 1);
  const dateNow = (await rpc(A, "get_active_date")).data;
  await rpc(A, "finish_date", { p_date: date.id, p_expected: dateNow.version });
  const gone = await admin.from("game_responses").select("id").eq("response_json->>text", "sisaTeks");
  check("KM answer text deleted when the date ends", (gone.data?.length ?? 0) === 0);

  // ---- custom prompts ----
  const badCat = await rpc(A, "add_custom_question", { p_type: "truth_or_truth", p_category: "Nope", p_prompt: "x", p_a: null, p_b: null, p_follow: null });
  check("CQ invalid category rejected", badCat.error === "invalid_request");
  const noOpts = await rpc(A, "add_custom_question", { p_type: "would_you_rather", p_category: "Fun", p_prompt: "Pilih:", p_a: "a", p_b: "", p_follow: null });
  check("CQ would-you-rather needs both options", noOpts.error === "invalid_request");
  const okQ = await rpc(A, "add_custom_question", { p_type: "would_you_rather", p_category: "Fun", p_prompt: "Pilih:", p_a: "Kopi", p_b: "Teh", p_follow: null });
  if (okQ.data) createdQuestionIds.push(okQ.data);
  check("CQ custom prompt added and visible to both", !okQ.error && (await rpc(B, "list_custom_questions")).data.some((q: Json) => q.id === okQ.data));
  check("CQ non-member cannot add", (await rpc(C, "add_custom_question", { p_type: "know_me", p_category: "x", p_prompt: "x", p_a: null, p_b: null, p_follow: null })).error === "not_member");
  await rpc(B, "remove_custom_question", { p_id: okQ.data });
  check("CQ removed prompts disappear", !(await rpc(A, "list_custom_questions")).data.some((q: Json) => q.id === okQ.data));

  // ---- rename ----
  check("RN empty name rejected", (await rpc(A, "rename_me", { p_name: "  " })).error === "invalid_request");
  await rpc(A, "rename_me", { p_name: "NamaBaru" });
  const names = await admin.from("members").select("display_name").eq("id", idA).single();
  check("RN member can rename themself", names.data!.display_name === "NamaBaru");

  // ---- export ----
  const exp = (await rpc(B, "export_data")).data;
  check("EX export has members and dates but no answer text",
    exp.members.length === 2 && exp.dates.length >= 1 && !JSON.stringify(exp).includes("tebakanGuesser456") && !JSON.stringify(exp).includes("rahasiaOwner123"));
  check("EX non-member cannot export", (await rpc(C, "export_data")).error === "not_member");

  // ---- deletion needs both ----
  const mom = await rpc(A, "propose_moment", { p_date: date.id, p_question: null, p_content: "momen uji" });
  const req = (await rpc(A, "request_data_deletion")).data;
  const seenByB = (await rpc(B, "get_data_request")).data;
  check("DEL request visible to the partner, flagged as not theirs", seenByB?.id === req.id && seenByB.requestedByMe === false && req.requestedByMe === true);
  check("DEL requester cannot approve their own request", (await rpc(A, "respond_data_deletion", { p_request: req.id, p_approve: true })).error === "not_your_turn");
  check("DEL nothing deleted yet", ((await admin.from("date_sessions").select("id")).data?.length ?? 0) >= 1);
  await rpc(B, "respond_data_deletion", { p_request: req.id, p_approve: false });
  check("DEL declining keeps data", ((await admin.from("date_sessions").select("id")).data?.length ?? 0) >= 1 && (await rpc(A, "get_data_request")).data === null);
  const req2 = (await rpc(A, "request_data_deletion")).data;
  check("DEL a second pending request is not duplicated", (await rpc(A, "request_data_deletion")).data.id === req2.id);
  await rpc(B, "respond_data_deletion", { p_request: req2.id, p_approve: true });
  const dates = await admin.from("date_sessions").select("id");
  const moments = await admin.from("saved_moments").select("id");
  const games = await admin.from("game_sessions").select("id");
  check("DEL partner approval deletes dates, games and moments", (dates.data?.length ?? 0) === 0 && (moments.data?.length ?? 0) === 0 && (games.data?.length ?? 0) === 0 && !!mom.data);
  check("DEL space and members survive", (await rpc(A, "get_active_date")).error === null);
  check("DEL non-member cannot request", (await rpc(C, "request_data_deletion")).error === "not_member");
}

try {
  await main();
} catch (e) {
  console.error("ERROR", e instanceof Error ? e.message : e);
  failed++;
} finally {
  await admin.from("date_sessions").delete().not("id", "is", null);
  await admin.from("question_history").delete().not("id", "is", null);
  await admin.from("saved_moments").delete().not("id", "is", null);
  await admin.from("data_requests").delete().not("id", "is", null);
  if (createdQuestionIds.length) await admin.from("questions").delete().in("id", createdQuestionIds);
  await admin.from("rate_limits").delete().neq("key", "");
  for (const m of original ?? []) await admin.from("members").update({ display_name: m.display_name, auth_user_id: null, joined_at: null }).eq("id", m.id);
  for (const id of userIds) await admin.auth.admin.deleteUser(id);
}
console.log(failed ? `\n${failed} FAILED` : "\nALL PASSED");
process.exit(failed ? 1 : 0);
