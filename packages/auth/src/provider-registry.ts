// Auth provider registry: config driven resolution of the AuthProvider
// interface. AuthService already takes its provider by injection, so
// the builder, templates, mockups, and billing never call a provider
// directly. This registry is the remaining seam: server wiring reads
// the provider name from AuthConfig.provider, resolves it here, and
// passes the result to AuthService. A new provider is added by
// registering a factory under its name and naming it in config, never
// by editing AuthService or any caller.
//
// Config key: AuthConfig.provider ("email" in the shipped config).
// The local stub and the Prisma provider both implement the interface
// under the name "email". Google sign-in is a separate placeholder in
// google-provider.ts and is not an AuthProvider implementation yet;
// making it one means building the OAuth exchange, which is a separate
// build, not a registry change.

import type { AuthProvider } from "./stub-provider.ts";
import type { AuthProviderName } from "./types.ts";

export type AuthProviderFactory = () => AuthProvider;

const authProviderRegistry = new Map<string, AuthProviderFactory>();

export function registerAuthProvider(name: string, factory: AuthProviderFactory): void {
  if (!name || typeof factory !== "function") {
    throw new Error("An auth provider needs a name and a factory function.");
  }
  authProviderRegistry.set(name, factory);
}

export function listAuthProviders(): string[] {
  return [...authProviderRegistry.keys()].sort();
}

export function resolveAuthProvider(name: AuthProviderName): AuthProvider {
  const factory = authProviderRegistry.get(name);
  if (!factory) {
    throw new Error(
      "Auth provider \"" + name + "\" is not registered. No provider implementation is wired in for that name, so no sign-in runs. Register the provider, or name a registered provider in AuthConfig.provider.",
    );
  }
  const provider = factory();
  if (!provider || provider.name !== name) {
    throw new Error(
      "Auth provider factory for \"" + name + "\" did not return a provider with that name.",
    );
  }
  return provider;
}
