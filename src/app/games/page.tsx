import { AppShell } from "@/components/app-shell";
import { Card } from "@/components/card";

const games = [
  { name: "Truth or Truth", desc: "Pilih satu dari dua jalur pertanyaan, jawab bergantian.", tag: "Sweet / Deep", soon: false },
  { name: "Deep Talk Cards", desc: "Tarik satu kartu dan ngobrol, tanpa skor.", tag: "Deep", soon: false },
  { name: "Would You Rather?", desc: "Pilih A atau B diam-diam, lalu buka bersama.", tag: "Fun", soon: false },
  { name: "Who's More Likely To?", desc: "Tebak siapa yang paling mungkin, reveal bareng.", tag: "Fun / Sweet", soon: false },
  { name: "How Well Do You Know Me?", desc: "Seberapa kenal kamu dengan pasanganmu.", tag: "Coming Next", soon: true },
];

export default function GamesPage() {
  return (
    <AppShell title="Games">
      <ul className="flex flex-col gap-3">
        {games.map((g) => (
          <li key={g.name}>
            <Card className={g.soon ? "opacity-70" : undefined}>
              <h2 className="font-serif text-xl">{g.name}</h2>
              <p className="text-plum/80">{g.desc}</p>
              <p className="mt-2 text-sm text-plum/70">{g.tag} · ~5-15 menit</p>
            </Card>
          </li>
        ))}
      </ul>
    </AppShell>
  );
}
