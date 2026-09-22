export function asRequiredString(value: unknown, field: string): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new RequestError(`${field} is required`, 400);
  }
  return value.trim();
}

export function asOptionalString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export function asTags(value: unknown): string[] {
  if (Array.isArray(value)) {
    return [...new Set(value.map(String).map((tag) => tag.trim()).filter(Boolean))];
  }
  if (typeof value === "string") {
    return [...new Set(value.split(",").map((tag) => tag.trim()).filter(Boolean))];
  }
  return [];
}

export class RequestError extends Error {
  constructor(message: string, readonly status = 400) {
    super(message);
  }
}

export function errorResponse(error: unknown) {
  const message = error instanceof Error ? error.message : "Unexpected error";
  const status =
    error instanceof RequestError
      ? error.status
      : /UNIQUE constraint failed/i.test(message)
        ? 409
        : /FOREIGN KEY constraint failed/i.test(message)
          ? 409
          : 500;

  console.error("MyGraph API error", error);
  return Response.json({ error: message }, { status });
}

