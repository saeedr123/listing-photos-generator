import { getCurrentUser } from "../../lib/current-user";
import { NewPackClient } from "./NewPackClient";

export const dynamic = "force-dynamic";

export default async function NewBuilderPage() {
  const user = await getCurrentUser();
  return <NewPackClient signedIn={user !== null} />;
}
