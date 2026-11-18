import { RegisterForm } from "../../../components/AuthForms";
import { Alert, Button, PageShell } from "../../../components/ui";
import { siteCopy } from "../../../config/site-copy";
import { signupOpen } from "../../../lib/signup";

// Read LPG_SIGNUP on each request, not at build time.
export const dynamic = "force-dynamic";

export default function RegisterPage() {
  if (!signupOpen()) {
    return (
      <PageShell title={siteCopy.auth.signupClosedHeading}>
        <Alert tone="info">{siteCopy.auth.signupClosedBody}</Alert>{" "}
        <Button href="/auth/login" variant="secondary">
          {siteCopy.auth.toLogin}
        </Button>
      </PageShell>
    );
  }
  return (
    <PageShell title={siteCopy.auth.registerHeading}>
      <RegisterForm />
    </PageShell>
  );
}
