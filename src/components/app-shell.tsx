import { redirect } from "next/navigation";
import { getPublicEnv } from "@/lib/env";
import { getMe } from "@/lib/server/session";
import { AppNav } from "./app-nav";
import { ConnectionBanner } from "./connection-banner";
import { SpaceShell } from "./space-shell";

/** Guards every in-app page: unbound visitors are redirected, nothing private is rendered. */
export async function AppShell({ title, children }: { title: string; children: React.ReactNode }) {
  const configured = getPublicEnv() !== null;
  const me = configured ? await getMe() : null;
  if (configured && !me) redirect("/");

  const body = (
    <div className="min-h-dvh pb-24 md:pb-8">
      <AppNav />
      {me && <ConnectionBanner />}
      <main className="mx-auto w-full max-w-3xl px-4 py-6">
        <h1 className="mb-6 font-serif text-3xl text-plum">{title}</h1>
        {children}
      </main>
    </div>
  );
  return me ? <SpaceShell me={me}>{body}</SpaceShell> : body;
}
