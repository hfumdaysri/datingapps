import { z } from "zod";
import { bad, callRpc, readJson, uuid } from "@/lib/server/rpc";

export const dynamic = "force-dynamic";
const schema = z.object({ id: uuid });

export async function POST(req: Request) {
  const body = await readJson(req, schema);
  if (!body) return bad();
  return callRpc("remove_custom_question", { p_id: body.id });
}
