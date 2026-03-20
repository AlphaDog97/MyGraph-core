---
status: draft
created: '2026-03-20'
tags:
  - frontend
  - visualization
  - knowledge-graph
  - github-pages
priority: high
created_at: '2026-03-20T01:10:15+00:00'
---

# Visual Knowledge Graph MVP

> **Status**: draft · **Priority**: high · **Created**: 2026-03-20

## Overview

Build a static knowledge-graph web app that reads structured content from a
repository folder, converts that content into graph nodes and edges, and
renders the result in the browser with React, Vite, and Cytoscape.js.

The MVP is successful when a contributor can:

1. add or edit node files in the agreed folder structure,
2. publish the repository to GitHub Pages,
3. open the Pages site and see an interactive graph generated from those files,
4. zoom and pan the graph, and
5. search for nodes by text and quickly locate the matching items.

This spec focuses on the first end-to-end authoring and publishing flow. It does
not try to solve advanced graph editing, collaboration, or large-scale dataset
performance yet, but it does include tag-based coloring and a visible legend so
the graph remains understandable as content grows.

## Design

### Product goals

- Keep the authoring workflow file-based and easy to understand.
- Keep the runtime fully static so it works on GitHub Pages without a backend.
- Make node styling predictable, including per-node color.
- Define a clear node model in TypeScript so the file format and rendered graph
  stay aligned.

### Proposed repository structure

```text
/
├── graph-data/
│   ├── config.json
│   └── nodes/
│       ├── react.json
│       ├── vite.json
│       └── cytoscape.json
├── src/
│   ├── domain/
│   ├── data/
│   ├── components/
│   └── ...
└── .github/workflows/
```

- `graph-data/nodes/` is the user-managed source folder for the knowledge graph.
- `graph-data/config.json` stores shared graph settings for the MVP, especially
  tag definitions and tag colors.
- Each file represents one node and can declare outbound relationships.
- The app loads all node files at build time or startup, validates them, and
  transforms them into Cytoscape element definitions.

### Proposed graph config format

Use one shared JSON config file to define tag metadata and the legend.

Example:

```json
{
  "tags": {
    "frontend": {
      "label": "Frontend",
      "color": "#3b82f6"
    },
    "tooling": {
      "label": "Tooling",
      "color": "#8b5cf6"
    },
    "visualization": {
      "label": "Visualization",
      "color": "#10b981"
    }
  },
  "defaultNodeColor": "#94a3b8"
}
```

Config responsibilities:

- define the list of supported tags for the dataset,
- define the display label and color for each tag,
- provide a default fallback node color when neither tags nor node override
  colors resolve cleanly,
- power the on-screen legend.

### Proposed node file format

Use one JSON file per node for the MVP. JSON keeps parsing simple, avoids
Markdown/frontmatter complexity, and is easy to validate in TypeScript.

Example:

```json
{
  "id": "react",
  "label": "React",
  "color": "#61dafb",
  "description": "UI library for building component-driven interfaces.",
  "tags": ["frontend", "visualization"],
  "links": [
    {
      "target": "vite",
      "type": "used-with",
      "label": "bundled by"
    },
    {
      "target": "cytoscape",
      "type": "renders",
      "label": "visualizes with"
    }
  ]
}
```

Required fields:

- `id`: stable unique identifier, URL-safe string
- `label`: display name shown in the graph and search results
- `tags`: array of zero or more tag IDs, with support for multiple tags per node

Optional fields:

- `color`: node-specific override color, preferably hex or other CSS-valid color
  string
- `description`: short explanatory text for future detail panels or search
- `links`: outbound relationship declarations

Tag rules:

- nodes may carry multiple tags,
- every tag used by a node should be declared in `graph-data/config.json`,
- the first tag in the node's `tags` array is the default visual tag for color
  resolution when no node-specific `color` override is present,
- additional tags remain searchable and available for future filtering.

Relationship fields:

- `target`: target node `id`
- `type`: machine-readable relation kind
- `label`: human-readable edge label

### Domain model

Define an explicit TypeScript model instead of passing raw JSON directly into
the renderer.

Proposed shape:

- `GraphConfigFile`: raw shared config loaded from `graph-data/config.json`
- `TagDefinition`: normalized tag metadata with label and color
- `KnowledgeNodeFile`: raw data loaded from JSON
- `KnowledgeLinkFile`: raw outbound link data
- `KnowledgeNode`: validated runtime class or factory-backed model
- `KnowledgeEdge`: normalized edge model derived from `KnowledgeLinkFile`
- `KnowledgeGraph`: aggregate structure containing nodes, edges, and validation
  warnings

The `KnowledgeNode` class should own:

- required field validation,
- default normalization for optional fields,
- tag normalization and duplicate tag cleanup,
- effective color resolution,
- helper methods for search indexing,
- conversion into Cytoscape node data.

This keeps the file format stable while giving the UI a reliable internal API.

### Tag color resolution and legend behavior

The MVP needs one predictable rule for deciding each node's displayed color.

Recommended precedence:

1. if the node defines `color`, use it as an explicit override,
2. else if the node has at least one tag and that tag exists in the shared tag
   config, use the first tag's configured color,
3. else use `defaultNodeColor` from `graph-data/config.json`.

Legend behavior:

- render a visible legend panel in the app shell,
- show every configured tag with its color swatch and human-readable label,
- make it clear that legend colors are tag colors, not necessarily unique node
  identities,
- keep legend generation data-driven from `graph-data/config.json`.

This approach allows consistent category coloring while still supporting special
node-level overrides when needed.

### Data loading and transformation flow

1. Load and parse `graph-data/config.json`.
2. Validate tag definitions and default color settings.
3. Collect all files from `graph-data/nodes/*.json`.
4. Parse each file into `KnowledgeNodeFile`.
5. Validate required fields and enforce unique node IDs.
6. Convert raw files into `KnowledgeNode` instances.
7. Expand each node's `links` into normalized `KnowledgeEdge` instances.
8. Verify that edge targets reference existing nodes.
9. Resolve each node's effective display color from node override, tag config,
   or fallback color.
10. Convert nodes and edges into Cytoscape element definitions.
11. Render the graph, or show a clear validation error state if the dataset is
   invalid.

For the MVP, invalid data should fail loudly rather than silently producing a
partial graph. A broken dataset should show a readable on-page error summary so
the author can fix the source files and redeploy.

### Graph rendering behavior

Use Cytoscape.js as the graph engine and layout manager.

MVP behaviors:

- render all valid nodes and edges on initial load,
- support mouse/touch zoom and pan,
- include a reset-view action that returns to a sensible default fit,
- apply each node's resolved display color,
- show a legend for configured tag colors,
- show node labels by default,
- use one general-purpose automatic layout suitable for small-to-medium graphs.

Recommended initial layout: `cose` or another force-directed layout that works
reasonably well without manual coordinates. Manual positioning is out of scope
for the first version.

### Search behavior

Provide a simple text search UI above or beside the graph.

MVP search rules:

- query against `label`, `id`, and `tags`,
- update results as the user types,
- highlight matching nodes,
- dim non-matching nodes and edges,
- allow clearing the search and returning to the full graph view,
- optionally zoom-to-fit the matched subset when results exist.

Search does not need fuzzy ranking in the MVP; case-insensitive substring
matching is sufficient.

### UI scope

The first version only needs a focused single-page experience:

- graph canvas,
- search input,
- tag color legend,
- reset/fit controls,
- loading state,
- validation error state.

Optional detail sidebars, editing UIs, filtering by relation type, and rich
tooltips are explicitly out of scope for this MVP unless they become necessary
to complete the basic authoring-to-Pages flow.

### GitHub Pages compatibility

The project must build as a static site and deploy cleanly to GitHub Pages.

Implementation constraints for the eventual build:

- use Vite for bundling,
- configure `base` correctly for a repository-hosted Pages site,
- avoid server-only runtime dependencies,
- keep data loading compatible with static hosting,
- add a GitHub Actions workflow that builds and deploys the `dist/` output.

Because this app does not require client-side routing for the MVP, it should
avoid route-dependent behavior that complicates Pages hosting.

### Documentation and sample data

Include a small sample dataset in `graph-data/nodes/` so the repository renders
something useful immediately after setup.

Also include author documentation that explains:

- how `graph-data/config.json` defines tag colors and the legend,
- where to place node files,
- required and optional fields,
- how multi-tag nodes work,
- accepted node and tag color format examples,
- how links are declared,
- how to publish to GitHub Pages,
- what happens when validation fails.

### Out of scope

- in-browser graph editing
- drag-and-drop node placement persistence
- backend storage or sync
- authentication and permissions
- multiple graph datasets or workspaces
- advanced analytics or graph algorithms
- fuzzy search, tag faceting, or clustering controls
- thousands-of-nodes performance optimization

## Plan

- [ ] Scaffold a React + Vite application suitable for GitHub Pages deployment.
- [ ] Add Cytoscape.js and create the base graph rendering component.
- [ ] Define shared tag config loading, including tag labels, colors, and
      fallback color behavior.
- [ ] Define TypeScript node and edge models, including a `KnowledgeNode` class
      for validation and normalization.
- [ ] Implement loading of `graph-data/nodes/*.json` and transformation into
      Cytoscape elements.
- [ ] Implement validation and a readable error state for invalid datasets.
- [ ] Implement tag-based color resolution and a visible legend component.
- [ ] Add search, highlight/dim behavior, and reset/fit controls.
- [ ] Add sample graph data and contributor documentation for the folder format.
- [ ] Configure GitHub Actions deployment to GitHub Pages.

## Test

- [ ] Add `graph-data/config.json` with multiple tag definitions and colors.
- [ ] Add at least 3 sample node files with cross-links, multiple tags, and at
      least one node-level color override.
- [ ] Run the local build successfully with the sample dataset.
- [ ] Confirm the rendered graph shows all nodes and edges from the source
      folder.
- [ ] Confirm nodes with multiple tags load successfully and remain searchable by
      each tag.
- [ ] Confirm legend entries match configured tag labels and colors.
- [ ] Confirm node color precedence works as specified: node override first,
      first tag color second, default fallback last.
- [ ] Confirm zoom, pan, and reset/fit controls work in the browser.
- [ ] Confirm search matches node `label`, `id`, and `tags`.
- [ ] Confirm an invalid dataset produces a visible validation error instead of
      a silent failure.
- [ ] Deploy to GitHub Pages and verify the graph loads correctly from the
      published site.
- [ ] Verify that adding or editing files in `graph-data/nodes/` changes the
      published graph after rebuild and redeploy.

## Review points

Please review these decisions before implementation:

1. Use `graph-data/config.json` plus `graph-data/nodes/*.json` as the initial
   authoring format.
2. Treat each file as one node and declare edges through that node's `links`.
3. Require that nodes support multiple tags through a `tags` array.
4. Use shared tag color definitions for the legend, with optional node-level
   color overrides.
5. Resolve node color in this order: node override -> first configured tag color
   -> default fallback color.
6. Keep the MVP as a single static page without editing features.
7. Make invalid data block rendering with a readable error state.
8. Limit MVP search to case-insensitive substring matches on `label`, `id`, and
   `tags`.
