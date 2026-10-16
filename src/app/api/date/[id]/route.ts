import { callRpc, uuid, bad } from "@/lib/server/rpc";

export const dynamic = "force-dynamic";
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (!uuid.safeParse(id).success) return bad();
  return callRpc("get_date", { p_date: id });
}
