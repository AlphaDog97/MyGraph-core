import { KnowledgeGraph, Manifest } from "../domain/types";

export type RepositoryMode = "file" | "appwrite";

export interface UserGraphRecord {
  categoryId: string;
  graphId: string;
}

export interface GraphRepository {
  readonly mode: RepositoryMode;
  loadManifest(): Promise<Manifest>;
  loadGraph(categoryId: string, graphId: string): Promise<KnowledgeGraph>;
  saveGraph(
    categoryId: string,
    graphId: string,
    graph: KnowledgeGraph
  ): Promise<void>;
  listUserGraphs(): Promise<UserGraphRecord[]>;
}
