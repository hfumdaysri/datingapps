import type { Me } from "@/lib/server/session";
import { SpaceProvider } from "./space-provider";

/** Wraps a signed-in page with the realtime/presence provider. Server component: receives the verified member. */
export function SpaceShell({ me, children }: { me: Me; children: React.ReactNode }) {
  return (
    <SpaceProvider
      me={{ memberId: me.memberId, seat: me.seat, displayName: me.displayName, spaceId: me.space.id, spaceName: me.space.name }}
    >
      {children}
    </SpaceProvider>
  );
}
