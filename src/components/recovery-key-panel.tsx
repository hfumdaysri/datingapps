"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/card";

export function RecoveryKeyPanel({ recoveryKey }: { recoveryKey: string }) {
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);
  return (
    <Card className="flex flex-col gap-3">
      <h2 className="font-serif text-xl">Simpan kunci pemulihanmu</h2>
      <p>
        Kunci ini hanya ditampilkan sekali. Tanpa kunci ini kamu tidak bisa masuk dari perangkat baru. Simpan di
        pengelola kata sandi atau catatan aman, dan perlakukan seperti kata sandi.
      </p>
      <code className="break-all rounded-xl bg-cream p-3 text-sm" data-testid="recovery-key">
        {recoveryKey}
      </code>
      <Button
        variant="secondary"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(recoveryKey);
            setCopied(true);
          } catch {
            setCopied(false);
          }
        }}
      >
        {copied ? "Tersalin" : "Salin kunci"}
      </Button>
      <label className="flex min-h-11 items-center gap-3">
        <input type="checkbox" className="size-5" checked={saved} onChange={(e) => setSaved(e.target.checked)} />
        Aku sudah menyimpannya
      </label>
      <Button disabled={!saved} onClick={() => window.location.assign("/home")}>
        Lanjut ke Home
      </Button>
    </Card>
  );
}
