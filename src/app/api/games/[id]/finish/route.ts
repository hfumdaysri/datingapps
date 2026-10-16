import { bad, callRpc, uuid } from "@/lib/server/rpc";

export const dynamic = "force-dynamic";
export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (!uuid.safeParse(id).success) return bad();
  return callRpc("finish_game", { p_game: id });
}
