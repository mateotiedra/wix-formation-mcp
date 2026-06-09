import { z } from "zod/v4";
import type { WixClient } from "../wix-client.js";
import type { ParticipantOutput, WixBooking } from "../types.js";

export const getFormationParticipantsSchema = z.object({
  serviceId: z
    .string()
    .describe("ID du service/cours (obtenu via wix_list_services)."),
});

export type GetFormationParticipantsInput = z.infer<typeof getFormationParticipantsSchema>;

function fmtDate(dateStr: string | undefined): string {
  if (!dateStr) return "?";
  return dateStr.slice(0, 10);
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
  const bookings = (await client.fetchAllBookings()).filter(b => b.bookedEntity?.serviceId === input.serviceId);
  const confirmed = bookings.filter((b) => b.status === "CONFIRMED");

  if (confirmed.length === 0) {
    return {
      title: "?",
      location: "?",
      startDate: "?",
      endDate: "?",
      participantCount: 0,
      participants: [],
    };
  }

  const first = confirmed[0]!;
  const title = first.bookedEntity?.title ?? "?";
  const sched = first.bookedEntity?.schedule;
  const location = sched?.location?.name ?? "?";
  const startDate = fmtDate(sched?.firstSessionStart);
  const endDate = fmtDate(sched?.lastSessionEnd);

  const participants: ParticipantOutput[] = confirmed.map((b) => {
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
  });

  return {
    title,
    location,
    startDate,
    endDate,
    participantCount: participants.length,
    participants,
  };
}
