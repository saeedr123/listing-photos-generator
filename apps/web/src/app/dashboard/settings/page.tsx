import { getCurrentUser } from "../../../lib/current-user";
import { getServerAuthService } from "../../../lib/server-auth";
import type { AuditEvent } from "../../../../../../packages/auth/src/types.ts";
import { SettingsClient } from "./SettingsClient";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const user = await getCurrentUser();
  let audit: AuditEvent[] = [];
  if (user) {
    const store = (await getServerAuthService()).auditStore as { listForActor?: (id: string, limit: number) => Promise<AuditEvent[]>; list: (limit: number) => Promise<AuditEvent[]> };
    audit = store.listForActor ? await store.listForActor(user.id, 50) : (await store.list(500)).filter((event) => event.actorId === user.id).slice(0, 50);
  }
  return <SettingsClient signedIn={user !== null} audit={audit} />;
}
