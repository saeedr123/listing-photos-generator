# Auth, Listing Photos Generator

Status: local build only. Email sign-in now, Google sign-in next.
No live OAuth is claimed anywhere in this file or in the code.

Style rule: no em dashes and no en dashes anywhere in this file.

## What exists now

- Code: `packages/auth/src/` with `auth-service.ts`, `password.ts`
  (scrypt hashing), `sessions.ts` (opaque sessions, tokens stored as
  hashes only), `stub-provider.ts` (local development stub, in memory
  only), `prisma-provider.ts` (Prisma backed provider against the
  User, AuthIdentity, and Session tables), `config.ts`,
  `rate-limit.ts`, `audit.ts`, and `permissions.ts`.
- Email sign-in is the only sign-in method that works. Register and
  login use email plus password, with rate limits and an audit log.
- Tests: `packages/auth/src/__tests__/auth.test.ts`. Run with
  `node --test packages/auth/src/__tests__/auth.test.ts` from the
  repo root, or `npm test --prefix packages/auth`.

## Google sign-in: placeholder only

Code: `packages/auth/src/google-provider.ts`. It is a placeholder
stub, disabled unless both `GOOGLE_CLIENT_ID` and
`GOOGLE_CLIENT_SECRET` are set in env.

- When either is absent, `GoogleProviderStub.beginSignIn()` and
  `handleCallback()` return `{ ok: false, error:
  "google_not_configured" }` with a plain message naming the two env
  vars and the callback path. Email sign-in still works.
- When both are set, both methods still return `{ ok: false, error:
  "google_not_implemented" }`, because the OAuth code exchange and
  the Google identity link are not built yet. No sign-in happens,
  no user is redirected to Google, and no code is exchanged.
- The callback path is `/auth/google/callback`, exported as
  `GOOGLE_CALLBACK_PATH`. The Google OAuth client must list it as an
  authorized redirect URI, relative to the app origin, for example
  `https://example.com/auth/google/callback` once the app origin is
  known. The app origin itself is not set in this build.
- The file never contains a real client id or secret, never reads a
  credential value into a returned object, never calls the network,
  and never stores a token. There is no `fetch(` call in it.

## What Saeed must add himself

Saeed adds the Google OAuth credentials himself. Nobody else puts
them in code, config, or docs. The steps:

1. Open Google Cloud Console and create an OAuth client for a web
   application, or reuse the one he already has for NVConsult if
   that is the right client for this product. That choice is his.
2. In that OAuth client, add an authorized redirect URI for the
   callback path: the app origin plus `/auth/google/callback`.
3. Set two env vars on the server, with the values from that OAuth
   client only:
   - `GOOGLE_CLIENT_ID`: the OAuth client id.
   - `GOOGLE_CLIENT_SECRET`: the OAuth client secret.
   An optional third var, `GOOGLE_REDIRECT_URI`, holds the full
   redirect URI when the app origin is fixed. When it is not set,
   the callback path is used with the app origin.
4. Tell the build that the values are set. Nothing else changes:
   the stub reads them from env at run time.

No step above turns Google sign-in on by itself. After the values
are set, the stub reports `google_not_implemented` until the OAuth
code exchange and the Google identity link are built in a separate
step. That build must create or link an AuthIdentity row with
provider `google`, verify the email, and create a session through
AuthService, the same way the email provider does. It must never
store a Google token in plain text and must never log one.

## Server login action and first admin seed (local proof only)

Added 2026-11-11. Login is now server auth, not the demo store.

- Code: `apps/web/src/lib/server-auth.ts` builds the singleton
  AuthService on PrismaAuthProvider. `apps/web/src/app/auth/actions.ts`
  holds the `loginAction` and `logoutAction` server actions.
  `apps/web/src/components/AuthForms.tsx` LoginForm calls
  `loginAction`; the register form still uses the demo store, and
  register via a server action is a follow-up, not this increment.
- Delegate resolution: if `DATABASE_URL` is set and a generated
  PrismaClient can be imported, the service uses that real client.
  Otherwise it uses the DEVELOPMENT ONLY in memory delegate in
  server-auth.ts, which implements the full PrismaAuthClient
  contract (createUser, findUserByEmail, findUserById,
  verifyCredentials via scrypt, createSession, findSessionByToken,
  revokeSession, revokeAllSessions, markEmailVerified,
  changePassword, setRole) with the same PrismaAuthProvider code
  the real client uses. The in memory delegate loses everything on
  restart and must never be used as production auth. Its store lives
  on globalThis, not on the delegate instance, because Next.js
  bundles server-auth.ts into more than one server chunk (the login
  action chunk and the admin page chunk each carry their own copy
  of the module), and a plain instance field would give the action
  and the layout two different user stores, so a login would never
  be visible to the admin gate. The LocalStubAuthProvider is not
  used for server auth at all.
- `loginAction` verifies credentials through AuthService.login,
  sets the httpOnly `lpg_session` cookie (secure in production,
  sameSite lax, path `/`, max age from the session expiry), and
  redirects to the `next` parameter (default `/dashboard`, same
  origin paths only). On failure it returns the same generic
  message, "Email or password is incorrect.", whether the email
  exists or the password is wrong. `logoutAction` revokes the
  session through AuthService.logout and clears the cookie.
- The admin layout (`apps/web/src/app/admin/layout.tsx`) now passes
  the AuthService from server-auth.ts as the resolver to
  `getCurrentAdminUser`, and has a sign out form calling
  `logoutAction`. Middleware stays a cookie presence first layer
  only: it cannot check the role, because it cannot reach the
  database from the edge, and AuthService must not be passed into
  edge middleware. The layout stays authoritative.
- First admin seed, local proof only: when the delegate is the in
  memory one, the user store is empty, and both
  `LPG_SEED_ADMIN_EMAIL` and `LPG_SEED_ADMIN_PASSWORD` are set in
  env, that admin user is created once on first use (createUser
  then setRole to admin). No credential is hard coded, committed,
  or logged anywhere. Unset the vars and no user is seeded.
- Prisma generate, tried once 2026-11-11: `npx prisma generate`
  failed with exit code 1, `Error: aborted` with code `ECONNRESET`
  while downloading engines, after installing `@prisma/client`
  6.19.3 into package.json. No generated client exists
  (`node_modules/.prisma` is absent), so no live database test is
  claimed and the delegate pattern above stands.
- Tests: `tests/server-auth.test.ts` (login creates a session and
  getSession resolves the admin user, wrong password fails with the
  generic message, a forged token resolves to null, logout revokes
  the session, plus the seed behaviour and the full provider
  contract). Live server proof:
  `scripts/verify-server-login.sh`.

## Still open

- The OAuth code exchange, the Google identity link, and the
  sign-in button and callback route in the app. None of these exist
  yet, by design: email sign-in is the working method until Ali
  decides Google sign-in goes ahead.
- Whether the Google OAuth client is shared with NVConsult or a
  separate client for this product. That is Saeed's decision.
