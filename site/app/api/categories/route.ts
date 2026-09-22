import { getD1 } from "@/db";
import { listWorkspace } from "@/app/lib/graph-store";
import { requireApiUser } from "@/app/lib/auth";
import {
  asRequiredString,
  errorResponse,
  RequestError,
} from "@/app/lib/route-utils";

export async function GET() {
  try {
    await requireApiUser();
    return Response.json(await listWorkspace());
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    await requireApiUser();
    const payload = (await request.json()) as { id?: unknown; label?: unknown };
    const id = asRequiredString(payload.id, "id")
      .toLowerCase()
      .replace(/[^a-z0-9-]+/g, "-")
      .replace(/^-+|-+$/g, "");
    const label = asRequiredString(payload.label, "label");

    if (!id) throw new RequestError("id must contain letters or numbers");

    await getD1()
      .prepare("INSERT INTO categories (id, label) VALUES (?, ?)")
      .bind(id, label)
      .run();

    return Response.json({ id, label }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
