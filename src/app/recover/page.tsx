import Link from "next/link";
import { RecoverClient } from "./recover-client";

export default function RecoverPage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-4 px-4">
      <h1 className="font-serif text-3xl">Pulihkan akses</h1>
      <RecoverClient />
      <Link href="/" className="min-h-11 py-2 text-rose underline">Kembali</Link>
    </main>
  );
}
