import { getD1 } from "@/db";
import { requireApiUser } from "@/app/lib/auth";
import {
  asOptionalString,
  asRequiredString,
  asTags,
  errorResponse,
  RequestError,
} from "@/app/lib/route-utils";

type Context = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: Context) {
  try {
    await requireApiUser();
    const { id } = await context.params;
    const payload = (await request.json()) as Record<string, unknown>;
    const nodeKey = asRequiredString(payload.nodeKey, "nodeKey");
    const label = asRequiredString(payload.label, "label");
    const description = asOptionalString(payload.description);
    const tags = asTags(payload.tags);
    const globalConceptId = asOptionalString(payload.globalConceptId) || null;

    const result = await getD1()
      .prepare(
        `UPDATE nodes
         SET node_key = ?, label = ?, description = ?, tags = ?,
             global_concept_id = ?, updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
      )
      .bind(
        nodeKey,
        label,
        description,
        JSON.stringify(tags),
        globalConceptId,
        id,
      )
      .run();

    if (!result.meta.changes) throw new RequestError("Node not found", 404);
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
      .prepare("DELETE FROM nodes WHERE id = ?")
      .bind(id)
      .run();

    if (!result.meta.changes) throw new RequestError("Node not found", 404);
    return Response.json({ deleted: id });
  } catch (error) {
    return errorResponse(error);
  }
}
