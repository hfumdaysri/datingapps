import Link from "next/link";
import { JoinClient } from "./join-client";

export const metadata = { referrer: "no-referrer" as const };

export default async function JoinPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-4 px-4">
      <h1 className="font-serif text-3xl">Terima undangan</h1>
      <JoinClient token={token ?? ""} />
      <Link href="/" className="min-h-11 py-2 text-rose underline">Kembali</Link>
    </main>
  );
}
