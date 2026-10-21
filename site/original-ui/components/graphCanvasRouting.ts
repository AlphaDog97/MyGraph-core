import type { Core, Position } from "cytoscape";
import { type ConnectionPort } from "./graphConnectionGeometry";
import { segmentCoordinates } from "./edgeRouting";
import { segments, type Segment } from "./edgeRoutingGeometry";
import { endpointValue, naturalConnection } from "./edgeRoutingNatural";

type SavedRoute = { signature: string; points: Position[]; controls: Position[]; source: ConnectionPort; target: ConnectionPort };
const cache = new WeakMap<Core, { nodeStamp: string; routes: Map<string, SavedRoute> }>();

export function routeGraphEdges(cy: Core) {
  if (cy.destroyed()) return;
  const boxes = new Map(cy.nodes().map(node => [node.id(),
    node.boundingBox({ includeLabels: false, includeOverlays: false })]));
  const nodeStamp = JSON.stringify([...boxes].sort(([a], [b]) => a.localeCompare(b)));
  const previous = cache.get(cy);
  const reusable = previous?.nodeStamp === nodeStamp ? previous.routes : new Map<string, SavedRoute>();
  const routes = new Map<string, SavedRoute>(), occupied: Segment[] = [];
  const pending: { edge: ReturnType<Core["edges"]>[number]; signature: string }[] = [];
  for (const edge of cy.edges()) {
    const signature = JSON.stringify([edge.data("source"), edge.data("target"), edge.data("sourcePort"), edge.data("targetPort")]);
    const saved = reusable.get(edge.id());
    if (saved?.signature === signature) { routes.set(edge.id(), saved); occupied.push(...segments(saved.points)); }
    else pending.push({ edge, signature });
  }
  for (const { edge, signature } of pending) {
    const sourceBox = boxes.get(edge.source().id()), targetBox = boxes.get(edge.target().id());
    if (!sourceBox || !targetBox || edge.source().id() === edge.target().id()) continue;
    const { source, target, points, controls } = naturalConnection(sourceBox, targetBox,
      edge.data("sourcePort"), edge.data("targetPort"), [...boxes.values()], occupied);
    routes.set(edge.id(), { signature, points, controls, source, target });
    occupied.push(...segments(points));
  }
  cy.batch(() => {
    for (const edge of cy.edges()) {
      const route = routes.get(edge.id());
      const coordinates = route && segmentCoordinates([route.source, ...route.controls, route.target], edge.source().position(), edge.target().position());
      if (!route || !coordinates) { edge.data("routed", 0); continue; }
      edge.data({ routed: 1,
        controlWeights: coordinates.weights.join(" "), controlDistances: coordinates.distances.join(" "),
        sourceEndpoint: endpointValue(route.source, boxes.get(edge.source().id())!),
        targetEndpoint: endpointValue(route.target, boxes.get(edge.target().id())!),
        routePoints: route.points, curveControls: route.controls });
    }
  });
  cache.set(cy, { nodeStamp, routes });
}
