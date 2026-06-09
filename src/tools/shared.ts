/** JSON-stringify a value into a single MCP text content block. */
export function ok(
  data: unknown,
  structuredContent?: Record<string, unknown>,
) {
  const result: {
    content: Array<{ type: "text"; text: string }>;
    structuredContent?: Record<string, unknown>;
  } = {
    content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
  };
  if (structuredContent !== undefined) {
    result.structuredContent = structuredContent;
  }
  return result;
}

export function fail(message: string) {
  return {
    isError: true,
    content: [{ type: "text" as const, text: message }],
  };
}

export function errMsg(err: unknown): string {
  if (err instanceof Error) return err.message;
  return String(err);
}

// ── Date helpers ────────────────────────────────────────────────────────

export function parseDate(dateStr: string | undefined): Date | null {
  if (!dateStr) return null;
  const clean = dateStr.replace(/([+-]\d{2}):(\d{2})$/, "$1$2");
  const d = new Date(clean);
  return isNaN(d.getTime()) ? null : d;
}

export function fmtDate(dateStr: string | undefined): string {
  if (!dateStr) return "?";
  return dateStr.slice(0, 10);
}

export function dateMatch(
  aFirst: string | undefined,
  aLast: string | undefined,
  bFirst: string | undefined,
  bLast: string | undefined,
): boolean {
  return fmtDate(aFirst) === fmtDate(bFirst) && fmtDate(aLast) === fmtDate(bLast);
}
