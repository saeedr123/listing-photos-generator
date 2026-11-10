// Google sign-in placeholder, same pattern as Global Career Studio:
// auth is email only now, Google sign-in comes next, and the callback
// path is documented here so the owner can add his own client id and
// secret himself.
//
// PLACEHOLDER ONLY. No live OAuth is claimed and no sign-in happens
// through this file. The stub is disabled unless GOOGLE_CLIENT_ID and
// GOOGLE_CLIENT_SECRET are both set in env. When either is absent it
// returns a clear not configured error. When both are set it still
// returns a not implemented error, because the OAuth code exchange
// and the session creation for a Google identity are not built yet.
// This file never contains a real client id or secret, never reads a
// credential value into a returned object, never calls the network,
// and never stores a token.
//
// What Saeed must add himself, and where, is documented in
// docs/auth.md. In short: create the OAuth client in Google Cloud
// Console, add the authorized redirect URI for the callback path
// below, and set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in the
// environment. No value belongs in code, config, or docs.

export const GOOGLE_CALLBACK_PATH = "/auth/google/callback";

export interface GoogleSignInConfig {
  // OAuth client id, or null when not set in env.
  clientId: string | null;
  // Whether GOOGLE_CLIENT_SECRET is set. The value is never read
  // into this object.
  clientSecretSet: boolean;
  // Callback path the Google OAuth client must list as an authorized
  // redirect URI, relative to the app origin.
  callbackPath: string;
  // Full redirect URI when the owner sets GOOGLE_REDIRECT_URI,
  // otherwise null and the callback path is used with the app origin.
  redirectUri: string | null;
  // True only when both the client id and the client secret are set.
  enabled: boolean;
}

// Read the Google sign-in config from environment. Only the presence
// of the secret is recorded, never its value.
export function loadGoogleSignInConfig(
  env: Record<string, string | undefined> = process.env,
): GoogleSignInConfig {
  const clientId = env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_ID !== "" ? env.GOOGLE_CLIENT_ID : null;
  const clientSecretSet = Boolean(env.GOOGLE_CLIENT_SECRET && env.GOOGLE_CLIENT_SECRET !== "");
  const redirectUri = env.GOOGLE_REDIRECT_URI && env.GOOGLE_REDIRECT_URI !== "" ? env.GOOGLE_REDIRECT_URI : null;
  return {
    clientId,
    clientSecretSet,
    callbackPath: GOOGLE_CALLBACK_PATH,
    redirectUri,
    enabled: clientId !== null && clientSecretSet,
  };
}

export type GoogleSignInError = "google_not_configured" | "google_not_implemented";

export interface GoogleSignInAttempt {
  ok: false;
  error: GoogleSignInError;
  message: string;
  callbackPath: string;
}

export function googleNotConfiguredMessage(): string {
  return "Google sign-in is not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in the environment, and add " + GOOGLE_CALLBACK_PATH + " as an authorized redirect URI in the Google Cloud Console OAuth client. Email sign-in still works.";
}

export function googleNotImplementedMessage(): string {
  return "Google sign-in is not implemented yet. The client id and secret are set, but the OAuth code exchange and the Google identity link are not built, so no sign-in happens. Email sign-in still works.";
}

// Placeholder provider. It reports status and refuses every sign-in
// attempt with a clear error. It never redirects a user to Google and
// never exchanges a code.
export class GoogleProviderStub {
  readonly name = "google" as const;
  private config: GoogleSignInConfig;

  constructor(config: GoogleSignInConfig) {
    this.config = config;
  }

  isConfigured(): boolean {
    return this.config.enabled;
  }

  status(): { enabled: boolean; callbackPath: string; message: string } {
    if (!this.config.enabled) {
      return { enabled: false, callbackPath: this.config.callbackPath, message: googleNotConfiguredMessage() };
    }
    return { enabled: true, callbackPath: this.config.callbackPath, message: googleNotImplementedMessage() };
  }

  // Start a Google sign-in. Always refuses in this placeholder build.
  beginSignIn(): GoogleSignInAttempt {
    if (!this.config.enabled) {
      return { ok: false, error: "google_not_configured", message: googleNotConfiguredMessage(), callbackPath: this.config.callbackPath };
    }
    return { ok: false, error: "google_not_implemented", message: googleNotImplementedMessage(), callbackPath: this.config.callbackPath };
  }

  // Handle the OAuth callback. The code is never exchanged in this
  // placeholder build, and no session is created from it.
  handleCallback(_code: string): GoogleSignInAttempt {
    if (!this.config.enabled) {
      return { ok: false, error: "google_not_configured", message: googleNotConfiguredMessage(), callbackPath: this.config.callbackPath };
    }
    return { ok: false, error: "google_not_implemented", message: googleNotImplementedMessage(), callbackPath: this.config.callbackPath };
  }
}
