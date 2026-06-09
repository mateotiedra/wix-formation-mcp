import { z } from "zod/v4";
import type { WixClient } from "../wix-client.js";
import type { CourseOutput, WixBooking } from "../types.js";
import { fmtDate, parseDate, dateMatch } from "./shared.js";

export const listCoursesSchema = z.object({
  includeHidden: z
    .boolean()
    .default(false)
    .describe("Inclure les services masqués/archivés. Défaut: false."),
  includePast: z
    .boolean()
    .default(false)
    .describe("Inclure les formations déjà terminées. Défaut: false (à venir uniquement)."),
  includeEmpty: z
    .boolean()
    .default(false)
    .describe("Inclure les cours sans réservations confirmées. Défaut: false."),
});

export type ListCoursesInput = z.infer<typeof listCoursesSchema>;

export async function listCourses(
  client: WixClient,
  input: ListCoursesInput,
): Promise<{ courses: CourseOutput[] }> {
  const [{ services }, allBookings] = await Promise.all([
    client.listServices(),
    client.fetchAllBookings(),
  ]);

  // Filter services
  const visibleServices = input.includeHidden
    ? services
    : services.filter((s) => !s.hidden);

  // Only confirmed bookings
  const confirmed = allBookings.filter((b) => b.status === "CONFIRMED");

  // Group confirmed bookings by serviceId (deduplicate by contactId).
  // Bookings without serviceId are kept in a separate array for fallback join.
  type BookingGroup = {
    location: string;
    start: string;
    end: string;
    startDt: Date | null;
    contactIds: Set<string>;
    rawCount: number;
  };

  const bookingBySvc = new Map<string, BookingGroup>();
  const orphanBookings: { svcId: string; group: BookingGroup }[] = [];

  for (const b of confirmed) {
    const sched = b.bookedEntity?.schedule;
    const svcId = b.bookedEntity?.serviceId;

    const location = sched?.location?.name ?? "";
    const start = sched?.firstSessionStart ?? "";
    const end = sched?.lastSessionEnd ?? "";
    const contactId = b.contactDetails?.contactId ?? "";

    if (svcId) {
      let group = bookingBySvc.get(svcId);
      if (!group) {
        group = {
          location,
          start,
          end,
          startDt: parseDate(start),
          contactIds: new Set(),
          rawCount: 0,
        };
        bookingBySvc.set(svcId, group);
      }
      group.rawCount++;
      if (contactId) group.contactIds.add(contactId);
    } else {
      // Booking without serviceId — build a one-off group for fallback matching
      orphanBookings.push({
        svcId: "",
        group: {
          location,
          start,
          end,
          startDt: parseDate(start),
          contactIds: new Set(contactId ? [contactId] : []),
          rawCount: 1,
        },
      });
    }
  }

  // Build course list
  const now = new Date();
  const courses: CourseOutput[] = [];

  for (const svc of visibleServices) {
    const group = bookingBySvc.get(svc.id);
    let finalGroup = group;

    // If no direct match, try fallback join by schedule dates against orphan bookings
    if (!finalGroup) {
      const svcSched = svc.schedule ?? {};
      for (const orphan of orphanBookings) {
        if (dateMatch(svcSched.firstSessionStart, svcSched.lastSessionEnd, orphan.group.start, orphan.group.end)) {
          finalGroup = orphan.group;
          break;
        }
      }
    }

    const startDate =
      finalGroup?.start || svc.schedule?.firstSessionStart || "?";
    const endDate =
      finalGroup?.end || svc.schedule?.lastSessionEnd || "?";
    const startDt = parseDate(startDate);

    // Time filter
    if (!input.includePast && startDt && startDt <= now) continue;

    // Empty filter
    if (!input.includeEmpty && !finalGroup) continue;

    const location = finalGroup?.location ?? "?";
    const participantCount = finalGroup?.contactIds.size ?? 0;
    const rawCount = finalGroup?.rawCount ?? 0;

    courses.push({
      id: svc.id,
      name: svc.name,
      type: svc.type,
      hidden: svc.hidden,
      defaultCapacity: svc.defaultCapacity,
      price: client.formatService(svc).price,
      location,
      startDate: fmtDate(startDate),
      endDate: fmtDate(endDate),
      participantCount,
      rawCount,
    });
  }

  // Sort by start date ASC
  courses.sort((a, b) => {
    const da = parseDate(a.startDate)?.getTime() ?? 0;
    const db = parseDate(b.startDate)?.getTime() ?? 0;
    return da - db;
  });

  return { courses };
}
