import { z } from "zod";
import { bad, callRpc, uuid } from "@/lib/server/rpc";

export const dynamic = "force-dynamic";
const respond = z.object({ requestId: uuid, approve: z.boolean() });

export const GET = () => callRpc("get_data_request");
export async function POST(req: Request) {
  const raw = await req.json().catch(() => null);
  if (raw && typeof raw === "object" && "requestId" in raw) {
    const parsed = respond.safeParse(raw);
    if (!parsed.success) return bad();
    return callRpc("respond_data_deletion", { p_request: parsed.data.requestId, p_approve: parsed.data.approve });
  }
  return callRpc("request_data_deletion");
}
