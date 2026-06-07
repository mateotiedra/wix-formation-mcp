import type { Credentials, WixBooking, WixService } from "./types.js";

// ── Error ───────────────────────────────────────────────────────────────

export class WixApiError extends Error {
  constructor(
    message: string,
    public status?: number,
  ) {
    super(message);
    this.name = "WixApiError";
  }
}

// ── Helpers ─────────────────────────────────────────────────────────────

function authHeaders(creds: Credentials): Record<string, string> {
  return {
    Authorization: creds.token,
    "wix-site-id": creds.siteId,
    "Content-Type": "application/json",
  };
}

function fmtPrice(payment: WixService["payment"]): string {
  if (!payment) return "";
  const fixed = payment.fixed;
  if (fixed?.price) return `${fixed.price.value ?? "?"} ${fixed.price.currency ?? ""}`;
  const varied = payment.varied;
  if (varied?.defaultPrice) return `${varied.defaultPrice.value ?? "?"} ${varied.defaultPrice.currency ?? ""}`;
  return "";
}

// ── Client ──────────────────────────────────────────────────────────────

export class WixClient {
  private baseUrl = "https://www.wixapis.com";

  constructor(private creds: Credentials) {
    if (!creds.token || !creds.siteId) {
      throw new WixApiError(
        "Identifiants Wix manquants. Fournissez X-Wix-Api-Token et X-Wix-Site-Id dans les en-têtes HTTP.",
      );
    }
  }

  // ── Low-level POST ──────────────────────────────────────────────────

  async post(path: string, body: unknown): Promise<unknown> {
    let resp: Response;
    try {
      resp = await fetch(`${this.baseUrl}${path}`, {
        method: "POST",
        headers: authHeaders(this.creds),
        body: JSON.stringify(body),
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new WixApiError(`Erreur réseau (Wix API): ${msg}`);
    }

    const text = await resp.text();

    if (!resp.ok) {
      let detail = text;
      try {
        const errJson = JSON.parse(text) as Record<string, unknown>;
        detail =
          (errJson.message as string) ??
          (errJson.details as Record<string, unknown>)?.applicationError ??
          text;
      } catch {
        // not JSON
      }
      throw new WixApiError(
        `Erreur Wix API (${resp.status}): ${String(detail).slice(0, 300)}`,
        resp.status,
      );
    }

    try {
      return JSON.parse(text);
    } catch {
      throw new WixApiError(`Réponse Wix API non-JSON (${resp.status})`);
    }
  }

  // ── Service helpers ─────────────────────────────────────────────────

  async listServices(): Promise<{ services: WixService[] }> {
    const data = (await this.post("/bookings/v2/services/query", {
      query: { filter: {}, paging: { limit: 100 } },
    })) as { services?: WixService[] };

    return { services: data.services ?? [] };
  }

  formatService(s: WixService) {
    const sched = s.schedule ?? {};
    return {
      id: s.id,
      name: s.name,
      type: s.type,
      hidden: s.hidden,
      firstSessionStart: sched.firstSessionStart ?? "?",
      lastSessionEnd: sched.lastSessionEnd ?? "?",
      defaultCapacity: s.defaultCapacity,
      price: fmtPrice(s.payment),
    };
  }

  // ── Booking helpers ─────────────────────────────────────────────────

  async fetchAllBookings(serviceId?: string): Promise<WixBooking[]> {
    const allBookings: WixBooking[] = [];
    let offset = 0;

    while (true) {
      const body: Record<string, unknown> = {
        query: { paging: { limit: 100, offset } },
      };
      if (serviceId) {
        (body.query as Record<string, unknown>).filter = { serviceId };
      }

      const data = (await this.post("/bookings/v2/bookings/query", body)) as {
        bookings?: WixBooking[];
        pagingMetadata?: { hasNext?: boolean };
      };

      const batch = data.bookings ?? [];
      allBookings.push(...batch);

      const hasNext = data.pagingMetadata?.hasNext ?? false;
      if (!hasNext || batch.length === 0) break;
      offset += 100;
    }

    return allBookings;
  }
}
