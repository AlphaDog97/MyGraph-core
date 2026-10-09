import { isSupportedEdgeType } from "./edgeTypes";
import { KnowledgeNode, KnowledgeNodeFile } from "./types";

export type GraphDiagnosticSeverity = "error" | "warning" | "info";

export interface GraphDiagnostic {
  severity: GraphDiagnosticSeverity;
  code: string;
  path: string;
  message: string;
  suggestion?: string;
}

export interface GraphValidationContext {
  categoryId: string;
  graphId: string;
}

export interface GraphValidationResult {
  validNodes: KnowledgeNodeFile[];
  diagnostics: GraphDiagnostic[];
}

function nodePath(context: GraphValidationContext, index: number): string {
  return `${context.categoryId}/${context.graphId}/nodes[${index}]`;
}

export function formatGraphDiagnostic(diagnostic: GraphDiagnostic): string {
  return `[${diagnostic.code}] ${diagnostic.message}`;
}

export function diagnoseGraphNodes(
  rawArray: unknown,
  context: GraphValidationContext
): GraphValidationResult {
  const diagnostics: GraphDiagnostic[] = [];
  if (!Array.isArray(rawArray)) {
    diagnostics.push({
      severity: "error",
      code: "DOCUMENT_NOT_ARRAY",
      path: `${context.categoryId}/${context.graphId}`,
      message: "Graph nodes must be a JSON array.",
    });
    return { validNodes: [], diagnostics };
  }

  const validNodes: KnowledgeNodeFile[] = [];
  const nodeIndexById = new Map<string, number>();

  rawArray.forEach((rawNode, index) => {
    const result = KnowledgeNode.validate(rawNode);
    if (!result.ok) {
      diagnostics.push({
        severity: "error",
        code: "INVALID_NODE",
        path: nodePath(context, index),
        message: result.error,
      });
      return;
    }

    const normalizedId = result.value.id.trim();
    const existingIndex = nodeIndexById.get(normalizedId);
    if (existingIndex !== undefined) {
      diagnostics.push({
        severity: "error",
        code: "DUPLICATE_NODE_ID",
        path: nodePath(context, index),
        message: `Node id '${normalizedId}' duplicates nodes[${existingIndex}].`,
        suggestion: "Use an ID that is unique within the graph.",
      });
      return;
    }

    nodeIndexById.set(normalizedId, index);
    validNodes.push({
      ...result.value,
      id: normalizedId,
      label: result.value.label.trim(),
      description: result.value.description?.trim() || undefined,
      globalConceptId: result.value.globalConceptId?.trim() || undefined,
      tags: result.value.tags.map((tag) => tag.trim()).filter(Boolean),
      links: result.value.links?.map((link) => ({
        target: link.target.trim(),
        type: link.type.trim(),
        label: link.label?.trim() || undefined,
      })),
    });
  });

  const nodeIds = new Set(validNodes.map((node) => node.id));
  const degreeById = new Map(validNodes.map((node) => [node.id, 0]));
  const edgeKeys = new Set<string>();

  validNodes.forEach((node) => {
    (node.links ?? []).forEach((link, linkIndex) => {
      const path = `${context.categoryId}/${context.graphId}/node('${node.id}').links[${linkIndex}]`;
      if (!isSupportedEdgeType(link.type)) {
        diagnostics.push({
          severity: "warning",
          code: "UNKNOWN_EDGE_TYPE",
          path,
          message: `Relation type '${link.type}' is not one of the supported legend types.`,
          suggestion: "Use Concept, Description, Condition, or Action.",
        });
      }
      if (link.target === node.id) {
        diagnostics.push({
          severity: "warning",
          code: "SELF_REFERENCE",
          path,
          message: `Node '${node.id}' links to itself.`,
        });
      }
      if (!nodeIds.has(link.target)) {
        diagnostics.push({
          severity: "error",
          code: "BROKEN_LINK",
          path,
          message: `Node '${node.id}' references missing target '${link.target}'.`,
        });
        return;
      }

      const edgeKey = `${node.id}--${link.type}--${link.target}`;
      if (edgeKeys.has(edgeKey)) {
        diagnostics.push({
          severity: "warning",
          code: "DUPLICATE_EDGE",
          path,
          message: `Duplicate relation '${edgeKey}' will be ignored.`,
        });
        return;
      }

      edgeKeys.add(edgeKey);
      degreeById.set(node.id, (degreeById.get(node.id) ?? 0) + 1);
      degreeById.set(link.target, (degreeById.get(link.target) ?? 0) + 1);
    });
  });

  for (const [id, degree] of degreeById) {
    if (degree === 0) {
      diagnostics.push({
        severity: "info",
        code: "ISOLATED_NODE",
        path: `${context.categoryId}/${context.graphId}/node('${id}')`,
        message: `Node '${id}' has no valid inbound or outbound relations.`,
      });
    }
  }

  return { validNodes, diagnostics };
}
