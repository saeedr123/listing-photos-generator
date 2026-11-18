import { getCurrentUser } from "@/lib/current-user";
import { AccountClient } from "./AccountClient";

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const user = await getCurrentUser();
  return <AccountClient email={user ? user.email : null} />;
}
