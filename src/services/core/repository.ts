import { env } from "@/config/env";
import { apiClient } from "@/lib/api/client";
import { getCollection, saveCollection } from "@/lib/mock-db";
import type { ApiResponse, PaginatedResponse } from "@/types";
import { mockRequest, newId, notFound, nowIso } from "./mock-runtime";

export interface Entity {
  id: string;
}

export type FilterValue = string | number | boolean | null | undefined | Array<string | number | boolean>;

export interface ListParams {
  page?: number;
  pageSize?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  /** Equality filters; array values mean "one of". Undefined/empty values are ignored. */
  filters?: Record<string, FilterValue>;
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export type CreateInput<T extends Entity> = Omit<T, "id"> & { id?: string };

/**
 * The contract every data source implements — mock (IndexedDB) today, REST tomorrow.
 * UI code depends only on this interface (through domain services + hooks).
 */
export interface Repository<T extends Entity> {
  list(params?: ListParams): Promise<Paginated<T>>;
  all(filters?: ListParams["filters"]): Promise<T[]>;
  get(id: string): Promise<T>;
  find(id: string): Promise<T | undefined>;
  create(input: CreateInput<T>): Promise<T>;
  update(id: string, patch: Partial<T>): Promise<T>;
  remove(id: string): Promise<void>;
  bulkUpdate(ids: string[], patch: Partial<T>): Promise<T[]>;
  bulkRemove(ids: string[]): Promise<void>;
}

// ---------------------------------------------------------------------------
// In-memory query engine (shared by mock repositories and unit tests)
// ---------------------------------------------------------------------------

function readPath(obj: unknown, path: string): unknown {
  return path.split(".").reduce<unknown>((acc, key) => (acc == null ? acc : (acc as Record<string, unknown>)[key]), obj);
}

function textOf(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) return value.map(textOf).join(" ");
  if (typeof value === "object") return Object.values(value as Record<string, unknown>).map(textOf).join(" ");
  return "";
}

export function normalizeSearch(text: string): string {
  return text.toLocaleLowerCase().normalize("NFC").trim();
}

export function matchesSearch<T>(item: T, search: string | undefined, fields: string[]): boolean {
  if (!search?.trim()) return true;
  const haystack = normalizeSearch(fields.map((f) => textOf(readPath(item, f))).join(" "));
  // Every whitespace-separated term must appear (AND semantics).
  return normalizeSearch(search)
    .split(/\s+/)
    .every((term) => haystack.includes(term));
}

export function matchesFilters<T>(item: T, filters: ListParams["filters"]): boolean {
  if (!filters) return true;
  return Object.entries(filters).every(([key, expected]) => {
    if (expected === undefined || expected === null || expected === "" || (Array.isArray(expected) && !expected.length))
      return true;
    const actual = readPath(item, key);
    const wanted = Array.isArray(expected) ? expected : [expected];
    if (Array.isArray(actual)) return actual.some((a) => wanted.includes(a as never));
    return wanted.includes(actual as never);
  });
}

export function sortItems<T>(items: T[], sortBy?: string, order: "asc" | "desc" = "asc"): T[] {
  if (!sortBy) return items;
  const dir = order === "asc" ? 1 : -1;
  return [...items].sort((a, b) => {
    const av = readPath(a, sortBy);
    const bv = readPath(b, sortBy);
    if (av == null && bv == null) return 0;
    if (av == null) return 1;
    if (bv == null) return -1;
    if (typeof av === "number" && typeof bv === "number") return (av - bv) * dir;
    return String(av).localeCompare(String(bv), "bn") * dir;
  });
}

export function paginate<T>(items: T[], page = 1, pageSize = 20): Paginated<T> {
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  return {
    items: items.slice((safePage - 1) * pageSize, safePage * pageSize),
    total,
    page: safePage,
    pageSize,
    totalPages,
  };
}

export function queryItems<T>(items: T[], params: ListParams = {}, searchFields: string[] = []): Paginated<T> {
  const filtered = items.filter(
    (item) => matchesFilters(item, params.filters) && matchesSearch(item, params.search, searchFields),
  );
  return paginate(sortItems(filtered, params.sortBy, params.sortOrder), params.page, params.pageSize ?? 20);
}

// ---------------------------------------------------------------------------
// Mock repository (IndexedDB-backed)
// ---------------------------------------------------------------------------

export interface MockRepositoryOptions<T> {
  collection: string;
  seed: () => T[];
  searchFields?: string[];
  /** Entity label used in error messages. */
  entity?: string;
  idPrefix?: string;
  defaultSort?: { sortBy: string; sortOrder: "asc" | "desc" };
  latency?: number;
  /** Stamp createdAt/updatedAt automatically when the entity has those fields. */
  timestamps?: boolean;
}

export function createMockRepository<T extends Entity>(options: MockRepositoryOptions<T>): Repository<T> & {
  /** Direct, latency-free access for domain services composing several repositories. */
  raw(): Promise<T[]>;
  replaceAll(items: T[]): Promise<void>;
} {
  const {
    collection,
    seed,
    searchFields = [],
    entity = collection,
    idPrefix = collection.slice(0, 3),
    defaultSort,
    latency = 200,
    timestamps = true,
  } = options;

  const load = () => getCollection<T>(collection, seed);

  async function writeAll(items: T[]) {
    await saveCollection(collection, items);
  }

  return {
    raw: load,
    replaceAll: writeAll,

    async list(params = {}) {
      await mockRequest(latency);
      return queryItems(await load(), { ...defaultSort, ...params }, searchFields);
    },

    async all(filters) {
      await mockRequest(latency);
      const items = await load();
      return sortItems(
        items.filter((i) => matchesFilters(i, filters)),
        defaultSort?.sortBy,
        defaultSort?.sortOrder,
      );
    },

    async get(id) {
      await mockRequest(latency);
      const item = (await load()).find((i) => i.id === id);
      return item ?? notFound(entity, id);
    },

    async find(id) {
      return (await load()).find((i) => i.id === id);
    },

    async create(input) {
      await mockRequest(latency);
      const stamp = nowIso();
      const given = input as { createdAt?: string; updatedAt?: string };
      const item = {
        ...input,
        // Blank timestamps from form defaults must not override the stamp.
        ...(timestamps ? { createdAt: given.createdAt || stamp, updatedAt: given.updatedAt || stamp } : {}),
        id: input.id ?? newId(idPrefix),
      } as unknown as T;
      await writeAll([item, ...(await load())]);
      return item;
    },

    async update(id, patch) {
      await mockRequest(latency);
      const items = await load();
      const index = items.findIndex((i) => i.id === id);
      if (index === -1) notFound(entity, id);
      const updated = {
        ...items[index],
        ...patch,
        id,
        ...(timestamps && "updatedAt" in (items[index] as object) ? { updatedAt: nowIso() } : {}),
      } as T;
      const next = [...items];
      next[index] = updated;
      await writeAll(next);
      return updated;
    },

    async remove(id) {
      await mockRequest(latency);
      const items = await load();
      if (!items.some((i) => i.id === id)) notFound(entity, id);
      await writeAll(items.filter((i) => i.id !== id));
    },

    async bulkUpdate(ids, patch) {
      await mockRequest(latency);
      const set = new Set(ids);
      const stamp = nowIso();
      const next = (await load()).map((i) =>
        set.has(i.id) ? ({ ...i, ...patch, ...(timestamps && "updatedAt" in (i as object) ? { updatedAt: stamp } : {}) } as T) : i,
      );
      await writeAll(next);
      return next.filter((i) => set.has(i.id));
    },

    async bulkRemove(ids) {
      await mockRequest(latency);
      const set = new Set(ids);
      await writeAll((await load()).filter((i) => !set.has(i.id)));
    },
  };
}

// ---------------------------------------------------------------------------
// REST repository (future backend). Same interface; never used while USE_MOCK_API=true.
// ---------------------------------------------------------------------------

export function createApiRepository<T extends Entity>(basePath: string): Repository<T> {
  const toQuery = (params: ListParams = {}) => {
    const { filters, ...rest } = params;
    const flat: Record<string, string | number | boolean | undefined> = { ...rest };
    for (const [key, value] of Object.entries(filters ?? {})) {
      if (value == null || value === "") continue;
      flat[`filter[${key}]`] = Array.isArray(value) ? value.join(",") : value;
    }
    return flat;
  };

  return {
    async list(params) {
      const res = await apiClient.get<PaginatedResponse<T>>(basePath, { query: toQuery(params) });
      return { items: res.data, ...res.meta };
    },
    async all(filters) {
      const res = await apiClient.get<ApiResponse<T[]>>(basePath, { query: { ...toQuery({ filters }), all: true } });
      return res.data;
    },
    async get(id) {
      return (await apiClient.get<ApiResponse<T>>(`${basePath}/${id}`)).data;
    },
    async find(id) {
      try {
        return (await apiClient.get<ApiResponse<T>>(`${basePath}/${id}`)).data;
      } catch {
        return undefined;
      }
    },
    async create(input) {
      return (await apiClient.post<ApiResponse<T>>(basePath, input)).data;
    },
    async update(id, patch) {
      return (await apiClient.patch<ApiResponse<T>>(`${basePath}/${id}`, patch)).data;
    },
    async remove(id) {
      await apiClient.delete<void>(`${basePath}/${id}`);
    },
    async bulkUpdate(ids, patch) {
      return (await apiClient.patch<ApiResponse<T[]>>(`${basePath}/bulk`, { ids, patch })).data;
    },
    async bulkRemove(ids) {
      await apiClient.post<void>(`${basePath}/bulk-delete`, { ids });
    },
  };
}

/** Picks the data source for a domain. Single switch point for mock vs real API. */
export function selectRepository<T extends Entity>(mock: Repository<T>, apiPath: string): Repository<T> {
  return env.NEXT_PUBLIC_USE_MOCK_API ? mock : createApiRepository<T>(apiPath);
}
