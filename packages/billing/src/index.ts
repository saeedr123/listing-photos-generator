// Billing package entry point.
// Entitlements, trial, billing terms disclosure, Stripe development stub,
// VAT placeholder, cancel and refund flows, and renewal reminders.
// All values come from config/plans.json or admin. No price, tax rate,
// trial length, or limit is hard coded in application code.

export { BillingError, newFreeAccount } from "./types.ts";
export type {
  AccountBillingState,
  BillingConfig,
  BillingInterval,
  ChangeLogEntry,
  PlanConfig,
  PlanEntitlements,
  PlansConfig,
  PlanSlug,
  SubscriptionState,
  SubscriptionStatus,
  TrialConfig,
  TrialState,
  TrialStatus,
} from "./types.ts";
export {
  getFreePlan,
  getPlan,
  getPremiumPlan,
  loadPlansConfig,
  plansConfigPath,
  recordEntitlementChange,
  validatePlansConfig,
} from "./config.ts";
export {
  aiCreditsRemaining,
  canCreatePack,
  canDownloadPack,
  canEditPack,
  canExportFormat,
  canUseMockup,
  canUseTemplate,
  canViewPack,
  getEntitlements,
  isTrialActive,
  resolveEffectivePlan,
  storageLimit,
} from "./entitlements.ts";
export type { EffectivePlan, EffectivePlanSource, GateResult } from "./entitlements.ts";
export { expireTrial, hasUsedTrial, startTrial, trialAllowances, trialEndDate } from "./trial.ts";
export type { TrialEndResult } from "./trial.ts";
export {
  annualSaving,
  buildBillingTerms,
  formatMinorAmount,
  renewalDate,
} from "./disclosure.ts";
export type { AnnualSaving, BillingTerms } from "./disclosure.ts";
export {
  billingProviderName,
  createBillingProvider,
  DEFAULT_BILLING_PROVIDER_NAME,
  listBillingProviders,
  registerBillingProvider,
  resolveBillingProvider,
} from "./provider.ts";
export type {
  BillingProvider,
  BillingProviderFactory,
  CheckoutRequest,
  CheckoutResult,
} from "./provider.ts";
export {
  STUB_NOTICE,
  StripeStubProvider,
  defaultBillingProvider,
  newStubId,
} from "./stripe-stub.ts";
export { buildInvoiceDraft, getVatTreatment } from "./vat.ts";
export type { InvoiceDraft, VatTreatment } from "./vat.ts";
export {
  canCancelWithoutSupport,
  cancelSubscription,
  hasAccessUntilPeriodEnd,
  newRefundId,
  refundPolicyPlaceholder,
  requestRefund,
} from "./cancel-refund.ts";
export type { CancelResult, RefundRequest } from "./cancel-refund.ts";
export { newReminderId, scheduleRenewalReminder, scheduleTrialEndReminder } from "./reminders.ts";
export type { ReminderRecord } from "./reminders.ts";
export {
  PrismaBillingStore,
  InMemoryBillingStore,
  createBillingStore,
} from "./prisma-billing-store.ts";
export type {
  AiCreditBalance,
  AiUsageRecord,
  BillingStore,
  BillingStoreOptions,
  EntitlementRecord,
  GrantEntitlementInput,
  PrismaAICreditLedgerRow,
  PrismaAIUsageLogRow,
  PrismaBillingClient,
  PrismaSubscriptionRow,
  PrismaTrialRow,
  PrismaUserEntitlementRow,
  RecordAiUsageInput,
  SavedRefundRequest,
  TrialAllowances,
} from "./prisma-billing-store.ts";
export {
  EMAIL_API_KEY_ENV_VAR,
  buildRenewalReminderEmail,
  buildTrialEndReminderEmail,
  createEmailHook,
  describeEmailConfig,
  listEmailProviders,
  loadEmailHookConfig,
  registerEmailProvider,
  sendReminderEmail,
} from "./email-hook.ts";
export type {
  AccountEmailKind,
  EmailHook,
  EmailHookConfig,
  EmailMessage,
  EmailSendAttempt,
  EmailSendFunction,
  ReminderSendOutcome,
} from "./email-hook.ts";
export {
  getDecision,
  loadFeatureDecisions,
  featureDecisionsPath,
  mockupPricing,
  reconciliationMode,
  describeFeatureDecisions,
  trialShape,
  validateFeatureDecisions,
} from "./feature-decisions.ts";
export type {
  FeatureDecision,
  FeatureDecisionsConfig,
  MockupPricing,
  ReconciliationMode,
  TrialShape,
} from "./feature-decisions.ts";
