// Health check for the container and for uptime monitoring.
// Reports whether the database answers and whether the reference data is
// set up. It reveals no data and needs no sign in.

import { getPrismaClient } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  const client = (await getPrismaClient()) as { $queryRawUnsafe?: (q: string) => Promise<unknown>; platform?: { count: () => Promise<number> } } | null;
  if (!client || !client.$queryRawUnsafe || !client.platform) {
    return Response.json({ ok: false, database: "not connected" }, { status: 503 });
  }
  try {
    await client.$queryRawUnsafe("SELECT 1");
    const platforms = await client.platform.count();
    const ready = platforms > 0;
    return Response.json({ ok: ready, database: "connected", referenceData: ready ? "ready" : "missing, run npm run db:setup" }, { status: ready ? 200 : 503 });
  } catch {
    return Response.json({ ok: false, database: "not answering" }, { status: 503 });
  }
}
