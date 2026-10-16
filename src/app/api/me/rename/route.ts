import { z } from "zod";
import { bad, callRpc, readJson } from "@/lib/server/rpc";

export const dynamic = "force-dynamic";
const schema = z.object({ name: z.string().trim().min(1).max(40) });

export async function POST(req: Request) {
  const body = await readJson(req, schema);
  if (!body) return bad();
  return callRpc("rename_me", { p_name: body.name });
}
