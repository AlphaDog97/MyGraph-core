import { TagColorAssignment } from "../domain/types";
import {
  getBrowserStorage,
  KeyValueStorage,
  readStoredJson,
  writeStoredJson,
} from "./storage";

const TAG_COLORS_KEY = "mygraph-tag-colors";
const LAST_VIEWED_KEY = "mygraph-last-viewed";

export function loadTagColors(
  storage: KeyValueStorage | null = getBrowserStorage()
): TagColorAssignment {
  return readStoredJson<TagColorAssignment>(TAG_COLORS_KEY, {}, storage);
}

export function saveTagColors(
  colors: TagColorAssignment,
  storage: KeyValueStorage | null = getBrowserStorage()
): void {
  writeStoredJson(TAG_COLORS_KEY, colors, storage);
}

export interface LastViewed {
  categoryId: string;
  graphId: string;
}

export function loadLastViewed(
  storage: KeyValueStorage | null = getBrowserStorage()
): LastViewed | null {
  return readStoredJson<LastViewed | null>(LAST_VIEWED_KEY, null, storage);
}

export function saveLastViewed(
  lastViewed: LastViewed,
  storage: KeyValueStorage | null = getBrowserStorage()
): void {
  writeStoredJson(LAST_VIEWED_KEY, lastViewed, storage);
}
