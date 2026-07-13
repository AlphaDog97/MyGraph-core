import type { GraphDiagnostic } from "./diagnostics";

/** Manifest describing all categories and graphs in graph-data/. */
export interface Manifest {
  categories: ManifestCategory[];
}

export interface ManifestCategory {
  id: string;
  label: string;
  graphs: ManifestGraph[];
}

export interface ManifestGraph {
  id: string;
  label: string;
}

/** Raw JSON shape for a single node inside a graph document. */
export interface KnowledgeNodeFile {
  id: string;
  label: string;
  description?: string;
  tags: string[];
  links?: KnowledgeLinkFile[];
  /** Optional cross-graph identity. Nodes merge only when this value matches. */
  globalConceptId?: string;
}

/** Raw outbound link declaration inside a node. */
export interface KnowledgeLinkFile {
  target: string;
  type: string;
  label?: string;
}

/** Identifies the source graph that contributed a normalized node. */
export interface GraphNodeProvenance {
  categoryId: string;
  graphId: string;
  graphLabel: string;
  localNodeId: string;
}

/** Normalized edge derived from a node's links. */
export interface KnowledgeEdge {
  id: string;
  source: string;
  target: string;
  type: string;
  label: string;
}

/** Maps tag IDs to user-chosen CSS color strings (or undefined for unassigned). */
export type TagColorAssignment = Record<string, string | undefined>;

/** Aggregate structure returned by the data pipeline. */
export interface KnowledgeGraph {
  nodes: KnowledgeNode[];
  edges: KnowledgeEdge[];
  tags: string[];
  warnings: string[];
  /** Structured diagnostics for callers that need more than display strings. */
  diagnostics?: GraphDiagnostic[];
}

interface KnowledgeNodeMetadata {
  localId?: string;
  provenance?: GraphNodeProvenance[];
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim() !== "";
}

export class KnowledgeNode {
  readonly id: string;
  readonly localId: string;
  readonly label: string;
  readonly description: string;
  readonly tags: string[];
  readonly links: KnowledgeLinkFile[];
  readonly globalConceptId?: string;
  readonly provenance: GraphNodeProvenance[];

  constructor(raw: KnowledgeNodeFile, metadata: KnowledgeNodeMetadata = {}) {
    this.id = raw.id;
    this.localId = metadata.localId ?? raw.id;
    this.label = raw.label;
    this.description = raw.description ?? "";
    this.tags = [...new Set((raw.tags ?? []).map((tag) => tag.trim()).filter(Boolean))];
    this.links = (raw.links ?? []).map((link) => ({ ...link }));
    this.globalConceptId = raw.globalConceptId?.trim() || undefined;
    this.provenance = (metadata.provenance ?? []).map((source) => ({ ...source }));
  }

  static validate(
    raw: unknown
  ): { ok: true; value: KnowledgeNodeFile } | { ok: false; error: string } {
    if (typeof raw !== "object" || raw === null) {
      return { ok: false, error: "Node must be a JSON object." };
    }

    const obj = raw as Record<string, unknown>;
    if (!isNonEmptyString(obj.id)) {
      return { ok: false, error: "Missing or empty 'id' field." };
    }
    if (!isNonEmptyString(obj.label)) {
      return { ok: false, error: `Node '${obj.id}': missing or empty 'label' field.` };
    }
    if (obj.description !== undefined && typeof obj.description !== "string") {
      return { ok: false, error: `Node '${obj.id}': 'description' must be a string.` };
    }
    if (
      obj.globalConceptId !== undefined &&
      !isNonEmptyString(obj.globalConceptId)
    ) {
      return {
        ok: false,
        error: `Node '${obj.id}': 'globalConceptId' must be a non-empty string.`,
      };
    }
    if (!Array.isArray(obj.tags)) {
      return { ok: false, error: `Node '${obj.id}': 'tags' must be an array.` };
    }
    for (const tag of obj.tags) {
      if (typeof tag !== "string") {
        return { ok: false, error: `Node '${obj.id}': each tag must be a string.` };
      }
    }

    if (obj.links !== undefined) {
      if (!Array.isArray(obj.links)) {
        return { ok: false, error: `Node '${obj.id}': 'links' must be an array.` };
      }
      for (const link of obj.links) {
        if (typeof link !== "object" || link === null) {
          return { ok: false, error: `Node '${obj.id}': each link must be an object.` };
        }
        const candidate = link as Record<string, unknown>;
        if (!isNonEmptyString(candidate.target)) {
          return { ok: false, error: `Node '${obj.id}': link missing 'target'.` };
        }
        if (!isNonEmptyString(candidate.type)) {
          return { ok: false, error: `Node '${obj.id}': link missing 'type'.` };
        }
        if (candidate.label !== undefined && typeof candidate.label !== "string") {
          return { ok: false, error: `Node '${obj.id}': link 'label' must be a string.` };
        }
      }
    }

    return { ok: true, value: obj as unknown as KnowledgeNodeFile };
  }

  /** Aggregated overview nodes are read-only because their IDs are scoped or shared. */
  get isAggregate(): boolean {
    return this.provenance.length > 1 || this.id !== this.localId;
  }

  resolveBorderColor(tagColors: TagColorAssignment): string {
    for (const tag of this.tags) {
      const color = tagColors[tag];
      if (color) return color;
    }
    return "#b0b0b0";
  }

  searchText(): string {
    const provenanceText = this.provenance.flatMap((source) => [
      source.categoryId,
      source.graphId,
      source.graphLabel,
      source.localNodeId,
    ]);
    const linkText = this.links.flatMap((link) => [
      link.target,
      link.type,
      link.label ?? "",
    ]);

    return [
      this.id,
      this.localId,
      this.label,
      this.description,
      this.globalConceptId ?? "",
      ...this.tags,
      ...linkText,
      ...provenanceText,
    ]
      .join(" ")
      .toLowerCase();
  }

  toCytoscapeNode(tagColors: TagColorAssignment): cytoscape.ElementDefinition {
    return {
      data: {
        id: this.id,
        localId: this.localId,
        label: this.label,
        borderColor: this.resolveBorderColor(tagColors),
      },
    };
  }
}
