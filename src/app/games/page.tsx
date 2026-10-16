import { AppShell } from "@/components/app-shell";
import { getPublicEnv } from "@/lib/env";
import { GamesClient } from "./games-client";

export const dynamic = "force-dynamic";

export default function GamesPage() {
  return (
    <AppShell title="Game">
      {getPublicEnv() ? <GamesClient /> : <p>Hubungkan Supabase untuk bermain.</p>}
    </AppShell>
  );
}
