"use client";

import { SellerProfileForm } from "../../../components/SellerProfileForm";
import { PageShell } from "../../../components/ui";
import { siteCopy } from "../../../config/site-copy";
import { getDemoSession } from "../../../lib/demo-store";

export default function ProfilePage() {
  const session = getDemoSession();
  if (!session) {
    return (
      <PageShell title={siteCopy.profile.heading} intro="Sign in to see your seller profile.">
        <a href="/auth/login">Sign in</a>
      </PageShell>
    );
  }
  return (
    <PageShell title={siteCopy.profile.heading} intro={siteCopy.profile.help}>
      <SellerProfileForm userId={session.id} />
    </PageShell>
  );
}
