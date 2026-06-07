import { describe, it, expect, vi, beforeEach } from "vitest";
import { searchBookings } from "../../src/tools/search-bookings.js";
import { WixClient } from "../../src/wix-client.js";
import { mockFetch, testCredentials, sampleBooking } from "../helpers.js";

const fetchMock = vi.fn();
vi.stubGlobal("fetch", fetchMock);

beforeEach(() => {
  fetchMock.mockReset();
});

function buildBooking(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return { ...sampleBooking, ...overrides };
}

describe("searchBookings", () => {
  it("searches by first name", async () => {
    fetchMock.mockImplementation(
      mockFetch([
        {
          status: 200,
          body: {
            bookings: [
              buildBooking({
                contactDetails: {
                  contactId: "c1",
                  firstName: "Marie",
                  lastName: "Curie",
                  email: "marie@example.com",
                },
              }),
            ],
            pagingMetadata: { hasNext: false },
          },
        },
      ]),
    );

    const client = new WixClient(testCredentials);
    const result = await searchBookings(client, { query: "marie", includeNonConfirmed: false });

    expect(result.results).toHaveLength(1);
    expect(result.results[0]!.firstName).toBe("Marie");
  });

  it("searches case-insensitively", async () => {
    fetchMock.mockImplementation(
      mockFetch([
        {
          status: 200,
          body: {
            bookings: [
              buildBooking({
                contactDetails: {
                  contactId: "c1",
                  firstName: "MARIE",
                  lastName: "Curie",
                  email: "marie@example.com",
                },
              }),
            ],
            pagingMetadata: { hasNext: false },
          },
        },
      ]),
    );

    const client = new WixClient(testCredentials);
    const result = await searchBookings(client, { query: "marie", includeNonConfirmed: false });

    expect(result.results).toHaveLength(1);
  });

  it("searches by email", async () => {
    fetchMock.mockImplementation(
      mockFetch([
        {
          status: 200,
          body: {
            bookings: [
              buildBooking({
                contactDetails: {
                  contactId: "c1",
                  firstName: "X",
                  lastName: "Y",
                  email: "specific@domain.com",
                },
              }),
            ],
            pagingMetadata: { hasNext: false },
          },
        },
      ]),
    );

    const client = new WixClient(testCredentials);
    const result = await searchBookings(client, { query: "specific@domain", includeNonConfirmed: false });

    expect(result.results).toHaveLength(1);
  });

  it("searches by phone", async () => {
    fetchMock.mockImplementation(
      mockFetch([
        {
          status: 200,
          body: {
            bookings: [
              buildBooking({
                contactDetails: {
                  contactId: "c1",
                  firstName: "X",
                  lastName: "Y",
                  email: "",
                  phone: "0601020304",
                },
              }),
            ],
            pagingMetadata: { hasNext: false },
          },
        },
      ]),
    );

    const client = new WixClient(testCredentials);
    const result = await searchBookings(client, { query: "060102", includeNonConfirmed: false });

    expect(result.results).toHaveLength(1);
  });

  it("filters out non-confirmed by default", async () => {
    fetchMock.mockImplementation(
      mockFetch([
        {
          status: 200,
          body: {
            bookings: [
              buildBooking({
                id: "b1",
                status: "CONFIRMED",
                contactDetails: {
                  contactId: "c1",
                  firstName: "Jean",
                  lastName: "Dupont",
                  email: "jean@example.com",
                },
              }),
              buildBooking({
                id: "b2",
                status: "CANCELLED",
                contactDetails: {
                  contactId: "c2",
                  firstName: "Jean",
                  lastName: "Cancelled",
                  email: "jean-c@example.com",
                },
              }),
            ],
            pagingMetadata: { hasNext: false },
          },
        },
      ]),
    );

    const client = new WixClient(testCredentials);
    const result = await searchBookings(client, { query: "jean", includeNonConfirmed: false });

    expect(result.results).toHaveLength(1);
    expect(result.results[0]!.status).toBe("CONFIRMED");
  });

  it("includes non-confirmed when requested", async () => {
    fetchMock.mockImplementation(
      mockFetch([
        {
          status: 200,
          body: {
            bookings: [
              buildBooking({
                id: "b1",
                status: "CONFIRMED",
                contactDetails: {
                  contactId: "c1",
                  firstName: "Jean",
                  lastName: "Dupont",
                  email: "jean@example.com",
                },
              }),
              buildBooking({
                id: "b2",
                status: "CANCELLED",
                contactDetails: {
                  contactId: "c2",
                  firstName: "Jean",
                  lastName: "Cancelled",
                  email: "jean-c@example.com",
                },
              }),
            ],
            pagingMetadata: { hasNext: false },
          },
        },
      ]),
    );

    const client = new WixClient(testCredentials);
    const result = await searchBookings(client, { query: "jean", includeNonConfirmed: true });

    expect(result.results).toHaveLength(2);
  });

  it("returns empty when no match", async () => {
    fetchMock.mockImplementation(
      mockFetch([
        {
          status: 200,
          body: {
            bookings: [
              buildBooking({
                contactDetails: {
                  contactId: "c1",
                  firstName: "Alice",
                  lastName: "Martin",
                  email: "alice@example.com",
                },
              }),
            ],
            pagingMetadata: { hasNext: false },
          },
        },
      ]),
    );

    const client = new WixClient(testCredentials);
    const result = await searchBookings(client, { query: "inconnu", includeNonConfirmed: false });

    expect(result.results).toEqual([]);
  });

  it("returns structured output with all fields", async () => {
    fetchMock.mockImplementation(
      mockFetch([
        {
          status: 200,
          body: {
            bookings: [
              buildBooking({
                contactDetails: {
                  contactId: "c1",
                  firstName: "Jean",
                  lastName: "Dupont",
                  email: "jean@example.com",
                  phone: "0601020304",
                },
                paymentStatus: "PAID",
                bookedAddOns: [{ name: "Repas" }, { name: "Matériel" }],
              }),
            ],
            pagingMetadata: { hasNext: false },
          },
        },
      ]),
    );

    const client = new WixClient(testCredentials);
    const result = await searchBookings(client, { query: "jean", includeNonConfirmed: false });

    const r = result.results[0]!;
    expect(r.firstName).toBe("Jean");
    expect(r.lastName).toBe("Dupont");
    expect(r.email).toBe("jean@example.com");
    expect(r.phone).toBe("0601020304");
    expect(r.courseTitle).toBe("Formation A");
    expect(r.startDate).toBe("2026-06-15");
    expect(r.endDate).toBe("2026-06-16");
    expect(r.status).toBe("CONFIRMED");
    expect(r.paymentStatus).toBe("PAID");
    expect(r.addOns).toEqual(["Repas", "Matériel"]);
  });
});
