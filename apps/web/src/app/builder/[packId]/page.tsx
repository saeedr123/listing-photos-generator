// Existing pack. Only the owner can open it here. A reviewer uses the
// read only share link instead. Loaded on the server.

import { BuilderClient } from "../../../components/builder/BuilderClient";
import { Alert, PageShell } from "../../../components/ui";
import { siteCopy } from "../../../config/site-copy";
import { getCurrentUser } from "../../../lib/current-user";
import { loadPackEditorAction } from "../../seller/actions";

export const dynamic = "force-dynamic";

export default async function BuilderPackPage({ params }: { params: { packId: string } }) {
  const session = await getCurrentUser();
  if (!session) {
    return (
      <PageShell title={siteCopy.builder.heading} intro={siteCopy.errors.notSignedIn}>
        <a href={"/auth/login?next=" + encodeURIComponent("/builder/" + params.packId)}>Sign in</a>
      </PageShell>
    );
  }
  const loaded = await loadPackEditorAction(params.packId);
  if (!loaded.ok) {
    return (
      <PageShell title={siteCopy.builder.heading}>
        <Alert tone="danger">{loaded.message}</Alert>
      </PageShell>
    );
  }
  return (
    <PageShell title={siteCopy.builder.heading} intro="Guided prompts, a product check, and a preview that updates live.">
      <BuilderClient pack={loaded.value.pack} userId={session.id} versions={loaded.value.versions} />
    </PageShell>
  );
}
