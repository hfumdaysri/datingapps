"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/card";
import { api } from "@/lib/client/api";
import { DEEP_CATEGORIES, normalizePrefs, TRUTH_CATEGORIES, type Prefs } from "@/lib/client/prefs";

function Group({ title, all, value, onChange }: { title: string; all: string[]; value: string[]; onChange: (v: string[]) => void }) {
  return (
    <fieldset className="mb-4">
      <legend className="mb-1 font-semibold">{title}</legend>
      <div className="flex flex-wrap gap-2">
        {all.map((c) => {
          const on = value.includes(c);
          return (
            <label key={c} className={`flex min-h-11 cursor-pointer items-center gap-2 rounded-full px-4 ring-1 ${on ? "bg-blush/50 ring-rose" : "bg-white ring-blush"}`}>
              <input type="checkbox" className="size-4" checked={on}
                onChange={() => {
                  const next = on ? value.filter((x) => x !== c) : [...value, c];
                  if (next.length > 0) onChange(next); // at least one category must stay enabled
                }} />
              {c}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

export function QuestionSettings() {
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["prefs"], queryFn: () => api<Partial<Prefs>>("/api/preferences") });
  const save = useMutation({
    mutationFn: (p: Prefs) => api("/api/preferences", p),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["prefs"] }),
  });
  const prefs = normalizePrefs(data);
  const set = (patch: Partial<Prefs>) => save.mutate({ ...prefs, ...patch });

  return (
    <Card>
      <h2 className="mb-3 font-serif text-xl">Kategori pertanyaan</h2>
      <Group title="Truth or Truth" all={TRUTH_CATEGORIES} value={prefs.truthCategories} onChange={(v) => set({ truthCategories: v })} />
      <Group title="Deep Talk Cards" all={DEEP_CATEGORIES} value={prefs.deepCategories} onChange={(v) => set({ deepCategories: v })} />
      <label className="flex min-h-11 cursor-pointer items-start gap-3">
        <input type="checkbox" className="mt-1.5 size-5" checked={prefs.vulnerable} onChange={(e) => set({ vulnerable: e.target.checked })} />
        <span>
          <span className="font-semibold">Aktifkan tema Vulnerable</span>
          <span className="block text-sm text-plum/70">
            Pertanyaan yang lebih pribadi, hanya di Deep Talk. Mati secara default; boleh dilewati kapan saja.
          </span>
        </span>
      </label>
      <p className="mt-3 text-sm text-plum/70" role="status">{save.isPending ? "Menyimpan…" : "Pengaturan tersimpan untuk kalian berdua."}</p>
    </Card>
  );
}
