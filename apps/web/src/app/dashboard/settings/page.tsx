"use client";

import { useState } from "react";
import { getPlans } from "@/lib/config";
import { Alert, Button, Card, Field, inputStyle, PageShell } from "../../../components/ui";
import { siteCopy } from "../../../config/site-copy";
import {
  demoChangePassword,
  demoDeleteAccount,
  getDemoSession,
  listDemoAudit,
} from "../../../lib/demo-store";

const copy = siteCopy.settings;

export default function SettingsPage() {
  const plans = getPlans();
  const session = getDemoSession();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deletion, setDeletion] = useState<{ completedAt: string; note: string } | null>(null);
  const [audit] = useState(() => listDemoAudit());

  if (!session) {
    return (
      <PageShell title={copy.heading} intro="Sign in to see your account settings.">
        <a href="/auth/login">Sign in</a>
      </PageShell>
    );
  }

  async function changePassword(event: React.FormEvent) {
    event.preventDefault();
    const result = await demoChangePassword(session?.id as string, currentPassword, newPassword);
    setPasswordMessage(result.message);
    if (result.ok) {
      setCurrentPassword("");
      setNewPassword("");
    }
  }

  function requestDeletion(event: React.FormEvent) {
    event.preventDefault();
    if (deleteConfirm.trim() !== "DELETE") {
      return;
    }
    setDeletion(demoDeleteAccount(session?.id as string));
  }

  return (
    <PageShell title={copy.heading}>
      <Card title={copy.subscriptionHeading}>
        <p>
          Trial: {plans.trial.duration_days} days, {plans.trial.requires_card ? "card required" : "no card required"}, one per account. At trial end
          you downgrade to Free automatically, with no charge if no card was taken. You keep viewing and downloading packs you created.
        </p>
        <p>Price not set. No price is shown until the owner sets one.</p>
      </Card>
      <Card title={copy.changePasswordHeading}>
        <form onSubmit={changePassword}>
          <Field label={copy.currentPasswordLabel}>
            <input style={inputStyle} type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required autoComplete="current-password" />
          </Field>
          <Field label={copy.newPasswordLabel}>
            <input style={inputStyle} type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required autoComplete="new-password" />
          </Field>
          {passwordMessage ? <Alert tone={passwordMessage === "Password changed." ? "success" : "danger"}>{passwordMessage}</Alert> : null}
          <Button type="submit">Change password</Button>
        </form>
      </Card>
      <Card title={copy.deletionHeading}>
        <p>{copy.deletionHelp}</p>
        {deletion ? (
          <Alert tone="success">
            {copy.deletionRequested} Completed at {deletion.completedAt}. {deletion.note}
          </Alert>
        ) : (
          <form onSubmit={requestDeletion}>
            <Field label={copy.deletionConfirm}>
              <input style={inputStyle} value={deleteConfirm} onChange={(e) => setDeleteConfirm(e.target.value)} required />
            </Field>
            <Button variant="danger" type="submit" disabled={deleteConfirm.trim() !== "DELETE"}>
              {copy.deletionButton}
            </Button>
          </form>
        )}
      </Card>
      <Card title="Audit log">
        {audit.length === 0 ? (
          <p>No audit events yet.</p>
        ) : (
          <ul>
            {audit.map((event) => (
              <li key={event.id}>
                {event.createdAt} {event.action} {event.targetId ?? ""}
              </li>
            ))}
          </ul>
        )}
        <p style={{ fontSize: 13 }}>Audit entries record time, actor, and action, without product content or secrets.</p>
      </Card>
    </PageShell>
  );
}
