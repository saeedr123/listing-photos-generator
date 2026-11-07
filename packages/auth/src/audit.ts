// Audit log. Every entry records time, actor, and action. Product content,
// listing copy, prompt text, and secrets are never written here. The store
// is an interface so the local stub can be swapped for the database
// AdminAuditLog table without changing callers.

import { randomUUID } from "node:crypto";
import type { AuditAction, AuditEvent, Role } from "./types.ts";

export interface AuditStore {
  append(event: AuditEvent): Promise<void>;
  list(limit?: number): Promise<AuditEvent[]>;
}

export class InMemoryAuditStore implements AuditStore {
  private events: AuditEvent[] = [];

  async append(event: AuditEvent): Promise<void> {
    this.events.push(event);
  }

  async list(limit: number = 100): Promise<AuditEvent[]> {
    return this.events.slice(-limit).reverse();
  }
}

export function newAuditEvent(input: {
  actorId: string | null;
  actorRole: Role | "system" | null;
  action: AuditAction;
  targetType: string;
  targetId: string | null;
  reason?: string | null;
  detail?: Record<string, string | number | boolean | null>;
}): AuditEvent {
  return {
    id: randomUUID(),
    actorId: input.actorId,
    actorRole: input.actorRole,
    action: input.action,
    targetType: input.targetType,
    targetId: input.targetId,
    reason: input.reason ?? null,
    createdAt: new Date().toISOString(),
    detail: input.detail ?? {},
  };
}
