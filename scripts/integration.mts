// Integration tests against the real Supabase project + a running Next server.
// Provisions a TEMPORARY space, runs A01-A03 / A13-A15, then deletes everything it created.
// Usage: BASE_URL=http://localhost:3100 npm run test:integration
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { randomToken, sha256Hex } from "../src/lib/server/crypto.ts";

const BASE = process.env.BASE_URL ?? "http://localhost:3100";
const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const admin = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });

type Jar = Map<string, string>;
const userIds: string[] = [];
let failed = 0;

function check(id: string, label: string, ok: boolean, extra = "") {
  console.log(`${ok ? "PASS" : "FAIL"} ${id} ${label}${ok ? "" : ` ${extra}`}`);
  if (!ok) failed++;
}

async function newSession(): Promise<{ jar: Jar; userId: string; supa: ReturnType<typeof createServerClient> }> {
  const jar: Jar = new Map();
  const supa = createServerClient(url, anon, {
    cookies: {
      getAll: () => [...jar].map(([name, value]) => ({ name, value })),
      setAll: (items) => items.forEach(({ name, value }) => (value ? jar.set(name, value) : jar.delete(name))),
    },
  });
  const { data, error } = await supa.auth.signInAnonymously();
  if (error || !data.user) throw new Error(`anonymous sign-in failed: ${error?.message}`);
  userIds.push(data.user.id);
  return { jar, userId: data.user.id, supa };
}

const cookieHeader = (jar: Jar) => [...jar].map(([k, v]) => `${k}=${v}`).join("; ");

async function api(path: string, jar: Jar | null, body?: unknown) {
  const res = await fetch(BASE + path, {
    method: body === undefined ? "GET" : "POST",
    redirect: "manual",
    headers: { "content-type": "application/json", ...(jar ? { cookie: cookieHeader(jar) } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const json = await res.json().catch(() => null);
  return { status: res.status, json };
}

async function cleanup() {
  await admin.from("couple_spaces").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  await admin.from("rate_limits").delete().neq("key", "");
  for (const id of userIds) await admin.auth.admin.deleteUser(id);
}

async function main() {
  const { count } = await admin.from("couple_spaces").select("*", { count: "exact", head: true });
  if (count) throw new Error("A space already exists; refusing to run (would delete real data).");
  await admin.from("rate_limits").delete().neq("key", "");

  const ta = randomToken(32);
  const tb = randomToken(32);
  const { error: provErr } = await admin.rpc("provision_space", {
    p_name: "test", p_anniversary: "2026-08-13", p_name_a: "Aa", p_name_b: "Bb",
    p_hash_a: sha256Hex(ta), p_hash_b: sha256Hex(tb), p_expires: "1 hour",
  });
  if (provErr) throw new Error(provErr.message);

  // Provisioning is one-time.
  const again = await admin.rpc("provision_space", {
    p_name: "x", p_anniversary: "2026-01-01", p_name_a: "a", p_name_b: "b",
    p_hash_a: "h1", p_hash_b: "h2", p_expires: "1 hour",
  });
  check("M1", "second provisioning refused", !!again.error);

  // A01
  const nobody = await api("/api/me", null);
  check("A01", "no session -> 403/401 on /api/me", [401, 403].includes(nobody.status), String(nobody.status));
  const stranger = await newSession();
  const strangerMe = await api("/api/me", stranger.jar);
  check("A01", "uninvited anon -> 403 on /api/me", strangerMe.status === 403, String(strangerMe.status));
  const home = await fetch(`${BASE}/home`, { redirect: "manual", headers: { cookie: cookieHeader(stranger.jar) } });
  const homeBody = await home.text();
  check("A01", "uninvited anon /home redirects, no private content", home.status >= 300 && home.status < 400 && !homeBody.includes("hari bersama"), String(home.status));
  const direct = await stranger.supa.from("couple_spaces").select("*");
  const directM = await stranger.supa.from("members").select("*");
  check("A01", "uninvited anon sees zero rows via PostgREST", (direct.data?.length ?? 0) === 0 && (directM.data?.length ?? 0) === 0);
  const inv = await stranger.supa.from("invites").select("*");
  check("A01", "invites table not readable by client", !!inv.error);

  // A02
  const u1 = await newSession();
  const r1 = await api("/api/invites/redeem", u1.jar, { token: ta });
  check("A02", "first redeem of invite A succeeds", r1.status === 200 && r1.json?.seat === "A" && !!r1.json?.recoveryKey, JSON.stringify(r1));
  const u2 = await newSession();
  const r2 = await api("/api/invites/redeem", u2.jar, { token: ta });
  check("A02", "repeat of same token fails", r2.status === 403, JSON.stringify(r2));
  const meA = await api("/api/me", u1.jar);
  check("A02", "bound member reads /api/me as seat A", meA.status === 200 && meA.json?.me?.seat === "A", JSON.stringify(meA));
  const homeA = await fetch(`${BASE}/home`, { redirect: "manual", headers: { cookie: cookieHeader(u1.jar) } });
  check("A02", "bound member can open /home", homeA.status === 200, String(homeA.status));

  // A03
  const rb = await api("/api/invites/redeem", u2.jar, { token: tb });
  check("A03", "seat B claimed by legitimate invite", rb.status === 200 && rb.json?.seat === "B", JSON.stringify(rb));
  const u3 = await newSession();
  const r3 = await api("/api/invites/redeem", u3.jar, { token: tb });
  const r3b = await api("/api/invites/redeem", u3.jar, { token: randomToken(32) });
  check("A03", "third user cannot claim a seat", r3.status === 403 && r3b.status === 403);
  const rpc = await u3.supa.rpc("rebind_member", { p_member: "00000000-0000-0000-0000-000000000000", p_uid: u3.userId });
  check("A03", "client cannot call privileged RPCs", !!rpc.error);

  // A13
  const fresh = await newSession();
  check("A13", "cleared storage (new session) has no access", (await api("/api/me", fresh.jar)).status === 403);

  // A14
  const keyA = r1.json.recoveryKey as string;
  const u4 = await newSession();
  const rec = await api("/api/recovery/redeem", u4.jar, { key: keyA });
  check("A14", "valid key restores seat on new device", rec.status === 200 && !!rec.json?.recoveryKey, JSON.stringify(rec));
  check("A14", "new device is seat A", (await api("/api/me", u4.jar)).json?.me?.seat === "A");
  check("A14", "old binding denied afterwards (API)", (await api("/api/me", u1.jar)).status === 403);
  const oldRows = await u1.supa.from("members").select("*");
  check("A14", "old session reads zero rows via PostgREST", (oldRows.data?.length ?? 0) === 0);
  const reuse = await api("/api/recovery/redeem", (await newSession()).jar, { key: keyA });
  check("A14", "used (rotated) key no longer works", reuse.status === 403, JSON.stringify(reuse));

  // A15
  const memberId = keyA.split(".")[0];
  const wrongKnown = await api("/api/recovery/redeem", fresh.jar, { key: `${memberId}.${randomToken(32)}` });
  const wrongUnknown = await api("/api/recovery/redeem", fresh.jar, { key: `${crypto.randomUUID()}.${randomToken(32)}` });
  check("A15", "wrong key and unknown member give identical response", wrongKnown.status === 403 && JSON.stringify(wrongKnown.json) === JSON.stringify(wrongUnknown.json), JSON.stringify([wrongKnown, wrongUnknown]));
  let limited = false;
  for (let i = 0; i < 8 && !limited; i++) {
    limited = (await api("/api/recovery/redeem", fresh.jar, { key: `${memberId}.${randomToken(32)}` })).status === 429;
  }
  check("A15", "repeated wrong keys are rate limited (429)", limited);
}

try {
  await main();
} catch (e) {
  console.error("ERROR", e instanceof Error ? e.message : e);
  failed++;
} finally {
  await cleanup().catch((e) => console.error("cleanup failed", e));
}
console.log(failed ? `\n${failed} FAILED` : "\nALL PASSED");
process.exit(failed ? 1 : 0);
