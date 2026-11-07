// Usage analytics and export monitoring. Aggregated counts only, never
// product content, never listing copy, never personal product text.
// Events carry ids and counts only: template id, mockup id, platform id,
// pack version, plan, format, status, duration. No product content is
// read for analytics, and no event in this file holds it.

export type AnalyticsEventType =
  | "signup"
  | "trial_started"
  | "trial_converted"
  | "cancelled"
  | "pack_created"
  | "export_ready"
  | "export_failed"
  | "ai_credit_used"
  | "ai_suggestion_accepted"
  | "ai_suggestion_rejected"
  | "share_link_viewed";

export interface AnalyticsEvent {
  id: string;
  type: AnalyticsEventType;
  userId: string;
  templateId: string | null;
  mockupId: string | null;
  platformId: string | null;
  packVersionId: string | null;
  format: string | null;
  plan: string | null;
  durationMs: number | null;
  createdAt: string;
}

export interface UsageSummary {
  signups: number;
  trialStarts: number;
  trialConversions: number;
  cancellations: number;
  packsCreated: number;
  exportsReady: number;
  exportsFailed: number;
  aiCreditsUsed: number;
  aiSuggestionsAccepted: number;
  aiSuggestionsRejected: number;
  shareLinkViews: number;
  trialConversionRate: number | null;
  exportSuccessRate: number | null;
}

export function summarizeUsage(events: AnalyticsEvent[]): UsageSummary {
  const count = (type: AnalyticsEventType): number => events.filter((e) => e.type === type).length;
  const signups = count("signup");
  const trialStarts = count("trial_started");
  const trialConversions = count("trial_converted");
  const exportsReady = count("export_ready");
  const exportsFailed = count("export_failed");
  const totalExports = exportsReady + exportsFailed;
  return {
    signups,
    trialStarts,
    trialConversions,
    cancellations: count("cancelled"),
    packsCreated: count("pack_created"),
    exportsReady,
    exportsFailed,
    aiCreditsUsed: count("ai_credit_used"),
    aiSuggestionsAccepted: count("ai_suggestion_accepted"),
    aiSuggestionsRejected: count("ai_suggestion_rejected"),
    shareLinkViews: count("share_link_viewed"),
    trialConversionRate: trialStarts > 0 ? trialConversions / trialStarts : null,
    exportSuccessRate: totalExports > 0 ? exportsReady / totalExports : null,
  };
}

export interface ExportBreakdown {
  byTemplate: Record<string, { ready: number; failed: number; successRate: number | null }>;
  byMockup: Record<string, { ready: number; failed: number; successRate: number | null }>;
  byFormat: Record<string, { ready: number; failed: number; successRate: number | null }>;
  averageExportTimeMs: number | null;
  totalExports: number;
}

function rate(ready: number, failed: number): number | null {
  return ready + failed > 0 ? ready / (ready + failed) : null;
}

export function exportMonitoring(events: AnalyticsEvent[]): ExportBreakdown {
  const exports = events.filter((e) => e.type === "export_ready" || e.type === "export_failed");
  const group = (key: (e: AnalyticsEvent) => string | null): Record<string, { ready: number; failed: number; successRate: number | null }> => {
    const out: Record<string, { ready: number; failed: number }> = {};
    for (const e of exports) {
      const k = key(e) ?? "unknown";
      out[k] = out[k] ?? { ready: 0, failed: 0 };
      if (e.type === "export_ready") out[k].ready += 1;
      else out[k].failed += 1;
    }
    const withRate: Record<string, { ready: number; failed: number; successRate: number | null }> = {};
    for (const [k, v] of Object.entries(out)) withRate[k] = { ...v, successRate: rate(v.ready, v.failed) };
    return withRate;
  };
  const durations = exports.map((e) => e.durationMs).filter((d): d is number => d !== null);
  return {
    byTemplate: group((e) => e.templateId),
    byMockup: group((e) => e.mockupId),
    byFormat: group((e) => e.format),
    averageExportTimeMs: durations.length > 0 ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : null,
    totalExports: exports.length,
  };
}

// Churn, aggregated: cancellations divided by trial conversions plus
// cancellations is not a churn rate on its own, so this file reports the
// raw counts and leaves any rate to a period with a known subscriber
// base. Callers must not present a churn percentage from these counts
// alone.
export function churnCounts(events: AnalyticsEvent[]): { cancellations: number; trialConversions: number } {
  return { cancellations: events.filter((e) => e.type === "cancelled").length, trialConversions: events.filter((e) => e.type === "trial_converted").length };
}
