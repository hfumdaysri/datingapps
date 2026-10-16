import { z } from "zod";
import { bad, callRpc, readJson, uuid } from "@/lib/server/rpc";

export const dynamic = "force-dynamic";
const schema = z.object({ dateId: uuid, expectedVersion: z.number().int() });

export async function POST(req: Request) {
  const body = await readJson(req, schema);
  if (!body) return bad();
  return callRpc("finish_date", { p_date: body.dateId, p_expected: body.expectedVersion });
}
