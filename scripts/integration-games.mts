// Game-engine integration tests (A04-A12, A16, A17, A20) against the real Supabase project.
// Provisions a TEMPORARY space, then deletes everything it created. No Next server needed.
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { randomToken, sha256Hex } from "../src/lib/server/crypto.ts";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const admin = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });

const userIds: string[] = [];
let failed = 0;
function check(id: string, label: string, ok: boolean, extra = "") {
  console.log(`${ok ? "PASS" : "FAIL"} ${id} ${label}${ok ? "" : ` :: ${extra}`}`);
  if (!ok) failed++;
}

type Client = { supa: SupabaseClient; userId: string };
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

async function main() {
  const { count } = await admin.from("couple_spaces").select("*", { count: "exact", head: true });
  if (count) throw new Error("A space already exists; refusing to run (would delete real data).");

  const ta = randomToken(32), tb = randomToken(32);
  const prov = await admin.rpc("provision_space", {
    p_name: "test", p_anniversary: "2026-08-13", p_name_a: "Aa", p_name_b: "Bb",
    p_hash_a: sha256Hex(ta), p_hash_b: sha256Hex(tb), p_expires: "1 hour",
  });
  if (prov.error) throw new Error(prov.error.message);
  const A = await newUser(), B = await newUser(), C = await newUser();
  const ra = await admin.rpc("redeem_invite", { p_hash: sha256Hex(ta), p_uid: A.userId });
  const rb = await admin.rpc("redeem_invite", { p_hash: sha256Hex(tb), p_uid: B.userId });
  if (ra.error || rb.error) throw new Error("bind failed");
  const idA = ra.data as string, idB = rb.data as string;
  const byId = { [idA]: A, [idB]: B } as Record<string, Client>;

  // ---------- access ----------
  check("A01", "non-member cannot read game state / dates", (await rpc(C, "get_active_date")).error === "not_member" && (await rpc(C, "start_date")).error === "not_member");
  for (const t of ["game_responses", "questions", "game_rounds", "game_sessions", "date_sessions", "question_history"]) {
    const r = await B.supa.from(t).select("*");
    check("A17", `member cannot read table ${t} directly`, !!r.error || (r.data?.length ?? 0) === 0);
  }

  // ---------- A16: idempotent date ----------
  const d1 = (await rpc(A, "start_date")).data;
  const d2 = (await rpc(B, "start_date")).data;
  const d3 = await Promise.all([rpc(A, "start_date"), rpc(B, "start_date")]);
  check("A16", "start_date returns the same active date", d1.id === d2.id && d3.every((x) => x.data?.id === d1.id), JSON.stringify([d1.id, d2.id]));

  // ---------- Truth or Truth ----------
  let g = (await rpc(A, "start_game", { p_date: d1.id, p_type: "truth_or_truth", p_settings: null, p_replace: false })).data;
  const gid = g.game.id as string;
  const sB = (await rpc(B, "get_game_state", { p_game: gid })).data;
  check("A05", "both players see the same game and round", sB.round.id === g.round.id && sB.game.id === gid);
  check("TT", "pending state exposes two themes only, no prompts", g.round.phase === "pending" && g.round.choices?.length === 2 && g.round.prompt === undefined);
  const r0 = await admin.from("game_rounds").select("question_id, alternate_question_id").eq("id", g.round.id).single();
  const qs0 = await admin.from("questions").select("prompt").in("id", [r0.data!.question_id, r0.data!.alternate_question_id]);
  const leak = JSON.stringify(sB);
  check("TT", "candidate prompt text is not in either client payload", qs0.data!.every((q) => !leak.includes(q.prompt)));

  const owner = byId[g.round.turnMemberId as string]!, other = owner === A ? B : A;
  const notOwner = await rpc(other, "select_option", { p_game: gid, p_expected: g.game.version, p_choice: "left" });
  check("TT", "only the turn owner may choose", notOwner.error === "not_your_turn", String(notOwner.error));
  const sel = await rpc(owner, "select_option", { p_game: gid, p_expected: g.game.version, p_choice: "left" });
  check("TT", "owner chooses; question frozen on server", !sel.error && !!sel.data.round.prompt, String(sel.error));
  const again = await rpc(owner, "select_option", { p_game: gid, p_expected: sel.data.game.version, p_choice: "right" });
  check("TT", "choice cannot be changed afterwards", again.error === "illegal_phase", String(again.error));
  const refreshed = (await rpc(other, "get_game_state", { p_game: gid })).data;
  check("A10", "refresh/reopen returns the same question for the other player", refreshed.round.prompt === sel.data.round.prompt);

  // ---------- A08: concurrent Next => exactly one advance ----------
  const v = refreshed.game.version;
  const race = await Promise.all([
    rpc(A, "advance_round", { p_game: gid, p_expected: v, p_action: "next" }),
    rpc(B, "advance_round", { p_game: gid, p_expected: v, p_action: "next" }),
  ]);
  const wins = race.filter((x) => !x.error).length;
  const rounds = await admin.from("game_rounds").select("round_number").eq("game_session_id", gid);
  check("A08", "concurrent Next advances exactly once", wins === 1 && rounds.data!.length === 2, JSON.stringify([race.map((x) => x.error), rounds.data!.length]));
  check("A08", "loser gets a version conflict", race.some((x) => x.error === "version_conflict"));

  // ---------- no repeats within a session (skip through many rounds) ----------
  let st = (await rpc(A, "get_game_state", { p_game: gid })).data;
  for (let i = 0; i < 25; i++) {
    const r = await rpc(A, "advance_round", { p_game: gid, p_expected: st.game.version, p_action: "skip" });
    if (r.error) throw new Error(`skip failed: ${r.error}`);
    st = r.data;
  }
  const all = await admin.from("game_rounds").select("question_id, alternate_question_id").eq("game_session_id", gid);
  const ids = all.data!.flatMap((r) => [r.question_id, r.alternate_question_id]);
  check("TT", "no prompt repeats within a session", new Set(ids).size === ids.length, `${new Set(ids).size}/${ids.length}`);

  // ---------- pause / illegal actions ----------
  const paused = await rpc(A, "pause_game", { p_game: gid, p_expected: st.game.version, p_pause: true });
  const pausedAct = await rpc(B, "advance_round", { p_game: gid, p_expected: paused.data.game.version, p_action: "skip" });
  check("PAUSE", "paused game blocks actions; resume works", pausedAct.error === "illegal_phase" &&
    !(await rpc(A, "pause_game", { p_game: gid, p_expected: paused.data.game.version, p_pause: false })).error);

  // ---------- Deep talk: A10, A11, A12 ----------
  g = (await rpc(A, "start_game", { p_date: d1.id, p_type: "deep_talk", p_settings: { categories: ["Life"], vulnerable: false }, p_replace: false }));
  check("SWITCH", "starting another game while one is open needs confirmation (409)", g.error === "game_active", String(g.error));
  g = (await rpc(A, "start_game", { p_date: d1.id, p_type: "deep_talk", p_settings: { categories: ["Life"], vulnerable: false }, p_replace: true }));
  const dg = g.data.game.id as string;
  check("A10", "deep talk card is face-down with no prompt", g.data.round.phase === "pending" && g.data.round.prompt === undefined);
  const opened = await rpc(B, "select_option", { p_game: dg, p_expected: g.data.game.version, p_choice: "open" });
  check("A10", "opened prompt is the same after reopening", (await rpc(A, "get_game_state", { p_game: dg })).data.round.prompt === opened.data.round.prompt);
  let ds = opened.data;
  let exhausted = false;
  for (let i = 0; i < 20 && !exhausted; i++) {
    const nx = await rpc(A, "advance_round", { p_game: dg, p_expected: ds.game.version, p_action: "skip" });
    if (nx.error === "exhausted") { exhausted = true; break; }
    if (nx.error) throw new Error(nx.error);
    ds = nx.data;
  }
  check("A11", "exhausted category fails gracefully; state intact", exhausted && (await rpc(A, "get_game_state", { p_game: dg })).data.game.status === "active");
  const dqr = await admin.from("game_rounds").select("question_id").eq("game_session_id", dg);
  const dq = await admin.from("questions").select("depth, category").in("id", dqr.data!.map((r) => r.question_id));
  check("A12", "only enabled categories, never vulnerable, when not opted in",
    dq.data!.length > 0 && dq.data!.every((q) => q.depth !== "vulnerable" && q.category === "Life"));

  // vulnerable opt-in only when asked, with default categories: sample many draws
  g = await rpc(A, "start_game", { p_date: d1.id, p_type: "deep_talk", p_settings: { categories: ["Vulnerable"], vulnerable: false }, p_replace: true });
  check("A12", "vulnerable-only category with opt-in off is empty (exhausted)", g.error === "exhausted", String(g.error));

  // ---------- Would You Rather: secrets ----------
  g = await rpc(A, "start_game", { p_date: d1.id, p_type: "would_you_rather", p_settings: null, p_replace: true });
  const wid = g.data.game.id as string;
  check("WYR", "shared question with two options appears", g.data.round.phase === "answering" && !!g.data.round.optionA && !!g.data.round.optionB);
  const aVote = await rpc(A, "submit_choice", { p_game: wid, p_value: "A" });
  check("A04", "own submission persists across reload", (await rpc(A, "get_game_state", { p_game: wid })).data.round.myChoice === "A" && !aVote.error);
  const bView = (await rpc(B, "get_game_state", { p_game: wid })).data;
  check("A06", "partner cannot see the other's vote before reveal",
    bView.round.phase === "answering" && bView.round.partnerSubmitted === true && bView.round.myChoice == null && bView.round.choices === undefined);
  const direct = await B.supa.from("game_responses").select("*");
  check("A06", "partner cannot fetch the vote via PostgREST", !!direct.error || (direct.data?.length ?? 0) === 0);
  const dbl = await rpc(A, "submit_choice", { p_game: wid, p_value: "B" });
  check("A07", "double submit is idempotent and cannot change the vote", !dbl.error && dbl.data.round.myChoice === "A");
  const bVote = await rpc(B, "submit_choice", { p_game: wid, p_value: "B" });
  check("A07", "second vote reveals both choices", bVote.data.round.phase === "revealed" && Object.keys(bVote.data.round.choices).length === 2 && bVote.data.round.same === false);
  const revealedRows = await admin.from("game_rounds").select("phase").eq("id", g.data.round.id).single();
  check("A07", "reveal happened once, server-side", revealedRows.data!.phase === "revealed");
  const nextWyr = await Promise.all([
    rpc(A, "advance_round", { p_game: wid, p_expected: bVote.data.game.version, p_action: "next" }),
    rpc(B, "advance_round", { p_game: wid, p_expected: bVote.data.game.version, p_action: "next" }),
  ]);
  check("A08", "WYR concurrent Next => one new round", nextWyr.filter((x) => !x.error).length === 1);

  // simultaneous submissions reveal exactly once
  const cur = (await rpc(A, "get_game_state", { p_game: wid })).data;
  const sim = await Promise.all([
    rpc(A, "submit_choice", { p_game: wid, p_value: "A" }),
    rpc(B, "submit_choice", { p_game: wid, p_value: "A" }),
  ]);
  const after = (await rpc(A, "get_game_state", { p_game: wid })).data;
  check("A07", "simultaneous votes: both succeed, revealed, same=true", sim.every((x) => !x.error) && after.round.phase === "revealed" && after.round.same === true && after.round.id === cur.round.id);

  // ---------- Who's more likely to ----------
  g = await rpc(A, "start_game", { p_date: d1.id, p_type: "most_likely", p_settings: null, p_replace: true });
  const mid = g.data.game.id as string;
  const badVote = await rpc(A, "submit_choice", { p_game: mid, p_value: "not-a-member" });
  const selfVote = await rpc(A, "submit_choice", { p_game: mid, p_value: idA });
  const otherVote = await rpc(B, "submit_choice", { p_game: mid, p_value: idA });
  check("ML", "only the two member ids are valid options", badVote.error === "invalid_request" && !selfVote.error);
  check("ML", "reveal shows each member's pick", otherVote.data.round.phase === "revealed" && otherVote.data.round.choices[idA] === idA && otherVote.data.round.choices[idB] === idA);

  // ---------- Saved moments (consent) ----------
  const prop = await rpc(A, "propose_moment", { p_date: d1.id, p_question: null, p_content: "Ingat obrolan malam ini" });
  const listB = (await rpc(B, "list_moments")).data as Json[];
  check("A19", "proposal is pending, not shared, until the partner approves", listB[0]?.status === "needs_approval" && (await rpc(A, "list_moments")).data[0].status === "waiting");
  check("A19", "proposer cannot approve own moment", (await rpc(A, "approve_moment", { p_moment: prop.data })).error === "not_your_turn");
  await rpc(B, "approve_moment", { p_moment: prop.data });
  check("A19", "approved moment becomes shared", (await rpc(A, "list_moments")).data[0].status === "shared");

  // ---------- A20: finish date ----------
  const finishing = await rpc(A, "finish_date", { p_date: d1.id, p_expected: d1.version });
  check("A20", "finish_date completes the date", finishing.data?.status === "finished", String(finishing.error));
  const fin2 = await rpc(B, "finish_date", { p_date: d1.id, p_expected: d1.version });
  check("A20", "finish is idempotent; refresh keeps completed state", fin2.data?.status === "finished" && (await rpc(A, "get_active_date")).data === null && (await rpc(A, "get_date", { p_date: d1.id })).data.status === "finished");
  check("A20", "finished date cannot spawn games; open game is finished", (await rpc(A, "start_game", { p_date: d1.id, p_type: "deep_talk", p_settings: null, p_replace: false })).error === "illegal_phase" && (await rpc(A, "get_game_state", { p_game: mid })).data.game.status === "finished");
  const newDate = (await rpc(A, "start_date")).data;
  check("A20", "a new date can be started after finishing", newDate.id !== d1.id && newDate.status === "active");
}

try {
  await main();
} catch (e) {
  console.error("ERROR", e instanceof Error ? e.message : e);
  failed++;
} finally {
  await admin.from("couple_spaces").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  for (const id of userIds) await admin.auth.admin.deleteUser(id);
}
console.log(failed ? `\n${failed} FAILED` : "\nALL PASSED");
process.exit(failed ? 1 : 0);
