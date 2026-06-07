import { describe, it, expect, vi, beforeEach } from "vitest";
import { getFormationParticipants } from "../../src/tools/get-formation-participants.js";
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

describe("getFormationParticipants", () => {
  it("returns participant details for a service", async () => {
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
                  phone: "0601",
                },
              }),
              buildBooking({
                id: "b2",
                contactDetails: {
                  contactId: "c2",
                  firstName: "Bob",
                  lastName: "Durand",
                  email: "bob@example.com",
                  phone: "0602",
                },
                bookedAddOns: [{ name: "Déjeuner" }],
              }),
            ],
            pagingMetadata: { hasNext: false },
          },
        },
      ]),
    );

    const client = new WixClient(testCredentials);
    const result = await getFormationParticipants(client, { serviceId: "svc-1" });

    expect(result.title).toBe("Formation A");
    expect(result.location).toBe("Paris");
    expect(result.participantCount).toBe(2);
    expect(result.participants[0]!.firstName).toBe("Alice");
    expect(result.participants[0]!.lastName).toBe("Martin");
    expect(result.participants[0]!.email).toBe("alice@example.com");
    expect(result.participants[0]!.phone).toBe("0601");
    expect(result.participants[0]!.status).toBe("CONFIRMED");
    expect(result.participants[0]!.addOns).toEqual([]);
    expect(result.participants[1]!.addOns).toEqual(["Déjeuner"]);
  });

  it("handles no confirmed bookings", async () => {
    fetchMock.mockImplementation(
      mockFetch([
        {
          status: 200,
          body: {
            bookings: [
              buildBooking({
                id: "b1",
                status: "CANCELLED",
              }),
            ],
            pagingMetadata: { hasNext: false },
          },
        },
      ]),
    );

    const client = new WixClient(testCredentials);
    const result = await getFormationParticipants(client, { serviceId: "svc-1" });

    expect(result.participantCount).toBe(0);
    expect(result.participants).toEqual([]);
    expect(result.title).toBe("?");
  });

  it("passes serviceId to fetch call", async () => {
    fetchMock.mockImplementation(
      mockFetch([
        {
          status: 200,
          body: { bookings: [], pagingMetadata: { hasNext: false } },
        },
      ]),
    );

    const client = new WixClient(testCredentials);
    await getFormationParticipants(client, { serviceId: "svc-42" });

    const body = JSON.parse(
      (fetchMock.mock.calls[0][1] as RequestInit).body as string,
    );
    expect(body.query.filter).toEqual({ serviceId: "svc-42" });
  });
});
