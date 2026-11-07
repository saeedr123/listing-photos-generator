export default function AdminExports() {
  return (
    <div>
      <h2 className="text-xl font-semibold">Export monitoring</h2>
      <p className="mt-2 text-sm text-slate-600">Export success rate, failure rate by template, mockup, and format, and average export time, without logging product content. No exports have been recorded yet, so there is no rate to show. Export failures are logged with template id, pack id, pack version, format, and error type, never with the seller product text or images.</p>
      <p className="mt-2 text-sm text-slate-600">When exports run, the breakdown appears here from the same aggregated events used on the Analytics page.</p>
    </div>
  );
}
