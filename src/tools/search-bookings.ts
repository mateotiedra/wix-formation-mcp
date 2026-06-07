import { z } from "zod/v4";
import type { WixClient } from "../wix-client.js";
import type { SearchResultOutput } from "../types.js";

export const searchBookingsSchema = z.object({
  query: z
    .string()
    .describe("Terme de recherche — correspond au prénom, nom, email ou téléphone."),
  includeNonConfirmed: z
    .boolean()
    .default(false)
    .describe("Inclure les réservations ANNULÉES/REFUSÉES. Défaut: false (CONFIRMÉES uniquement)."),
});

export type SearchBookingsInput = z.infer<typeof searchBookingsSchema>;

function fmtDate(dateStr: string | undefined): string {
  if (!dateStr) return "?";
  return dateStr.slice(0, 10);
}

export async function searchBookings(
  client: WixClient,
  input: SearchBookingsInput,
): Promise<{ results: SearchResultOutput[] }> {
  const allBookings = await client.fetchAllBookings();

  const q = input.query.toLowerCase().trim();

  const byStatus = input.includeNonConfirmed
    ? allBookings
    : allBookings.filter((b) => b.status === "CONFIRMED");

  const matched = byStatus.filter((b) => {
    const c = b.contactDetails;
    const first = (c.firstName ?? "").toLowerCase();
    const last = (c.lastName ?? "").toLowerCase();
    const email = (c.email ?? "").toLowerCase();
    const phone = (c.phone ?? "").toLowerCase();
    const fullName = `${first} ${last}`.trim();

    return fullName.includes(q) || email.includes(q) || phone.includes(q);
  });

  return {
    results: matched.map((b) => {
      const c = b.contactDetails;
      const sched = b.bookedEntity?.schedule;
      return {
        firstName: c.firstName ?? "",
        lastName: c.lastName ?? "",
        email: c.email ?? "",
        phone: c.phone ?? "",
        courseTitle: b.bookedEntity?.title ?? "?",
        startDate: fmtDate(sched?.firstSessionStart),
        endDate: fmtDate(sched?.lastSessionEnd),
        status: b.status,
        paymentStatus: b.paymentStatus ?? "",
        addOns: (b.bookedAddOns ?? []).map((a) => a.name ?? "").filter(Boolean),
      };
    }),
  };
}
