import { z } from "zod/v4";
import type { WixClient } from "../wix-client.js";
import type { ParticipantOutput, WixBooking } from "../types.js";
import { fmtDate, parseDate, dateMatch } from "./shared.js";

export const getFormationParticipantsSchema = z.object({
  serviceId: z
    .string()
    .describe("ID du service/cours (obtenu via wix_list_services)."),
});

export type GetFormationParticipantsInput = z.infer<typeof getFormationParticipantsSchema>;

function toParticipant(b: WixBooking): ParticipantOutput {
  const c = b.contactDetails;
  return {
    firstName: c.firstName ?? "",
    lastName: c.lastName ?? "",
    email: c.email ?? "",
    phone: c.phone ?? "",
    status: b.status,
    paymentStatus: b.paymentStatus ?? "",
    addOns: (b.bookedAddOns ?? []).map((a) => a.name ?? "").filter(Boolean),
  };
}

export async function getFormationParticipants(
  client: WixClient,
  input: GetFormationParticipantsInput,
): Promise<{
  title: string;
  location: string;
  startDate: string;
  endDate: string;
  participantCount: number;
  participants: ParticipantOutput[];
}> {
  // Fetch the service to get its schedule (needed for orphan fallback)
  const { services } = await client.listServices();
  const svc = services.find((s) => s.id === input.serviceId);
  const svcSched = svc?.schedule ?? {};
  const svcFirst = svcSched.firstSessionStart;
  const svcLast = svcSched.lastSessionEnd;

  // Fetch all bookings and filter to CONFIRMED only
  const allBookings = await client.fetchAllBookings();
  const confirmed = allBookings.filter((b) => b.status === "CONFIRMED");

  // Strategy 1: direct serviceId match
  let matched = confirmed.filter(
    (b) => b.bookedEntity?.serviceId === input.serviceId,
  );

  // Strategy 2: orphan fallback — bookings without serviceId that match by schedule dates
  if (matched.length === 0 && svcFirst && svcLast) {
    matched = confirmed.filter(
      (b) =>
        !b.bookedEntity?.serviceId &&
        dateMatch(
          svcFirst,
          svcLast,
          b.bookedEntity?.schedule?.firstSessionStart,
          b.bookedEntity?.schedule?.lastSessionEnd,
        ),
    );
  }

  if (matched.length === 0) {
    return {
      title: svc?.name ?? "?",
      location: "?",
      startDate: fmtDate(svcFirst),
      endDate: fmtDate(svcLast),
      participantCount: 0,
      participants: [],
    };
  }

  const first = matched[0]!;
  const title = first.bookedEntity?.title ?? svc?.name ?? "?";
  const sched = first.bookedEntity?.schedule;
  const location = sched?.location?.name ?? "?";
  const startDate = fmtDate(sched?.firstSessionStart ?? svcFirst);
  const endDate = fmtDate(sched?.lastSessionEnd ?? svcLast);

  const participants = matched.map(toParticipant);

  return {
    title,
    location,
    startDate,
    endDate,
    participantCount: participants.length,
    participants,
  };
}
