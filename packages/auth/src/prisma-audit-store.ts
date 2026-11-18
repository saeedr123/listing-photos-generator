// Audit store on the SystemLog table. Each event is one row with level
// "audit", the action as the message, and the event itself as context.
// Events hold ids and counts only, never product content or secrets
// (see audit.ts), so nothing sensitive reaches this table.

import type { AuditStore } from "./audit.ts";
import type { AuditEvent } from "./types.ts";

export interface PrismaAuditClient {
  systemLog: {
    create(args: { data: Record<string, unknown> }): Promise<Record<string, unknown>>;
    findMany(args: { where: Record<string, unknown>; orderBy: Record<string, unknown>; take: number }): Promise<Record<string, unknown>[]>;
  };
}

export const AUDIT_LOG_LEVEL = "audit";

function toEvent(row: Record<string, unknown>): AuditEvent | null {
  const context = row["context_json"] as Partial<AuditEvent> | null;
  if (!context || typeof context.action !== "string") return null;
  return {
    id: String(context.id ?? row["id"]),
    actorId: context.actorId ?? null,
    actorRole: context.actorRole ?? null,
    action: context.action,
    targetType: String(context.targetType ?? ""),
    targetId: context.targetId ?? null,
    reason: context.reason ?? null,
    createdAt: new Date(String(row["created_at"])).toISOString(),
    detail: context.detail ?? {},
  };
}

export class PrismaAuditStore implements AuditStore {
  private client: PrismaAuditClient;

  constructor(client: PrismaAuditClient) {
    this.client = client;
  }

  async append(event: AuditEvent): Promise<void> {
    await this.client.systemLog.create({
      data: {
        level: AUDIT_LOG_LEVEL,
        message: event.action,
        context_json: event,
        // Only a real account id goes in user_id. Anything else stays in the context.
        user_id: event.actorId && /^[0-9a-f-]{36}$/i.test(event.actorId) ? event.actorId : null,
        created_at: new Date(event.createdAt),
      },
    });
  }

  async list(limit: number = 100): Promise<AuditEvent[]> {
    const rows = await this.client.systemLog.findMany({ where: { level: AUDIT_LOG_LEVEL }, orderBy: { created_at: "desc" }, take: limit });
    return rows.map(toEvent).filter((e): e is AuditEvent => e !== null);
  }

  /** The events one account caused, newest first. */
  async listForActor(actorId: string, limit: number = 50): Promise<AuditEvent[]> {
    const rows = await this.client.systemLog.findMany({ where: { level: AUDIT_LOG_LEVEL, user_id: actorId }, orderBy: { created_at: "desc" }, take: limit });
    return rows.map(toEvent).filter((e): e is AuditEvent => e !== null);
  }
}
