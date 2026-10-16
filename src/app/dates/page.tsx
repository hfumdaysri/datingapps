import { AppShell } from "@/components/app-shell";
import { getPublicEnv } from "@/lib/env";
import { DatesClient } from "./dates-client";

export const dynamic = "force-dynamic";

export default function DatesPage() {
  return (
    <AppShell title="Dates">
      {getPublicEnv() ? <DatesClient /> : <p>Hubungkan Supabase untuk memulai date.</p>}
    </AppShell>
  );
}
