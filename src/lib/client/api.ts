export class ApiError extends Error {
  constructor(public status: number, public code: string, message: string) {
    super(message);
  }
}

export async function api<T>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(path, {
    method: body === undefined ? "GET" : "POST",
    headers: body === undefined ? undefined : { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: "no-store",
  });
  const json = await res.json().catch(() => null);
  if (!res.ok) throw new ApiError(res.status, json?.error?.code ?? "error", json?.error?.message ?? "Terjadi kesalahan.");
  return json.data as T;
}

// ---- shared types (mirror the SQL projections) ----
export type Member = { id: string; seat: "A" | "B"; name: string };
export type GameType = "truth_or_truth" | "deep_talk" | "would_you_rather" | "most_likely";

export type GameState = {
  game: {
    id: string; type: GameType; status: "active" | "paused" | "finished"; version: number;
    roundNumber: number; dateId: string; turnMemberId: string | null; settings: Record<string, unknown>;
  };
  me: { memberId: string; seat: "A" | "B" };
  members: Member[];
  round: {
    id: string; number: number; phase: string; turnMemberId: string | null;
    category?: string; prompt?: string; followUp?: string | null; questionId?: string;
    choices?: Array<{ side: "left" | "right"; label: string }> | Record<string, string>;
    optionA?: string; optionB?: string; myChoice?: string | null; partnerSubmitted?: boolean; same?: boolean;
  } | null;
};

export type DateInfo = {
  id: string; status: "active" | "finished"; version: number; startedAt: string; finishedAt: string | null;
  activeGame: { id: string; type: GameType; status: string } | null;
  summary: { games: number; prompts: number; moments: number };
};

export const GAME_LABEL: Record<GameType, string> = {
  truth_or_truth: "Jujur-jujuran",
  deep_talk: "Kartu Ngobrol",
  would_you_rather: "Pilih Mana?",
  most_likely: "Siapa yang Paling Mungkin?",
};
