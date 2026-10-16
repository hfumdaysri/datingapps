import { callRpc } from "@/lib/server/rpc";

export const dynamic = "force-dynamic";
export const GET = () => callRpc("get_active_date");
