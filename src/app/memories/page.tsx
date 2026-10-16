import { AppShell } from "@/components/app-shell";
import { getPublicEnv } from "@/lib/env";
import { MemoriesClient } from "./memories-client";

export const dynamic = "force-dynamic";

export default function MemoriesPage() {
  return (
    <AppShell title="Kenangan">
      {getPublicEnv() ? <MemoriesClient /> : <p>Hubungkan Supabase untuk menyimpan momen.</p>}
    </AppShell>
  );
}
