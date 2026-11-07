// AI suggestion UI for the builder copy step. Every suggestion is shown as
// a suggestion, not as a final fact: the seller edits it, accepts it, or
// rejects it. Accept runs the guardrails again on the edited text and
// blocks the accept when a violation is found. Generation uses the
// development stub only, through the browser safe AI entry point, so no
// Node API and no real provider call reaches the client bundle. Prompts
// and plans are read from the root config files, the same way the app
// config loader reads the other config files.

"use client";

import { useState } from "react";
import type { ProductFacts } from "@listing-photos-generator/builder/browser";
import {
  DevelopmentStubProvider,
  aiLayoutLabel,
  formatCreditDisplay,
  generateCopy,
  getCreditLimit,
  getPrompt,
  mockupFrameLabel,
  validateSuggestion,
} from "@listing-photos-generator/ai/browser";
import type {
  AiProviderConfig,
  CopyPrompt,
  GenerationResult,
  NichePackAi,
  PlatformLimits,
  PlansConfigShape,
  SuggestionKind,
} from "@listing-photos-generator/ai/browser";
import copyPromptsRaw from "../../../../../config/copy-prompts.json";
import plansRaw from "../../../../../config/plans.json";
import { Alert, Button, Card, Field, inputStyle } from "../ui";

const KINDS: SuggestionKind[] = ["title", "description", "tags", "checklist"];

const KIND_LABELS: Record<SuggestionKind, string> = {
  title: "Title suggestion",
  description: "Description suggestion",
  tags: "Tags suggestion",
  checklist: "Checklist suggestion",
};

interface NicheChoice {
  slug: string;
  name: string;
  toneGuidance: string;
  aiGenerationReady: boolean;
  needsRealProductTesting: boolean;
}

interface RawPrompt {
  slug: string;
  purpose: string;
  version: number;
  status: string;
  prompt_text: string;
  preview: string;
  rollback_to_version: number | null;
  previous_version: number | null;
  change_note: string;
}

const prompts: CopyPrompt[] = (copyPromptsRaw.prompts as RawPrompt[]).map((prompt) => ({
  slug: prompt.slug,
  purpose: prompt.purpose as CopyPrompt["purpose"],
  version: prompt.version,
  status: prompt.status,
  promptText: prompt.prompt_text,
  preview: prompt.preview,
  rollbackToVersion: prompt.rollback_to_version,
  previousVersion: prompt.previous_version,
  changeNote: prompt.change_note,
}));

const providerConfig: AiProviderConfig = {
  provider: copyPromptsRaw.provider.name,
  model: copyPromptsRaw.provider.model,
  budgetCap: copyPromptsRaw.provider.budget_cap,
  budgetCapCurrency: copyPromptsRaw.provider.budget_cap_currency,
  creditsPerSuggestion: copyPromptsRaw.credits_per_suggestion,
};

function toNichePackAi(choice: NicheChoice): NichePackAi {
  return {
    slug: choice.slug,
    name: choice.name,
    description: "",
    toneGuidance: choice.toneGuidance,
    keywordStartingPoints: [],
    templateRoles: [],
    templateNotes: {},
    mockupKinds: [],
    mockupNotes: {},
    lastVerifiedDate: "2026-11-05",
    sourceNotes: "Chosen as a version 1 test niche. Pack content is not yet researched or tested with a real product.",
    status: "active",
    aiGenerationReady: choice.aiGenerationReady,
    needsRealProductTesting: choice.needsRealProductTesting,
    reviewStatus: "needs_review",
    lastReviewedBy: null,
  };
}

function resultText(result: GenerationResult): string {
  if (result.suggestion === null) {
    return "";
  }
  if (result.suggestion.text !== null) {
    return result.suggestion.text;
  }
  if (result.suggestion.tags !== null) {
    return result.suggestion.tags.join(", ");
  }
  if (result.suggestion.checklist !== null) {
    return result.suggestion.checklist.join("\n");
  }
  return "";
}

export function AiSuggestions(props: {
  facts: ProductFacts;
  limits: PlatformLimits;
  nichePack: NicheChoice | null;
  onAccept: (patch: { title?: string; description?: string; tags?: string[]; checklist?: string[] }) => void;
}) {
  const [creditsUsed, setCreditsUsed] = useState(0);
  const [results, setResults] = useState<Partial<Record<SuggestionKind, GenerationResult>>>({});
  const [edited, setEdited] = useState<Partial<Record<SuggestionKind, string>>>({});
  const [accepted, setAccepted] = useState<Partial<Record<SuggestionKind, boolean>>>({});
  const [acceptErrors, setAcceptErrors] = useState<Partial<Record<SuggestionKind, string[]>>>({});

  const plans = plansRaw as unknown as PlansConfigShape;
  const creditLimit = getCreditLimit("free", plans);
  const creditText = formatCreditDisplay({ used: creditsUsed, limit: creditLimit, planSlug: "free" });

  async function handleGenerate(kind: SuggestionKind) {
    const prompt = getPrompt(prompts, kind);
    if (prompt === null) {
      return;
    }
    const result = await generateCopy({
      kind,
      facts: props.facts,
      limits: props.limits,
      provider: new DevelopmentStubProvider(),
      prompt,
      credits: { used: creditsUsed, limit: creditLimit, planSlug: "free" },
      providerConfig,
      nichePack: props.nichePack ? toNichePackAi(props.nichePack) : null,
    });
    setResults((prev) => ({ ...prev, [kind]: result }));
    setEdited((prev) => ({ ...prev, [kind]: resultText(result) }));
    setAccepted((prev) => ({ ...prev, [kind]: false }));
    if (result.status === "suggestion" && result.creditCost !== null) {
      const cost = result.creditCost;
      setCreditsUsed((prev) => prev + cost);
    }
  }

  function handleAccept(kind: SuggestionKind) {
    const result = results[kind];
    const value = edited[kind] ?? "";
    if (!result || result.suggestion === null) {
      return;
    }
    const candidate = { ...result.suggestion, text: kind === "tags" || kind === "checklist" ? null : value };
    if (kind === "tags") {
      candidate.tags = value.split(",").map((tag) => tag.trim()).filter((tag) => tag !== "");
    }
    if (kind === "checklist") {
      candidate.checklist = value.split("\n").map((item) => item.trim()).filter((item) => item !== "");
    }
    const guardrail = validateSuggestion(props.facts, candidate, props.limits);
    if (!guardrail.ok) {
      setAcceptErrors((prev) => ({ ...prev, [kind]: guardrail.violations }));
      return;
    }
    setAcceptErrors((prev) => ({ ...prev, [kind]: [] }));
    if (kind === "title") {
      props.onAccept({ title: value });
    } else if (kind === "description") {
      props.onAccept({ description: value });
    } else if (kind === "tags") {
      props.onAccept({ tags: candidate.tags ?? [] });
    } else {
      props.onAccept({ checklist: candidate.checklist ?? [] });
    }
    setAccepted((prev) => ({ ...prev, [kind]: true }));
  }

  function handleReject(kind: SuggestionKind) {
    setResults((prev) => ({ ...prev, [kind]: undefined }));
    setEdited((prev) => ({ ...prev, [kind]: undefined }));
    setAccepted((prev) => ({ ...prev, [kind]: false }));
    setAcceptErrors((prev) => ({ ...prev, [kind]: [] }));
  }

  return (
    <Card title="AI copy help">
      <p>{aiLayoutLabel()}</p>
      <p>{mockupFrameLabel()}</p>
      <p>{creditText}</p>
      <p>Provider: Development stub only. No real AI provider is connected.</p>
      {props.nichePack && !props.nichePack.aiGenerationReady ? (
        <Alert tone="warning">
          Niche pack &quot;{props.nichePack.name}&quot; is not ready for AI generation. Sample outputs must be reviewed for grammar, tone, and accuracy against a real product first.
        </Alert>
      ) : null}
      {KINDS.map((kind) => {
        const result = results[kind];
        return (
          <div key={kind} style={{ borderTop: "1px solid #E5E0DC", paddingTop: 12, marginTop: 12 }}>
            <h3>{KIND_LABELS[kind]}</h3>
            <p>
              <Button onClick={() => void handleGenerate(kind)}>Generate {kind} suggestion</Button>
            </p>
            {result && result.status !== "suggestion" ? (
              <Alert tone="warning">
                {result.note}
                {result.missingInfo.length > 0 ? (
                  <span>
                    {" "}
                    {result.missingInfo.map((item) => item.prompt).join(" ")}
                  </span>
                ) : null}
                {result.violations.length > 0 ? " " + result.violations.join(" ") : null}
              </Alert>
            ) : null}
            {result && result.status === "suggestion" && result.suggestion ? (
              <div>
                <p>{result.suggestion.label}</p>
                <Field label={KIND_LABELS[kind] + " (edit before accepting)"}>
                  {kind === "title" ? (
                    <input style={inputStyle} value={edited[kind] ?? ""} onChange={(e) => setEdited((prev) => ({ ...prev, [kind]: e.target.value }))} />
                  ) : (
                    <textarea style={inputStyle} rows={kind === "description" ? 5 : 3} value={edited[kind] ?? ""} onChange={(e) => setEdited((prev) => ({ ...prev, [kind]: e.target.value }))} />
                  )}
                </Field>
                {acceptErrors[kind] && acceptErrors[kind]!.length > 0 ? (
                  <Alert tone="danger">{acceptErrors[kind]!.join(" ")}</Alert>
                ) : null}
                {accepted[kind] ? <p>Accepted. You can still edit it above.</p> : null}
                <p style={{ display: "flex", gap: 8 }}>
                  <Button onClick={() => handleAccept(kind)}>Accept suggestion</Button>
                  <Button variant="secondary" onClick={() => handleReject(kind)}>Reject suggestion</Button>
                </p>
              </div>
            ) : null}
          </div>
        );
      })}
    </Card>
  );
}
