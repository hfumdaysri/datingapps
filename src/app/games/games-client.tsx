"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/card";
import { QuestionSettings } from "@/components/question-settings";
import { useStartGame } from "@/lib/client/use-start-game";
import type { GameType } from "@/lib/client/api";

const games: Array<{ type: GameType | null; name: string; desc: string; tag: string }> = [
  { type: "truth_or_truth", name: "Truth or Truth", desc: "Pilih satu dari dua jalur pertanyaan, jawab bergantian.", tag: "Sweet / Deep" },
  { type: "deep_talk", name: "Deep Talk Cards", desc: "Tarik satu kartu dan ngobrol, tanpa skor.", tag: "Deep" },
  { type: "would_you_rather", name: "Would You Rather?", desc: "Pilih A atau B diam-diam, lalu buka bersama.", tag: "Fun" },
  { type: "most_likely", name: "Who’s More Likely To?", desc: "Tebak siapa yang paling mungkin, reveal bareng.", tag: "Fun / Sweet" },
  { type: null, name: "How Well Do You Know Me?", desc: "Seberapa kenal kamu dengan pasanganmu.", tag: "Coming Next" },
];

export function GamesClient() {
  const { start, busy, error, dialog } = useStartGame();
  return (
    <>
      {error && <p role="alert" className="mb-3 rounded-xl bg-danger/10 p-3 text-danger">{error}</p>}
      <ul className="mb-6 flex flex-col gap-3">
        {games.map((g) => (
          <li key={g.name}>
            <Card className={g.type ? undefined : "opacity-70"}>
              <h2 className="font-serif text-xl">{g.name}</h2>
              <p className="text-plum/80">{g.desc}</p>
              <p className="mt-2 text-sm text-plum/70">{g.tag} · ~5-15 menit</p>
              {g.type ? (
                <Button className="mt-3" disabled={busy} onClick={() => start(g.type!)}>Play</Button>
              ) : (
                <p className="mt-3 text-sm font-semibold">Coming Next</p>
              )}
            </Card>
          </li>
        ))}
      </ul>
      <QuestionSettings />
      {dialog}
    </>
  );
}
