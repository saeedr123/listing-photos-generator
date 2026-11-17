// Admin check for API routes. The admin layout guards pages. API routes
// are reached directly, so each one runs this check itself. It reuses the
// same gate as the layout: a signed out or non admin caller gets no data.

import { cookies } from "next/headers";
import { decideAdminAccess, getCurrentAdminUser } from "./admin-gate";
import { getServerAuthService } from "./server-auth";

export type AdminApiAccess = { ok: true; actor: string } | { ok: false; response: Response };

export async function requireAdminApi(): Promise<AdminApiAccess> {
  const authService = await getServerAuthService();
  const user = await getCurrentAdminUser(cookies(), authService);
  const access = decideAdminAccess(user);
  if (!access.allowed) {
    const status = access.reason === "signed_out" ? 401 : 403;
    const error = access.reason === "signed_out" ? "Sign in as an administrator." : "This action is for administrators only.";
    return { ok: false, response: Response.json({ ok: false, error }, { status }) };
  }
  return { ok: true, actor: access.user.email };
}
