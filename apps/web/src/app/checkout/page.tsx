// Checkout page: billing terms before trial start and before any payment.
// The terms are shown in plain language from config/plans.json. The price
// is null in the shipped config, so checkout is blocked with a clear
// message and no payment form is shown. No real charge, no Stripe key, no
// live payment flow. The trial start needs a separate, unchecked consent
// box: no pre ticked consent, no silent conversion. The trial ends with a
// downgrade to Free, with no charge if no card was taken.

"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { getPlans } from "@/lib/config";
import { Alert, Button, Card, PageShell } from "../../components/ui";

function CheckoutInner() {
  const searchParams = useSearchParams();
  const plans = getPlans();
  const planSlug = searchParams.get("plan") ?? "premium";
  const interval = searchParams.get("interval") ?? "monthly";
  const plan = plans.plans.find((candidate) => candidate.slug === planSlug) ?? plans.plans.find((candidate) => candidate.slug === "premium");
  const [understood, setUnderstood] = useState(false);
  const [trialStarted, setTrialStarted] = useState<string | null>(null);

  const priceSet =
    plan?.price_amount_minor !== null ||
    plan?.price_monthly_amount_minor !== null ||
    plan?.price_annual_amount_minor !== null;

  const trialEnd = trialStarted
    ? new Date(new Date(trialStarted).getTime() + plans.trial.duration_days * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
    : null;

  function startTrial(): void {
    if (!understood) {
      return;
    }
    const now = new Date().toISOString();
    if (typeof window !== "undefined") {
      window.localStorage.setItem("lpg.demo.billing.trial", JSON.stringify({ startedAt: now, planSlug: plan?.slug ?? "premium" }));
    }
    setTrialStarted(now);
  }

  return (
    <PageShell title="Checkout" intro="Read the terms first. Nothing is charged on this page.">
      <Card title="Billing terms, before you start">
        <p>
          Trial: {plans.trial.duration_days} days, {plans.trial.requires_card ? "card required to start" : "no card required to start"},
          one trial per account. Full premium features during the trial, within the AI credit allowance and export allowance set in admin.
        </p>
        <p>
          At trial end you downgrade to Free automatically, with no charge if no card was taken, and with a charge only after clear
          authorization if a card was taken. You keep viewing and downloading packs you created. Premium editing, premium templates,
          premium mockups, and premium exports lock until you subscribe.
        </p>
        <p>
          {priceSet
            ? "Monthly price and annual price are set in admin. Annual shows the saving as monthly equivalent and total."
            : "Monthly price: not set yet. Annual price: not set yet. No payment can be taken until the owner sets a price."}
        </p>
        <p>Renewal date: not set yet. No renewal date is shown until a price and a billing interval are set. A renewal reminder is scheduled before renewal.</p>
        <p>
          Cancel: cancel any time in your account, in a small number of clicks. You do not need to contact support to cancel.
          Cancelling keeps your access until the end of the current period, then your plan returns to Free.
        </p>
        <p>Refund policy: {plans.billing.refund_policy_text}</p>
        <p>VAT: {plans.billing.vat_note}</p>
        <p>Plan: {plan?.name ?? "Premium"}. Billing interval chosen: {interval}.</p>
      </Card>

      {trialStarted ? (
        <Alert tone="success">
          Trial started on {trialStarted.slice(0, 10)}. It ends on {trialEnd}. At trial end you downgrade to Free automatically, with no
          charge, because no card was taken. You can cancel the trial any time in your account.
        </Alert>
      ) : (
        <Card title="Start the free trial">
          {priceSet ? (
            <p>Price is set. Payment is still a development stub in this build: no real charge is made here.</p>
          ) : (
            <Alert tone="warning">
              Checkout is blocked: price not set yet. No payment can be taken until the owner sets a price. The free trial below needs no
              card and no payment.
            </Alert>
          )}
          <label style={{ display: "block", marginTop: 12 }}>
            <input type="checkbox" checked={understood} onChange={(event) => setUnderstood(event.target.checked)} />{" "}
            I understand the trial is {plans.trial.duration_days} days, it ends with a downgrade to Free, and no charge happens without
            clear authorization.
          </label>
          <p style={{ marginTop: 12 }}>
            <Button onClick={startTrial} disabled={!understood}>
              Start {plans.trial.duration_days} day free trial, no card required
            </Button>
          </p>
          <p>The consent box above starts unchecked. Nothing starts until you tick it and press the button.</p>
        </Card>
      )}

      <p>
        <a href="/account">Back to account</a>
      </p>
    </PageShell>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={<p>Loading checkout terms.</p>}>
      <CheckoutInner />
    </Suspense>
  );
}
