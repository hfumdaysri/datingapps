import { z } from "zod";
import { bad, callRpc, readJson, uuid } from "@/lib/server/rpc";

export const dynamic = "force-dynamic";
const schema = z.object({ value: z.string().min(1).max(64) });

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const body = await readJson(req, schema);
  if (!body || !uuid.safeParse(id).success) return bad();
  return callRpc("submit_choice", { p_game: id, p_value: body.value });
}
