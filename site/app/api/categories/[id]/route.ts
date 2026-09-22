import { getD1 } from "@/db";
import { requireApiUser } from "@/app/lib/auth";
import {
  asRequiredString,
  errorResponse,
  RequestError,
} from "@/app/lib/route-utils";

type Context = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: Context) {
  try {
    await requireApiUser();
    const { id } = await context.params;
    const payload = (await request.json()) as { label?: unknown };
    const label = asRequiredString(payload.label, "label");
    const result = await getD1()
      .prepare(
        "UPDATE categories SET label = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
      )
      .bind(label, id)
      .run();

    if (!result.meta.changes) throw new RequestError("Category not found", 404);
    return Response.json({ id, label });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(_request: Request, context: Context) {
  try {
    await requireApiUser();
    const { id } = await context.params;
    const result = await getD1()
      .prepare("DELETE FROM categories WHERE id = ?")
      .bind(id)
      .run();

    if (!result.meta.changes) throw new RequestError("Category not found", 404);
    return Response.json({ deleted: id });
  } catch (error) {
    return errorResponse(error);
  }
}
