import type { ConnectionSide } from "@/original-ui/domain/types";
import { RequestError } from "./route-utils";

export function asConnectionSide(value: unknown): ConnectionSide | null {
  if (value === undefined || value === null || value === "") return null;
  if (value === "top" || value === "right" || value === "bottom" || value === "left") return value;
  throw new RequestError("Invalid connection point", 400);
}
