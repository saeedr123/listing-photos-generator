// Content governance: niche packs and platform packs show source, last
// verified date, and reviewer. Out of date packs are flagged for review,
// never silently shown as current. A pack is flagged when its last
// verified date is missing, or when it is older than the review interval
// the admin sets (reviewIntervalDays is admin configuration, not a
// hard coded rule in this file; callers pass it in).

export interface GovernedPack {
  id: string;
  slug: string;
  name: string;
  kind: "niche-pack" | "platform-pack";
  source: string | null;
  sourceNotes: string | null;
  lastVerifiedDate: string | null;
  reviewer: string | null;
  status: string;
}

export interface GovernanceCheck {
  packId: string;
  needsReview: boolean;
  reasons: string[];
  daysSinceVerified: number | null;
}

export function checkPackGovernance(pack: GovernedPack, reviewIntervalDays: number, today: string = new Date().toISOString().slice(0, 10)): GovernanceCheck {
  const reasons: string[] = [];
  if (!pack.source && !pack.sourceNotes) reasons.push("No source recorded.");
  if (!pack.reviewer) reasons.push("No reviewer recorded.");
  let daysSinceVerified: number | null = null;
  if (!pack.lastVerifiedDate) {
    reasons.push("No last verified date recorded.");
  } else {
    const verified = new Date(pack.lastVerifiedDate + "T00:00:00Z").getTime();
    const now = new Date(today + "T00:00:00Z").getTime();
    daysSinceVerified = Math.floor((now - verified) / (1000 * 60 * 60 * 24));
    if (daysSinceVerified > reviewIntervalDays) {
      reasons.push("Last verified " + daysSinceVerified + " days ago, over the " + reviewIntervalDays + " day review interval.");
    }
    if (daysSinceVerified < 0) reasons.push("Last verified date is in the future.");
  }
  return { packId: pack.id, needsReview: reasons.length > 0, reasons, daysSinceVerified };
}

export function packsNeedingReview(packs: GovernedPack[], reviewIntervalDays: number, today?: string): GovernanceCheck[] {
  return packs.map((p) => checkPackGovernance(p, reviewIntervalDays, today)).filter((c) => c.needsReview);
}
