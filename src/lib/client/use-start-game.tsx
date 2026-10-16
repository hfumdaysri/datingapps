"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ConfirmDialog } from "@/components/dialog";
import { api, ApiError, GAME_LABEL, type DateInfo, type GameState, type GameType } from "./api";
import { normalizePrefs, settingsFor, type Prefs } from "./prefs";

/** Starts (or joins) the date, then the game. Switching an unfinished game asks for confirmation first. */
export function useStartGame() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState<{ type: GameType; dateId: string } | null>(null);

  async function launch(type: GameType, dateId: string, replace: boolean) {
    const prefs = normalizePrefs(await api<Partial<Prefs>>("/api/preferences"));
    const state = await api<GameState>("/api/games/start", {
      dateId, gameType: type, settings: settingsFor(type, prefs), replace,
    });
    router.push(`/play/${state.game.id}`);
  }

  async function start(type: GameType, dateIdHint?: string) {
    setBusy(true);
    setError(null);
    try {
      const date = dateIdHint ? { id: dateIdHint } : await api<DateInfo>("/api/date/start", {});
      try {
        await launch(type, date.id, false);
      } catch (e) {
        if (e instanceof ApiError && e.code === "game_active") setConfirm({ type, dateId: date.id });
        else throw e;
      }
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Tidak bisa memulai permainan.");
    } finally {
      setBusy(false);
    }
  }

  const dialog = (
    <ConfirmDialog
      open={!!confirm}
      title="Ganti permainan?"
      body={confirm ? `Permainan yang sedang berjalan akan diakhiri dan diganti dengan ${GAME_LABEL[confirm.type]}. Pasanganmu akan melihat perubahannya.` : ""}
      confirmLabel="Ganti"
      onCancel={() => setConfirm(null)}
      onConfirm={async () => {
        const c = confirm;
        setConfirm(null);
        if (!c) return;
        setBusy(true);
        try {
          await launch(c.type, c.dateId, true);
        } catch (e) {
          setError(e instanceof ApiError ? e.message : "Tidak bisa mengganti permainan.");
        } finally {
          setBusy(false);
        }
      }}
    />
  );

  return { start, busy, error, dialog };
}
