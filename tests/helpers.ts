import type { Credentials } from "../src/types.js";
import { WixClient } from "../src/wix-client.js";

// ── Mock fetch builder ──────────────────────────────────────────────────

export interface MockResponse {
  status: number;
  body: unknown;
  headers?: Record<string, string>;
}

export function mockFetch(responses: MockResponse[]) {
  let callIndex = 0;

  const fn = vi.fn(async (_url: string | URL | Request, _init?: RequestInit) => {
    const resp = responses[callIndex] ?? responses[responses.length - 1];
    if (!resp) {
      throw new Error(`Mock fetch call #${callIndex} has no configured response`);
    }
    callIndex++;
    return {
      ok: resp.status >= 200 && resp.status < 300,
      status: resp.status,
      text: async () => JSON.stringify(resp.body),
      json: async () => resp.body,
      headers: new Headers(resp.headers ?? { "content-type": "application/json" }),
    } as Response;
  });

  return fn;
}

// ── Test client factory ─────────────────────────────────────────────────

export const testCredentials: Credentials = {
  token: "test-token",
  siteId: "test-site-id",
};

export function createTestClient(): WixClient {
  return new WixClient(testCredentials);
}

// ── Sample data ─────────────────────────────────────────────────────────

export const sampleService = {
  id: "svc-1",
  name: "Formation A",
  type: "COURSE",
  hidden: false,
  defaultCapacity: 10,
  schedule: {
    firstSessionStart: "2026-06-15T09:00:00+0200",
    lastSessionEnd: "2026-06-16T17:00:00+0200",
  },
  payment: {
    fixed: { price: { value: "500", currency: "EUR" } },
  },
};

export const sampleBooking: Record<string, unknown> = {
  id: "book-1",
  status: "CONFIRMED",
  createdDate: "2026-05-01T10:00:00+0200",
  contactDetails: {
    contactId: "contact-1",
    firstName: "Jean",
    lastName: "Dupont",
    email: "jean@example.com",
    phone: "0601020304",
  },
  bookedEntity: {
    title: "Formation A",
    schedule: {
      scheduleId: "sched-1",
      firstSessionStart: "2026-06-15T09:00:00+0200",
      lastSessionEnd: "2026-06-16T17:00:00+0200",
      location: { name: "Paris" },
    },
  },
  paymentStatus: "PAID",
};
