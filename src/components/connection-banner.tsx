"use client";

import { useEffect, useState } from "react";
import { useSpace } from "./space-provider";

export function ConnectionBanner({ queryFailed }: { queryFailed?: boolean }) {
  const { connected } = useSpace();
  const [offline, setOffline] = useState(false);
  useEffect(() => {
    const update = () => setOffline(!navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);
  if (!offline && !queryFailed && connected) return null;
  return (
    <p role="status" className="bg-danger/10 px-4 py-2 text-center text-sm text-danger">
      Koneksi terputus. Mencoba menyambungkan kembali…
    </p>
  );
}
