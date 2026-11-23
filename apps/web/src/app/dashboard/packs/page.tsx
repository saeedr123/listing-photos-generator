// Saved listing packs for the signed in seller, read on the server.

import { PageShell } from "../../../components/ui";
import { getCurrentUser } from "../../../lib/current-user";
import { getSellerData } from "../../../lib/seller-data";
import { DeletePackButton } from "./DeletePackButton";

export const dynamic = "force-dynamic";

export default async function PacksPage() {
  const session = await getCurrentUser();
  if (!session) {
    return (
      <PageShell title="Saved listing packs" intro="Sign in to see your listing packs.">
        <a href="/auth/login?next=%2Fdashboard%2Fpacks">Sign in</a>
      </PageShell>
    );
  }
  const data = await getSellerData();
  const packs = await data.packs.listPacks(session.id);
  return (
    <PageShell title="Saved listing packs" intro="Pack history lives here: every pack, its status, and its exports.">
      {packs.length === 0 ? (
        <p>No listing packs yet. Start your first pack and finish it in one session.</p>
      ) : (
        <ul>
          {packs.map((pack) => (
            <li key={pack.id} style={{ marginBottom: 12 }}>
              <a href={"/builder/" + pack.id}>{pack.productFacts.productName === "" ? "(Untitled pack)" : pack.productFacts.productName}</a> {pack.status}
              {pack.hasSampleContent ? " Sample content" : ""} Created {pack.createdAt} <DeletePackButton packId={pack.id} />
            </li>
          ))}
        </ul>
      )}
      <p>
        <a href="/builder?new=1">Start a new pack</a>
      </p>
    </PageShell>
  );
}
