"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/card";
import { RecoveryKeyPanel } from "@/components/recovery-key-panel";
import { ensureAnonymousSession } from "@/lib/supabase/ensure-session";

export function RecoverClient() {
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newKey, setNewKey] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const sessionError = await ensureAnonymousSession();
    if (sessionError) {
      setError(sessionError);
      setBusy(false);
      return;
    }
    const res = await fetch("/api/recovery/redeem", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ key: value }),
    });
    const json = await res.json().catch(() => null);
    if (res.ok) setNewKey(json.recoveryKey);
    else setError(json?.error?.message ?? "Terjadi kesalahan.");
    setBusy(false);
  }

  if (newKey) return <RecoveryKeyPanel recoveryKey={newKey} />;
  return (
    <Card>
      <form onSubmit={submit} className="flex flex-col gap-3">
        <label htmlFor="key" className="font-semibold">Kunci pemulihan</label>
        <input
          id="key"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          autoComplete="off"
          spellCheck={false}
          className="min-h-11 rounded-xl border border-plum/30 bg-white px-3"
        />
        {error && <p role="alert" className="text-danger">{error}</p>}
        <Button type="submit" disabled={busy || value.trim().length === 0}>
          {busy ? "Memeriksa..." : "Pulihkan akses"}
        </Button>
      </form>
    </Card>
  );
}
