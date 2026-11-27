/**
 * Browser-side mock database.
 *
 * - One IndexedDB object store; each collection is one record (`key = collection name`).
 * - Collections are seeded lazily from deterministic seed functions on first access.
 * - Falls back to memory when IndexedDB is unavailable (SSR, private mode, unit tests without fake-indexeddb).
 * - Bump MOCK_SEED_VERSION whenever seed data changes shape: stored data is then discarded and reseeded.
 *
 * Nothing outside src/services should import this module.
 */

import { env } from "@/config/env";
import { apiClient } from "@/lib/api/client";
import { ApiError } from "@/lib/api/api-error";

export const MOCK_SEED_VERSION = 8;

/**
 * Singleton documents the backend stores (`GET|PUT /documents/:key`). Everything else stays
 * device-local (preferences, caches) even in API mode. Prefixed keys look like `english:u-1`.
 */
const SERVER_DOCUMENTS = new Set(["systemConfig", "permissionMatrix", "aiSettings", "paymentSettings"]);
const SERVER_DOCUMENT_PREFIXES = ["gamification:", "usage:", "planSettings:", "english:", "guardianGoals:"];

export function isServerDocument(name: string): boolean {
  return !env.NEXT_PUBLIC_USE_MOCK_API && (SERVER_DOCUMENTS.has(name) || SERVER_DOCUMENT_PREFIXES.some((p) => name.startsWith(p)));
}

const DB_NAME = "shikkhaai-mock-db";
const STORE = "collections";
const META_KEY = "__meta";

type Seed<T> = () => T[];

const memory = new Map<string, unknown[]>();
const pending = new Map<string, Promise<unknown[]>>();
let dbPromise: Promise<IDBDatabase | null> | null = null;
let versionChecked: Promise<void> | null = null;

function openDb(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === "undefined") return Promise.resolve(null);
  dbPromise ??= new Promise((resolve) => {
    try {
      const request = indexedDB.open(DB_NAME, 1);
      request.onupgradeneeded = () => {
        if (!request.result.objectStoreNames.contains(STORE)) request.result.createObjectStore(STORE);
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => resolve(null);
      request.onblocked = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
  return dbPromise;
}

function tx<T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest): Promise<T | undefined> {
  return openDb().then(
    (db) =>
      new Promise<T | undefined>((resolve) => {
        if (!db) return resolve(undefined);
        try {
          const request = run(db.transaction(STORE, mode).objectStore(STORE));
          request.onsuccess = () => resolve(request.result as T);
          request.onerror = () => resolve(undefined);
        } catch {
          resolve(undefined);
        }
      }),
  );
}

const idbGet = <T>(key: string) => tx<T>("readonly", (s) => s.get(key));
const idbSet = (key: string, value: unknown) => tx("readwrite", (s) => s.put(value, key));
const idbClear = () => tx("readwrite", (s) => s.clear());

async function ensureVersion() {
  versionChecked ??= (async () => {
    const meta = await idbGet<{ version: number }>(META_KEY);
    if (meta?.version !== MOCK_SEED_VERSION) {
      await idbClear();
      await idbSet(META_KEY, { version: MOCK_SEED_VERSION, seededAt: new Date().toISOString() });
    }
  })();
  return versionChecked;
}

/** Returns the live array for a collection (seeding on first use). Treat as read-only; write via saveCollection. */
export async function getCollection<T>(name: string, seed: Seed<T>): Promise<T[]> {
  const cached = memory.get(name);
  if (cached) return cached as T[];
  const inflight = pending.get(name);
  if (inflight) return inflight as Promise<T[]>;

  const load = (async () => {
    await ensureVersion();
    let items = await idbGet<T[]>(name);
    if (!items) {
      items = seed();
      await idbSet(name, items);
    }
    memory.set(name, items);
    pending.delete(name);
    return items;
  })();
  pending.set(name, load);
  return load;
}

export async function saveCollection<T>(name: string, items: T[]): Promise<void> {
  memory.set(name, items);
  await idbSet(name, items);
}

/** Single-document collections (settings objects, singletons). Server-backed in API mode. */
export async function getDocument<T>(name: string, seed: () => T): Promise<T> {
  if (isServerDocument(name)) {
    try {
      const res = await apiClient.get<{ data: T | null }>(`/documents/${encodeURIComponent(name)}`);
      return res.data ?? seed();
    } catch (e) {
      // A document nobody saved yet: start from the default.
      if (e instanceof ApiError && e.status === 404) return seed();
      throw e;
    }
  }
  const [doc] = await getCollection<T>(name, () => [seed()]);
  return doc;
}

export async function saveDocument<T>(name: string, doc: T): Promise<void> {
  if (isServerDocument(name)) {
    await apiClient.put(`/documents/${encodeURIComponent(name)}`, doc);
    return;
  }
  await saveCollection(name, [doc]);
}

/** Wipes everything; collections reseed on next access. */
export async function resetMockDb(): Promise<void> {
  memory.clear();
  pending.clear();
  await idbClear();
  versionChecked = null;
  await ensureVersion();
}

/** Test helper. */
export function __resetMemoryForTests() {
  memory.clear();
  pending.clear();
  versionChecked = null;
  dbPromise = null;
}
