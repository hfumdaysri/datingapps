import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { LobbyClient } from "./lobby-client";

export const dynamic = "force-dynamic";

export default async function LobbyPage({ params }: { params: Promise<{ dateId: string }> }) {
  const { dateId } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(dateId)) notFound();
  return (
    <AppShell title="Our Date">
      <LobbyClient dateId={dateId} />
    </AppShell>
  );
}
