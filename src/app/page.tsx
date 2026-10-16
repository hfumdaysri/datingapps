import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/card";
import { getPublicEnv } from "@/lib/env";
import { getMe } from "@/lib/server/session";

export const dynamic = "force-dynamic";

export default async function Welcome() {
  const configured = getPublicEnv() !== null;
  if (configured && (await getMe())) redirect("/home");
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-6 px-4 py-10">
      <div className="text-center">
        <h1 className="font-serif text-4xl text-plum">Our Little Space</h1>
        <p className="mt-2 text-plum/80">A little place for us, no matter the distance.</p>
      </div>
      <Card className="flex flex-col gap-3">
        <p>Selamat datang kembali. Buka tautan undangan, atau masuk dengan kunci pemulihanmu.</p>
        <Button asChild variant="secondary">
          <Link href="/recover">Aku punya kunci pemulihan</Link>
        </Button>
        {!configured && (
          <Button asChild variant="ghost">
            <Link href="/home">Lihat tampilan demo</Link>
          </Button>
        )}
      </Card>
      {!configured && (
        <p role="status" className="text-center text-sm text-plum/70">
          Supabase belum dikonfigurasi, jadi aplikasi berjalan dalam mode demo tanpa data pribadi.
        </p>
      )}
    </main>
  );
}
