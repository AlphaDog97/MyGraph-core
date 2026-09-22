import { getD1 } from "@/db";
import { newId } from "@/app/lib/graph-store";
import { requireApiUser } from "@/app/lib/auth";
import {
  asRequiredString,
  errorResponse,
} from "@/app/lib/route-utils";

export async function POST(request: Request) {
  try {
    await requireApiUser();
    const payload = (await request.json()) as {
      categoryId?: unknown;
      slug?: unknown;
      label?: unknown;
    };
    const categoryId = asRequiredString(payload.categoryId, "categoryId");
    const slug = asRequiredString(payload.slug, "slug")
      .toLowerCase()
      .replace(/[^a-z0-9-]+/g, "-")
      .replace(/^-+|-+$/g, "");
    const label = asRequiredString(payload.label, "label");
    const id = newId("graph");

    await getD1()
      .prepare(
        "INSERT INTO graphs (id, category_id, slug, label) VALUES (?, ?, ?, ?)",
      )
      .bind(id, categoryId, slug, label)
      .run();

    return Response.json({ id, categoryId, slug, label }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
