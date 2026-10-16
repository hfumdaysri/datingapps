"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/card";
import { useActiveDate, useStartDate } from "@/components/date-card";
import { GAME_LABEL } from "@/lib/client/api";

export function DatesClient() {
  const { data: date, isLoading } = useActiveDate();
  const start = useStartDate();
  if (isLoading) return <p role="status">Memuat…</p>;
  if (!date) {
    return (
      <Card className="flex flex-col gap-3">
        <p>Belum ada ngedate yang berlangsung. Mulai satu, lalu pasanganmu bisa bergabung dari layarnya.</p>
        <Button disabled={start.isPending} onClick={() => start.mutate()}>Mulai Ngedate</Button>
      </Card>
    );
  }
  return (
    <Card className="flex flex-col gap-3">
      <h2 className="font-serif text-xl">Ngedate berlangsung</h2>
      <p>
        Dimulai {new Intl.DateTimeFormat("id-ID", { timeZone: "Asia/Jakarta", dateStyle: "medium", timeStyle: "short" }).format(new Date(date.startedAt))}
      </p>
      {date.activeGame && <p>Sedang bermain: {GAME_LABEL[date.activeGame.type]}</p>}
      <Button asChild><Link href={`/dates/${date.id}`}>Gabung Ngedate</Link></Button>
    </Card>
  );
}
