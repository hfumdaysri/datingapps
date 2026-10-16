import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { Card } from "@/components/card";
import { Button } from "@/components/ui/button";
import { daysTogether } from "@/lib/domain/dates";
import { getMe } from "@/lib/server/session";

export const dynamic = "force-dynamic";

const DEMO_ANNIVERSARY = "2025-01-01"; // only used when Supabase is not configured

const tiles = [
  { href: "/games", title: "Games", desc: "Pilih permainan untuk malam ini" },
  { href: "/dates", title: "Dates", desc: "Sesi kencan kalian" },
  { href: "/memories", title: "Memories", desc: "Momen yang kalian simpan" },
  { href: "/settings", title: "Settings", desc: "Nama, warna, kunci pemulihan" },
];

export default async function HomePage() {
  const me = await getMe();
  const days = daysTogether(me?.space.anniversaryDate ?? DEMO_ANNIVERSARY);
  return (
    <AppShell title="Home">
      <Card className="mb-4 text-center">
        <p className="text-sm text-plum/70">{me ? `Halo, ${me.displayName}` : "Mode demo"}</p>
        <p className="font-serif text-5xl text-rose">{days}</p>
        <p>hari bersama</p>
      </Card>
      <Button disabled className="mb-6 w-full">
        Start Our Date
      </Button>
      <ul className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-2">
        {tiles.map((t) => (
          <li key={t.href}>
            <Link
              href={t.href}
              className="block min-h-24 rounded-card bg-white p-4 ring-1 ring-blush/60 hover:ring-rose"
            >
              <span className="block font-serif text-xl">{t.title}</span>
              <span className="text-sm text-plum/80">{t.desc}</span>
            </Link>
          </li>
        ))}
      </ul>
    </AppShell>
  );
}
