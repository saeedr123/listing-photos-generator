import { summarizeUsage, exportMonitoring } from "@listing-photos-generator/admin";

export default function AdminAnalytics() {
  const summary = summarizeUsage([]);
  const monitoring = exportMonitoring([]);
  return (
    <div>
      <h2 className="text-xl font-semibold">AI usage analytics</h2>
      <p className="mt-2 text-sm text-slate-600">Counts only, aggregated, without reading personal product content. No events have been recorded yet, so every count below is zero, not an estimate.</p>
      <ul className="mt-4 grid gap-3 md:grid-cols-3">
        <li className="rounded border border-slate-200 p-4">Signups: {summary.signups}</li>
        <li className="rounded border border-slate-200 p-4">Trial starts: {summary.trialStarts}</li>
        <li className="rounded border border-slate-200 p-4">Trial conversions: {summary.trialConversions}</li>
        <li className="rounded border border-slate-200 p-4">Cancellations: {summary.cancellations}</li>
        <li className="rounded border border-slate-200 p-4">Packs created: {summary.packsCreated}</li>
        <li className="rounded border border-slate-200 p-4">AI credits used: {summary.aiCreditsUsed}</li>
        <li className="rounded border border-slate-200 p-4">Exports ready: {summary.exportsReady}</li>
        <li className="rounded border border-slate-200 p-4">Exports failed: {summary.exportsFailed}</li>
        <li className="rounded border border-slate-200 p-4">Export success rate: {summary.exportSuccessRate === null ? "no exports yet" : String(summary.exportSuccessRate)}</li>
      </ul>
      <p className="mt-4 text-sm text-slate-600">Total exports in monitoring: {monitoring.totalExports}. Average export time: {monitoring.averageExportTimeMs === null ? "no exports yet" : String(monitoring.averageExportTimeMs) + " ms"}.</p>
    </div>
  );
}
