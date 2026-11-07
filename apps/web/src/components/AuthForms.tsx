// Auth forms. Demo sign in only: these call the demo store in
// src/lib/demo-store.ts. Production wiring replaces the submit handlers
// with server actions that call AuthService. The forms never claim the demo
// is production authentication.

"use client";

import { useState } from "react";
import { siteCopy } from "../config/site-copy";
import { demoLogin, demoRegister } from "../lib/demo-store";
import { Alert, Button, Card, Field, inputStyle } from "./ui";

const copy = siteCopy.auth;

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    const result = await demoLogin(email, password);
    setMessage(result.message);
    setBusy(false);
    if (result.ok) {
      window.location.href = "/dashboard";
    }
  }

  return (
    <Card title={copy.loginHeading}>
      <Alert tone="info">{siteCopy.demoNotice}</Alert>
      <form onSubmit={submit}>
        <Field label={copy.emailLabel}>
          <input style={inputStyle} type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
        </Field>
        <Field label={copy.passwordLabel}>
          <input style={inputStyle} type="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" />
        </Field>
        {message ? <Alert tone={message === "Signed in." ? "success" : "danger"}>{message}</Alert> : null}
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
    const result = await demoRegister(email, password, name);
    setMessage(result.message);
    setBusy(false);
    if (result.ok) {
      window.location.href = "/dashboard";
    }
  }

  return (
    <Card title={copy.registerHeading}>
      <Alert tone="info">{siteCopy.demoNotice}</Alert>
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
        {message ? <Alert tone={message === "Account created." ? "success" : "danger"}>{message}</Alert> : null}
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
