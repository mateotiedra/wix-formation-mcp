# Wix Bookings MCP Server

Serveur MCP (Model Context Protocol) exposant les outils de l'API Wix Bookings pour la gestion des cours et la recherche de participants.

## Outils

| Outil | Description |
|-------|-------------|
| `list_courses` | Lister les cours/formations avec métadonnées (ID, nom, type, prix, capacité) et données d'inscription (lieu, nombre de participants). Utiliser pour découvrir les IDs nécessaires à `get_formation_participants`. |
| `get_formation_participants` | Obtenir la liste détaillée des participants d'un cours (noms, emails, statuts). |
| `search_bookings` | Rechercher des réservations par nom, email ou téléphone. |

## Identifiants

Les identifiants Wix sont passés de deux façons selon le mode :

- **Mode stdio** : via les variables d'environnement `WIX_API_TOKEN` et `WIX_SITE_ID`.
- **Mode HTTP** : via les en-têtes HTTP `X-Wix-Api-Token` et `X-Wix-Site-Id`.

## Modes de transport

### Stdio (par défaut avec `--stdio`)

```bash
WIX_API_TOKEN=xxx WIX_SITE_ID=yyy npx -y github:mateotiedra/wix-formation-mcp --stdio
```

### HTTP

```bash
docker run -p 3000:3000 wix-bookings-mcp
```

Le serveur écoute sur le port `3000` (configurable via `PORT`).

Exemple de configuration client MCP (HTTP) :

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

# Lancer en mode développement (HTTP)
npm run dev

# Compiler
npm run build

# Lancer les tests
npm test
```
