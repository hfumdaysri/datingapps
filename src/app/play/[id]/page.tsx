import { notFound, redirect } from "next/navigation";
import { GameRoom } from "@/components/games/game-room";
import { SpaceShell } from "@/components/space-shell";
import { getMe } from "@/lib/server/session";

export const dynamic = "force-dynamic";

export default async function PlayPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const me = await getMe();
  if (!me) redirect("/");
  return (
    <SpaceShell me={me}>
      <GameRoom gameId={id} />
    </SpaceShell>
  );
}
