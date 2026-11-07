// Minimal design system. Components take their labels as props or children,
// so no content bearing copy is hard coded here. Styles come from the
// design tokens, with inline styles, so the components work without a
// Tailwind setup and can be dropped into apps/web as they are.

import type { CSSProperties, ReactNode } from "react";
import { tokens } from "../config/design-tokens";

const t = tokens.colors;

export function Button(props: {
  children: ReactNode;
  onClick?: () => void;
  type?: "button" | "submit";
  disabled?: boolean;
  variant?: "primary" | "secondary" | "danger";
  href?: string;
}) {
  const style: CSSProperties = {
    display: "inline-block",
    padding: "10px 18px",
    borderRadius: tokens.radii.medium,
    border: props.variant === "secondary" ? "1px solid " + t.border : "none",
    background: props.variant === "danger" ? t.danger : props.variant === "secondary" ? t.surface : t.primary,
    color: props.variant === "secondary" ? t.ink : t.primaryText,
    fontFamily: tokens.fonts.body,
    fontSize: 15,
    fontWeight: 600,
    cursor: props.disabled ? "not-allowed" : "pointer",
    opacity: props.disabled ? 0.6 : 1,
    textDecoration: "none",
    textAlign: "center",
  };
  if (props.href) {
    return (
      <a href={props.href} style={style}>
        {props.children}
      </a>
    );
  }
  return (
    <button type={props.type ?? "button"} onClick={props.onClick} disabled={props.disabled} style={style}>
      {props.children}
    </button>
  );
}

export function Card(props: { children: ReactNode; title?: string }) {
  return (
    <section
      style={{
        background: t.surface,
        border: "1px solid " + t.border,
        borderRadius: tokens.radii.large,
        padding: tokens.spacing.lg,
        marginBottom: tokens.spacing.md,
      }}
    >
      {props.title ? (
        <h2 style={{ fontFamily: tokens.fonts.title, fontSize: 20, margin: "0 0 12px 0", color: t.ink }}>{props.title}</h2>
      ) : null}
      {props.children}
    </section>
  );
}

export function Field(props: { label: string; help?: string; children: ReactNode }) {
  return (
    <label style={{ display: "block", marginBottom: tokens.spacing.md, fontFamily: tokens.fonts.body }}>
      <span style={{ display: "block", fontWeight: 600, fontSize: 14, marginBottom: 4, color: t.ink }}>{props.label}</span>
      {props.children}
      {props.help ? <span style={{ display: "block", fontSize: 13, color: t.muted, marginTop: 4 }}>{props.help}</span> : null}
    </label>
  );
}

export const inputStyle: CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  padding: "10px 12px",
  border: "1px solid " + t.border,
  borderRadius: tokens.radii.medium,
  fontFamily: tokens.fonts.body,
  fontSize: 15,
  color: t.ink,
  background: t.surface,
};

export function Badge(props: { children: ReactNode; tone?: "info" | "success" | "warning" | "danger" }) {
  const bg =
    props.tone === "success" ? t.successBg : props.tone === "warning" ? t.warningBg : props.tone === "danger" ? t.dangerBg : t.infoBg;
  const color = props.tone === "success" ? t.success : props.tone === "warning" ? t.warning : props.tone === "danger" ? t.danger : t.primary;
  return (
    <span
      style={{
        display: "inline-block",
        background: bg,
        color,
        borderRadius: 999,
        padding: "2px 10px",
        fontSize: 12,
        fontWeight: 700,
        fontFamily: tokens.fonts.body,
      }}
    >
      {props.children}
    </span>
  );
}

export function Alert(props: { children: ReactNode; tone?: "info" | "success" | "warning" | "danger" }) {
  const bg =
    props.tone === "success" ? t.successBg : props.tone === "warning" ? t.warningBg : props.tone === "danger" ? t.dangerBg : t.infoBg;
  const color = props.tone === "success" ? t.success : props.tone === "warning" ? t.warning : props.tone === "danger" ? t.danger : t.primary;
  return (
    <div style={{ background: bg, color, borderRadius: tokens.radii.medium, padding: "10px 14px", marginBottom: 12, fontFamily: tokens.fonts.body, fontSize: 14 }}>
      {props.children}
    </div>
  );
}

export function Stepper(props: { steps: readonly string[]; current: number }) {
  return (
    <ol style={{ display: "flex", flexWrap: "wrap", gap: 8, listStyle: "none", padding: 0, margin: "0 0 20px 0", fontFamily: tokens.fonts.body }}>
      {props.steps.map((step, i) => (
        <li
          key={step}
          style={{
            padding: "6px 12px",
            borderRadius: 999,
            fontSize: 13,
            fontWeight: i === props.current ? 700 : 400,
            background: i === props.current ? t.primary : i < props.current ? t.successBg : t.surfaceAlt,
            color: i === props.current ? t.primaryText : t.ink,
            border: "1px solid " + t.border,
          }}
        >
          {i + 1}. {step}
        </li>
      ))}
    </ol>
  );
}

export function PageShell(props: { children: ReactNode; title: string; intro?: string }) {
  return (
    <main
      style={{
        background: t.background,
        minHeight: "100vh",
        fontFamily: tokens.fonts.body,
        color: t.ink,
        padding: tokens.spacing.lg,
      }}
    >
      <div style={{ maxWidth: tokens.maxWidth, margin: "0 auto" }}>
        <header style={{ marginBottom: tokens.spacing.lg }}>
          <h1 style={{ fontFamily: tokens.fonts.title, fontSize: 32, margin: "0 0 8px 0" }}>{props.title}</h1>
          {props.intro ? <p style={{ color: t.muted, margin: 0 }}>{props.intro}</p> : null}
        </header>
        {props.children}
      </div>
    </main>
  );
}
