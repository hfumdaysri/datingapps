"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/card";
import { ConfirmDialog } from "@/components/dialog";
import { RecoveryKeyPanel } from "@/components/recovery-key-panel";
import { api, ApiError, GAME_LABEL, type GameType } from "@/lib/client/api";
import { TRUTH_CATEGORIES, DEEP_CATEGORIES } from "@/lib/client/prefs";
import { categoryLabel } from "@/lib/client/labels";

const errMsg = (e: unknown) => (e instanceof ApiError ? e.message : "Terjadi kesalahan.");
const field = "min-h-11 w-full rounded-xl border border-plum/30 bg-white px-3";

export function RenameSection({ current }: { current: string }) {
  const [name, setName] = useState(current);
  const rename = useMutation({ mutationFn: () => api("/api/me/rename", { name }) });
  return (
    <Card>
      <h2 className="mb-2 font-serif text-xl">Namamu</h2>
      <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); rename.mutate(); }}>
        <label htmlFor="nick" className="sr-only">Nama tampilan</label>
        <input id="nick" className={field} value={name} maxLength={40} onChange={(e) => setName(e.target.value)} />
        <Button type="submit" disabled={rename.isPending || name.trim().length === 0}>Simpan</Button>
      </form>
      {rename.isSuccess && <p role="status" className="mt-2 text-success">Tersimpan. Muat ulang halaman untuk melihat di mana-mana.</p>}
      {rename.error && <p role="alert" className="mt-2 text-danger">{errMsg(rename.error)}</p>}
    </Card>
  );
}

export function RecoverySection() {
  const [confirm, setConfirm] = useState(false);
  const rotate = useMutation({ mutationFn: () => api<{ recoveryKey: string }>("/api/recovery/rotate", {}) });
  if (rotate.data) return <RecoveryKeyPanel recoveryKey={rotate.data.recoveryKey} />;
  return (
    <Card>
      <h2 className="mb-1 font-serif text-xl">Kunci pemulihan</h2>
      <p className="text-plum/80">
        Dipakai untuk masuk dari perangkat baru. Buat kunci baru kalau kamu merasa kuncimu bocor atau hilang catatannya. Kunci lama langsung tidak berlaku.
      </p>
      <Button className="mt-3" variant="secondary" onClick={() => setConfirm(true)}>Buat kunci baru</Button>
      {rotate.error && <p role="alert" className="mt-2 text-danger">{errMsg(rotate.error)}</p>}
      <ConfirmDialog open={confirm} title="Buat kunci pemulihan baru?" confirmLabel="Buat"
        body="Kunci yang lama tidak bisa dipakai lagi. Pastikan kamu langsung menyimpan yang baru."
        onCancel={() => setConfirm(false)} onConfirm={() => { setConfirm(false); rotate.mutate(); }} />
    </Card>
  );
}

type Custom = { id: string; gameType: GameType; category: string; prompt: string; optionA: string | null; optionB: string | null; mine: boolean };

export function CustomQuestionsSection() {
  const qc = useQueryClient();
  const list = useQuery({ queryKey: ["custom"], queryFn: () => api<Custom[]>("/api/custom-questions") });
  const [gameType, setGameType] = useState<GameType>("truth_or_truth");
  const [category, setCategory] = useState("Fun");
  const [prompt, setPrompt] = useState("");
  const [a, setA] = useState("");
  const [b, setB] = useState("");
  const add = useMutation({
    mutationFn: () => api("/api/custom-questions", { gameType, category, prompt, optionA: a || undefined, optionB: b || undefined }),
    onSuccess: () => { setPrompt(""); setA(""); setB(""); qc.invalidateQueries({ queryKey: ["custom"] }); },
  });
  const remove = useMutation({
    mutationFn: (id: string) => api("/api/custom-questions/remove", { id }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["custom"] }),
  });
  const cats = gameType === "truth_or_truth" ? TRUTH_CATEGORIES : gameType === "deep_talk" ? DEEP_CATEGORIES : null;
  const isWyr = gameType === "would_you_rather";

  return (
    <Card>
      <h2 className="mb-1 font-serif text-xl">Pertanyaan buatan sendiri</h2>
      <p className="mb-3 text-plum/80">Tambahkan pertanyaan kalian sendiri. Ikut muncul di permainan untuk kalian berdua.</p>
      <form className="flex flex-col gap-3" onSubmit={(e) => { e.preventDefault(); add.mutate(); }}>
        <label className="flex flex-col gap-1">
          <span className="font-semibold">Untuk game</span>
          <select className={field} value={gameType} onChange={(e) => { setGameType(e.target.value as GameType); setCategory("Fun"); }}>
            {(Object.keys(GAME_LABEL) as GameType[]).map((t) => <option key={t} value={t}>{GAME_LABEL[t]}</option>)}
          </select>
        </label>
        {cats && (
          <label className="flex flex-col gap-1">
            <span className="font-semibold">Kategori</span>
            <select className={field} value={cats.includes(category) ? category : cats[0]} onChange={(e) => setCategory(e.target.value)}>
              {cats.map((c) => <option key={c} value={c}>{categoryLabel(c)}</option>)}
            </select>
          </label>
        )}
        <label className="flex flex-col gap-1">
          <span className="font-semibold">{isWyr ? "Pembuka (misal: Pilih salah satu:)" : "Pertanyaan"}</span>
          <textarea className="rounded-xl border border-plum/30 bg-white p-3" rows={2} maxLength={300} value={prompt} onChange={(e) => setPrompt(e.target.value)} />
        </label>
        {isWyr && (
          <>
            <label className="flex flex-col gap-1"><span className="font-semibold">Pilihan A</span>
              <input className={field} maxLength={200} value={a} onChange={(e) => setA(e.target.value)} /></label>
            <label className="flex flex-col gap-1"><span className="font-semibold">Pilihan B</span>
              <input className={field} maxLength={200} value={b} onChange={(e) => setB(e.target.value)} /></label>
          </>
        )}
        {add.error && <p role="alert" className="text-danger">{errMsg(add.error)}</p>}
        {add.isSuccess && <p role="status" className="text-success">Ditambahkan.</p>}
        <Button type="submit" disabled={add.isPending || prompt.trim().length === 0 || (isWyr && (!a.trim() || !b.trim()))}>Tambah</Button>
      </form>
      {!!list.data?.length && (
        <ul className="mt-4 flex flex-col gap-2">
          {list.data.map((q) => (
            <li key={q.id} className="flex items-start justify-between gap-2 rounded-xl bg-cream p-3">
              <span>
                <span className="block text-sm text-plum/70">{GAME_LABEL[q.gameType]}</span>
                {q.prompt}{q.optionA ? ` ${q.optionA} / ${q.optionB}` : ""}
              </span>
              <Button variant="ghost" className="shrink-0" disabled={remove.isPending} onClick={() => remove.mutate(q.id)}>Hapus</Button>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

type DataRequest = { id: string; requestedByMe: boolean; requesterName: string } | null;

export function useDataRequest() {
  return useQuery({ queryKey: ["data-request"], queryFn: () => api<DataRequest>("/api/data-request"), refetchInterval: 8000 });
}

export function PrivacySection() {
  const qc = useQueryClient();
  const { data: request } = useDataRequest();
  const [confirm, setConfirm] = useState(false);
  const refresh = () => { qc.invalidateQueries(); };
  const ask = useMutation({ mutationFn: () => api("/api/data-request", {}), onSuccess: refresh });
  const respond = useMutation({
    mutationFn: (approve: boolean) => api("/api/data-request", { requestId: request!.id, approve }),
    onSuccess: refresh,
  });
  const download = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/export", { cache: "no-store" });
      if (!res.ok) throw new Error("export");
      const url = URL.createObjectURL(await res.blob());
      const link = document.createElement("a");
      link.href = url;
      link.download = "ayok-kita-ngedate-export.json";
      link.click();
      URL.revokeObjectURL(url);
    },
  });

  return (
    <Card>
      <h2 className="mb-1 font-serif text-xl">Privasi &amp; data</h2>
      <p className="text-plum/80">
        Jawaban dan obrolan tidak disimpan. Yang tersimpan hanya riwayat ngedate, kenangan yang disetujui berdua, dan pengaturan.
      </p>
      <div className="mt-3 flex flex-col gap-3">
        <Button variant="secondary" disabled={download.isPending} onClick={() => download.mutate()}>Unduh data (JSON)</Button>
        {download.isError && <p role="alert" className="text-danger">Gagal mengunduh data.</p>}

        {request ? (
          request.requestedByMe ? (
            <div role="status" className="rounded-xl bg-blush/30 p-3">
              <p>Permintaan hapus data menunggu persetujuan pasanganmu.</p>
              <Button className="mt-2" variant="ghost" disabled={respond.isPending} onClick={() => respond.mutate(false)}>Batalkan</Button>
            </div>
          ) : (
            <div role="alert" className="rounded-xl bg-blush/30 p-3">
              <p><strong>{request.requesterName}</strong> meminta menghapus semua data bersama (riwayat ngedate dan kenangan). Nama dan akses tetap ada.</p>
              <div className="mt-2 flex gap-2">
                <Button disabled={respond.isPending} onClick={() => respond.mutate(true)}>Setujui &amp; hapus</Button>
                <Button variant="secondary" disabled={respond.isPending} onClick={() => respond.mutate(false)}>Tolak</Button>
              </div>
            </div>
          )
        ) : (
          <Button variant="ghost" disabled={ask.isPending} onClick={() => setConfirm(true)}>Minta hapus data bersama</Button>
        )}
        {(ask.error || respond.error) && <p role="alert" className="text-danger">{errMsg(ask.error ?? respond.error)}</p>}
      </div>
      <ConfirmDialog open={confirm} title="Minta hapus data bersama?" confirmLabel="Kirim permintaan"
        body="Pasanganmu akan diberi tahu dan harus menyetujui sebelum riwayat ngedate dan kenangan dihapus. Ini tidak bisa dibatalkan setelah disetujui."
        onCancel={() => setConfirm(false)} onConfirm={() => { setConfirm(false); ask.mutate(); }} />
    </Card>
  );
}
