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
  const creds = storage.getStore();
  if (!creds) {
    throw new WixApiError(
      "Identifiants Wix manquants — fournissez X-Wix-Api-Token et X-Wix-Site-Id dans les en-têtes HTTP.",
    );
  }
  return creds;
}
