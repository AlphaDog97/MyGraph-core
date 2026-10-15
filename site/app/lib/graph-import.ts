import { KnowledgeNode, type KnowledgeNodeFile } from "@/original-ui/domain/types";

export const MAX_IMPORT_CHARACTERS = 200_000;
export const MAX_IMPORT_RECORDS = 400;

export interface ImportGraph {
  graphId: string;
  graphLabel: string;
  nodes: KnowledgeNodeFile[];
}

export interface ImportDocument {
  graphs: ImportGraph[];
  nodeCount: number;
  edgeCount: number;
}

function object(value: unknown, path: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${path} 必须是对象`);
  }
  return value as Record<string, unknown>;
}

function text(value: unknown, path: string): string {
  if (typeof value !== "string" || !value.trim()) throw new Error(`${path} 不能为空`);
  return value.trim();
}

function parseNodes(value: unknown, path: string): KnowledgeNodeFile[] {
  if (!Array.isArray(value) || !value.length) throw new Error(`${path} 必须是非空节点数组`);
  const seen = new Set<string>();
  const nodes = value.map((item, index) => {
    const at = `${path}[${index}]`;
    const raw = object(item, at);
    // Older exports require tags; accepting omitted tags makes AI output easier to use.
    const candidate = { ...raw, tags: raw.tags === undefined ? [] : raw.tags };
    const checked = KnowledgeNode.validate(candidate);
    if (!checked.ok) throw new Error(`${at}: ${checked.error}`);
    const node = checked.value;
    const id = node.id.trim();
    if (seen.has(id)) throw new Error(`${at}.id 重复：${id}`);
    seen.add(id);
    return {
      id,
      label: node.label.trim(),
      description: node.description ?? "",
      tags: [...new Set(node.tags.map((tag) => tag.trim()).filter(Boolean))],
      globalConceptId: node.globalConceptId?.trim(),
      links: (node.links ?? []).map((link) => ({
        target: link.target.trim(), type: link.type.trim(), label: link.label?.trim(),
      })),
    };
  });
  for (const node of nodes) {
    for (const link of node.links) {
      if (!seen.has(link.target)) {
        throw new Error(`${path}: 节点“${node.id}”指向不存在的节点“${link.target}”`);
      }
    }
  }
  return nodes;
}

/** Shared by preview and server; the server always parses the original text again. */
export function parseGraphImport(rawText: string, defaultLabel = "导入的图谱"): ImportDocument {
  if (rawText.length > MAX_IMPORT_CHARACTERS) throw new Error("JSON 超过 20 万字符，请拆分导入");
  const trimmed = rawText.trim().replace(/^\uFEFF/, "");
  const fenced = trimmed.match(/^```(?:json)?\s*\n?([\s\S]*?)\n?```$/i);
  let parsed: unknown;
  try {
    parsed = JSON.parse(fenced ? fenced[1] : trimmed);
  } catch {
    throw new Error("JSON 格式不正确，请检查引号、逗号和括号；也可以直接粘贴完整的 JSON 代码块");
  }
  const root = Array.isArray(parsed) ? { nodes: parsed } : object(parsed, "JSON");
  const entries = root.graphs === undefined ? [root] : root.graphs;
  if (!Array.isArray(entries) || !entries.length) throw new Error("graphs 必须是非空图谱数组");
  if (entries.length > 20) throw new Error("一次最多导入 20 个图谱，请拆分导入");
  const graphIds = new Set<string>();
  const graphs = entries.map((entry, index) => {
    const at = `graphs[${index}]`;
    const graph = object(entry, at);
    const graphId = graph.graphId === undefined ? `import-${index + 1}` : text(graph.graphId, `${at}.graphId`);
    if (graphIds.has(graphId)) throw new Error(`graphId 重复：${graphId}`);
    graphIds.add(graphId);
    return {
      graphId,
      graphLabel: text(graph.graphLabel ?? (entries.length === 1 ? defaultLabel : graphId), `${at}.graphLabel`),
      nodes: parseNodes(graph.nodes, `${at}.nodes`),
    };
  });
  const nodeCount = graphs.reduce((count, graph) => count + graph.nodes.length, 0);
  const edgeCount = graphs.reduce((count, graph) => count + graph.nodes.reduce(
    (edges, node) => edges + (node.links?.length ?? 0), 0,
  ), 0);
  if (graphs.length + nodeCount + edgeCount > MAX_IMPORT_RECORDS) {
    throw new Error(`图谱、节点和关系合计最多 ${MAX_IMPORT_RECORDS} 条，请拆分导入`);
  }
  return { graphs, nodeCount, edgeCount };
}
