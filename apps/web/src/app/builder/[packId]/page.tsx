// Existing pack. Only the owner can open it here. A reviewer uses the
// read only share link instead.

"use client";

import { useParams } from "next/navigation";
import { BuilderClient } from "../../../components/builder/BuilderClient";
import { Alert, PageShell } from "../../../components/ui";
import { siteCopy } from "../../../config/site-copy";
import { getDemoPack, getDemoSession } from "../../../lib/demo-store";

export default function BuilderPackPage() {
  const params = useParams();
  const packId = typeof params.packId === "string" ? params.packId : "";
  const session = getDemoSession();
  const pack = packId === "" ? null : getDemoPack(packId);

  if (!session) {
    return (
      <PageShell title={siteCopy.builder.heading} intro={siteCopy.errors.notSignedIn}>
        <a href="/auth/login">Sign in</a>
      </PageShell>
    );
  }
  if (!pack) {
    return (
      <PageShell title={siteCopy.builder.heading}>
        <Alert tone="danger">{siteCopy.errors.packNotFound}</Alert>
      </PageShell>
    );
  }
  if (pack.userId !== session.id) {
    return (
      <PageShell title={siteCopy.builder.heading}>
        <Alert tone="danger">You can only open your own listing packs.</Alert>
      </PageShell>
    );
  }

  return (
    <PageShell title={siteCopy.builder.heading} intro="Guided prompts, a product check, and a preview that updates live.">
      <BuilderClient pack={pack} userId={session.id} />
    </PageShell>
  );
}
