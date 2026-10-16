import { AppShell } from "@/components/app-shell";
import { Card } from "@/components/card";
import { QuestionSettings } from "@/components/question-settings";
import { getPublicEnv } from "@/lib/env";
import { getMe } from "@/lib/server/session";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const me = await getMe();
  return (
    <AppShell title="Pengaturan">
      <div className="flex flex-col gap-4">
        {me && (
          <Card>
            <h2 className="font-serif text-xl">{me.space.name}</h2>
            <p>Kamu masuk sebagai <strong>{me.displayName}</strong> (kursi {me.seat}).</p>
            <p className="mt-2 text-sm text-plum/70">
              Kunci pemulihan hanya ditampilkan sekali saat bergabung. Jika hilang, minta pemilik membuat undangan baru lewat server.
            </p>
          </Card>
        )}
        {getPublicEnv() && <QuestionSettings />}
      </div>
    </AppShell>
  );
}
