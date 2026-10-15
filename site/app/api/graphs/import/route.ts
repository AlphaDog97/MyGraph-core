import { getD1 } from "@/db";
import { requireApiUser } from "@/app/lib/auth";
import { parseGraphImport } from "@/app/lib/graph-import";
import { saveGraphImport } from "@/app/lib/graph-import-store";
import { asRequiredString, errorResponse, RequestError } from "@/app/lib/route-utils";

async function readPayload(request: Request): Promise<Record<string, unknown>> {
  const reader = request.body?.getReader();
  if (!reader) throw new RequestError("请粘贴 JSON 内容");
  const decoder = new TextDecoder();
  let size = 0;
  let text = "";
  try {
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      size += chunk.value.byteLength;
      if (size > 1024 * 1024) {
        await reader.cancel();
        throw new RequestError("导入内容过大，请拆分导入", 413);
      }
      text += decoder.decode(chunk.value, { stream: true });
    }
    text += decoder.decode();
  } finally {
    reader.releaseLock();
  }
  try {
    const payload: unknown = JSON.parse(text);
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) throw new Error();
    return payload as Record<string, unknown>;
  } catch {
    throw new RequestError("导入请求格式不正确");
  }
}

export async function POST(request: Request) {
  try {
    await requireApiUser();
    const payload = await readPayload(request);
    const categoryId = asRequiredString(payload.categoryId, "categoryId");
    const rawText = asRequiredString(payload.rawText, "rawText");
    let document;
    try {
      document = parseGraphImport(rawText, typeof payload.graphLabel === "string" ? payload.graphLabel : undefined);
    } catch (error) {
      throw new RequestError(error instanceof Error ? error.message : "图谱格式不正确");
    }
    const result = await saveGraphImport(getD1(), categoryId, document);
    return Response.json(result, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
