import { z } from "zod";
import { bad, callRpc, readJson, uuid } from "@/lib/server/rpc";

export const dynamic = "force-dynamic";
const schema = z.object({ choice: z.enum(["left", "right", "open"]), expectedVersion: z.number().int() });

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const body = await readJson(req, schema);
  if (!body || !uuid.safeParse(id).success) return bad();
  return callRpc("select_option", { p_game: id, p_expected: body.expectedVersion, p_choice: body.choice });
}
