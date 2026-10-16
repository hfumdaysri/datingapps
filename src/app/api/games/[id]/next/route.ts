import { z } from "zod";
import { bad, callRpc, readJson, uuid } from "@/lib/server/rpc";

export const dynamic = "force-dynamic";
const schema = z.object({ expectedVersion: z.number().int(), action: z.enum(["next", "skip"]).default("next") });

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const body = await readJson(req, schema);
  if (!body || !uuid.safeParse(id).success) return bad();
  return callRpc("advance_round", { p_game: id, p_expected: body.expectedVersion, p_action: body.action });
}
