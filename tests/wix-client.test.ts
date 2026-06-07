import { describe, it, expect, vi, beforeEach } from "vitest";
import { WixClient, WixApiError } from "../src/wix-client.js";
import { mockFetch, testCredentials, sampleService, sampleBooking } from "./helpers.js";

// We mock the global fetch
const fetchMock = vi.fn();
vi.stubGlobal("fetch", fetchMock);

beforeEach(() => {
  fetchMock.mockReset();
});

// ── Constructor ───────────────────────────────────────────────────────

describe("WixClient constructor", () => {
  it("throws when token is empty", () => {
    expect(() => new WixClient({ token: "", siteId: "x" })).toThrow(WixApiError);
  });

  it("throws when siteId is empty", () => {
    expect(() => new WixClient({ token: "x", siteId: "" })).toThrow(WixApiError);
  });

  it("creates client when credentials are valid", () => {
    expect(() => new WixClient(testCredentials)).not.toThrow();
  });
});

// ── post() ────────────────────────────────────────────────────────────

describe("WixClient.post", () => {
  it("sends auth headers", async () => {
    fetchMock.mockImplementation(
      mockFetch([{ status: 200, body: { success: true } }]),
    );

    const client = new WixClient(testCredentials);
    await client.post("/test", { key: "val" });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const url = fetchMock.mock.calls[0][0] as string;
    const init = fetchMock.mock.calls[0][1] as RequestInit;
    expect(url).toBe("https://www.wixapis.com/test");
    expect(init.headers).toEqual({
      Authorization: "test-token",
      "wix-site-id": "test-site-id",
      "Content-Type": "application/json",
    });
    expect(JSON.parse(init.body as string)).toEqual({ key: "val" });
  });

  it("returns parsed JSON on success", async () => {
    fetchMock.mockImplementation(
      mockFetch([{ status: 200, body: { data: "hello" } }]),
    );

    const client = new WixClient(testCredentials);
    const result = await client.post("/test", {});
    expect(result).toEqual({ data: "hello" });
  });

  it("throws WixApiError on network failure", async () => {
    fetchMock.mockRejectedValue(new Error("ECONNREFUSED"));

    const client = new WixClient(testCredentials);
    await expect(client.post("/test", {})).rejects.toThrow(WixApiError);
    await expect(client.post("/test", {})).rejects.toThrow("Erreur réseau");
  });

  it("throws WixApiError on HTTP error with status", async () => {
    fetchMock.mockImplementation(
      mockFetch([{ status: 401, body: { message: "Unauthorized" } }]),
    );

    const client = new WixClient(testCredentials);
    try {
      await client.post("/test", {});
    } catch (err) {
      expect(err).toBeInstanceOf(WixApiError);
      expect((err as WixApiError).status).toBe(401);
      expect((err as WixApiError).message).toContain("401");
    }
  });

  it("throws WixApiError on non-JSON response", async () => {
    fetchMock.mockImplementation(async () => ({
      ok: true,
      status: 200,
      text: async () => "not json",
    }) as unknown as Response);

    const client = new WixClient(testCredentials);
    await expect(client.post("/test", {})).rejects.toThrow(WixApiError);
    await expect(client.post("/test", {})).rejects.toThrow("non-JSON");
  });
});

// ── listServices() ────────────────────────────────────────────────────

describe("WixClient.listServices", () => {
  it("returns services array", async () => {
    fetchMock.mockImplementation(
      mockFetch([{ status: 200, body: { services: [sampleService] } }]),
    );

    const client = new WixClient(testCredentials);
    const result = await client.listServices();
    expect(result.services).toHaveLength(1);
  });

  it("handles empty response", async () => {
    fetchMock.mockImplementation(
      mockFetch([{ status: 200, body: {} }]),
    );

    const client = new WixClient(testCredentials);
    const result = await client.listServices();
    expect(result.services).toEqual([]);
  });
});

// ── fetchAllBookings() ────────────────────────────────────────────────

describe("WixClient.fetchAllBookings", () => {
  it("paginates through multiple pages", async () => {
    // Page 1: 2 bookings, hasNext=true
    // Page 2: 1 booking, hasNext=false
    fetchMock.mockImplementation(
      mockFetch([
        {
          status: 200,
          body: {
            bookings: [
              { ...sampleBooking, id: "book-1" },
              { ...sampleBooking, id: "book-2" },
            ],
            pagingMetadata: { hasNext: true },
          },
        },
        {
          status: 200,
          body: {
            bookings: [{ ...sampleBooking, id: "book-3" }],
            pagingMetadata: { hasNext: false },
          },
        },
      ]),
    );

    const client = new WixClient(testCredentials);
    const result = await client.fetchAllBookings();
    expect(result).toHaveLength(3);
    expect(result.map((b) => b.id)).toEqual(["book-1", "book-2", "book-3"]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("passes serviceId filter when provided", async () => {
    fetchMock.mockImplementation(
      mockFetch([
        {
          status: 200,
          body: { bookings: [], pagingMetadata: { hasNext: false } },
        },
      ]),
    );

    const client = new WixClient(testCredentials);
    await client.fetchAllBookings("svc-99");

    const callArg = JSON.parse(
      (fetchMock.mock.calls[0][1] as RequestInit).body as string,
    );
    expect(callArg.query.filter).toEqual({ serviceId: "svc-99" });
  });

  it("stops when batch is empty", async () => {
    fetchMock.mockImplementation(
      mockFetch([
        { status: 200, body: { bookings: [], pagingMetadata: {} } },
      ]),
    );

    const client = new WixClient(testCredentials);
    const result = await client.fetchAllBookings();
    expect(result).toEqual([]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

// ── formatService() ───────────────────────────────────────────────────

describe("WixClient.formatService", () => {
  it("formats service with all fields", () => {
    const client = new WixClient(testCredentials);
    const result = client.formatService(sampleService);
    expect(result).toEqual({
      id: "svc-1",
      name: "Formation A",
      type: "COURSE",
      hidden: false,
      firstSessionStart: "2026-06-15T09:00:00+0200",
      lastSessionEnd: "2026-06-16T17:00:00+0200",
      defaultCapacity: 10,
      price: "500 EUR",
    });
  });
});
