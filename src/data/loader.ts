import {
  KnowledgeNode,
  KnowledgeEdge,
  KnowledgeGraph,
  TagColorAssignment,
} from "../domain/types";

const NODE_MANIFEST_URL = `${import.meta.env.BASE_URL}graph-data/manifest.json`;

/**
 * Load all node JSON files listed in the build-time manifest,
 * validate them, and produce a KnowledgeGraph.
 */
export async function loadKnowledgeGraph(): Promise<KnowledgeGraph> {
  const manifestRes = await fetch(NODE_MANIFEST_URL);
  if (!manifestRes.ok) {
    throw new Error(
      `Failed to load node manifest (${manifestRes.status}). ` +
        `Make sure graph-data/manifest.json exists.`
    );
  }

  const fileNames: string[] = await manifestRes.json();
  const warnings: string[] = [];
  const nodes: KnowledgeNode[] = [];
  const seenIds = new Set<string>();

  for (const fileName of fileNames) {
    const url = `${import.meta.env.BASE_URL}graph-data/nodes/${fileName}`;
    const res = await fetch(url);
    if (!res.ok) {
      warnings.push(`Could not load ${fileName}: HTTP ${res.status}`);
      continue;
    }

    let raw: unknown;
    try {
      raw = await res.json();
    } catch {
      warnings.push(`${fileName}: invalid JSON.`);
      continue;
    }

    const result = KnowledgeNode.validate(raw);
    if (!result.ok) {
      warnings.push(`${fileName}: ${result.error}`);
      continue;
    }

    if (seenIds.has(result.value.id)) {
      warnings.push(`${fileName}: duplicate node id '${result.value.id}'.`);
      continue;
    }
    seenIds.add(result.value.id);
    nodes.push(new KnowledgeNode(result.value));
  }

  if (nodes.length === 0 && warnings.length > 0) {
    throw new Error(
      "No valid nodes loaded.\n" + warnings.join("\n")
    );
  }

  const edges: KnowledgeEdge[] = [];
  for (const node of nodes) {
    for (const link of node.links) {
      if (!seenIds.has(link.target)) {
        warnings.push(
          `Node '${node.id}': link target '${link.target}' does not exist.`
        );
        continue;
      }
      edges.push({
        id: `${node.id}--${link.type}--${link.target}`,
        source: node.id,
        target: link.target,
        type: link.type,
        label: link.label ?? link.type,
      });
    }
  }

  const tagSet = new Set<string>();
  for (const node of nodes) {
    for (const tag of node.tags) tagSet.add(tag);
  }

  return {
    nodes,
    edges,
    tags: [...tagSet].sort(),
    warnings,
  };
}

/** Convert a KnowledgeGraph into Cytoscape ElementDefinition[] */
export function toCytoscapeElements(
  graph: KnowledgeGraph,
  tagColors: TagColorAssignment
): cytoscape.ElementDefinition[] {
  const nodeEls = graph.nodes.map((n) => n.toCytoscapeNode(tagColors));
  const edgeEls: cytoscape.ElementDefinition[] = graph.edges.map((e) => ({
    data: {
      id: e.id,
      source: e.source,
      target: e.target,
      label: e.label,
    },
  }));
  return [...nodeEls, ...edgeEls];
}
