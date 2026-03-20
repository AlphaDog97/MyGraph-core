import { TagColorAssignment } from "../domain/types";

const TAG_COLORS_KEY = "mygraph-tag-colors";
const LAST_VIEWED_KEY = "mygraph-last-viewed";

export function loadTagColors(): TagColorAssignment {
  try {
    const raw = localStorage.getItem(TAG_COLORS_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    /* ignore */
  }
  return {};
}

export function saveTagColors(colors: TagColorAssignment): void {
  try {
    localStorage.setItem(TAG_COLORS_KEY, JSON.stringify(colors));
  } catch {
    /* ignore */
  }
}

export interface LastViewed {
  categoryId: string;
  graphId: string;
}

export function loadLastViewed(): LastViewed | null {
  try {
    const raw = localStorage.getItem(LAST_VIEWED_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    /* ignore */
  }
  return null;
}

export function saveLastViewed(lv: LastViewed): void {
  try {
    localStorage.setItem(LAST_VIEWED_KEY, JSON.stringify(lv));
  } catch {
    /* ignore */
  }
}
