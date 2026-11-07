// Read only share link. The reviewer sees the pack and can comment. They
// cannot edit the original. The token is resolved by hash only; the plain
// token is never stored.

"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { ShareView } from "../../../components/share/ShareView";
import { Alert, PageShell } from "../../../components/ui";
import { siteCopy } from "../../../config/site-copy";
import { getDemoPack, resolveDemoShareLink } from "../../../lib/demo-store";
import type { ListingPack } from "@listing-photos-generator/builder/browser";

export default function SharePage() {
  const params = useParams();
  const token = typeof params.token === "string" ? params.token : "";
  const [state, setState] = useState<"loading" | "ready" | "not-found" | "unusable">("loading");
  const [pack, setPack] = useState<ListingPack | null>(null);
  const [viewCount, setViewCount] = useState(0);
  const [reason, setReason] = useState<string | null>(null);

  useEffect(() => {
    if (token === "") {
      setState("not-found");
      return;
    }
    let live = true;
    void resolveDemoShareLink(token).then((resolved) => {
      if (!live) {
        return;
      }
      if (!resolved) {
        setState("not-found");
        return;
      }
      if (!resolved.usable) {
        setReason(resolved.reason);
        setState("unusable");
        return;
      }
      const found = getDemoPack(resolved.link.listingPackId);
      if (!found) {
        setState("not-found");
        return;
      }
      setPack(found);
      setViewCount(resolved.link.viewCount);
      setState("ready");
    });
    return () => {
      live = false;
    };
  }, [token]);

  if (state === "loading") {
    return (
      <PageShell title={siteCopy.share.heading}>
        <p>Loading the shared pack...</p>
      </PageShell>
    );
  }
  if (state === "not-found" || !pack) {
    return (
      <PageShell title={siteCopy.share.heading}>
        <Alert tone="danger">{siteCopy.share.notFound}</Alert>
      </PageShell>
    );
  }
  if (state === "unusable") {
    return (
      <PageShell title={siteCopy.share.heading}>
        <Alert tone="warning">{reason ?? siteCopy.share.revoked}</Alert>
      </PageShell>
    );
  }
  return (
    <PageShell title={siteCopy.share.heading} intro={siteCopy.share.readOnlyNote}>
      <ShareView pack={pack} viewCount={viewCount} />
    </PageShell>
  );
}
