"use client";

import { useSpace } from "./space-provider";

export function PresenceDot({ memberId, name }: { memberId: string; name: string }) {
  const { online, me } = useSpace();
  const isOn = memberId === me?.memberId || online.has(memberId);
  return (
    <span className="inline-flex items-center gap-1.5 text-sm">
      <span aria-hidden className={`size-2.5 rounded-full ${isOn ? "bg-success" : "bg-plum/30"}`} />
      {name}
      <span className="sr-only">{isOn ? "online" : "offline"}</span>
      <span aria-hidden className="text-plum/60">{isOn ? "Online" : "Offline"}</span>
    </span>
  );
}
