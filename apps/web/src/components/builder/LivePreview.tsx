// Live preview. Renders what the pack shows right now, from the pack state,
// so the preview updates live as the seller edits. Mockup frames are
// labelled as frames, never presented as real product screenshots. The
// preview shows the real product facts; sample content is badged as sample.

import type { ListingPack, ReconciliationResult } from "@listing-photos-generator/builder/browser";
import { formatPrice } from "@listing-photos-generator/builder/browser";
import { siteCopy } from "../../config/site-copy";
import { tokens } from "../../config/design-tokens";
import { Alert, Badge, Card } from "../ui";

const t = tokens.colors;

export function LivePreview(props: { pack: ListingPack; reconciliation: ReconciliationResult | null }) {
  const pack = props.pack;
  const facts = pack.productFacts;
  return (
    <Card title="Live preview">
      {pack.hasSampleContent ? <Badge tone="warning">{siteCopy.builder.sampleBadge}</Badge> : null}{" "}
      <Badge tone="info">{pack.platformId}</Badge>{" "}
      <Badge tone="info">{pack.status}</Badge>
      <div style={{ marginTop: 16 }}>
        <div
          style={{
            border: "1px solid " + t.border,
            borderRadius: tokens.radii.large,
            padding: tokens.spacing.lg,
            background: t.surfaceAlt,
          }}
        >
          <p style={{ fontFamily: tokens.fonts.title, fontSize: 24, margin: "0 0 8px 0" }}>{pack.copy.title === "" ? "(Title not set yet)" : pack.copy.title}</p>
          <p style={{ margin: "0 0 8px 0", color: t.muted }}>{pack.copy.description === "" ? "(Description not set yet)" : pack.copy.description}</p>
          <p style={{ margin: "0 0 8px 0", fontSize: 14 }}>
            {facts.tabCount === null ? "Tab count not confirmed" : facts.tabCount + " tabs"} | {facts.formatDetail || facts.format} |{" "}
            {formatPrice(facts.priceListMinor, facts.currency)}
          </p>
          {pack.copy.tags.length > 0 ? <p style={{ margin: "0 0 8px 0", fontSize: 14 }}>Tags: {pack.copy.tags.join(", ")}</p> : null}
        </div>
      </div>
      <h3 style={{ fontFamily: tokens.fonts.title, margin: "16px 0 8px 0" }}>Images in this pack</h3>
      {pack.images.length === 0 ? (
        <p style={{ color: t.muted }}>No images yet. Choose templates and mockups to add images.</p>
      ) : (
        <ol>
          {pack.images.map((image) => (
            <li key={image.id}>
              {image.position}. {image.imageRole}
              {image.mockupVersionId ? " (in a mockup frame, not a real screenshot)" : ""}
              {image.fitWarning ? " Warning: " + image.fitWarning : ""}
            </li>
          ))}
        </ol>
      )}
      <h3 style={{ fontFamily: tokens.fonts.title, margin: "16px 0 8px 0" }}>Product check</h3>
      {props.reconciliation === null ? (
        <p style={{ color: t.muted }}>Run the check to see whether the pack matches the real product.</p>
      ) : props.reconciliation.canExport ? (
        <Alert tone="success">{props.reconciliation.summary}</Alert>
      ) : (
        <Alert tone="danger">{props.reconciliation.summary}</Alert>
      )}
      {props.reconciliation !== null
        ? props.reconciliation.items.map((item) => (
            <p key={item.factKey + item.found} style={{ fontSize: 14, margin: "4px 0" }}>
              {item.result === "match" ? "Pass" : "Mismatch"}: {item.factKey}. Expected: {item.expected}. Found: {item.found}
              {item.fix !== "" ? " Fix: " + item.fix : ""}
            </p>
          ))
        : null}
    </Card>
  );
}
