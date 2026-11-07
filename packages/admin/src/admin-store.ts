// In memory admin store. DEVELOPMENT ONLY: holds admin data in memory
// for local development and for the admin UI before a live database is
// connected. It must never hold real user data outside local
// development. Production persistence is through the Prisma tables
// (User, Subscription, Trial, AIUsageLog, ExportLog, AdminAuditLog,
// SystemLog, FeatureFlag, and the version tables). Every admin action
// is logged here with time, actor, action, and target, without product
// content and without secrets. Admin access to a user pack needs a
// recorded support reason; the permission check alone is not the log.

import type { FeatureFlag } from "./feature-flags.ts";
import type { VersionedItem } from "./versioning.ts";
import type { AnalyticsEvent } from "./analytics.ts";

export interface AdminUserRow {
  id: string;
  email: string;
  name: string | null;
  role: "user" | "admin";
  edition: string;
  plan: string;
  trialStatus: string | null;
  createdAt: string;
}

export interface AdminLogEntry {
  id: string;
  actorId: string;
  actorRole: string;
  action: string;
  targetType: string;
  targetId: string | null;
  reason: string | null;
  createdAt: string;
}

export interface SubscriptionRow {
  id: string;
  userId: string;
  planSlug: string;
  status: string;
  provider: string | null;
  cancelAtPeriodEnd: boolean;
  currentPeriodEnd: string | null;
}

export class InMemoryAdminStore {
  items: VersionedItem[] = [];
  flags: FeatureFlag[] = [];
  users: AdminUserRow[] = [];
  subscriptions: SubscriptionRow[] = [];
  events: AnalyticsEvent[] = [];
  logs: AdminLogEntry[] = [];
  private counter = 0;

  log(actorId: string, actorRole: string, action: string, targetType: string, targetId: string | null, reason: string | null = null): AdminLogEntry {
    this.counter += 1;
    const entry: AdminLogEntry = { id: "log-" + this.counter, actorId, actorRole, action, targetType, targetId, reason, createdAt: new Date().toISOString() };
    this.logs.push(entry);
    return entry;
  }

  recordEvent(event: AnalyticsEvent): void {
    this.events.push(event);
  }

  setUserRole(userId: string, role: "user" | "admin", actorId: string): AdminUserRow | null {
    const user = this.users.find((u) => u.id === userId);
    if (!user) return null;
    user.role = role;
    this.log(actorId, "admin", "admin.user_changed", "user", userId, "Role changed to " + role);
    return user;
  }

  cancelSubscription(subscriptionId: string, actorId: string): SubscriptionRow | null {
    const sub = this.subscriptions.find((s) => s.id === subscriptionId);
    if (!sub) return null;
    sub.cancelAtPeriodEnd = true;
    sub.status = "cancel_at_period_end";
    this.log(actorId, "admin", "subscription.cancelled", "subscription", subscriptionId, "Cancelled by admin, access until period end.");
    return sub;
  }
}

export function seedAdminStore(): InMemoryAdminStore {
  const store = new InMemoryAdminStore();
  store.users = [
    { id: "seed-user-1", email: "seller@example.com", name: "Seed Seller", role: "user", edition: "listing-photos-generator", plan: "free", trialStatus: null, createdAt: "2026-11-07T00:00:00.000Z" },
  ];
  return store;
}
