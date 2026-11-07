"use client";

import { LoginForm } from "../../../components/AuthForms";
import { PageShell } from "../../../components/ui";
import { siteCopy } from "../../../config/site-copy";

export default function LoginPage() {
  return (
    <PageShell title={siteCopy.auth.loginHeading}>
      <LoginForm />
    </PageShell>
  );
}
