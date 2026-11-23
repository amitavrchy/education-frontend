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

export const MOCK_SEED_VERSION = 7;

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

/** Single-document collections (settings objects, singletons). */
export async function getDocument<T>(name: string, seed: () => T): Promise<T> {
  const [doc] = await getCollection<T>(name, () => [seed()]);
  return doc;
}

export async function saveDocument<T>(name: string, doc: T): Promise<void> {
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
