// New pack entry point. Creates a pack for the signed in seller and opens
// the six step builder. ?sample=1 starts with clearly marked sample
// content. ?name= sets the product name. No pack is created for a visitor
// who is not signed in.

"use client";

import { useEffect, useRef, useState } from "react";
import type { ListingPack } from "@listing-photos-generator/builder/browser";
import { BuilderClient } from "../../components/builder/BuilderClient";
import { Alert, PageShell } from "../../components/ui";
import { siteCopy } from "../../config/site-copy";
import { createDemoPack, getDemoSession } from "../../lib/demo-store";

export default function NewBuilderPage() {
  const session = getDemoSession();
  const [pack, setPack] = useState<ListingPack | null>(null);
  const created = useRef(false);

  useEffect(() => {
    if (!session || created.current) {
      return;
    }
    created.current = true;
    const params = new URLSearchParams(window.location.search);
    const useSample = params.get("sample") === "1";
    const name = params.get("name") ?? "";
    const createdPack = createDemoPack(
      session.id,
      {
        productName: name,
        format: "Sheets",
        formatDetail: "Google Sheets",
        tabCount: null,
        priceListMinor: null,
        priceLaunchMinor: null,
        currency: null,
        claims: [],
        features: [],
        verificationNote: "",
      },
      null,
      useSample,
    );
    setPack(createdPack);
  }, [session]);

  if (!session) {
    return (
      <PageShell title={siteCopy.builder.heading} intro={siteCopy.errors.notSignedIn}>
        <a href="/auth/register">Create an account</a> or <a href="/auth/login">sign in</a>.
      </PageShell>
    );
  }

  if (!pack) {
    return (
      <PageShell title={siteCopy.builder.heading}>
        <Alert tone="info">Starting your pack...</Alert>
      </PageShell>
    );
  }

  return (
    <PageShell title={siteCopy.builder.heading} intro="Guided prompts, a product check, and a preview that updates live.">
      <BuilderClient pack={pack} userId={session.id} />
    </PageShell>
  );
}
