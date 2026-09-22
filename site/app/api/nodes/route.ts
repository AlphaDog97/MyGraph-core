import { getD1 } from "@/db";
import { newId } from "@/app/lib/graph-store";
import { requireApiUser } from "@/app/lib/auth";
import {
  asOptionalString,
  asRequiredString,
  asTags,
  errorResponse,
} from "@/app/lib/route-utils";

export async function POST(request: Request) {
  try {
    await requireApiUser();
    const payload = (await request.json()) as Record<string, unknown>;
    const graphId = asRequiredString(payload.graphId, "graphId");
    const nodeKey = asRequiredString(payload.nodeKey, "nodeKey");
    const label = asRequiredString(payload.label, "label");
    const description = asOptionalString(payload.description);
    const tags = asTags(payload.tags);
    const globalConceptId = asOptionalString(payload.globalConceptId) || null;
    const id = newId("node");

    await getD1()
      .prepare(
        "INSERT INTO nodes (id, graph_id, node_key, label, description, tags, global_concept_id) VALUES (?, ?, ?, ?, ?, ?, ?)",
      )
      .bind(
        id,
        graphId,
        nodeKey,
        label,
        description,
        JSON.stringify(tags),
        globalConceptId,
      )
      .run();

    return Response.json({ id }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
