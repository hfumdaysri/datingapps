"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/card";
import { api } from "@/lib/client/api";

type Moment = { id: string; content: string; createdAt: string; prompt: string | null; status: "shared" | "waiting" | "needs_approval"; mine: boolean };

export function MemoriesClient() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["moments"], queryFn: () => api<Moment[]>("/api/moments"), refetchInterval: 8000 });
  const approve = useMutation({
    mutationFn: (momentId: string) => api("/api/moments/approve", { momentId }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["moments"] }),
  });
  if (isLoading) return <p role="status">Memuat…</p>;
  if (!data?.length) {
    return <Card>Belum ada momen. Saat bermain, tekan <strong>Simpan momen</strong> untuk menyimpan sesuatu yang ingin kalian ingat.</Card>;
  }
  const date = (iso: string) => new Intl.DateTimeFormat("id-ID", { timeZone: "Asia/Jakarta", dateStyle: "medium" }).format(new Date(iso));
  return (
    <ul className="flex flex-col gap-3">
      {data.map((m) => (
        <li key={m.id}>
          <Card>
            <p className="text-sm text-plum/70">{date(m.createdAt)}</p>
            <p className="mt-1">{m.status === "needs_approval" ? "Pasanganmu ingin menyimpan sebuah momen. Setujui untuk melihatnya bersama." : m.content}</p>
            {m.status === "needs_approval" && (
              <Button className="mt-3" disabled={approve.isPending} onClick={() => approve.mutate(m.id)}>Setujui</Button>
            )}
            {m.status === "waiting" && <p className="mt-2 text-sm text-plum/70">Menunggu persetujuan pasanganmu</p>}
          </Card>
        </li>
      ))}
    </ul>
  );
}
