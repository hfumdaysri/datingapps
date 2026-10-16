"use client";

import Link from "next/link";
import { useDataRequest } from "@/app/settings/settings-client";

/** Beranda banner: the partner is told when the other asks to delete shared data. */
export function DeletionNotice() {
  const { data } = useDataRequest();
  if (!data || data.requestedByMe) return null;
  return (
    <p role="alert" className="mb-4 rounded-card bg-blush/40 p-4">
      {data.requesterName} meminta menghapus data bersama.{" "}
      <Link href="/settings" className="font-semibold underline">Lihat di Pengaturan</Link>
    </p>
  );
}
