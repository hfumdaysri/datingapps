import { z } from "zod";
import { bad, callRpc, readJson, uuid } from "@/lib/server/rpc";

export const dynamic = "force-dynamic";
const schema = z.object({ dateId: uuid.optional(), questionId: uuid.optional(), content: z.string().trim().min(1).max(500) });

export async function POST(req: Request) {
  const body = await readJson(req, schema);
  if (!body) return bad();
  return callRpc("propose_moment", { p_date: body.dateId ?? null, p_question: body.questionId ?? null, p_content: body.content });
}
