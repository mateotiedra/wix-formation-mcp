import { describe, it, expect, vi, beforeEach } from "vitest";
import { listFormations } from "../../src/tools/list-formations.js";
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

describe("listFormations", () => {
  it("returns empty when no confirmed bookings", async () => {
    fetchMock.mockImplementation(
      mockFetch([
        {
          status: 200,
          body: {
            bookings: [
              buildBooking({
                id: "b1",
                status: "CANCELLED",
                bookedEntity: {
                  title: "Cours X",
                  schedule: {
                    scheduleId: "sched-1",
                    firstSessionStart: "2026-06-15T09:00:00+0200",
                    lastSessionEnd: "2026-06-16T17:00:00+0200",
                    location: { name: "Lyon" },
                  },
                },
              }),
            ],
            pagingMetadata: { hasNext: false },
          },
        },
      ]),
    );

    const client = new WixClient(testCredentials);
    const result = await listFormations(client, { includePast: false });

    expect(result.formations).toEqual([]);
  });

  it("groups bookings by scheduleId", async () => {
    fetchMock.mockImplementation(
      mockFetch([
        {
          status: 200,
          body: {
            bookings: [
              buildBooking({
                id: "b1",
                bookedEntity: {
                  title: "Cours A",
                  schedule: {
                    scheduleId: "sched-a",
                    firstSessionStart: "2026-06-15T09:00:00+0200",
                    lastSessionEnd: "2026-06-16T17:00:00+0200",
                    location: { name: "Paris" },
                  },
                },
              }),
              buildBooking({
                id: "b2",
                bookedEntity: {
                  title: "Cours A",
                  schedule: {
                    scheduleId: "sched-a",
                    firstSessionStart: "2026-06-15T09:00:00+0200",
                    lastSessionEnd: "2026-06-16T17:00:00+0200",
                    location: { name: "Paris" },
                  },
                },
              }),
              buildBooking({
                id: "b3",
                bookedEntity: {
                  title: "Cours B",
                  schedule: {
                    scheduleId: "sched-b",
                    firstSessionStart: "2026-07-01T09:00:00+0200",
                    lastSessionEnd: "2026-07-02T17:00:00+0200",
                    location: { name: "Lyon" },
                  },
                },
              }),
            ],
            pagingMetadata: { hasNext: false },
          },
        },
      ]),
    );

    const client = new WixClient(testCredentials);
    const result = await listFormations(client, { includePast: false });

    expect(result.formations).toHaveLength(2);
    expect(result.formations[0]!.title).toBe("Cours A");
    expect(result.formations[0]!.participantCount).toBe(1); // deduplicated (same contactId)
    expect(result.formations[0]!.rawCount).toBe(2);
    expect(result.formations[1]!.title).toBe("Cours B");
  });

  it("deduplicates by contactId", async () => {
    fetchMock.mockImplementation(
      mockFetch([
        {
          status: 200,
          body: {
            bookings: [
              buildBooking({
                id: "b1",
                contactDetails: {
                  contactId: "c1",
                  firstName: "Jean",
                  lastName: "Dupont",
                  email: "jean@example.com",
                },
                bookedEntity: {
                  title: "Cours",
                  schedule: {
                    scheduleId: "sched-1",
                    firstSessionStart: "2026-06-15T09:00:00+0200",
                    lastSessionEnd: "2026-06-16T17:00:00+0200",
                    location: { name: "Paris" },
                  },
                },
              }),
              buildBooking({
                id: "b2",
                contactDetails: {
                  contactId: "c1", // same contactId
                  firstName: "Jean",
                  lastName: "Dupont",
                  email: "jean@example.com",
                },
                bookedEntity: {
                  title: "Cours",
                  schedule: {
                    scheduleId: "sched-1",
                    firstSessionStart: "2026-06-15T09:00:00+0200",
                    lastSessionEnd: "2026-06-16T17:00:00+0200",
                    location: { name: "Paris" },
                  },
                },
              }),
            ],
            pagingMetadata: { hasNext: false },
          },
        },
      ]),
    );

    const client = new WixClient(testCredentials);
    const result = await listFormations(client, { includePast: false });

    expect(result.formations).toHaveLength(1);
    expect(result.formations[0]!.participantCount).toBe(1);
    expect(result.formations[0]!.rawCount).toBe(2);
  });

  it("filters out past formations by default", async () => {
    fetchMock.mockImplementation(
      mockFetch([
        {
          status: 200,
          body: {
            bookings: [
              buildBooking({
                id: "b1",
                bookedEntity: {
                  title: "Cours Passé",
                  schedule: {
                    scheduleId: "sched-past",
                    firstSessionStart: "2020-01-01T09:00:00+0200",
                    lastSessionEnd: "2020-01-02T17:00:00+0200",
                    location: { name: "Paris" },
                  },
                },
              }),
              buildBooking({
                id: "b2",
                bookedEntity: {
                  title: "Cours Futur",
                  schedule: {
                    scheduleId: "sched-future",
                    firstSessionStart: "2030-01-01T09:00:00+0200",
                    lastSessionEnd: "2030-01-02T17:00:00+0200",
                    location: { name: "Lyon" },
                  },
                },
              }),
            ],
            pagingMetadata: { hasNext: false },
          },
        },
      ]),
    );

    const client = new WixClient(testCredentials);
    const result = await listFormations(client, { includePast: false });

    expect(result.formations).toHaveLength(1);
    expect(result.formations[0]!.title).toBe("Cours Futur");
  });

  it("includes past formations when includePast is true", async () => {
    fetchMock.mockImplementation(
      mockFetch([
        {
          status: 200,
          body: {
            bookings: [
              buildBooking({
                id: "b1",
                bookedEntity: {
                  title: "Cours Passé",
                  schedule: {
                    scheduleId: "sched-past",
                    firstSessionStart: "2020-01-01T09:00:00+0200",
                    lastSessionEnd: "2020-01-02T17:00:00+0200",
                    location: { name: "Paris" },
                  },
                },
              }),
            ],
            pagingMetadata: { hasNext: false },
          },
        },
      ]),
    );

    const client = new WixClient(testCredentials);
    const result = await listFormations(client, { includePast: true });

    expect(result.formations).toHaveLength(1);
    expect(result.formations[0]!.title).toBe("Cours Passé");
  });

  it("sorts formations by start date ascending", async () => {
    fetchMock.mockImplementation(
      mockFetch([
        {
          status: 200,
          body: {
            bookings: [
              buildBooking({
                id: "b1",
                bookedEntity: {
                  title: "Cours Août",
                  schedule: {
                    scheduleId: "sched-aug",
                    firstSessionStart: "2026-08-01T09:00:00+0200",
                    lastSessionEnd: "2026-08-02T17:00:00+0200",
                    location: { name: "Paris" },
                  },
                },
              }),
              buildBooking({
                id: "b2",
                bookedEntity: {
                  title: "Cours Juillet",
                  schedule: {
                    scheduleId: "sched-jul",
                    firstSessionStart: "2026-07-01T09:00:00+0200",
                    lastSessionEnd: "2026-07-02T17:00:00+0200",
                    location: { name: "Lyon" },
                  },
                },
              }),
            ],
            pagingMetadata: { hasNext: false },
          },
        },
      ]),
    );

    const client = new WixClient(testCredentials);
    const result = await listFormations(client, { includePast: false });

    expect(result.formations[0]!.title).toBe("Cours Juillet");
    expect(result.formations[1]!.title).toBe("Cours Août");
  });
});
