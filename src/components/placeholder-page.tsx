import { AppShell } from "./app-shell";
import { Card } from "./card";

export function PlaceholderPage({ title, message }: { title: string; message: string }) {
  return (
    <AppShell title={title}>
      <Card>{message}</Card>
    </AppShell>
  );
}
