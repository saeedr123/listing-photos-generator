// Auth forms. Both are server auth: LoginForm calls loginAction in
// src/app/auth/actions.ts and RegisterForm calls registerAction in
// src/app/seller/actions.ts. Both verify through AuthService and set the
// httpOnly lpg_session cookie. Nothing is kept in browser storage.

"use client";

import { useState } from "react";
import { siteCopy } from "../config/site-copy";
import { loginAction } from "../app/auth/actions";
import { registerAction } from "../app/seller/actions";
import { Alert, Button, Card, Field, inputStyle } from "./ui";

const copy = siteCopy.auth;

// A successful server action redirect surfaces as a NEXT_REDIRECT error
// on the caller. Navigation is already happening then, so it is
// swallowed here. Any other error is rethrown.
function rethrowUnlessRedirect(error: unknown): void {
  const digest = (error as { digest?: unknown } | null)?.digest;
  if (typeof digest !== "string" || !digest.startsWith("NEXT_REDIRECT")) {
    throw error;
  }
}

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage(null);
    const formData = new FormData();
    formData.append("email", email);
    formData.append("password", password);
    const next = new URLSearchParams(window.location.search).get("next");
    if (next) {
      formData.append("next", next);
    }
    try {
      const result = await loginAction(formData);
      if (result) {
        setMessage(result.message);
      }
    } catch (error) {
      rethrowUnlessRedirect(error);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card title={copy.loginHeading}>
      <Alert tone="info">Server sign in. Your session is kept in a secure HttpOnly cookie, not in browser storage.</Alert>
      <form onSubmit={submit}>
        <Field label={copy.emailLabel}>
          <input style={inputStyle} type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
        </Field>
        <Field label={copy.passwordLabel}>
          <input style={inputStyle} type="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" />
        </Field>
        {message ? <Alert tone="danger">{message}</Alert> : null}
        <Button type="submit" disabled={busy}>
          {copy.loginButton}
        </Button>{" "}
        <Button href="/auth/register" variant="secondary">
          {copy.toRegister}
        </Button>
      </form>
    </Card>
  );
}

export function RegisterForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage(null);
    const formData = new FormData();
    formData.append("name", name);
    formData.append("email", email);
    formData.append("password", password);
    const next = new URLSearchParams(window.location.search).get("next");
    if (next) {
      formData.append("next", next);
    }
    try {
      const result = await registerAction(formData);
      if (result) {
        setMessage(result.message);
      }
    } catch (error) {
      rethrowUnlessRedirect(error);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card title={copy.registerHeading}>
      <form onSubmit={submit}>
        <Field label={copy.nameLabel}>
          <input style={inputStyle} type="text" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
        </Field>
        <Field label={copy.emailLabel}>
          <input style={inputStyle} type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
        </Field>
        <Field label={copy.passwordLabel} help={copy.passwordHint}>
          <input style={inputStyle} type="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="new-password" />
        </Field>
        {message ? <Alert tone="danger">{message}</Alert> : null}
        <Button type="submit" disabled={busy}>
          {copy.registerButton}
        </Button>{" "}
        <Button href="/auth/login" variant="secondary">
          {copy.toLogin}
        </Button>
      </form>
    </Card>
  );
}
