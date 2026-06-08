import { AsyncLocalStorage } from "node:async_hooks";
import type { Credentials } from "./types.js";
import { WixApiError } from "./wix-client.js";

const storage = new AsyncLocalStorage<Credentials>();

/** Wrap a callback so Wix credentials are available to all async code within it. */
export function runWithCredentials<T>(creds: Credentials, fn: () => Promise<T>): Promise<T> {
  return storage.run(creds, fn);
}

/** Retrieve the current request's Wix credentials. Throws if missing. */
export function getCredentials(): Credentials {
  // HTTP mode — credentials from AsyncLocalStorage (set per-request via headers)
  const creds = storage.getStore();
  if (creds) return creds;

  // Stdio mode — credentials from environment variables
  const token = process.env.WIX_API_TOKEN;
  const siteId = process.env.WIX_SITE_ID;
  if (token && siteId) return { token, siteId };

  throw new WixApiError(
    "Identifiants Wix manquants — fournissez WIX_API_TOKEN et WIX_SITE_ID via les variables d'environnement, ou X-Wix-Api-Token et X-Wix-Site-Id dans les en-têtes HTTP.",
  );
}
