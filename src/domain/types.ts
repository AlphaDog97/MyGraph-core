/** Raw JSON shape for a single node file in graph-data/nodes/ */
export interface KnowledgeNodeFile {
  id: string;
  label: string;
  description?: string;
  tags: string[];
  links?: KnowledgeLinkFile[];
}

/** Raw outbound link declaration inside a node file */
export interface KnowledgeLinkFile {
  target: string;
  type: string;
  label?: string;
}

/** Normalized edge derived from a node's links */
export interface KnowledgeEdge {
  id: string;
  source: string;
  target: string;
  type: string;
  label: string;
}

/** Maps tag IDs to user-chosen CSS color strings (or undefined for unassigned) */
export type TagColorAssignment = Record<string, string | undefined>;

/** Aggregate structure returned by the data pipeline */
export interface KnowledgeGraph {
  nodes: KnowledgeNode[];
  edges: KnowledgeEdge[];
  tags: string[];
  warnings: string[];
}

export class KnowledgeNode {
  readonly id: string;
  readonly label: string;
  readonly description: string;
  readonly tags: string[];
  readonly links: KnowledgeLinkFile[];

  constructor(raw: KnowledgeNodeFile) {
    this.id = raw.id;
    this.label = raw.label;
    this.description = raw.description ?? "";
    this.tags = [...new Set(raw.tags ?? [])];
    this.links = raw.links ?? [];
  }

  /** Validate that all required fields are present and well-formed */
  static validate(raw: unknown): { ok: true; value: KnowledgeNodeFile } | { ok: false; error: string } {
    if (typeof raw !== "object" || raw === null) {
      return { ok: false, error: "Node file must be a JSON object." };
    }
    const obj = raw as Record<string, unknown>;

    if (typeof obj.id !== "string" || obj.id.trim() === "") {
      return { ok: false, error: "Missing or empty 'id' field." };
    }
    if (typeof obj.label !== "string" || obj.label.trim() === "") {
      return { ok: false, error: `Node '${obj.id}': missing or empty 'label' field.` };
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
        const l = link as Record<string, unknown>;
        if (typeof l.target !== "string" || l.target.trim() === "") {
          return { ok: false, error: `Node '${obj.id}': link missing 'target'.` };
        }
        if (typeof l.type !== "string" || l.type.trim() === "") {
          return { ok: false, error: `Node '${obj.id}': link missing 'type'.` };
        }
      }
    }
    return { ok: true, value: obj as unknown as KnowledgeNodeFile };
  }

  /** Resolve border color from tag-color assignments (first matching tag wins) */
  resolveBorderColor(tagColors: TagColorAssignment): string {
    for (const tag of this.tags) {
      const color = tagColors[tag];
      if (color) return color;
    }
    return "#b0b0b0";
  }

  /** Produce a search-indexable string */
  searchText(): string {
    return [this.id, this.label, ...this.tags].join(" ").toLowerCase();
  }

  /** Convert to Cytoscape node data */
  toCytoscapeNode(tagColors: TagColorAssignment): cytoscape.ElementDefinition {
    return {
      data: {
        id: this.id,
        label: this.label,
        borderColor: this.resolveBorderColor(tagColors),
      },
    };
  }
}
