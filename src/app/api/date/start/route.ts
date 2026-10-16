import { callRpc } from "@/lib/server/rpc";

export const dynamic = "force-dynamic";
export const POST = () => callRpc("start_date"); // idempotent: returns the active date if one exists
