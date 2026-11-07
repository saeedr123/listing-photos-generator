export default function AdminSubscriptions() {
  return (
    <div>
      <h2 className="text-xl font-semibold">Subscription management</h2>
      <p className="mt-2 text-sm text-slate-600">No subscriptions are listed yet. Stripe is on hold, no Stripe product exists, and no payment has been taken. Subscription rows live in the database (Subscription table) once billing is connected. Cancel in the account, in a small number of clicks, with immediate confirmation and end of period access, is the required behaviour when billing lands; it is not built here because there is no payment provider yet.</p>
      <p className="mt-2 text-sm text-slate-600">Refunds are handled through the payment provider and admin, with a log, once a provider is chosen. The refund policy wording is a placeholder in docs/deployment.md until Ali and a legal check approve it.</p>
    </div>
  );
}
