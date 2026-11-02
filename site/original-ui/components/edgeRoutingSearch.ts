import type { Position } from "cytoscape";
import type { NodeBounds } from "./graphConnectionGeometry";
import { hitsBox, linePenalty, type Segment } from "./edgeRoutingGeometry";

class MinHeap {
  private items: { id: number; cost: number }[] = [];
  push(item: { id: number; cost: number }) {
    let index = this.items.push(item) - 1;
    while (index > 0) {
      const parent = (index - 1) >> 1;
      if (this.items[parent].cost <= item.cost) break;
      this.items[index] = this.items[parent]; index = parent;
    }
    this.items[index] = item;
  }
  pop() {
    const first = this.items[0], last = this.items.pop();
    if (!this.items.length || !last) return first;
    let index = 0;
    while (index * 2 + 1 < this.items.length) {
      let child = index * 2 + 1;
      if (child + 1 < this.items.length && this.items[child + 1].cost < this.items[child].cost) child++;
      if (this.items[child].cost >= last.cost) break;
      this.items[index] = this.items[child]; index = child;
    }
    this.items[index] = last;
    return first;
  }
}

/** A bounded visibility grid: length + bend cost, with a large crossing penalty. */
export function searchRoute(start: Position, end: Position, xs: number[], ys: number[],
  obstacles: NodeBounds[], occupied: Segment[]): Position[] | null {
  const width = xs.length, size = width * ys.length;
  const point = (index: number) => ({ x: xs[index % width], y: ys[Math.floor(index / width)] });
  const startIndex = ys.indexOf(start.y) * width + xs.indexOf(start.x);
  const endIndex = ys.indexOf(end.y) * width + xs.indexOf(end.x);
  const initial = startIndex * 3 + 2;
  const scores = new Map([[initial, 0]]), previous = new Map<number, number>();
  const closed = new Set<number>(), costs = new Map<string, number>();
  const queue = new MinHeap(); queue.push({ id: initial, cost: 0 });
  for (let iteration = 0; iteration < size * 3; iteration++) {
    const current = queue.pop();
    if (!current) break;
    if (closed.has(current.id)) { iteration--; continue; }
    closed.add(current.id);
    const index = Math.floor(current.id / 3), direction = current.id % 3;
    if (index === endIndex) {
      const result: Position[] = [];
      for (let id: number | undefined = current.id; id !== undefined; id = previous.get(id)) result.push(point(Math.floor(id / 3)));
      return result.reverse();
    }
    const x = index % width, y = Math.floor(index / width), a = point(index);
    const neighbors = [x > 0 ? index - 1 : -1, x + 1 < width ? index + 1 : -1,
      y > 0 ? index - width : -1, y + 1 < ys.length ? index + width : -1];
    for (const next of neighbors) {
      if (next < 0) continue;
      const b = point(next), nextDirection = a.y === b.y ? 0 : 1, id = next * 3 + nextDirection;
      if (closed.has(id)) continue;
      const key = `${Math.min(index, next)}:${Math.max(index, next)}`;
      let cost = costs.get(key);
      if (cost === undefined) {
        cost = obstacles.some(box => hitsBox(a, b, box)) ? Infinity :
          Math.abs(a.x - b.x) + Math.abs(a.y - b.y) + linePenalty(a, b, occupied, [start, end]);
        costs.set(key, cost);
      }
      const score = scores.get(current.id)! + cost + (direction !== 2 && direction !== nextDirection ? 18 : 0);
      if (!Number.isFinite(score) || score >= (scores.get(id) ?? Infinity)) continue;
      scores.set(id, score); previous.set(id, current.id);
      queue.push({ id, cost: score + Math.abs(b.x - end.x) + Math.abs(b.y - end.y) });
    }
  }
  return null;
}
