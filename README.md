# Wix Bookings MCP Server

Serveur MCP (Model Context Protocol) exposant les outils de l'API Wix Bookings pour la gestion des cours et la recherche de participants.

## Outils

| Outil | Description |
|-------|-------------|
| `wix_list_services` | Lister les services Wix Bookings (cours). Retourne ID, nom, type, dates, capacité et prix. |
| `wix_list_formations` | Lister les formations avec le nombre de participants dédupliqué, triées par date. |
| `wix_get_formation_participants` | Obtenir la liste détaillée des participants d'un cours (noms, emails, statuts). |
| `wix_search_bookings` | Rechercher des réservations par nom, email ou téléphone. |

## Identifiants

Les identifiants Wix sont passés via les en-têtes HTTP à chaque requête :

- `X-Wix-Api-Token` — Token d'API Wix
- `X-Wix-Site-Id` — ID du site Wix

## Déploiement (Docker)

```bash
# Construire l'image
docker build -t wix-bookings-mcp .

# Lancer le serveur
docker run -p 3000:3000 wix-bookings-mcp
```

Le serveur écoute sur le port `3000` (configurable via `PORT`).

### Configuration client MCP

Exemple de configuration pour un client MCP (Claude Desktop, etc.) :

```json
{
  "mcpServers": {
    "wix-bookings": {
      "url": "http://localhost:3000/mcp",
      "headers": {
        "X-Wix-Api-Token": "votre-token",
        "X-Wix-Site-Id": "votre-site-id"
      }
    }
  }
}
```

## Développement

```bash
# Installer les dépendances
npm install

# Lancer en mode développement
npm run dev

# Compiler
npm run build

# Lancer les tests
npm test
```
