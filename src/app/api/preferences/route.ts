import { z } from "zod";
import { bad, callRpc, readJson } from "@/lib/server/rpc";

export const dynamic = "force-dynamic";
const cats = z.array(z.string().max(30)).max(10);
const schema = z.object({ truthCategories: cats, deepCategories: cats, vulnerable: z.boolean(), noScore: z.boolean().optional() });

export const GET = () => callRpc("get_preferences");
export async function POST(req: Request) {
  const body = await readJson(req, schema);
  if (!body) return bad();
  return callRpc("set_preferences", { p_prefs: body });
}
