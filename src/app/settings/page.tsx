import { AppShell } from "@/components/app-shell";
import { Card } from "@/components/card";
import { QuestionSettings } from "@/components/question-settings";
import { getPublicEnv } from "@/lib/env";
import { getMe } from "@/lib/server/session";
import { CustomQuestionsSection, PrivacySection, RecoverySection, RenameSection } from "./settings-client";

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
          </Card>
        )}
        {me && <RenameSection current={me.displayName} />}
        {getPublicEnv() && <QuestionSettings />}
        {me && <CustomQuestionsSection />}
        {me && <RecoverySection />}
        {me && <PrivacySection />}
      </div>
    </AppShell>
  );
}
