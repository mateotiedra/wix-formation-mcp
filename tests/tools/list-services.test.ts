import { describe, it, expect, vi, beforeEach } from "vitest";
import { listServices } from "../../src/tools/list-services.js";
import { WixClient } from "../../src/wix-client.js";
import { mockFetch, testCredentials, sampleService } from "../helpers.js";

const fetchMock = vi.fn();
vi.stubGlobal("fetch", fetchMock);

beforeEach(() => {
  fetchMock.mockReset();
});

describe("listServices", () => {
  it("returns visible services by default", async () => {
    const hiddenSvc = { ...sampleService, id: "svc-hidden", hidden: true };
    fetchMock.mockImplementation(
      mockFetch([
        { status: 200, body: { services: [sampleService, hiddenSvc] } },
      ]),
    );

    const client = new WixClient(testCredentials);
    const result = await listServices(client, { includeHidden: false });

    expect(result.services).toHaveLength(1);
    expect(result.services[0]!.id).toBe("svc-1");
  });

  it("includes hidden services when includeHidden is true", async () => {
    const hiddenSvc = { ...sampleService, id: "svc-hidden", hidden: true };
    fetchMock.mockImplementation(
      mockFetch([
        { status: 200, body: { services: [sampleService, hiddenSvc] } },
      ]),
    );

    const client = new WixClient(testCredentials);
    const result = await listServices(client, { includeHidden: true });

    expect(result.services).toHaveLength(2);
  });

  it("handles empty services list", async () => {
    fetchMock.mockImplementation(
      mockFetch([{ status: 200, body: { services: [] } }]),
    );

    const client = new WixClient(testCredentials);
    const result = await listServices(client, { includeHidden: false });

    expect(result.services).toEqual([]);
  });

  it("formats service output correctly", async () => {
    fetchMock.mockImplementation(
      mockFetch([{ status: 200, body: { services: [sampleService] } }]),
    );

    const client = new WixClient(testCredentials);
    const result = await listServices(client, { includeHidden: false });

    const svc = result.services[0]!;
    expect(svc.id).toBe("svc-1");
    expect(svc.name).toBe("Formation A");
    expect(svc.type).toBe("COURSE");
    expect(svc.hidden).toBe(false);
    expect(svc.price).toBe("500 EUR");
  });
});
