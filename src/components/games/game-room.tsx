"use client";

import Link from "next/link";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/card";
import { ConnectionBanner } from "@/components/connection-banner";
import { PresenceDot } from "@/components/presence-dot";
import { useSpace } from "@/components/space-provider";
import { api, ApiError, GAME_LABEL, type GameState } from "@/lib/client/api";
import { ConversationView, VoteView } from "./views";
import { SaveMoment } from "./save-moment";

export type Actions = {
  state: GameState;
  busy: boolean;
  select: (choice: "left" | "right" | "open") => void;
  submit: (value: string) => void;
  next: (action: "next" | "skip") => void;
  nameOf: (memberId: string | null | undefined) => string;
  isMyTurn: boolean;
};

export function GameRoom({ gameId }: { gameId: string }) {
  const qc = useQueryClient();
  const { me } = useSpace();
  const [notice, setNotice] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const query = useQuery({
    queryKey: ["game", gameId],
    queryFn: () => api<GameState>(`/api/games/${gameId}/state`),
    refetchInterval: 4000, // safety net; realtime broadcast normally triggers refetch sooner
  });

  const run = useMutation({
    mutationFn: ({ path, body }: { path: string; body: unknown }) => api<GameState>(`/api/games/${gameId}/${path}`, body),
    onSuccess: (data) => {
      setNotice(null);
      qc.setQueryData(["game", gameId], data);
    },
    onError: (e) => {
      // Always converge on server state after a failure (stale version, partner acted first, ...).
      setNotice(e instanceof ApiError ? e.message : "Terjadi kesalahan.");
      qc.invalidateQueries({ queryKey: ["game", gameId] });
    },
  });

  if (query.isLoading) return <p role="status" className="p-6 text-center">Memuat…</p>;
  if (query.isError || !query.data) {
    const denied = query.error instanceof ApiError && [403, 404].includes(query.error.status);
    return (
      <div className="mx-auto max-w-md p-6">
        <ConnectionBanner queryFailed={!denied} />
        <Card className="mt-4">
          <p>{denied ? "Kamu tidak punya akses ke permainan ini." : "Belum bisa memuat permainan. Mencoba lagi…"}</p>
          <Button asChild className="mt-3"><Link href="/games">Kembali</Link></Button>
        </Card>
      </div>
    );
  }

  const state = query.data;
  const { game, round } = state;
  const partner = state.members.find((m) => m.id !== state.me.memberId);
  const nameOf = (id: string | null | undefined) => state.members.find((m) => m.id === id)?.name ?? "Pasangan";
  const v = game.version;
  const actions: Actions = {
    state,
    busy: run.isPending,
    isMyTurn: round?.turnMemberId === state.me.memberId,
    nameOf,
    select: (choice) => run.mutate({ path: "select", body: { choice, expectedVersion: v } }),
    submit: (value) => run.mutate({ path: "submit", body: { value } }),
    next: (action) => run.mutate({ path: "next", body: { expectedVersion: v, action } }),
  };

  const finished = game.status === "finished";
  const paused = game.status === "paused";

  return (
    <div className="mx-auto flex min-h-dvh max-w-2xl flex-col">
      <ConnectionBanner queryFailed={query.isRefetchError} />
      <header className="sticky top-0 z-10 flex items-center justify-between gap-2 border-b border-blush bg-cream/95 px-4 py-3 backdrop-blur">
        <div>
          <h1 className="font-serif text-lg leading-tight">{GAME_LABEL[game.type]}</h1>
          <p className="text-sm text-plum/70">Ronde {game.roundNumber}</p>
        </div>
        {partner && <PresenceDot memberId={partner.id} name={partner.name} />}
      </header>

      <main className="flex flex-1 flex-col gap-4 px-4 py-6">
        {notice && <p role="alert" className="rounded-xl bg-danger/10 p-3 text-danger">{notice}</p>}

        {finished ? (
          <Card className="text-center">
            <h2 className="font-serif text-2xl">Permainan selesai</h2>
            <p className="mt-1">Terima kasih sudah ngobrol bareng.</p>
            <Button asChild className="mt-4"><Link href={`/dates/${game.dateId}`}>Kembali ke Ngedate</Link></Button>
          </Card>
        ) : paused ? (
          <Card className="text-center">
            <h2 className="font-serif text-2xl">Dijeda</h2>
            <p className="mt-1">Lanjutkan kapan saja, tidak ada yang terburu-buru.</p>
            <Button className="mt-4" disabled={run.isPending}
              onClick={() => run.mutate({ path: "pause", body: { expectedVersion: v, pause: false } })}>
              Lanjutkan
            </Button>
          </Card>
        ) : round ? (
          game.type === "would_you_rather" || game.type === "most_likely" ? (
            <VoteView a={actions} />
          ) : (
            <ConversationView a={actions} onSave={() => setSaving(true)} />
          )
        ) : null}
      </main>

      {!finished && !paused && (
        <footer className="sticky bottom-0 flex flex-wrap justify-center gap-2 border-t border-blush bg-cream/95 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <Button variant="ghost" disabled={run.isPending} onClick={() => actions.next("skip")}>Lewati</Button>
          <Button variant="ghost" disabled={run.isPending}
            onClick={() => run.mutate({ path: "pause", body: { expectedVersion: v, pause: true } })}>
            Jeda
          </Button>
          <Button asChild variant="secondary"><Link href={`/dates/${game.dateId}`}>Kembali ke Ngedate</Link></Button>
        </footer>
      )}

      {saving && round?.prompt && (
        <SaveMoment dateId={game.dateId} questionId={round.questionId} initial={round.prompt} onClose={() => setSaving(false)} />
      )}
      <span className="sr-only" aria-live="polite">{me ? `Kamu masuk sebagai ${me.displayName}` : ""}</span>
    </div>
  );
}
