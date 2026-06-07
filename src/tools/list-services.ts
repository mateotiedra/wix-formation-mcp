import { z } from "zod/v4";
import type { WixClient } from "../wix-client.js";
import type { ServiceOutput } from "../types.js";

export const listServicesSchema = z.object({
  includeHidden: z
    .boolean()
    .default(false)
    .describe("Inclure les services masqués/archivés. Défaut: false."),
});

export type ListServicesInput = z.infer<typeof listServicesSchema>;

export async function listServices(
  client: WixClient,
  input: ListServicesInput,
): Promise<{ services: ServiceOutput[] }> {
  const { services } = await client.listServices();

  const filtered = input.includeHidden
    ? services
    : services.filter((s) => !s.hidden);

  return {
    services: filtered.map((s) => client.formatService(s)),
  };
}
