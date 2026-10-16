// Idempotent seed: upserts Indonesian prompts by seed_key.
import { createClient } from "@supabase/supabase-js";
import { SEED_QUESTIONS } from "../src/lib/seed/questions.ts";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error("Supabase env vars missing");
const admin = createClient(url, key, { auth: { persistSession: false } });

const rows = SEED_QUESTIONS.map((q) => ({
  seed_key: q.seedKey,
  game_type: q.gameType,
  category: q.category,
  depth: q.depth,
  prompt: q.prompt,
  option_a: q.optionA ?? null,
  option_b: q.optionB ?? null,
  follow_up: q.followUp ?? null,
  active: true,
}));

for (let i = 0; i < rows.length; i += 100) {
  const { error } = await admin.from("questions").upsert(rows.slice(i, i + 100), { onConflict: "seed_key" });
  if (error) throw error;
}
const { count } = await admin.from("questions").select("*", { count: "exact", head: true });
console.log(`Seeded ${rows.length} prompts (table now has ${count}).`);
