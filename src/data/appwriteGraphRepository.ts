import { KnowledgeGraph, Manifest } from "../domain/types";
import { loadGraphData, parseGraphJsonPayload } from "./loader";
import { GraphRepository, UserGraphRecord } from "./repository";

interface AppwriteDoc {
  $id: string;
  categoryId?: string;
  graphId?: string;
  userId?: string;
  graphData?: unknown;
}

interface AppwriteListResponse {
  documents: AppwriteDoc[];
}

export interface AppwriteRepositoryConfig {
  endpoint: string;
  projectId: string;
  databaseId: string;
  tableId: string;
}

function env(name: string): string {
  const value = import.meta.env[name];
  return typeof value === "string" ? value : "";
}

function buildConfig(): AppwriteRepositoryConfig {
  return {
    endpoint: env("VITE_APPWRITE_ENDPOINT"),
    projectId: env("VITE_APPWRITE_PROJECT_ID"),
    databaseId: env("VITE_APPWRITE_DATABASE_ID"),
    tableId: env("VITE_APPWRITE_GRAPHS_TABLE_ID"),
  };
}

function getAppwriteUserId(): string | null {
  const id = localStorage.getItem("mygraph.appwriteUserId");
  if (!id || !id.trim()) return null;
  return id;
}

function isConfigured(config: AppwriteRepositoryConfig): boolean {
  return Boolean(
    config.endpoint && config.projectId && config.databaseId && config.tableId
  );
}

function serializeGraph(graph: KnowledgeGraph) {
  return graph.nodes.map((n) => {
    const rawNode: {
      id: string;
      label: string;
      tags: string[];
      description?: string;
      links?: Array<{ target: string; type: string; label?: string }>;
    } = {
      id: n.id,
      label: n.label,
      tags: n.tags,
    };
    if (n.description) rawNode.description = n.description;
    if (n.links.length > 0) {
      rawNode.links = n.links.map((link) => ({
        target: link.target,
        type: link.type,
        label: link.label,
      }));
    }
    return rawNode;
  });
}

export class AppwriteGraphRepository implements GraphRepository {
  readonly mode = "appwrite" as const;
  private readonly config: AppwriteRepositoryConfig;

  constructor(config: AppwriteRepositoryConfig = buildConfig()) {
    this.config = config;
  }

  private async request(path: string, init: RequestInit = {}): Promise<Response> {
    if (!isConfigured(this.config)) {
      throw new Error(
        "Appwrite repository is not configured. Set VITE_APPWRITE_ENDPOINT, VITE_APPWRITE_PROJECT_ID, VITE_APPWRITE_DATABASE_ID, and VITE_APPWRITE_GRAPHS_TABLE_ID."
      );
    }

    const res = await fetch(`${this.config.endpoint}${path}`, {
      credentials: "include",
      ...init,
      headers: {
        "Content-Type": "application/json",
        "X-Appwrite-Project": this.config.projectId,
        ...(init.headers ?? {}),
      },
    });

    return res;
  }

  async loadManifest(): Promise<Manifest> {
    return {
      categories: [
        {
          id: "cloud",
          label: "Cloud",
          graphs: (await this.listUserGraphs()).map((graph) => ({
            id: graph.graphId,
            label: graph.graphId,
          })),
        },
      ],
    };
  }

  async loadGraph(categoryId: string, graphId: string): Promise<KnowledgeGraph> {
    const userId = getAppwriteUserId();
    if (!userId) {
      throw new Error("Not logged in. Please log in before using Appwrite mode.");
    }

    const response = await this.request(
      `/v1/databases/${this.config.databaseId}/tables/${this.config.tableId}/rows?queries[]=${encodeURIComponent(`equal("userId",["${userId}"])`)}&queries[]=${encodeURIComponent(`equal("categoryId",["${categoryId}"])`)}&queries[]=${encodeURIComponent(`equal("graphId",["${graphId}"])`)}`
    );

    if (!response.ok) {
      throw new Error(`Failed to load Appwrite graph (${response.status}).`);
    }

    const body = (await response.json()) as AppwriteListResponse;
    const doc = body.documents[0];

    if (!doc) {
      return loadGraphData(categoryId, graphId);
    }

    return parseGraphJsonPayload(doc.graphData, `${categoryId}/${graphId}`);
  }

  async saveGraph(
    categoryId: string,
    graphId: string,
    graph: KnowledgeGraph
  ): Promise<void> {
    const userId = getAppwriteUserId();
    if (!userId) {
      throw new Error("Not logged in. Please log in before using Appwrite mode.");
    }

    const serialized = serializeGraph(graph);

    const findResponse = await this.request(
      `/v1/databases/${this.config.databaseId}/tables/${this.config.tableId}/rows?queries[]=${encodeURIComponent(`equal("userId",["${userId}"])`)}&queries[]=${encodeURIComponent(`equal("categoryId",["${categoryId}"])`)}&queries[]=${encodeURIComponent(`equal("graphId",["${graphId}"])`)}`
    );

    if (!findResponse.ok) {
      throw new Error(`Failed to query Appwrite graph (${findResponse.status}).`);
    }

    const listBody = (await findResponse.json()) as AppwriteListResponse;
    const existing = listBody.documents[0];

    const payload = {
      data: {
        userId,
        categoryId,
        graphId,
        graphData: serialized,
      },
    };

    const savePath = existing
      ? `/v1/databases/${this.config.databaseId}/tables/${this.config.tableId}/rows/${existing.$id}`
      : `/v1/databases/${this.config.databaseId}/tables/${this.config.tableId}/rows`;

    const saveMethod = existing ? "PATCH" : "POST";

    const saveRes = await this.request(savePath, {
      method: saveMethod,
      body: JSON.stringify(payload),
    });

    if (!saveRes.ok) {
      throw new Error(`Failed to save Appwrite graph (${saveRes.status}).`);
    }
  }

  async listUserGraphs(): Promise<UserGraphRecord[]> {
    const userId = getAppwriteUserId();
    if (!userId) {
      return [];
    }

    const response = await this.request(
      `/v1/databases/${this.config.databaseId}/tables/${this.config.tableId}/rows?queries[]=${encodeURIComponent(`equal("userId",["${userId}"])`)}`
    );

    if (!response.ok) {
      throw new Error(`Failed to list Appwrite graphs (${response.status}).`);
    }

    const body = (await response.json()) as AppwriteListResponse;
    return body.documents
      .filter((doc) => typeof doc.categoryId === "string" && typeof doc.graphId === "string")
      .map((doc) => ({
        categoryId: doc.categoryId as string,
        graphId: doc.graphId as string,
      }));
  }
}
