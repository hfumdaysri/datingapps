"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/card";
import { categoryLabel, themeLabel } from "@/lib/client/labels";
import type { Actions } from "./game-room";

const PROMPT = "font-serif text-2xl leading-snug sm:text-3xl";

/** Truth or Truth + Deep Talk Cards. */
export function ConversationView({ a, onSave }: { a: Actions; onSave: () => void }) {
  const { state, busy, isMyTurn, nameOf } = a;
  const round = state.round!;
  const isTruth = state.game.type === "truth_or_truth";
  const [showFollow, setShowFollow] = useState(false);

  if (round.phase === "pending") {
    if (isTruth) {
      const choices = (round.choices ?? []) as Array<{ side: "left" | "right"; label: string }>;
      return (
        <section aria-labelledby="turn" className="flex flex-col gap-4">
          <h2 id="turn" className="text-center text-lg">
            {isMyTurn ? "Giliranmu memilih" : `Giliran ${nameOf(round.turnMemberId)} memilih`}
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {choices.map((c) => (
              <Button key={c.side} className="min-h-24 flex-col text-lg" variant={isMyTurn ? "primary" : "secondary"}
                disabled={!isMyTurn || busy} onClick={() => a.select(c.side)}>
                {themeLabel(c.label)}
              </Button>
            ))}
          </div>
          {!isMyTurn && <p className="text-center text-plum/70">Menunggu {nameOf(round.turnMemberId)}…</p>}
        </section>
      );
    }
    return (
      <section className="flex flex-col items-center gap-4">
        <Card className="flex min-h-56 w-full flex-col items-center justify-center bg-lavender/40 text-center">
          <p className="text-sm uppercase tracking-wide text-plum/70">Kartu {categoryLabel(round.category)}</p>
          <p className="mt-2 font-serif text-3xl">?</p>
        </Card>
        <Button disabled={busy} onClick={() => a.select("open")}>Buka kartu</Button>
      </section>
    );
  }

  return (
    <section className="flex flex-col gap-4">
      <Card>
        {round.category && <p className="mb-2 text-sm text-plum/70">{categoryLabel(round.category)}</p>}
        <p className={PROMPT} data-testid="prompt">{round.prompt}</p>
      </Card>
      {round.followUp && (
        <div>
          <Button variant="ghost" onClick={() => setShowFollow((s) => !s)} aria-expanded={showFollow}>
            {showFollow ? "Sembunyikan pertanyaan lanjutan" : "Pertanyaan lanjutan"}
          </Button>
          {showFollow && <p className="mt-2 rounded-xl bg-white p-3 ring-1 ring-blush/60">{round.followUp}</p>}
        </div>
      )}
      <p className="text-center text-plum/70">Jawab langsung lewat panggilan video. Tidak perlu mengetik.</p>
      <div className="flex flex-wrap justify-center gap-2">
        <Button disabled={busy} onClick={() => a.next("next")}>{isTruth ? "Selesai" : "Kartu berikutnya"}</Button>
        <Button variant="secondary" disabled={busy} onClick={onSave}>
          {isTruth ? "Simpan momen" : "Simpan pertanyaan"}
        </Button>
      </div>
    </section>
  );
}

/** Would You Rather + Who's More Likely To. */
export function VoteView({ a }: { a: Actions }) {
  const { state, busy, nameOf } = a;
  const round = state.round!;
  const isWyr = state.game.type === "would_you_rather";
  const [picked, setPicked] = useState<string | null>(null);

  const options = isWyr
    ? [{ value: "A", label: round.optionA ?? "" }, { value: "B", label: round.optionB ?? "" }]
    : state.members.map((m) => ({ value: m.id, label: m.id === state.me.memberId ? `${m.name} (kamu)` : m.name }));

  const revealed = round.phase === "revealed" || round.phase === "completed";
  const choices = (revealed ? round.choices : null) as Record<string, string> | null;
  const labelFor = (value: string) => options.find((o) => o.value === value)?.label ?? value;

  return (
    <section className="flex flex-col gap-4">
      <Card>
        <p className={PROMPT} data-testid="prompt">{round.prompt}</p>
      </Card>

      {!revealed && round.myChoice == null && (
        <>
          <div className="grid gap-3" role="radiogroup" aria-label="Pilihanmu">
            {options.map((o) => (
              <button key={o.value} type="button" role="radio" aria-checked={picked === o.value}
                onClick={() => setPicked(o.value)}
                className={`min-h-16 rounded-card border-2 px-4 py-3 text-left text-lg ${picked === o.value ? "border-rose bg-blush/40" : "border-blush bg-white"}`}>
                {o.label}
              </button>
            ))}
          </div>
          <Button disabled={!picked || busy} onClick={() => picked && a.submit(picked)}>Kunci jawaban</Button>
          <p className="text-center text-sm text-plum/70">Pilihanmu rahasia sampai kalian berdua sudah memilih.</p>
        </>
      )}

      {!revealed && round.myChoice != null && (
        <Card className="text-center" role="status">
          <p>Kamu menjawab: <strong>{labelFor(round.myChoice)}</strong></p>
          <p className="mt-1 text-plum/70">
            {round.partnerSubmitted ? "Membuka jawaban…" : "Menunggu pasanganmu…"}
          </p>
        </Card>
      )}

      {revealed && choices && (
        <section aria-label="Hasil" className="flex flex-col gap-3">
          <h2 className="text-center font-serif text-xl">{round.same ? "Pilihan yang sama!" : "Pilihan berbeda!"}</h2>
          <ul className="grid gap-2">
            {state.members.map((m) => (
              <li key={m.id} className="rounded-card bg-white p-4 ring-1 ring-blush/60">
                <span className="text-sm text-plum/70">{m.id === state.me.memberId ? `${m.name} (kamu)` : m.name}</span>
                <p className="text-lg font-semibold">{labelFor(choices[m.id] ?? "")}</p>
              </li>
            ))}
          </ul>
          {round.followUp && <p className="text-center text-plum/80">{round.followUp}</p>}
          <Button disabled={busy} onClick={() => a.next("next")}>Berikutnya</Button>
        </section>
      )}
      <span className="sr-only">{nameOf(state.me.memberId)}</span>
    </section>
  );
}
