"use client";

import { RegisterForm } from "../../../components/AuthForms";
import { PageShell } from "../../../components/ui";
import { siteCopy } from "../../../config/site-copy";

export default function RegisterPage() {
  return (
    <PageShell title={siteCopy.auth.registerHeading}>
      <RegisterForm />
    </PageShell>
  );
}
