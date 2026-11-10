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

## Still open

- The OAuth code exchange, the Google identity link, and the
  sign-in button and callback route in the app. None of these exist
  yet, by design: email sign-in is the working method until Ali
  decides Google sign-in goes ahead.
- Whether the Google OAuth client is shared with NVConsult or a
  separate client for this product. That is Saeed's decision.
