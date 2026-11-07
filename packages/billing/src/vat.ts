// VAT handling and invoice generation, placeholder design.
// As a Czech trade business, VAT handling and invoice generation for EU
// customers belong in the payment design. The exact VAT treatment must be
// confirmed with Ali's accountant before launch. Do NOT invent a tax rate
// in code, comments, or docs as if it were advice. The VAT rate stays null
// until the accountant confirms it. An invoice draft therefore carries a
// null VAT rate and a null VAT amount, and its total equals its subtotal
// until the accountant confirms the treatment.

import type { PlansConfig } from "./types.ts";

export interface VatTreatment {
  vat_rate: number | null;
  status: "awaiting_accountant_confirmation";
  note: string;
}

export function getVatTreatment(config: PlansConfig): VatTreatment {
  return {
    vat_rate: config.billing.vat_rate,
    status: "awaiting_accountant_confirmation",
    note: config.billing.vat_note,
  };
}

export interface InvoiceDraft {
  invoice_number: string;
  status: "draft_awaiting_vat_confirmation";
  currency: string | null;
  subtotal_minor: number;
  vat_rate: number | null;
  vat_amount_minor: number | null;
  total_minor: number;
  customer_country: string | null;
  customer_vat_id: string | null;
  note: string;
}

// Build an invoice draft. With the VAT rate unconfirmed, the VAT amount is
// null and the total is the subtotal. No rate is assumed, and no invoice is
// marked final. A final invoice needs the accountant confirmed rate, a
// real invoice number sequence, and a live payment record.
export function buildInvoiceDraft(opts: {
  subtotal_minor: number;
  currency: string | null;
  customer_country?: string | null;
  customer_vat_id?: string | null;
}): InvoiceDraft {
  return {
    invoice_number: "DRAFT-NOT-ISSUED",
    status: "draft_awaiting_vat_confirmation",
    currency: opts.currency,
    subtotal_minor: opts.subtotal_minor,
    vat_rate: null,
    vat_amount_minor: null,
    total_minor: opts.subtotal_minor,
    customer_country: opts.customer_country ?? null,
    customer_vat_id: opts.customer_vat_id ?? null,
    note: "VAT treatment not confirmed. Confirm the exact VAT treatment with the accountant before launch. Do not issue this draft as a final invoice.",
  };
}
