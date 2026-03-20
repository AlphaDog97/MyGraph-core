import { TagColorAssignment } from "../domain/types";

const STORAGE_KEY = "mygraph-tag-colors";

export function loadTagColors(): TagColorAssignment {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    /* ignore corrupt storage */
  }
  return {};
}

export function saveTagColors(colors: TagColorAssignment): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(colors));
  } catch {
    /* quota exceeded or private mode */
  }
}
