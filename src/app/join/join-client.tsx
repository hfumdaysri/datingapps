"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/card";
import { RecoveryKeyPanel } from "@/components/recovery-key-panel";
import { ensureAnonymousSession } from "@/lib/supabase/ensure-session";

export function JoinClient({ token }: { token: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [key, setKey] = useState<string | null>(null);

  async function redeem() {
    setBusy(true);
    setError(null);
    const sessionError = await ensureAnonymousSession();
    if (sessionError) {
      setError(sessionError);
      setBusy(false);
      return;
    }
    const res = await fetch("/api/invites/redeem", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ token }),
    });
    const json = await res.json().catch(() => null);
    if (res.ok) setKey(json.recoveryKey);
    else setError(json?.error?.message ?? "Terjadi kesalahan.");
    setBusy(false);
  }

  if (key) return <RecoveryKeyPanel recoveryKey={key} />;
  return (
    <Card className="flex flex-col gap-3">
      <p>Kamu diundang ke ruang pribadi berdua. Tidak perlu email atau kata sandi.</p>
      {error && <p role="alert" className="text-danger">{error}</p>}
      <Button onClick={redeem} disabled={busy || !token}>
        {busy ? "Memproses..." : "Terima undangan"}
      </Button>
    </Card>
  );
}
