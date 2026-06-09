import { describe, it, expect, vi, beforeEach } from "vitest";
import { listCourses } from "../../src/tools/list-courses.js";
import { WixClient } from "../../src/wix-client.js";
import { mockFetch, testCredentials, sampleService, sampleBooking } from "../helpers.js";

const fetchMock = vi.fn();
vi.stubGlobal("fetch", fetchMock);

beforeEach(() => {
  fetchMock.mockReset();
});

function svc(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return { ...sampleService, ...overrides };
}

function bk(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    ...sampleBooking,
    bookedEntity: {
      ...(sampleBooking.bookedEntity as Record<string, unknown>),
      serviceId: "svc-1",
    },
    ...overrides,
  };
}

// Helper: set up mocks for listServices (call 1) + fetchAllBookings (call 2)
function setupMocks(
  servicesBody: unknown,
  bookingsBody: unknown,
) {
  fetchMock.mockImplementation(
    mockFetch([
      { status: 200, body: servicesBody },
      { status: 200, body: bookingsBody },
    ]),
  );
}

describe("listCourses", () => {
  it("returns courses with enrollment data", async () => {
    setupMocks(
      { services: [sampleService] },
      {
        bookings: [
          bk({ contactDetails: { contactId: "c1", firstName: "Alice", lastName: "M" } }),
          bk({ id: "b2", contactDetails: { contactId: "c2", firstName: "Bob", lastName: "D" } }),
        ],
        pagingMetadata: { hasNext: false },
      },
    );

    const client = new WixClient(testCredentials);
    const result = await listCourses(client, {
      includeHidden: false,
      includePast: false,
      includeEmpty: false,
    });

    expect(result.courses).toHaveLength(1);
    const c = result.courses[0]!;
    expect(c.id).toBe("svc-1");
    expect(c.name).toBe("Formation A");
    expect(c.type).toBe("COURSE");
    expect(c.hidden).toBe(false);
    expect(c.defaultCapacity).toBe(10);
    expect(c.price).toBe("500 EUR");
    expect(c.location).toBe("Paris");
    expect(c.startDate).toBe("2026-06-15");
    expect(c.endDate).toBe("2026-06-16");
    expect(c.participantCount).toBe(2);
    expect(c.rawCount).toBe(2);
  });

  it("hides hidden services by default", async () => {
    setupMocks(
      {
        services: [
          sampleService,
          svc({ id: "svc-hidden", name: "Cours Caché", hidden: true }),
        ],
      },
      {
        bookings: [
          bk(),
          bk({ id: "b2", bookedEntity: { ...sampleBooking.bookedEntity, serviceId: "svc-hidden", title: "Cours Caché" } }),
        ],
        pagingMetadata: { hasNext: false },
      },
    );

    const client = new WixClient(testCredentials);
    const result = await listCourses(client, {
      includeHidden: false,
      includePast: false,
      includeEmpty: false,
    });

    expect(result.courses).toHaveLength(1);
    expect(result.courses[0]!.id).toBe("svc-1");
  });

  it("includes hidden services when includeHidden is true", async () => {
    setupMocks(
      {
        services: [
          sampleService,
          svc({ id: "svc-hidden", name: "Cours Caché", hidden: true }),
        ],
      },
      {
        bookings: [
          bk(),
          bk({
            id: "b2",
            bookedEntity: {
              ...sampleBooking.bookedEntity,
              serviceId: "svc-hidden",
              title: "Cours Caché",
            },
          }),
        ],
        pagingMetadata: { hasNext: false },
      },
    );

    const client = new WixClient(testCredentials);
    const result = await listCourses(client, {
      includeHidden: true,
      includePast: false,
      includeEmpty: false,
    });

    expect(result.courses).toHaveLength(2);
  });

  it("hides past formations by default", async () => {
    setupMocks(
      {
        services: [
          svc({ id: "svc-futur", name: "Futur", schedule: { firstSessionStart: "2030-01-01T09:00:00+0200", lastSessionEnd: "2030-01-02T17:00:00+0200" } }),
          svc({ id: "svc-passe", name: "Passé", schedule: { firstSessionStart: "2020-01-01T09:00:00+0200", lastSessionEnd: "2020-01-02T17:00:00+0200" } }),
        ],
      },
      {
        bookings: [
          bk({ bookedEntity: { ...sampleBooking.bookedEntity, serviceId: "svc-futur", title: "Futur", schedule: { ...(sampleBooking.bookedEntity as Record<string,unknown>).schedule, firstSessionStart: "2030-01-01T09:00:00+0200", lastSessionEnd: "2030-01-02T17:00:00+0200" } } }),
          bk({ id: "b2", bookedEntity: { ...sampleBooking.bookedEntity, serviceId: "svc-passe", title: "Passé", schedule: { ...(sampleBooking.bookedEntity as Record<string,unknown>).schedule, firstSessionStart: "2020-01-01T09:00:00+0200", lastSessionEnd: "2020-01-02T17:00:00+0200" } } }),
        ],
        pagingMetadata: { hasNext: false },
      },
    );

    const client = new WixClient(testCredentials);
    const result = await listCourses(client, {
      includeHidden: false,
      includePast: false,
      includeEmpty: false,
    });

    expect(result.courses).toHaveLength(1);
    expect(result.courses[0]!.name).toBe("Futur");
  });

  it("includes past formations when includePast is true", async () => {
    setupMocks(
      {
        services: [
          svc({ id: "svc-passe", name: "Passé", schedule: { firstSessionStart: "2020-01-01T09:00:00+0200", lastSessionEnd: "2020-01-02T17:00:00+0200" } }),
        ],
      },
      {
        bookings: [
          bk({ bookedEntity: { ...sampleBooking.bookedEntity, serviceId: "svc-passe", title: "Passé", schedule: { ...(sampleBooking.bookedEntity as Record<string,unknown>).schedule, firstSessionStart: "2020-01-01T09:00:00+0200", lastSessionEnd: "2020-01-02T17:00:00+0200" } } }),
        ],
        pagingMetadata: { hasNext: false },
      },
    );

    const client = new WixClient(testCredentials);
    const result = await listCourses(client, {
      includeHidden: false,
      includePast: true,
      includeEmpty: false,
    });

    expect(result.courses).toHaveLength(1);
    expect(result.courses[0]!.name).toBe("Passé");
  });

  it("hides courses with no bookings by default", async () => {
    setupMocks(
      { services: [sampleService] },
      { bookings: [], pagingMetadata: { hasNext: false } },
    );

    const client = new WixClient(testCredentials);
    const result = await listCourses(client, {
      includeHidden: false,
      includePast: false,
      includeEmpty: false,
    });

    expect(result.courses).toHaveLength(0);
  });

  it("includes empty courses when includeEmpty is true", async () => {
    setupMocks(
      { services: [sampleService] },
      { bookings: [], pagingMetadata: { hasNext: false } },
    );

    const client = new WixClient(testCredentials);
    const result = await listCourses(client, {
      includeHidden: false,
      includePast: false,
      includeEmpty: true,
    });

    expect(result.courses).toHaveLength(1);
    const c = result.courses[0]!;
    expect(c.id).toBe("svc-1");
    expect(c.participantCount).toBe(0);
    expect(c.rawCount).toBe(0);
    expect(c.location).toBe("?");
  });

  it("deduplicates participants by contactId", async () => {
    setupMocks(
      { services: [sampleService] },
      {
        bookings: [
          bk({ contactDetails: { contactId: "c1", firstName: "Alice" } }),
          bk({ id: "b2", contactDetails: { contactId: "c1", firstName: "Alice" } }),
          bk({ id: "b3", contactDetails: { contactId: "c2", firstName: "Bob" } }),
        ],
        pagingMetadata: { hasNext: false },
      },
    );

    const client = new WixClient(testCredentials);
    const result = await listCourses(client, {
      includeHidden: false,
      includePast: false,
      includeEmpty: false,
    });

    expect(result.courses).toHaveLength(1);
    expect(result.courses[0]!.participantCount).toBe(2);
    expect(result.courses[0]!.rawCount).toBe(3);
  });

  it("sorts courses by start date ascending", async () => {
    setupMocks(
      {
        services: [
          svc({ id: "svc-aug", name: "Août", schedule: { firstSessionStart: "2026-08-01T09:00:00+0200", lastSessionEnd: "2026-08-02T17:00:00+0200" } }),
          svc({ id: "svc-jul", name: "Juillet", schedule: { firstSessionStart: "2026-07-01T09:00:00+0200", lastSessionEnd: "2026-07-02T17:00:00+0200" } }),
        ],
      },
      {
        bookings: [
          bk({ bookedEntity: { ...sampleBooking.bookedEntity, serviceId: "svc-aug", title: "Août", schedule: { ...(sampleBooking.bookedEntity as Record<string,unknown>).schedule, firstSessionStart: "2026-08-01T09:00:00+0200" } } }),
          bk({ id: "b2", bookedEntity: { ...sampleBooking.bookedEntity, serviceId: "svc-jul", title: "Juillet", schedule: { ...(sampleBooking.bookedEntity as Record<string,unknown>).schedule, firstSessionStart: "2026-07-01T09:00:00+0200" } } }),
        ],
        pagingMetadata: { hasNext: false },
      },
    );

    const client = new WixClient(testCredentials);
    const result = await listCourses(client, {
      includeHidden: false,
      includePast: false,
      includeEmpty: false,
    });

    expect(result.courses).toHaveLength(2);
    expect(result.courses[0]!.name).toBe("Juillet");
    expect(result.courses[1]!.name).toBe("Août");
  });

  it("handles empty services list", async () => {
    setupMocks(
      { services: [] },
      { bookings: [], pagingMetadata: { hasNext: false } },
    );

    const client = new WixClient(testCredentials);
    const result = await listCourses(client, {
      includeHidden: false,
      includePast: false,
      includeEmpty: false,
    });

    expect(result.courses).toEqual([]);
  });

  it("handles only cancelled bookings", async () => {
    setupMocks(
      { services: [sampleService] },
      {
        bookings: [
          bk({ status: "CANCELLED" }),
        ],
        pagingMetadata: { hasNext: false },
      },
    );

    const client = new WixClient(testCredentials);
    const result = await listCourses(client, {
      includeHidden: false,
      includePast: false,
      includeEmpty: false,
    });

    // No confirmed bookings, and includeEmpty=false → no courses
    expect(result.courses).toHaveLength(0);
  });

  it("falls back to schedule date join when serviceId missing", async () => {
    const bkNoSvcId = {
      ...sampleBooking,
      bookedEntity: {
        ...(sampleBooking.bookedEntity as Record<string, unknown>),
        // no serviceId
        title: "Match par date",
        schedule: {
          scheduleId: "sched-1",
          firstSessionStart: "2026-06-15T09:00:00+0200",
          lastSessionEnd: "2026-06-16T17:00:00+0200",
          location: { name: "Lyon" },
        },
      },
    };

    fetchMock.mockImplementation(
      mockFetch([
        { status: 200, body: { services: [sampleService] } },
        { status: 200, body: { bookings: [bkNoSvcId], pagingMetadata: { hasNext: false } } },
      ]),
    );

    const client = new WixClient(testCredentials);
    const result = await listCourses(client, {
      includeHidden: false,
      includePast: false,
      includeEmpty: false,
    });

    expect(result.courses).toHaveLength(1);
    expect(result.courses[0]!.location).toBe("Lyon");
    expect(result.courses[0]!.participantCount).toBe(1);
  });
});
