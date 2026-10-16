"use client";

import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/card";
import { PresenceDot } from "@/components/presence-dot";
import { api, ApiError, GAME_LABEL, type DateInfo, type Member } from "@/lib/client/api";

export function useActiveDate() {
  return useQuery({ queryKey: ["date", "active"], queryFn: () => api<DateInfo | null>("/api/date/active"), refetchInterval: 5000 });
}

export function useStartDate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api<DateInfo>("/api/date/start", {}), // idempotent
    onSuccess: (d) => qc.setQueryData(["date", "active"], d),
  });
}

/** Home hero: Start / Continue Our Date, plus advisory presence for both seats. */
export function DateCard({ members }: { members: Member[] }) {
  const { data: date, isLoading } = useActiveDate();
  const start = useStartDate();
  return (
    <Card className="mb-6 flex flex-col gap-3">
      <div className="flex flex-wrap justify-center gap-x-5 gap-y-1">
        {members.map((m) => <PresenceDot key={m.id} memberId={m.id} name={m.name} />)}
      </div>
      {date ? (
        <>
          <p className="text-center">
            {date.activeGame ? `Sedang bermain ${GAME_LABEL[date.activeGame.type]}` : "Date sedang berlangsung"}
          </p>
          <Button asChild className="w-full">
            <Link href={date.activeGame ? `/play/${date.activeGame.id}` : `/dates/${date.id}`}>Continue Our Date</Link>
          </Button>
        </>
      ) : (
        <Button className="w-full" disabled={isLoading || start.isPending} onClick={() => start.mutate()}>
          Start Our Date
        </Button>
      )}
      {start.error && <p role="alert" className="text-danger">{start.error instanceof ApiError ? start.error.message : "Gagal memulai."}</p>}
      <p className="text-center text-xs text-plum/60">Status online hanya petunjuk, bukan jaminan pasanganmu siap.</p>
    </Card>
  );
}
