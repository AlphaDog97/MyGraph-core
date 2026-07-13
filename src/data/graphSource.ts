import { Manifest, KnowledgeNodeFile } from "../domain/types";

export const CURRENT_GRAPH_SCHEMA_VERSION = 1 as const;

export interface CategoryGraphEntry {
  graphId: string;
  graphLabel: string;
  nodes: KnowledgeNodeFile[];
}

export interface CategoryGraphDocument {
  schemaVersion?: number;
  categoryId?: string;
  graphs?: Array<{
    graphId?: string;
    graphLabel?: string;
    nodes?: KnowledgeNodeFile[];
  }>;
}

export interface GraphSource {
  loadManifest(signal?: AbortSignal): Promise<Manifest>;
  loadCategory(categoryId: string, signal?: AbortSignal): Promise<CategoryGraphEntry[]>;
}

export interface HttpGraphSourceOptions {
  baseUrl?: string;
  fetchImpl?: typeof fetch;
  cache?: boolean;
}

function ensureTrailingSlash(value: string): string {
  return value.endsWith("/") ? value : `${value}/`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function parseManifest(raw: unknown): Manifest {
  if (!isRecord(raw) || !Array.isArray(raw.categories)) {
    throw new Error("graph-data/manifest.json must contain categories[].");
  }

  const categoryIds = new Set<string>();
  const categories = raw.categories.map((rawCategory, categoryIndex) => {
    if (!isRecord(rawCategory)) {
      throw new Error(`manifest.categories[${categoryIndex}] must be an object.`);
    }
    const id = typeof rawCategory.id === "string" ? rawCategory.id.trim() : "";
    const label = typeof rawCategory.label === "string" ? rawCategory.label.trim() : "";
    if (!id || !label || !Array.isArray(rawCategory.graphs)) {
      throw new Error(
        `manifest.categories[${categoryIndex}] requires non-empty id, label, and graphs[].`
      );
    }
    if (categoryIds.has(id)) {
      throw new Error(`manifest contains duplicate category id '${id}'.`);
    }
    categoryIds.add(id);

    const graphIds = new Set<string>();
    const graphs = rawCategory.graphs.map((rawGraph, graphIndex) => {
      if (!isRecord(rawGraph)) {
        throw new Error(
          `manifest.categories[${categoryIndex}].graphs[${graphIndex}] must be an object.`
        );
      }
      const graphId = typeof rawGraph.id === "string" ? rawGraph.id.trim() : "";
      const graphLabel =
        typeof rawGraph.label === "string" ? rawGraph.label.trim() : "";
      if (!graphId || !graphLabel) {
        throw new Error(
          `manifest.categories[${categoryIndex}].graphs[${graphIndex}] requires id and label.`
        );
      }
      if (graphIds.has(graphId)) {
        throw new Error(`manifest category '${id}' contains duplicate graph id '${graphId}'.`);
      }
      graphIds.add(graphId);
      return { id: graphId, label: graphLabel };
    });

    return { id, label, graphs };
  });

  return { categories };
}

export function parseCategoryGraphDocument(
  raw: unknown,
  expectedCategoryId: string
): CategoryGraphEntry[] {
  if (!isRecord(raw)) {
    throw new Error(
      `graph-data/${expectedCategoryId}/graph.json must be a JSON object.`
    );
  }

  const document = raw as CategoryGraphDocument;
  const schemaVersion = document.schemaVersion ?? CURRENT_GRAPH_SCHEMA_VERSION;
  if (schemaVersion !== CURRENT_GRAPH_SCHEMA_VERSION) {
    throw new Error(
      `graph-data/${expectedCategoryId}/graph.json uses unsupported schemaVersion '${schemaVersion}'.`
    );
  }
  if (
    typeof document.categoryId === "string" &&
    document.categoryId.trim() !== "" &&
    document.categoryId.trim() !== expectedCategoryId
  ) {
    throw new Error(
      `graph-data/${expectedCategoryId}/graph.json declares categoryId '${document.categoryId}'.`
    );
  }
  if (!Array.isArray(document.graphs)) {
    throw new Error(
      `graph-data/${expectedCategoryId}/graph.json must contain graphs[].`
    );
  }

  const graphIds = new Set<string>();
  return document.graphs.map((graph, index) => {
    const graphId = typeof graph.graphId === "string" ? graph.graphId.trim() : "";
    const graphLabel =
      typeof graph.graphLabel === "string" ? graph.graphLabel.trim() : "";
    if (!graphId) {
      throw new Error(
        `graph-data/${expectedCategoryId}/graph.json: graphs[${index}].graphId is required.`
      );
    }
    if (!graphLabel) {
      throw new Error(
        `graph-data/${expectedCategoryId}/graph.json: graphs[${index}].graphLabel is required.`
      );
    }
    if (!Array.isArray(graph.nodes)) {
      throw new Error(
        `graph-data/${expectedCategoryId}/graph.json: graphs[${index}].nodes must be an array.`
      );
    }
    if (graphIds.has(graphId)) {
      throw new Error(
        `graph-data/${expectedCategoryId}/graph.json contains duplicate graphId '${graphId}'.`
      );
    }
    graphIds.add(graphId);
    return { graphId, graphLabel, nodes: graph.nodes };
  });
}

export class HttpGraphSource implements GraphSource {
  private readonly baseUrl: string;
  private readonly fetchImpl: typeof fetch;
  private readonly cacheEnabled: boolean;
  private manifestPromise?: Promise<Manifest>;
  private readonly categoryPromises = new Map<string, Promise<CategoryGraphEntry[]>>();

  constructor(options: HttpGraphSourceOptions = {}) {
    this.baseUrl = ensureTrailingSlash(options.baseUrl ?? "graph-data/");
    this.fetchImpl = options.fetchImpl ?? globalThis.fetch;
    this.cacheEnabled = options.cache ?? true;
    if (!this.fetchImpl) {
      throw new Error("HttpGraphSource requires a fetch implementation.");
    }
  }

  clearCache(): void {
    this.manifestPromise = undefined;
    this.categoryPromises.clear();
  }

  loadManifest(signal?: AbortSignal): Promise<Manifest> {
    if (!this.cacheEnabled || signal) {
      return this.fetchJson("manifest.json", signal).then(parseManifest);
    }
    this.manifestPromise ??= this.fetchJson("manifest.json").then(parseManifest);
    return this.manifestPromise;
  }

  loadCategory(
    categoryId: string,
    signal?: AbortSignal
  ): Promise<CategoryGraphEntry[]> {
    const load = () =>
      this.fetchJson(`${encodeURIComponent(categoryId)}/graph.json`, signal).then((raw) =>
        parseCategoryGraphDocument(raw, categoryId)
      );

    if (!this.cacheEnabled || signal) return load();
    const cached = this.categoryPromises.get(categoryId);
    if (cached) return cached;
    const promise = load().catch((error) => {
      this.categoryPromises.delete(categoryId);
      throw error;
    });
    this.categoryPromises.set(categoryId, promise);
    return promise;
  }

  private async fetchJson(path: string, signal?: AbortSignal): Promise<unknown> {
    const response = await this.fetchImpl(this.resolveUrl(path), {
      cache: "no-store",
      signal,
    });
    if (!response.ok) {
      throw new Error(`Failed to load ${path} (${response.status}).`);
    }
    try {
      return await response.json();
    } catch {
      throw new Error(`${path}: invalid JSON.`);
    }
  }

  private resolveUrl(path: string): string {
    const relative = `${this.baseUrl}${path}`;
    if (/^[a-z][a-z\d+.-]*:/i.test(relative)) return relative;
    if (typeof document !== "undefined") {
      return new URL(relative, document.baseURI).toString();
    }
    return relative;
  }
}

export class MemoryGraphSource implements GraphSource {
  constructor(
    private readonly manifest: Manifest,
    private readonly categoryGraphs: Record<string, CategoryGraphEntry[]>
  ) {}

  async loadManifest(): Promise<Manifest> {
    return this.manifest;
  }

  async loadCategory(categoryId: string): Promise<CategoryGraphEntry[]> {
    const graphs = this.categoryGraphs[categoryId];
    if (!graphs) throw new Error(`Category '${categoryId}' not found.`);
    return graphs;
  }
}

export const defaultGraphSource = new HttpGraphSource();
