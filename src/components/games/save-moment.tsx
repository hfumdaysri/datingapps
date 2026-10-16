"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { api, ApiError } from "@/lib/client/api";

/** Explicit save only. Nothing is stored until the player confirms, and the partner must approve before it is shared. */
export function SaveMoment({
  dateId, questionId, initial, onClose,
}: { dateId: string; questionId?: string; initial: string; onClose: () => void }) {
  const qc = useQueryClient();
  const [text, setText] = useState(initial);
  const save = useMutation({
    mutationFn: () => api("/api/moments/propose", { dateId, questionId, content: text }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["moments"] });
      onClose();
    },
  });
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-plum/40 p-4 sm:items-center">
      <div role="dialog" aria-modal="true" aria-labelledby="save-title" className="w-full max-w-md rounded-card bg-white p-5 shadow-lg">
        <h2 id="save-title" className="font-serif text-xl">Simpan momen</h2>
        <p className="mt-1 text-sm text-plum/70">Baru tersimpan bersama setelah pasanganmu menyetujui.</p>
        <label htmlFor="moment" className="mt-3 block font-semibold">Catatan</label>
        <textarea id="moment" value={text} maxLength={500} rows={4} onChange={(e) => setText(e.target.value)}
          className="mt-1 w-full rounded-xl border border-plum/30 p-3" />
        {save.error && (
          <p role="alert" className="mt-2 text-danger">{save.error instanceof ApiError ? save.error.message : "Gagal menyimpan."}</p>
        )}
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>Batal</Button>
          <Button disabled={save.isPending || text.trim().length === 0} onClick={() => save.mutate()}>Simpan</Button>
        </div>
      </div>
    </div>
  );
}
