import { z } from "zod";
import { bad, callRpc, readJson } from "@/lib/server/rpc";

export const dynamic = "force-dynamic";
const schema = z.object({
  gameType: z.enum(["truth_or_truth", "deep_talk", "would_you_rather", "most_likely", "know_me"]),
  category: z.string().max(30).default("Fun"),
  prompt: z.string().trim().min(1).max(300),
  optionA: z.string().trim().max(200).optional(),
  optionB: z.string().trim().max(200).optional(),
  followUp: z.string().trim().max(200).optional(),
});

export const GET = () => callRpc("list_custom_questions");
export async function POST(req: Request) {
  const body = await readJson(req, schema);
  if (!body) return bad();
  return callRpc("add_custom_question", {
    p_type: body.gameType, p_category: body.category, p_prompt: body.prompt,
    p_a: body.optionA ?? null, p_b: body.optionB ?? null, p_follow: body.followUp ?? null,
  });
}
