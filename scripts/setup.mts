// Owner-only CLI. Usage:
//   npm run setup -- provision --secret <SETUP_SECRET> --name "Kita" --anniversary 2024-02-14 --a Nama1 --b Nama2 --base https://app.example.com
//   npm run setup -- invite --secret <SETUP_SECRET> --seat A --base https://app.example.com
import { timingSafeEqual } from "node:crypto";
import { parseArgs } from "node:util";
import { createClient } from "@supabase/supabase-js";
import { randomToken, sha256Hex } from "../src/lib/server/crypto.ts";

const { positionals, values } = parseArgs({
  allowPositionals: true,
  options: {
    secret: { type: "string" },
    name: { type: "string" },
    anniversary: { type: "string" },
    a: { type: "string" },
    b: { type: "string" },
    seat: { type: "string" },
    base: { type: "string", default: "http://localhost:3000" },
  },
});

const expected = process.env.SETUP_SECRET ?? "";
const given = values.secret ?? "";
if (expected.length < 16 || given.length !== expected.length || !timingSafeEqual(Buffer.from(given), Buffer.from(expected))) {
  console.error("Invalid or missing --secret.");
  process.exit(1);
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error("Supabase env vars missing");
const admin = createClient(url, key, { auth: { persistSession: false } });

const EXPIRES = "72 hours";
const link = (t: string) => `${values.base}/join?token=${t}`;

if (positionals[0] === "provision") {
  const { name, anniversary, a, b } = values;
  if (!name || !anniversary || !a || !b || !/^\d{4}-\d{2}-\d{2}$/.test(anniversary)) {
    throw new Error("--name, --anniversary (YYYY-MM-DD), --a, --b are required");
  }
  const ta = randomToken(32);
  const tb = randomToken(32);
  const { error } = await admin.rpc("provision_space", {
    p_name: name, p_anniversary: anniversary, p_name_a: a, p_name_b: b,
    p_hash_a: sha256Hex(ta), p_hash_b: sha256Hex(tb), p_expires: EXPIRES,
  });
  if (error) throw new Error(error.message.includes("already_provisioned") ? "Space already provisioned; setup is disabled." : error.message);
  console.log(`Provisioned. Invites valid ${EXPIRES}, single use:\n  A (${a}): ${link(ta)}\n  B (${b}): ${link(tb)}`);
} else if (positionals[0] === "invite") {
  if (values.seat !== "A" && values.seat !== "B") throw new Error("--seat A|B required");
  const t = randomToken(32);
  const { error } = await admin.rpc("issue_invite", { p_seat: values.seat, p_hash: sha256Hex(t), p_expires: EXPIRES });
  if (error) throw new Error(error.message);
  console.log(`New invite for seat ${values.seat}: ${link(t)}`);
} else {
  console.error("Commands: provision | invite");
  process.exit(1);
}
