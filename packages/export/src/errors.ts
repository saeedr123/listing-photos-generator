// Export errors: plain language, with a fix, and never destructive.
// An export failure must never delete or corrupt the saved pack.

export class ExportError extends Error {
  code: string;
  fix: string;
  constructor(code: string, message: string, fix: string) {
    super(message);
    this.name = "ExportError";
    this.code = code;
    this.fix = fix;
  }
  toPlain(): string {
    return `${this.message} Fix: ${this.fix}`;
  }
}

export function reconciliationBlockedError(summary: string): ExportError {
  return new ExportError(
    "reconciliation-blocked",
    `Export stopped: ${summary}`,
    "Fix each mismatched fact in the listing or in the product facts, then run the reconciliation check again.",
  );
}

export function qualityGateBlockedError(reasons: string[]): ExportError {
  return new ExportError(
    "quality-gate-blocked",
    `Export stopped by the Crisp Quality Gate: ${reasons.join(" ")}`,
    "Fix the quality issue, usually by supplying a higher resolution real product render, then export again.",
  );
}

export function rasterizerError(detail: string): ExportError {
  return new ExportError(
    "rasterizer-failed",
    "Export failed while drawing the images. Your saved pack was not changed.",
    `Check that the rasterizer is available and try again. Detail for support: ${detail}`,
  );
}
