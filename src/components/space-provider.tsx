"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { createBrowserSupabase } from "@/lib/supabase/browser";

export type SpaceMe = { memberId: string; seat: "A" | "B"; displayName: string; spaceId: string; spaceName: string };
type Ctx = { me: SpaceMe | null; online: Set<string>; connected: boolean };

const SpaceContext = createContext<Ctx>({ me: null, online: new Set(), connected: true });
export const useSpace = () => useContext(SpaceContext);

/**
 * Subscribes to the private `space:<id>` channel: broadcast -> invalidate queries (state is always
 * re-fetched from the server, never taken from the message), presence -> advisory online hints.
 * Polling in the game screens keeps working if realtime is unavailable.
 */
export function SpaceProvider({ me, children }: { me: SpaceMe; children: React.ReactNode }) {
  const qc = useQueryClient();
  const [online, setOnline] = useState<Set<string>>(new Set());
  const [connected, setConnected] = useState(true);

  useEffect(() => {
    const supabase = createBrowserSupabase();
    if (!supabase) return;
    let cancelled = false;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    (async () => {
      const { data } = await supabase.auth.getSession();
      if (cancelled || !data.session) return;
      await supabase.realtime.setAuth(data.session.access_token);
      const ch = supabase.channel(`space:${me.spaceId}`, { config: { private: true, presence: { key: me.memberId } } });
      channel = ch;
      ch.on("broadcast", { event: "session-updated" }, () => {
        qc.invalidateQueries();
      })
        .on("presence", { event: "sync" }, () => {
          setOnline(new Set(Object.keys(ch.presenceState())));
        })
        .subscribe(async (status) => {
          setConnected(status === "SUBSCRIBED");
          if (status === "SUBSCRIBED") {
            await ch.track({ at: Date.now() });
            qc.invalidateQueries(); // reconcile after (re)connect
          }
        });
    })();

    const onOnline = () => qc.invalidateQueries();
    window.addEventListener("online", onOnline);
    return () => {
      cancelled = true;
      window.removeEventListener("online", onOnline);
      if (channel) supabase.removeChannel(channel);
    };
  }, [me.spaceId, me.memberId, qc]);

  const value = useMemo(() => ({ me, online, connected }), [me, online, connected]);
  return <SpaceContext.Provider value={value}>{children}</SpaceContext.Provider>;
}
