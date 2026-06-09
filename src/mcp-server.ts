import { McpServer } from "@modelcontextprotocol/server";
import { z } from "zod/v4";
import { getCredentials } from "./wix-context.js";
import { WixClient, WixApiError } from "./wix-client.js";
import {
  listCourses,
  listCoursesSchema,
} from "./tools/list-courses.js";
import {
  getFormationParticipants,
  getFormationParticipantsSchema,
} from "./tools/get-formation-participants.js";
import {
  searchBookings,
  searchBookingsSchema,
} from "./tools/search-bookings.js";

export function createServer(): McpServer {
  const server = new McpServer({
    name: "wix-bookings",
    version: "0.1.0",
  });

  // ── list_courses ───────────────────────────────────────────────────

  server.registerTool(
    "list_courses",
    {
      description:
        "Lister les cours/formations de Physio 7 avec leurs métadonnées (ID, nom, type, prix, capacité) et leurs données d'inscription (lieu, nombre de participants dédupliqué). Combiner cet outil avec get_formation_participants (qui nécessite l'ID du cours) pour obtenir la liste détaillée des participants. Par défaut, masque les services cachés, les formations passées, et les cours sans réservations.",
      inputSchema: listCoursesSchema,
    },
    async (params) => {
      const creds = getCredentials();
      const client = new WixClient(creds);
      const result = await listCourses(client, params);
      return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }] };
    },
  );

  // ── get_formation_participants ─────────────────────────────────────

  server.registerTool(
    "get_formation_participants",
    {
      description:
        "Obtenir la liste détaillée des participants d'un cours spécifique (noms, emails, statuts, options). Nécessite l'ID du service/cours obtenu via list_courses.",
      inputSchema: getFormationParticipantsSchema,
    },
    async (params) => {
      const creds = getCredentials();
      const client = new WixClient(creds);
      const result = await getFormationParticipants(client, params);
      return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }] };
    },
  );

  // ── search_bookings ─────────────────────────────────────────────────

  server.registerTool(
    "search_bookings",
    {
      description:
        "Rechercher des réservations par nom, email ou téléphone. Utiliser pour vérifier si une personne est inscrite, son statut, ou les détails de son cours. La recherche est insensible à la casse et couvre TOUTES les réservations (pas seulement à venir).",
      inputSchema: searchBookingsSchema,
    },
    async (params) => {
      const creds = getCredentials();
      const client = new WixClient(creds);
      const result = await searchBookings(client, params);
      return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }] };
    },
  );

  return server;
}
