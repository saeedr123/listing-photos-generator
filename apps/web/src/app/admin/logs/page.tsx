export default function AdminLogs() {
  return (
    <div>
      <h2 className="text-xl font-semibold">System logs</h2>
      <p className="mt-2 text-sm text-slate-600">No log entries yet. Admin changes, logins, subscription changes, trial starts, and export failures are logged with time, actor, and action, without logging product content or secrets. Log entries live in the database (AdminAuditLog and SystemLog tables) once a live database is connected.</p>
    </div>
  );
}
