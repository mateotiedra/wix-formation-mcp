import { z } from "zod/v4";
import type { WixClient } from "../wix-client.js";
import type { FormationOutput, WixBooking } from "../types.js";

export const listFormationsSchema = z.object({
  includePast: z
    .boolean()
    .default(false)
    .describe("Inclure les formations déjà terminées. Défaut: false (à venir uniquement)."),
});

export type ListFormationsInput = z.infer<typeof listFormationsSchema>;

function parseDate(dateStr: string | undefined): Date | null {
  if (!dateStr) return null;
  const clean = dateStr.replace(/([+-]\d{2}):(\d{2})$/, "$1$2");
  const d = new Date(clean);
  return isNaN(d.getTime()) ? null : d;
}

function fmtDate(dateStr: string | undefined): string {
  if (!dateStr) return "?";
  return dateStr.slice(0, 10);
}

export async function listFormations(
  client: WixClient,
  input: ListFormationsInput,
): Promise<{ formations: FormationOutput[] }> {
  const allBookings = await client.fetchAllBookings();

  const confirmed = allBookings.filter((b) => b.status === "CONFIRMED");

  // Aggregate by scheduleId with deduplication by contactId
  const schedules: Record<
    string,
    {
      title: string;
      location: string;
      start: string;
      end: string;
      startDt: Date | null;
      contactIds: Set<string>;
      rawCount: number;
    }
  > = {};

  for (const b of confirmed) {
    const sched = b.bookedEntity?.schedule;
    const sid = sched?.scheduleId;
    if (!sid) continue;

    const title = b.bookedEntity?.title ?? "";
    const location = sched.location?.name ?? "";
    const start = sched.firstSessionStart ?? "";
    const end = sched.lastSessionEnd ?? "";
    const contactId = b.contactDetails?.contactId ?? "";

    if (!schedules[sid]) {
      schedules[sid] = {
        title,
        location,
        start,
        end,
        startDt: parseDate(start),
        contactIds: new Set(),
        rawCount: 0,
      };
    }

    schedules[sid].rawCount++;
    if (contactId) schedules[sid].contactIds.add(contactId);
  }

  let entries = Object.entries(schedules);

  // Time filter
  if (!input.includePast) {
    const now = new Date();
    entries = entries.filter(([, v]) => v.startDt && v.startDt > now);
  }

  // Sort by start date ASC
  entries.sort((a, b) => {
    const da = a[1].startDt?.getTime() ?? 0;
    const db = b[1].startDt?.getTime() ?? 0;
    return da - db;
  });

  return {
    formations: entries.map(([scheduleId, s]) => ({
      scheduleId,
      title: s.title,
      location: s.location,
      startDate: fmtDate(s.start),
      endDate: fmtDate(s.end),
      participantCount: s.contactIds.size,
      rawCount: s.rawCount,
    })),
  };
}
