"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/card";
import { QuestionSettings } from "@/components/question-settings";
import { useStartGame } from "@/lib/client/use-start-game";
import type { GameType } from "@/lib/client/api";

const games: Array<{ type: GameType | null; name: string; desc: string; tag: string }> = [
  { type: "truth_or_truth", name: "Jujur-jujuran", desc: "Pilih satu dari dua jalur pertanyaan, jawab bergantian.", tag: "Manis / Dalam" },
  { type: "deep_talk", name: "Kartu Ngobrol", desc: "Tarik satu kartu dan ngobrol, tanpa skor.", tag: "Dalam" },
  { type: "would_you_rather", name: "Pilih Mana?", desc: "Pilih A atau B diam-diam, lalu buka bersama.", tag: "Seru" },
  { type: "most_likely", name: "Siapa yang Paling Mungkin?", desc: "Tebak siapa yang paling mungkin, reveal bareng.", tag: "Seru / Manis" },
  { type: "know_me", name: "Seberapa Kenal Aku?", desc: "Satu menjawab jujur, satu menebak. Seberapa kenal kalian?", tag: "Seru / Manis" },
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
                <Button className="mt-3" disabled={busy} onClick={() => start(g.type!)}>Main</Button>
              ) : (
                <p className="mt-3 text-sm font-semibold">Segera Hadir</p>
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
