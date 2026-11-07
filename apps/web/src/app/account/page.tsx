// Account page: plan, billing terms, cancel, and refund request.
// Billing terms are shown here before any payment, in plain language,
// from config/plans.json. No price is shown until the owner sets one.
// Cancel is in the account, in a small number of clicks, with immediate
// confirmation and end of period access. No support contact is needed.
// This page uses the demo store for sign in state only. Billing records
// are kept in browser local storage in this build; production wiring
// replaces them with server reads against the Subscription and Trial
// tables. No real charge happens on this page.

"use client";

import { useState } from "react";
import { getPlans } from "@/lib/config";
import { getDemoSession } from "@/lib/demo-store";
import { Alert, Button, Card, Field, PageShell } from "../../components/ui";

const BILLING_KEY = "lpg.demo.billing";

type BillingRecord = {
  cancelledAt: string | null;
  accessUntil: string | null;
  refundRequests: { id: string; reason: string; requestedAt: string; status: string }[];
};

function readRecord(): BillingRecord {
  if (typeof window === "undefined") {
    return { cancelledAt: null, accessUntil: null, refundRequests: [] };
  }
  try {
    const raw = window.localStorage.getItem(BILLING_KEY);
    if (!raw) {
      return { cancelledAt: null, accessUntil: null, refundRequests: [] };
    }
    return JSON.parse(raw) as BillingRecord;
  } catch {
    return { cancelledAt: null, accessUntil: null, refundRequests: [] };
  }
}

function writeRecord(record: BillingRecord): void {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(BILLING_KEY, JSON.stringify(record));
}

export default function AccountPage() {
  const plans = getPlans();
  const session = getDemoSession();
  const [record, setRecord] = useState<BillingRecord>(() => readRecord());
  const [refundReason, setRefundReason] = useState("");
  const [refundMessage, setRefundMessage] = useState<string | null>(null);
  const [cancelConfirm, setCancelConfirm] = useState(false);

  const freePlan = plans.plans.find((plan) => plan.slug === "free");
  const premiumPlan = plans.plans.find((plan) => plan.slug === "premium");

  if (!session) {
    return (
      <PageShell title="Account" intro="Sign in to see your plan, billing terms, and cancel options.">
        <a href="/auth/login">Sign in</a>
      </PageShell>
    );
  }

  const priceSet =
    premiumPlan?.price_amount_minor !== null ||
    premiumPlan?.price_monthly_amount_minor !== null ||
    premiumPlan?.price_annual_amount_minor !== null;

  function cancelSubscription(): void {
    // Demo record only. There is no live subscription in this build, so
    // the record shows the shape of a real cancel: immediate confirmation,
    // end of period access, and a clear record. Production wiring calls
    // cancelSubscription in packages/billing against the database.
    const now = new Date().toISOString();
    const next: BillingRecord = {
      ...record,
      cancelledAt: now,
      accessUntil: null,
    };
    writeRecord(next);
    setRecord(next);
    setCancelConfirm(false);
  }

  function submitRefund(event: React.FormEvent): void {
    event.preventDefault();
    if (refundReason.trim().length === 0) {
      return;
    }
    const request = {
      id: "refund_" + String(Date.now()),
      reason: refundReason.trim(),
      requestedAt: new Date().toISOString(),
      status: "pending_admin_review",
    };
    const next: BillingRecord = {
      ...record,
      refundRequests: [...record.refundRequests, request],
    };
    writeRecord(next);
    setRecord(next);
    setRefundReason("");
    setRefundMessage("Refund request logged for admin review. Status: pending admin review. Final refund policy wording is a placeholder until the owner confirms it with a legal check.");
  }

  return (
    <PageShell title="Account" intro={"Signed in as " + session.email + ". Your plan, billing terms, cancel, and refund request are here."}>
      <Card title="Your plan">
        <p>Current plan: Free.</p>
        <p>
          Free includes {String(freePlan?.entitlements.max_listing_packs)} complete, watermark free, commercially usable pack.
          Templates: {String(freePlan?.entitlements.template_access)}. Mockups: {String(freePlan?.entitlements.mockup_access)}.
          Export formats: {String(freePlan?.entitlements.export_formats.join(", "))}.
        </p>
        <p>
          {freePlan?.entitlements.ai_credits_per_month === null
            ? "AI credit limit not set in admin yet."
            : "AI credits per month: " + String(freePlan?.entitlements.ai_credits_per_month)}
        </p>
        <p>
          {freePlan?.entitlements.max_storage_packs === null
            ? "Pack storage limit not set in admin yet."
            : "Pack storage limit: " + String(freePlan?.entitlements.max_storage_packs) + " packs."}
        </p>
        <p>
          <a href="/checkout?plan=premium">See Premium and trial terms</a>
        </p>
      </Card>

      <Card title="Billing terms, in plain language">
        <p>
          Trial: {plans.trial.duration_days} days, {plans.trial.requires_card ? "card required to start" : "no card required to start"},
          one trial per account. At trial end you downgrade to Free automatically, with no charge if no card was taken, and with a charge
          only after clear authorization if a card was taken. You keep viewing and downloading packs you created. Premium editing,
          premium templates, premium mockups, and premium exports lock until you subscribe.
        </p>
        <p>
          {priceSet
            ? "Monthly price and annual price are set in admin."
            : "Monthly price: not set yet. Annual price: not set yet. No payment can be taken until the owner sets a price. Checkout is blocked until then."}
        </p>
        <p>Renewal date: not set yet. No renewal date is shown until a price and a billing interval are set. A renewal reminder is scheduled before renewal, as a record, not as a silent charge.</p>
        <p>
          Cancel: cancel any time in your account, in a small number of clicks. You do not need to contact support to cancel.
          Cancelling keeps your access until the end of the current period, then your plan returns to Free. You keep viewing and
          downloading packs you created.
        </p>
        <p>Refund policy: {plans.billing.refund_policy_text}</p>
        <p>VAT: {plans.billing.vat_note}</p>
      </Card>

      <Card title="Cancel subscription">
        {record.cancelledAt ? (
          <Alert tone="success">
            Cancelled on {record.cancelledAt.slice(0, 10)}. Access continues until the end of the current period
            {record.accessUntil ? " (" + record.accessUntil.slice(0, 10) + ")" : ", no period end is set in this demo account"},
            then your plan returns to Free. You keep viewing and downloading packs you created.
          </Alert>
        ) : (
          <>
            <p>No active subscription is recorded for this demo account, so there is nothing to cancel here. When a subscription is active, cancelling takes two clicks on this page: Cancel subscription, then Confirm cancel. No support contact is needed.</p>
            <p>
              <Button variant="danger" onClick={() => setCancelConfirm(true)}>Cancel subscription</Button>
            </p>
            {cancelConfirm ? (
              <Alert tone="warning">
                Confirm cancel? Your access continues until the end of the current period, then your plan returns to Free.
                <span style={{ display: "block", marginTop: 8 }}>
                  <Button variant="danger" onClick={cancelSubscription}>Confirm cancel</Button>
                  {" "}
                  <Button onClick={() => setCancelConfirm(false)}>Keep my subscription</Button>
                </span>
              </Alert>
            ) : null}
          </>
        )}
      </Card>

      <Card title="Ask for a refund">
        <p>Refund requests are logged for admin review. No refund is paid automatically. Final refund policy wording is a placeholder until the owner confirms it with a legal check.</p>
        {refundMessage ? <Alert tone="success">{refundMessage}</Alert> : null}
        <form onSubmit={submitRefund}>
          <Field label="Why are you asking for a refund?">
            <textarea
              value={refundReason}
              onChange={(event) => setRefundReason(event.target.value)}
              required
              rows={3}
              style={{ width: "100%", border: "1px solid #cbd5e1", borderRadius: 6, padding: 8 }}
            />
          </Field>
          <Button type="submit">Send refund request</Button>
        </form>
        {record.refundRequests.length > 0 ? (
          <ul>
            {record.refundRequests.map((request) => (
              <li key={request.id}>
                {request.requestedAt.slice(0, 10)} {request.status}: {request.reason}
              </li>
            ))}
          </ul>
        ) : null}
      </Card>
    </PageShell>
  );
}
