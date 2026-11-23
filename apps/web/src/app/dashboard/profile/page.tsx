import { SellerProfileForm } from "../../../components/SellerProfileForm";
import { PageShell } from "../../../components/ui";
import { siteCopy } from "../../../config/site-copy";
import { getCurrentUser } from "../../../lib/current-user";
import { getSellerData } from "../../../lib/seller-data";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const session = await getCurrentUser();
  if (!session) {
    return (
      <PageShell title={siteCopy.profile.heading} intro="Sign in to see your seller profile.">
        <a href="/auth/login?next=%2Fdashboard%2Fprofile">Sign in</a>
      </PageShell>
    );
  }
  const data = await getSellerData();
  const profile = await data.profiles.find(session.id);
  return (
    <PageShell title={siteCopy.profile.heading} intro={siteCopy.profile.help}>
      <SellerProfileForm initialValues={profile?.values ?? {}} />
    </PageShell>
  );
}
