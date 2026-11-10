// First layer of the /admin gate. Redirects requests with no session
// cookie to the login page. This layer cannot check the role: it cannot
// reach the database from the edge, and it must not trust a cookie value
// on its own. The admin layout (apps/web/src/app/admin/layout.tsx) is
// authoritative: it resolves the session through AuthService, applies
// isAdmin and canManageAdminContent, and refuses signed in non-admin
// users with a 403 panel. A forged or stale cookie passes this file and
// is still refused there.

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SESSION_COOKIE_NAME, adminLoginUrl } from "./lib/admin-gate";

export function middleware(request: NextRequest): NextResponse {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (!token) {
    return NextResponse.redirect(new URL(adminLoginUrl(request.nextUrl.pathname), request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
