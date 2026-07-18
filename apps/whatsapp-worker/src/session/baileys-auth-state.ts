import { BufferJSON, initAuthCreds, proto } from "@whiskeysockets/baileys";
import type { AuthenticationState, SignalDataTypeMap } from "@whiskeysockets/baileys";
import { decrypt, encrypt } from "./encryption.js";
import type { SessionStore } from "./session-store.js";

interface SerializedAuthState {
  creds: ReturnType<typeof initAuthCreds>;
  keys: Partial<Record<keyof SignalDataTypeMap, Record<string, unknown>>>;
}

export interface EncryptedAuthState {
  state: AuthenticationState;
  saveCreds: () => Promise<void>;
}

/**
 * Baileys auth state (creds + signal keys) backed by a single encrypted
 * blob in Supabase Storage instead of a local folder of files — the
 * whole point being the worker process can restart on any host without
 * re-scanning the QR code.
 */
export async function createEncryptedAuthState(options: {
  tenantId: string;
  store: SessionStore;
  encryptionKey: string;
}): Promise<EncryptedAuthState> {
  const { tenantId, store, encryptionKey } = options;

  const existing = await store.read(tenantId);
  const parsed: SerializedAuthState = existing
    ? (JSON.parse(decrypt(existing, encryptionKey), BufferJSON.reviver) as SerializedAuthState)
    : { creds: initAuthCreds(), keys: {} };

  const creds = parsed.creds;
  const keys = parsed.keys;

  // Baileys can call keys.set() many times in quick succession while
  // establishing a session; chain writes so we never upload two
  // overlapping (and out-of-order) versions of the encrypted blob.
  let writeQueue: Promise<void> = Promise.resolve();
  const persist = (): Promise<void> => {
    writeQueue = writeQueue.then(async () => {
      const serialized = JSON.stringify({ creds, keys }, BufferJSON.replacer);
      await store.write(tenantId, encrypt(serialized, encryptionKey));
    });
    return writeQueue;
  };

  const state: AuthenticationState = {
    creds,
    keys: {
      get: async (type, ids) => {
        const result: { [id: string]: SignalDataTypeMap[typeof type] } = {};
        for (const id of ids) {
          let value = keys[type]?.[id];
          if (type === "app-state-sync-key" && value) {
            value = proto.Message.AppStateSyncKeyData.fromObject(value as object);
          }
          if (value !== undefined) {
            result[id] = value as SignalDataTypeMap[typeof type];
          }
        }
        return result;
      },
      set: async (data) => {
        for (const category of Object.keys(data) as (keyof SignalDataTypeMap)[]) {
          const entries = data[category];
          if (!entries) continue;
          keys[category] ??= {};
          const bucket = keys[category] as Record<string, unknown>;
          for (const id of Object.keys(entries)) {
            const value = (entries as Record<string, unknown>)[id];
            if (value) {
              bucket[id] = value;
            } else {
              delete bucket[id];
            }
          }
        }
        await persist();
      },
    },
  };

  return {
    state,
    saveCreds: persist,
  };
}
