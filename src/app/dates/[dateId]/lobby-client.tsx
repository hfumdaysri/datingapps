"use client";

import Link from "next/link";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/card";
import { ConfirmDialog } from "@/components/dialog";
import { api, ApiError, GAME_LABEL, type DateInfo, type GameType } from "@/lib/client/api";
import { useStartGame } from "@/lib/client/use-start-game";

const TYPES = Object.keys(GAME_LABEL) as GameType[];

export function LobbyClient({ dateId }: { dateId: string }) {
  const qc = useQueryClient();
  const [confirmFinish, setConfirmFinish] = useState(false);
  const { start, busy, error, dialog } = useStartGame();
  const { data: date, isLoading, error: loadError } = useQuery({
    queryKey: ["date", dateId],
    queryFn: () => api<DateInfo>(`/api/date/${dateId}`),
    refetchInterval: 4000,
  });
  const finish = useMutation({
    mutationFn: (d: DateInfo) => api<DateInfo>("/api/date/finish", { dateId: d.id, expectedVersion: d.version }),
    onSuccess: (d) => {
      qc.setQueryData(["date", dateId], d);
      qc.invalidateQueries({ queryKey: ["date", "active"] });
    },
    onError: () => qc.invalidateQueries({ queryKey: ["date", dateId] }),
  });

  if (isLoading) return <p role="status">Memuat…</p>;
  if (loadError || !date) {
    return <Card>{loadError instanceof ApiError && loadError.status === 404 ? "Ngedate tidak ditemukan." : "Belum bisa memuat ngedate."}</Card>;
  }

  if (date.status === "finished") {
    return (
      <Card className="flex flex-col gap-3 text-center">
        <h2 className="font-serif text-2xl">Ngedate selesai</h2>
        <ul className="text-plum/80">
          <li>{date.summary.games} permainan dimainkan</li>
          <li>{date.summary.prompts} pertanyaan dijelajahi</li>
          <li>{date.summary.moments} momen tersimpan bersama</li>
        </ul>
        <p className="text-sm text-plum/70">Jawaban dan obrolan tidak disimpan otomatis.</p>
        <Button asChild><Link href="/home">Kembali ke Beranda</Link></Button>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {error && <p role="alert" className="rounded-xl bg-danger/10 p-3 text-danger">{error}</p>}
      {date.activeGame && (
        <Card className="flex flex-col gap-2">
          <p>Sedang bermain: <strong>{GAME_LABEL[date.activeGame.type]}</strong>{date.activeGame.status === "paused" ? " (dijeda)" : ""}</p>
          <Button asChild><Link href={`/play/${date.activeGame.id}`}>Lanjut bermain</Link></Button>
        </Card>
      )}
      <Card>
        <h2 className="mb-3 font-serif text-xl">{date.activeGame ? "Ganti permainan" : "Pilih permainan"}</h2>
        <ul className="grid gap-2">
          {TYPES.filter((t) => t !== date.activeGame?.type).map((t) => (
            <li key={t}><Button variant="secondary" className="w-full" disabled={busy} onClick={() => start(t, date.id)}>{GAME_LABEL[t]}</Button></li>
          ))}
        </ul>
      </Card>
      <Button variant="ghost" onClick={() => setConfirmFinish(true)}>Akhiri Ngedate</Button>
      <ConfirmDialog open={confirmFinish} title="Akhiri ngedate?" confirmLabel="Akhiri"
        body="Permainan yang berjalan akan selesai untuk kalian berdua. Obrolan dan jawaban tidak disimpan otomatis."
        onCancel={() => setConfirmFinish(false)}
        onConfirm={() => { setConfirmFinish(false); finish.mutate(date); }} />
      {dialog}
    </div>
  );
}
