import { redirect } from "next/navigation";
import { getPublicEnv } from "@/lib/env";
import { getMe } from "@/lib/server/session";
import { AppNav } from "./app-nav";

/** Guards every in-app page: unbound visitors are redirected, nothing private is rendered. */
export async function AppShell({ title, children }: { title: string; children: React.ReactNode }) {
  if (getPublicEnv() && !(await getMe())) redirect("/");
  return (
    <div className="min-h-dvh pb-24 md:pb-8">
      <AppNav />
      <main className="mx-auto w-full max-w-3xl px-4 py-6">
        <h1 className="mb-6 font-serif text-3xl text-plum">{title}</h1>
        {children}
      </main>
    </div>
  );
}
