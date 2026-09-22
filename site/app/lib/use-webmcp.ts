"use client";

import { useEffect } from "react";
import type { GraphDetail } from "@/app/lib/types";

interface ToolDefinition {
  name: string;
  title: string;
  description: string;
  inputSchema: Record<string, unknown>;
  annotations?: { readOnlyHint?: boolean; untrustedContentHint?: boolean };
  execute: (input: unknown) => unknown | Promise<unknown>;
}

interface ModelContext {
  registerTool(
    tool: ToolDefinition,
    options?: { signal?: AbortSignal },
  ): void | Promise<void>;
}

declare global {
  interface Document {
    readonly modelContext?: ModelContext;
  }
}

async function api(url: string, method: string, body?: unknown) {
  const response = await fetch(url, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const result = (await response.json()) as Record<string, unknown>;
  if (!response.ok) throw new Error(String(result.error ?? "Request failed"));
  return result;
}

export function useWebMcp(
  detail: GraphDetail | null,
  refreshGraph: () => Promise<void>,
  refreshWorkspace: () => Promise<void>,
) {
  useEffect(() => {
    const context = document.modelContext;
    if (!context?.registerTool || !detail) return;

    const lifecycle = new AbortController();
    const register = (tool: ToolDefinition) => {
      void Promise.resolve(
        context.registerTool(tool, { signal: lifecycle.signal }),
      ).catch((error) => console.warn("WebMCP registration failed", error));
    };

    register({
      name: "read_current_graph",
      title: "Read current graph",
      description: "Read the visible MyGraph graph, including nodes and relations.",
      inputSchema: { type: "object", properties: {}, additionalProperties: false },
      annotations: { readOnlyHint: true, untrustedContentHint: false },
      execute: () => ({
        graph: detail.graph,
        nodes: detail.nodes,
        relations: detail.edges,
      }),
    });

    register({
      name: "create_graph_node",
      title: "Create graph node",
      description: "Create a node in the currently visible MyGraph graph.",
      inputSchema: {
        type: "object",
        properties: {
          nodeKey: { type: "string" },
          label: { type: "string" },
          description: { type: "string" },
          tags: { type: "array", items: { type: "string" } },
          globalConceptId: { type: "string" },
        },
        required: ["nodeKey", "label"],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      execute: async (input) => {
        const value = input as Record<string, unknown>;
        const result = await api("/api/nodes", "POST", {
          ...value,
          graphId: detail.graph.id,
        });
        await Promise.all([refreshGraph(), refreshWorkspace()]);
        return { id: result.id, created: true };
      },
    });

    register({
      name: "update_graph_node",
      title: "Update graph node",
      description: "Update one node in the currently visible MyGraph graph.",
      inputSchema: {
        type: "object",
        properties: {
          id: { type: "string" },
          nodeKey: { type: "string" },
          label: { type: "string" },
          description: { type: "string" },
          tags: { type: "array", items: { type: "string" } },
          globalConceptId: { type: "string" },
        },
        required: ["id", "nodeKey", "label"],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      execute: async (input) => {
        const value = input as Record<string, unknown>;
        const id = String(value.id ?? "");
        await api(`/api/nodes/${encodeURIComponent(id)}`, "PATCH", value);
        await refreshGraph();
        return { id, updated: true };
      },
    });

    register({
      name: "delete_graph_node",
      title: "Delete graph node",
      description: "Delete a node and its attached relations from the current graph.",
      inputSchema: {
        type: "object",
        properties: { id: { type: "string" } },
        required: ["id"],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      execute: async (input) => {
        const id = String((input as Record<string, unknown>).id ?? "");
        await api(`/api/nodes/${encodeURIComponent(id)}`, "DELETE");
        await Promise.all([refreshGraph(), refreshWorkspace()]);
        return { id, deleted: true };
      },
    });

    register({
      name: "create_graph_relation",
      title: "Create graph relation",
      description: "Connect two nodes in the currently visible MyGraph graph.",
      inputSchema: {
        type: "object",
        properties: {
          sourceNodeId: { type: "string" },
          targetNodeId: { type: "string" },
          type: { type: "string" },
          label: { type: "string" },
        },
        required: ["sourceNodeId", "targetNodeId", "type"],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      execute: async (input) => {
        const result = await api("/api/edges", "POST", {
          ...(input as Record<string, unknown>),
          graphId: detail.graph.id,
        });
        await refreshGraph();
        return { id: result.id, created: true };
      },
    });

    return () => lifecycle.abort();
  }, [detail, refreshGraph, refreshWorkspace]);
}

