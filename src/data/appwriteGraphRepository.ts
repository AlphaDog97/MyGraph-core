import { KnowledgeGraph, KnowledgeNodeFile } from "../domain/types";

export type AppPersistenceMode = "file" | "appwrite";

export class AppwriteRepositoryError extends Error {
  readonly kind: "auth" | "permission" | "network" | "unknown";

  constructor(kind: "auth" | "permission" | "network" | "unknown", message: string) {
    super(message);
    this.kind = kind;
  }
}

interface AppwriteConfig {
  endpoint: string;
  projectId: string;
  databaseId: string;
  collectionId: string;
}

function getConfig(): AppwriteConfig {
  const endpoint = import.meta.env.VITE_APPWRITE_ENDPOINT as string | undefined;
  const projectId = import.meta.env.VITE_APPWRITE_PROJECT_ID as string | undefined;
  const databaseId = import.meta.env.VITE_APPWRITE_DATABASE_ID as string | undefined;
  const collectionId = import.meta.env.VITE_APPWRITE_COLLECTION_ID as string | undefined;

  if (!endpoint || !projectId || !databaseId || !collectionId) {
    throw new AppwriteRepositoryError(
      "unknown",
      "Appwrite configuration is incomplete. Check VITE_APPWRITE_* variables."
    );
  }

  return { endpoint, projectId, databaseId, collectionId };
}

function toGraphPayload(graph: KnowledgeGraph): KnowledgeNodeFile[] {
  return graph.nodes.map((n) => {
    const obj: KnowledgeNodeFile = { id: n.id, label: n.label, tags: n.tags };
    if (n.description) obj.description = n.description;
    if (n.links.length > 0) {
      obj.links = n.links.map((l) => ({
        target: l.target,
        type: l.type,
        ...(l.label ? { label: l.label } : {}),
      }));
    }
    return obj;
  });
}

function mapError(error: unknown): AppwriteRepositoryError {
  if (error instanceof AppwriteRepositoryError) {
    return error;
  }
  if (error instanceof TypeError) {
    return new AppwriteRepositoryError(
      "network",
      "Network error while connecting to Appwrite."
    );
  }
  return new AppwriteRepositoryError("unknown", "Unexpected Appwrite error.");
}

export class AppwriteGraphRepository {
  private config = getConfig();

  private documentId(categoryId: string, graphId: string): string {
    return `${categoryId}--${graphId}`;
  }

  private async request(path: string, init: RequestInit): Promise<Response> {
    const url = `${this.config.endpoint}${path}`;
    const res = await fetch(url, {
      ...init,
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        "X-Appwrite-Project": this.config.projectId,
        ...(init.headers ?? {}),
      },
    });

    if (!res.ok) {
      if (res.status === 401) {
        throw new AppwriteRepositoryError("auth", "Authentication expired. Please sign in again.");
      }
      if (res.status === 403) {
        throw new AppwriteRepositoryError("permission", "You do not have permission for this action.");
      }
      throw new AppwriteRepositoryError(
        "unknown",
        `Appwrite request failed (${res.status}).`
      );
    }

    return res;
  }

  async saveGraph(categoryId: string, graphId: string, graph: KnowledgeGraph): Promise<void> {
    const documentId = this.documentId(categoryId, graphId);
    const path = `/databases/${this.config.databaseId}/collections/${this.config.collectionId}/documents/${documentId}`;
    const data = {
      categoryId,
      graphId,
      nodes: toGraphPayload(graph),
    };

    try {
      await this.request(path, {
        method: "PATCH",
        body: JSON.stringify({ data }),
      });
    } catch (error) {
      const mapped = mapError(error);
      if (mapped.kind === "unknown") {
        await this.request(
          `/databases/${this.config.databaseId}/collections/${this.config.collectionId}/documents`,
          {
            method: "POST",
            body: JSON.stringify({ documentId, data }),
          }
        );
        return;
      }
      throw mapped;
    }
  }

  async moveGraph(fromCategoryId: string, targetCategoryId: string, graphId: string): Promise<void> {
    const oldId = this.documentId(fromCategoryId, graphId);

    await this.request(
      `/databases/${this.config.databaseId}/collections/${this.config.collectionId}/documents/${oldId}`,
      {
        method: "PATCH",
        body: JSON.stringify({
          data: {
            categoryId: targetCategoryId,
          },
        }),
      }
    );
  }

  async deleteGraph(categoryId: string, graphId: string): Promise<void> {
    const documentId = this.documentId(categoryId, graphId);
    await this.request(
      `/databases/${this.config.databaseId}/collections/${this.config.collectionId}/documents/${documentId}`,
      { method: "DELETE" }
    );
  }
}
