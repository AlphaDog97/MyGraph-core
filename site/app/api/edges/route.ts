import { getD1 } from "@/db";
import { newId } from "@/app/lib/graph-store";
import { requireApiUser } from "@/app/lib/auth";
import {
  asOptionalString,
  asRequiredString,
  errorResponse,
  RequestError,
} from "@/app/lib/route-utils";

export async function POST(request: Request) {
  try {
    await requireApiUser();
    const payload = (await request.json()) as Record<string, unknown>;
    const graphId = asRequiredString(payload.graphId, "graphId");
    const sourceNodeId = asRequiredString(payload.sourceNodeId, "sourceNodeId");
    const targetNodeId = asRequiredString(payload.targetNodeId, "targetNodeId");
    const type = asRequiredString(payload.type, "type");
    const label = asOptionalString(payload.label);

    const verification = await getD1()
      .prepare(
        "SELECT COUNT(*) AS count FROM nodes WHERE graph_id = ? AND id IN (?, ?)",
      )
      .bind(graphId, sourceNodeId, targetNodeId)
      .first();

    if (Number(verification?.count) !== (sourceNodeId === targetNodeId ? 1 : 2)) {
      throw new RequestError("Both nodes must belong to the selected graph", 409);
    }

    const id = newId("edge");
    await getD1()
      .prepare(
        "INSERT INTO edges (id, graph_id, source_node_id, target_node_id, type, label) VALUES (?, ?, ?, ?, ?, ?)",
      )
      .bind(id, graphId, sourceNodeId, targetNodeId, type, label)
      .run();

    return Response.json({ id }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
