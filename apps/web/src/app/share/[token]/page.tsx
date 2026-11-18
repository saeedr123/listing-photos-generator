// Read only share link. The reviewer sees the pack and can comment. They
// cannot edit the original. The token is resolved by hash only, on the
// server; the plain token is never stored.

import { ShareView } from "../../../components/share/ShareView";
import { Alert, PageShell } from "../../../components/ui";
import { siteCopy } from "../../../config/site-copy";
import { viewSharedPack } from "../../seller/actions";

export const dynamic = "force-dynamic";

export default async function SharePage({ params }: { params: { token: string } }) {
  const view = await viewSharedPack(params.token);
  if (!view.usable && view.purpose !== null) {
    return (
      <PageShell title={siteCopy.share.heading}>
        <Alert tone="warning">{view.reason ?? siteCopy.share.revoked}</Alert>
      </PageShell>
    );
  }
  if (!view.pack) {
    return (
      <PageShell title={siteCopy.share.heading}>
        <Alert tone="danger">{siteCopy.share.notFound}</Alert>
      </PageShell>
    );
  }
  return (
    <PageShell title={siteCopy.share.heading} intro={siteCopy.share.readOnlyNote}>
      <ShareView token={params.token} pack={view.pack} viewCount={view.viewCount} canComment={view.purpose === "review"} initialComments={view.comments} />
    </PageShell>
  );
}
