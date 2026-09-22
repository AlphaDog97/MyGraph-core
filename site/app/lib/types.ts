export interface CategorySummary {
  id: string;
  label: string;
  graphCount: number;
  nodeCount: number;
}

export interface GraphSummary {
  id: string;
  categoryId: string;
  slug: string;
  label: string;
  nodeCount: number;
  edgeCount: number;
}

export interface GraphNode {
  id: string;
  graphId: string;
  nodeKey: string;
  label: string;
  description: string;
  tags: string[];
  globalConceptId: string | null;
}

export interface GraphEdge {
  id: string;
  graphId: string;
  sourceNodeId: string;
  targetNodeId: string;
  type: string;
  label: string;
}

export interface GraphDetail {
  graph: GraphSummary;
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export interface WorkspaceSnapshot {
  categories: CategorySummary[];
  graphs: GraphSummary[];
}

