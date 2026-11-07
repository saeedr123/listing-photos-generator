"use client";

import { useState } from "react";
import { PageShell } from "../../../components/ui";
import { deleteDemoPack, getDemoSession, listDemoPacks } from "../../../lib/demo-store";

export default function PacksPage() {
  const session = getDemoSession();
  const [packs, setPacks] = useState(() => (session ? listDemoPacks(session.id) : []));

  if (!session) {
    return (
      <PageShell title="Saved listing packs" intro="Sign in to see your listing packs.">
        <a href="/auth/login">Sign in</a>
      </PageShell>
    );
  }

  function remove(packId: string) {
    deleteDemoPack(packId);
    setPacks(listDemoPacks(session?.id as string));
  }

  return (
    <PageShell title="Saved listing packs" intro="Pack history lives here: every pack, its status, and its exports.">
      {packs.length === 0 ? (
        <p>No listing packs yet. Start your first pack and finish it in one session.</p>
      ) : (
        <ul>
          {packs.map((pack) => (
            <li key={pack.id} style={{ marginBottom: 12 }}>
              <a href={"/builder/" + pack.id}>{pack.productFacts.productName === "" ? "(Untitled pack)" : pack.productFacts.productName}</a> {pack.status}
              {pack.hasSampleContent ? " Sample content" : ""} Created {pack.createdAt}{" "}
              <button type="button" onClick={() => remove(pack.id)}>
                Delete
              </button>
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
