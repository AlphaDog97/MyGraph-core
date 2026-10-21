import { getD1 } from "@/db";
import { requireApiUser } from "@/app/lib/auth";
import {
  asOptionalString,
  asRequiredString,
  errorResponse,
  RequestError,
} from "@/app/lib/route-utils";

type Context = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: Context) {
  try {
    await requireApiUser();
    const { id } = await context.params;
    const payload = (await request.json()) as Record<string, unknown>;
    const sourceNodeId = asRequiredString(payload.sourceNodeId, "sourceNodeId");
    const targetNodeId = asRequiredString(payload.targetNodeId, "targetNodeId");
    const type = asRequiredString(payload.type, "type");
    const label = asOptionalString(payload.label);

    const existing = await getD1().prepare("SELECT graph_id FROM edges WHERE id = ?").bind(id).first();
    if (!existing) throw new RequestError("Relation not found", 404);
    const verification = await getD1()
      .prepare("SELECT COUNT(*) AS count FROM nodes WHERE graph_id = ? AND id IN (?, ?)")
      .bind(existing.graph_id, sourceNodeId, targetNodeId).first();
    if (Number(verification?.count) !== (sourceNodeId === targetNodeId ? 1 : 2)) {
      throw new RequestError("Both nodes must belong to the selected graph", 409);
    }

    const result = await getD1()
      .prepare(
        `UPDATE edges
         SET source_node_id = ?, target_node_id = ?, type = ?, label = ?,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
      )
      .bind(sourceNodeId, targetNodeId, type, label, id)
      .run();

    if (!result.meta.changes) throw new RequestError("Relation not found", 404);
    return Response.json({ id });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(_request: Request, context: Context) {
  try {
    await requireApiUser();
    const { id } = await context.params;
    const result = await getD1()
      .prepare("DELETE FROM edges WHERE id = ?")
      .bind(id)
      .run();

    if (!result.meta.changes) throw new RequestError("Relation not found", 404);
    return Response.json({ deleted: id });
  } catch (error) {
    return errorResponse(error);
  }
}
