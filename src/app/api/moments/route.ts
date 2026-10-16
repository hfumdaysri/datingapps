import { callRpc } from "@/lib/server/rpc";

export const dynamic = "force-dynamic";
export const GET = () => callRpc("list_moments");
