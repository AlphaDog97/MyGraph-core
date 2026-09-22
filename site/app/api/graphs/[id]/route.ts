import { getD1 } from "@/db";
import { getGraphDetail } from "@/app/lib/graph-store";
import { requireApiUser } from "@/app/lib/auth";
import {
  asRequiredString,
  errorResponse,
  RequestError,
} from "@/app/lib/route-utils";

type Context = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: Context) {
  try {
    await requireApiUser();
    const { id } = await context.params;
    const detail = await getGraphDetail(id);
    if (!detail) throw new RequestError("Graph not found", 404);
    return Response.json(detail);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(request: Request, context: Context) {
  try {
    await requireApiUser();
    const { id } = await context.params;
    const payload = (await request.json()) as {
      slug?: unknown;
      label?: unknown;
    };
    const slug = asRequiredString(payload.slug, "slug")
      .toLowerCase()
      .replace(/[^a-z0-9-]+/g, "-")
      .replace(/^-+|-+$/g, "");
    const label = asRequiredString(payload.label, "label");

    const result = await getD1()
      .prepare(
        "UPDATE graphs SET slug = ?, label = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
      )
      .bind(slug, label, id)
      .run();

    if (!result.meta.changes) throw new RequestError("Graph not found", 404);
    return Response.json({ id, slug, label });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(_request: Request, context: Context) {
  try {
    await requireApiUser();
    const { id } = await context.params;
    const result = await getD1()
      .prepare("DELETE FROM graphs WHERE id = ?")
      .bind(id)
      .run();

    if (!result.meta.changes) throw new RequestError("Graph not found", 404);
    return Response.json({ deleted: id });
  } catch (error) {
    return errorResponse(error);
  }
}
