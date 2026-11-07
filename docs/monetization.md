# Listing Photos Generator: Monetization

Status: Phase 2 Wave 2, 2026-11-07. Local build only. No live site. No spending. No live charges. No real Stripe keys. Price, Stripe account, VAT treatment, and refund policy final wording are open decisions for Ali. Nothing in this file sets a price, a tax rate, or a refund window.

Source rules: PROMPT.md section 16 (free and premium model) and section 23 (open decisions), docs/architecture.md section 9, docs/database-design.md section 10, docs/competitor-research.md section 3.3 (billing complaints). Prices in the competitor research are secondary source only and are not quoted here as verified prices. No competitor price is used as this product's price.

Style rule: no em dashes and no en dashes anywhere in this file.

## 1. What was built

Code: `packages/billing/src/` with `types.ts`, `config.ts`, `entitlements.ts`, `trial.ts`, `disclosure.ts`, `stripe-stub.ts`, `vat.ts`, `cancel-refund.ts`, `reminders.ts`, and `index.ts`.

Config: `config/plans.json`, values only. Price fields stay null until Ali decides them.

Pages: `apps/web/src/app/account/page.tsx` and `apps/web/src/app/checkout/page.tsx`. Both show the billing terms in plain language before trial start and before any payment.

Tests: `tests/billing.test.mjs`, 18 tests, 18 pass, 0 fail, run with `node --test tests/billing.test.mjs`.

Database mapping, no schema change in this wave: Plan, PlanEntitlement, UserEntitlement, Subscription, and Trial models in `prisma/schema.prisma` already hold the fields this module uses. The billing module works on plain state objects with the same field names, so the server wiring can pass Prisma rows straight in. No new table was added here, and no migration is needed for this wave. Invoice and refund request records are in memory logs in the stub; a server wiring step must persist them to the database before launch, and that step is listed in section 8.

## 2. Entitlements

All entitlements are configurable in admin, never hard coded in application code. The single source is `config/plans.json`, mirrored in the Plan and PlanEntitlement tables. Admin changes go through `recordEntitlementChange`, which appends a change log entry with date, actor, field, old value, new value, and reason, and bumps the config version. No entitlement change is silent.

Free, starting defaults from PROMPT.md section 16:

- Basic listing pack builder.
- A complete, watermark free, commercially usable first pack free. The free limit is a count: `max_listing_packs` is 1. It is not a watermark and not a licence trap.
- Selected templates from the version 1 set of 10. `template_access` is `selected`. The selected list itself, `selected_template_slugs`, is null in the shipped config because the free template set is to be confirmed in admin, not invented. Until admin sets it, the gate refuses free template use with a plain message instead of guessing a list.
- Basic AI copy credits, with a clear monthly credit count shown in the dashboard. `ai_credits_per_month` is null because the monthly count is to be confirmed, not invented. The dashboard shows "AI credit limit not set in admin yet" instead of a number.
- Standard JPG exports at Etsy size. `export_formats` is `["jpg"]`.
- Limited pack storage. `max_storage_packs` is null because the storage limit is to be confirmed, not invented.
- Basic customization: colours and fonts within the free template set. `customization` is `basic`.
- Platform access in version 1 is Etsy only. `platform_access` is `["etsy"]`.

Premium, starting defaults from PROMPT.md section 16:

- Access to all 10 version 1 templates, and later all templates as they are added. `template_access` is `all`.
- Full mockup library, including premium frames. `mockup_access` is `full`. A basic frame is never labelled premium.
- Advanced AI generation, higher AI usage limits, and niche specific tailoring. `ai_credits_per_month` is null because the amount is to be confirmed, not invented. `customization` is `advanced`.
- More pack storage, configurable. `max_storage_packs` is null because the amount is to be confirmed, not invented.
- More platforms as they are added, starting with eBay, then Amazon. Version 1 is Etsy only, digital products only. eBay and Amazon are later phases, not version 1.
- Advanced customization, and premium pack bundles (images plus title, description, tags, and checklist as one pack). `premium_pack_bundles` is true.
- Priority for new templates, mockups, niche packs, and platform packs as they are released. `priority_access` is true.

## 3. Trial

Starting defaults, configurable in admin: 7 days, no card required to start, one trial per account. All three values live in `config/plans.json` under `trial`, and `trialAllowances` reads them from config.

- Duration: 7 days. `duration_days` is 7.
- Eligibility: one trial per account. `one_per_account` is true. `startTrial` throws `trial_already_used` on a second attempt, including after a trial has ended. Admin can set additional eligibility rules later, for example one trial per payment method or per email domain block for abuse. Those rules are not built yet.
- Card: no card required to start. `requires_card` is false.
- Trial features: full premium features during the trial, within a stated AI credit allowance and export allowance set in admin. Both allowances are null in the shipped config because the amounts are to be confirmed, not invented.
- Conversion rules: at trial end the user downgrades to Free automatically. `expireTrial` does this. With no card taken, there is no charge. With a card taken, there is still no charge unless a separate, clear authorization was given. Trial start alone is never authorization. The function takes `chargeAuthorized` as a separate option, default false.
- The user keeps viewing and downloading packs they created. `canViewPack` and `canDownloadPack` return allowed for the owner on any plan, during a trial, after a trial ends, after cancelling, and after a subscription lapses. This rule is unconditional. No plan check, no trial check, and no payment check can turn it off.
- Premium editing, premium templates, premium mockups, and premium exports lock until the user subscribes. `canEditPack` enforces this, and its refusal message says the pack can still be viewed and downloaded.
- The system must never lock a user out of viewing their own listing pack. That rule is tested: after trial end, viewing and downloading stay allowed while premium editing is locked.

## 4. Billing terms disclosure

Trial length, what happens at trial end, monthly and annual prices, renewal date, and cancel method must be shown before trial start and before any payment, in plain language, on the checkout and account pages. `buildBillingTerms` in `packages/billing/src/disclosure.ts` builds those lines from config, and both pages render them.

- Trial: 7 days, no card required, one per account, downgrade to Free at trial end, no charge without clear authorization, viewing and downloading kept.
- Monthly price: not set yet. Annual price: not set yet. Both price fields are null in the shipped config, so the disclosure says "Price not set yet. No payment can be taken until the owner sets a price. Checkout is blocked until then." A null price is never shown as zero and never hidden.
- Renewal date: not set yet. No renewal date is shown until a price and a billing interval are set. `renewalDate` computes the next renewal from a period start and an interval (monthly adds one month, annual adds one year) once those exist.
- Cancel method: cancel any time in the account, in a small number of clicks, no support contact needed, access until the end of the current period.
- Annual saving: shown only when both prices are set. `annualSaving` returns null while either price is null. When both are set it returns the monthly equivalent (annual total divided by 12, rounded) and the total, plus the saving in minor units and percent, from config values only. The test config uses test values only to check the maths; those values are not the product price.
- No dark patterns, no hidden renewal, no pre ticked consent. The checkout consent box starts unchecked. The trial start button stays disabled until the user ticks it. The trial never converts silently: `expireTrial` downgrades to Free and charges only on a separate authorization.

## 5. Stripe: development stub only

`packages/billing/src/stripe-stub.ts` defines a `BillingProvider` interface with `createCheckoutSession` and `createSubscription`, and a `StripeStubProvider` that implements it. The stub is clearly marked `DEVELOPMENT STUB ONLY` in code, in its returned records, and on the checkout page.

- No real Stripe keys. No real charges. No live payment flow. No spending. The stub never calls the network and never stores a real payment method. Every stub result has `charge_amount_minor` 0 and `status` `stub_no_charge`.
- Monthly and annual subscriptions are supported through the interface. The billing interval is a parameter, and the annual saving is shown as monthly equivalent and total, from config values only.
- The stub blocks checkout in two cases, both tested: price null blocks checkout with "Price not set yet. Checkout is blocked." and a missing authorization blocks checkout with "No charge without authorization." A checkout needs both a set price and an explicit authorization.
- A live Stripe provider replaces this stub only after Ali decides the price, the Stripe account, and the VAT treatment, and only after a separate go ahead for payments. Real keys go in the secure secret store, never in code.
- Separate billing products per edition, even on the same Stripe account, is a design rule from PROMPT.md section 2.6. The stub records the plan slug on every checkout so the edition split can be applied when a live provider is wired in.

## 6. VAT and invoicing: placeholder, accountant confirms

As a Czech trade business, VAT handling and invoice generation for EU customers belong in the payment design. The exact VAT treatment must be confirmed with Ali's accountant before launch.

- `config/plans.json` under `billing` holds `vat_rate: null` and a note that the accountant confirms it.
- `getVatTreatment` returns the null rate with status `awaiting_accountant_confirmation`.
- `buildInvoiceDraft` builds an invoice draft with `vat_rate` null, `vat_amount_minor` null, `total_minor` equal to the subtotal, `invoice_number` `DRAFT-NOT-ISSUED`, and status `draft_awaiting_vat_confirmation`. The draft must not be issued as a final invoice.
- No tax rate is invented in code, comments, or docs as if it were advice. No rate appears anywhere in this wave. A final invoice needs the accountant confirmed rate, a real invoice number sequence, and a live payment record.

## 7. Cancel and refund

Cancel, in `packages/billing/src/cancel-refund.ts`:

- Cancel in the account, in a small number of clicks, with immediate confirmation, end of period access, and a clear record. `cancelSubscription` sets status `cancelled`, `cancel_at_period_end` true, and `cancelled_at` to now, and never shortens `current_period_end`. `hasAccessUntilPeriodEnd` checks access against the unchanged period end.
- Do not require contacting support to cancel. `canCancelWithoutSupport` returns true with that note, and the account page says so in plain words.
- The account page cancel flow is two clicks: Cancel subscription, then Confirm cancel, with a Keep my subscription option. In this build the account is a demo account with no live subscription, so the page says there is nothing to cancel and shows the flow. The record shape (cancelled date, access until date, note) is the same shape the server wiring will persist.
- After the period ends, the plan returns to Free, and the user keeps viewing and downloading packs they created.

Refunds:

- The refund policy is a placeholder before launch. `config/plans.json` holds `refund_policy_status: "placeholder"` and placeholder text that promises no refund window, amount, or condition. Final wording needs Ali and a legal check before launch.
- Refund requests go through the billing interface and admin, with a log. `requestRefund` appends a request with status `pending_admin_review` to a log passed in by the caller. The stub never pays a refund and never refuses one by itself. Admin decides, and the decision is logged.
- The account page has a refund request form. It stores the request in the demo record and shows the pending status.

## 8. Billing complaint lessons, and how this product avoids each pattern

Source: docs/competitor-research.md section 3.3 and PROMPT.md section 3.3. Review scores there are small or skewed samples, and Trustpilot skews toward billing complaints, so the patterns are treated as warnings to design against, not as proven rates.

### EverBee: silent annual renewal with a 3 day refund window

What was found: annual plans auto renew with no reminder email, and the refund window is 3 days for a monthly plan. One reviewer reported going from a monthly charge to an annual charge, and getting only a pro rated amount after cancelling 8 days after the charge, with access removed at once.

How this product avoids it:

- Renewal is never silent. A renewal reminder is scheduled before renewal. `scheduleRenewalReminder` creates a scheduled record with a scheduled date, status `scheduled`, and `sent` false. It is a record, not a real email send in this build; sending email is a separate wiring step. The reminder must state the renewal date, the price, and the cancel method. The number of days before renewal comes from admin config (`renewal_reminder_days_before`, null until set), not from a hard coded value.
- Annual pricing shows the saving clearly as monthly equivalent and total, from config values only, so a buyer sees the annual total before paying, not only a monthly figure.
- Cancelling never removes access at once. Access continues until the end of the current period, and the cancel record states the access until date.
- The refund window is not set here. The refund policy is a placeholder, and no short window is promised or hidden. The final wording needs Ali and a legal check.

### Marmalead: charged after trial or cancellation, refunds refused

What was found: reviewers from 2023 to September 2026 describe being charged after a trial or after cancelling, and two say a refund was refused within 14 days. There is no free plan.

How this product avoids it:

- No charge after a trial without a separate, clear authorization. The trial takes no card by default, and `expireTrial` downgrades to Free with no charge. Even when a card was taken, a charge needs `chargeAuthorized` true, and trial start alone is never authorization.
- No charge after cancelling. Cancelling sets `cancel_at_period_end` true and keeps access until the period end. No new charge is created by the cancel path, and the cancel record is written at cancel time so a later charge can be checked against it.
- There is a free plan, and it is genuinely useful: one complete, watermark free, commercially usable pack free, so a seller is not forced into a paid plan to use the product at all.
- Refund requests are logged with status `pending_admin_review` and a reason, so a refused refund cannot happen silently. The final refund policy wording is still open and must be published before launch.

### Canva: charged after believed cancellation, refund refused

What was found: in a 100 review sample, billing appeared in 11 reviews and cancellation in 10, and every billing or cancellation review was 1 or 2 stars. Themes: charged after believing they had cancelled, refund refused, cancellation did not go through first time, paused subscription resuming and charging, support hard to reach. Canva Help Centre states that in most cases Canva subscriptions are not refundable.

How this product avoids it:

- Cancellation gives immediate confirmation on the page, with the cancelled date and the access until date, and a clear record. A cancellation that did not go through cannot look like it did: if there is no active subscription, `cancelSubscription` throws `no_active_subscription` instead of showing a false confirmation.
- Cancellation is in the account, in a small number of clicks, with no support contact needed. Support being hard to reach cannot block a cancel, because support is not in the cancel path.
- There is no pause and resume path in this build, so no paused subscription can resume and charge. If a pause feature is added later, it must state in plain words what happens on resume, and it must never resume charging silently.
- The refund policy is published as a placeholder before launch and must be finalised with a legal check. It does not state that subscriptions are not refundable. Refund requests are logged for admin review with a reason and a timestamp.

## 9. What is still open

- Price: monthly and annual premium price, and currency. All price fields are null. Ali decides. No checkout can run until he sets them.
- Stripe account: owner, business details, and live provider wiring. The stub must be replaced by a separate decision, with real keys in the secure secret store.
- VAT treatment: exact treatment confirmed with Ali's accountant before launch. Rate stays null until then. Final invoice numbering and issue flow are not built.
- Refund policy final wording, with a legal check for GDPR and consumer rights. The placeholder must not be published as the final policy.
- Free template set: `selected_template_slugs` is null until admin sets the free template list.
- AI credit counts: free monthly count, premium monthly count, and trial allowances are null until admin sets them.
- Renewal reminder timing: `renewal_reminder_days_before` is null until admin sets it. Reminder sending (real email) is not built; the reminder is a scheduled record only.
- Server wiring: account and checkout pages use the demo store and browser local storage in this build. Production wiring must read Plan, Subscription, and Trial rows, persist invoice drafts, refund requests, cancel records, and reminder records, and send the renewal reminder. The billing module functions are written to take those rows as plain state objects.
- Trial eligibility extras: one trial per payment method or per email domain block for abuse are admin options in PROMPT.md section 16 and are not built yet.
- Trial shape and mockup pricing are open decisions to test with real sellers, per PROMPT.md section 23: whether a 7 day trial, no card, one per account is the right trial for a listing tool, or whether the trial should be per listing pack, and whether mockups should be free for all or a premium feature.
