import { z } from "zod";
import { bad, callRpc, readJson, uuid } from "@/lib/server/rpc";

export const dynamic = "force-dynamic";
const schema = z.object({
  dateId: uuid,
  gameType: z.enum(["truth_or_truth", "deep_talk", "would_you_rather", "most_likely"]),
  settings: z
    .object({ categories: z.array(z.string().max(30)).max(10).optional(), vulnerable: z.boolean().optional() })
    .optional(),
  replace: z.boolean().optional(),
});

export async function POST(req: Request) {
  const body = await readJson(req, schema);
  if (!body) return bad();
  return callRpc("start_game", {
    p_date: body.dateId,
    p_type: body.gameType,
    p_settings: body.settings ?? null,
    p_replace: body.replace ?? false,
  });
}
