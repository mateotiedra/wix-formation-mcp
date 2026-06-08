import { McpServer } from "@modelcontextprotocol/server";
import { z } from "zod/v4";
import { getCredentials } from "./wix-context.js";
import { WixClient, WixApiError } from "./wix-client.js";
import {
  listServices,
  listServicesSchema,
} from "./tools/list-services.js";
import {
  listFormations,
  listFormationsSchema,
} from "./tools/list-formations.js";
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

  // ── list_services ──────────────────────────────────────────────────

  server.registerTool(
    "list_services",
    {
      description:
        "Lister les services Wix Bookings (cours) de Physio 7. Retourne l'ID, le nom, le type, les dates, la capacité et le prix de chaque service. Utiliser cet outil pour obtenir les IDs nécessaires aux autres outils Wix, ou pour voir quels cours existent. Par défaut, seuls les services visibles sont retournés.",
      inputSchema: listServicesSchema,
    },
    async (params) => {
      const creds = getCredentials();
      const client = new WixClient(creds);
      const result = await listServices(client, params);
      return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }] };
    },
  );

  // ── list_formations ────────────────────────────────────────────────

  server.registerTool(
    "list_formations",
    {
      description:
        "Lister les formations (cours) avec le nombre de participants dédupliqué, triées par date de début. Utiliser cet outil pour voir les formations à venir, leur disponibilité, ou le nombre d'inscrits. Par défaut, seules les formations à venir avec des réservations CONFIRMÉES sont incluses.",
      inputSchema: listFormationsSchema,
    },
    async (params) => {
      const creds = getCredentials();
      const client = new WixClient(creds);
      const result = await listFormations(client, params);
      return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }] };
    },
  );

  // ── get_formation_participants ─────────────────────────────────────

  server.registerTool(
    "get_formation_participants",
    {
      description:
        "Obtenir la liste détaillée des participants d'un cours spécifique (noms, emails, statuts, options). Nécessite l'ID du service/cours obtenu via list_services.",
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
