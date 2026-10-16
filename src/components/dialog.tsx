"use client";

import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";

export function ConfirmDialog({
  open, title, body, confirmLabel, onConfirm, onCancel,
}: { open: boolean; title: string; body: string; confirmLabel: string; onConfirm: () => void; onCancel: () => void }) {
  const ref = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    ref.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onCancel();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onCancel]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-plum/40 p-4 sm:items-center">
      <div role="dialog" aria-modal="true" aria-labelledby="dlg-title" className="w-full max-w-sm rounded-card bg-white p-5 shadow-lg">
        <h2 id="dlg-title" className="font-serif text-xl">{title}</h2>
        <p className="mt-2">{body}</p>
        <div className="mt-4 flex justify-end gap-2">
          <Button ref={ref} variant="ghost" onClick={onCancel}>Batal</Button>
          <Button onClick={onConfirm}>{confirmLabel}</Button>
        </div>
      </div>
    </div>
  );
}
