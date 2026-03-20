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
performance yet, but it does include runtime tag-based styling and a visible
legend so the graph remains understandable as content grows.

## Design

### Product goals

- Keep the authoring workflow file-based and easy to understand.
- Keep the runtime fully static so it works on GitHub Pages without a backend.
- Make node styling predictable, including user-controlled tag color mapping.
- Define a clear node model in TypeScript so the file format and rendered graph
  stay aligned.

### Proposed repository structure

```text
/
├── graph-data/
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
- Each file represents one node and can declare outbound relationships.
- The app loads all node files at build time or startup, validates them, and
  transforms them into Cytoscape element definitions.

### Runtime tag color editor

Do not require a repository-level tag color config file for the MVP. Instead,
the app should discover all tags present in the loaded node data and let the
viewer control how those tags are colored from the UI.

Editor behavior:

- provide an explicit `Edit tag colors` button in the app shell,
- open a lightweight panel or modal listing all discovered tags,
- allow the user to pick a display color for each tag,
- allow clearing a tag color back to the default unassigned state,
- update the graph and legend immediately when a color changes,
- persist the user's tag-color choices in browser storage so GitHub Pages users
  keep their selections across refreshes on the same device/browser.

Because the app is static and backend-free, browser-local persistence is enough
for the MVP. Cross-device sync is out of scope.

### Proposed node file format

Use one JSON file per node for the MVP. JSON keeps parsing simple, avoids
Markdown/frontmatter complexity, and is easy to validate in TypeScript.

Example:

```json
{
  "id": "react",
  "label": "React",
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

- `description`: short explanatory text for future detail panels or search
- `links`: outbound relationship declarations

Tag rules:

- nodes may carry multiple tags,
- tags are discovered directly from the loaded node files,
- the order of tags in the node's `tags` array matters for color resolution,
- additional tags remain searchable and available for future filtering.

Relationship fields:

- `target`: target node `id`
- `type`: machine-readable relation kind
- `label`: human-readable edge label

### Domain model

Define an explicit TypeScript model instead of passing raw JSON directly into
the renderer.

Proposed shape:

- `TagRegistry`: derived list of unique tags discovered from loaded nodes
- `TagColorAssignment`: runtime UI state that maps tag IDs to chosen colors
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
- helper methods for resolving effective border color from external tag-color
  state,
- helper methods for search indexing,
- conversion into Cytoscape node data.

This keeps the file format stable while giving the UI a reliable internal API.

### Tag color resolution and legend behavior

The MVP needs one predictable rule for deciding each node's displayed style.

Default node style:

- white fill,
- medium gray border when no matching tag color has been chosen,
- border color determined by runtime tag-color assignment when available.

Recommended border-color resolution:

1. inspect the node's `tags` array in order,
2. use the first tag that currently has a user-assigned color,
3. if none of the node's tags have a chosen color, render the node with a gray
   border.

Legend behavior:

- render a visible legend panel in the app shell,
- show every discovered tag with its current color swatch,
- show unassigned tags in the default gray state,
- make it clear that legend colors describe node border styling by tag,
- keep legend generation data-driven from the loaded dataset and runtime
  tag-color state.

This approach keeps the source data simple while allowing viewers to customize
how tag categories are emphasized.

### Data loading and transformation flow

1. Collect all files from `graph-data/nodes/*.json`.
2. Parse each file into `KnowledgeNodeFile`.
3. Validate required fields and enforce unique node IDs.
4. Convert raw files into `KnowledgeNode` instances.
5. Expand each node's `links` into normalized `KnowledgeEdge` instances.
6. Verify that edge targets reference existing nodes.
7. Discover the unique set of tags present in the loaded nodes.
8. Initialize tag-color UI state from browser storage or empty defaults.
9. Resolve each node's effective border color from the current tag-color state.
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
- render nodes as white-filled shapes with bordered outlines,
- apply each node's resolved border color,
- show a legend for discovered tags and their current colors,
- include an edit action for changing tag colors at runtime,
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
- edit tag colors button,
- tag color editor panel or modal,
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

- where to place node files,
- required and optional fields,
- how multi-tag nodes work,
- how runtime tag color editing works,
- default node styling when no tag color is chosen,
- accepted color input examples in the editor,
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
- [ ] Define TypeScript node and edge models, including a `KnowledgeNode` class
      for validation and normalization.
- [ ] Implement loading of `graph-data/nodes/*.json` and transformation into
      Cytoscape elements.
- [ ] Implement validation and a readable error state for invalid datasets.
- [ ] Implement runtime tag discovery from loaded nodes.
- [ ] Implement a tag color editor UI, local persistence, and a visible legend.
- [ ] Implement node border-color resolution based on user-selected tag colors.
- [ ] Add search, highlight/dim behavior, and reset/fit controls.
- [ ] Add sample graph data and contributor documentation for the folder format.
- [ ] Configure GitHub Actions deployment to GitHub Pages.

## Test

- [ ] Add at least 3 sample node files with cross-links and multiple tags.
- [ ] Run the local build successfully with the sample dataset.
- [ ] Confirm the rendered graph shows all nodes and edges from the source
      folder.
- [ ] Confirm nodes with multiple tags load successfully and remain searchable by
      each tag.
- [ ] Confirm the editor lists all discovered tags from the loaded dataset.
- [ ] Confirm choosing a color for a tag updates the legend and node border
      colors immediately.
- [ ] Confirm node style precedence works as specified: first color-assigned tag
      in `tags` order wins, otherwise gray border fallback.
- [ ] Confirm nodes render with white fill and gray border when no relevant tag
      color has been chosen.
- [ ] Confirm chosen tag colors persist across page refresh in the same browser.
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

1. Use only `graph-data/nodes/*.json` as the initial authoring format.
2. Treat each file as one node and declare edges through that node's `links`.
3. Require that nodes support multiple tags through a `tags` array.
4. Discover tags from loaded node data instead of maintaining a repository-level
   tag color config.
5. Let users assign colors through an in-page editor, with browser-local
   persistence.
6. Render all nodes with white fill; use gray border by default and the chosen
   tag color as the border when assigned.
7. Resolve node border color by the first tag in `tags` order that currently has
   a chosen color.
8. Keep the MVP as a single static page with search plus a lightweight tag color
   editing UI.
9. Make invalid data block rendering with a readable error state.
10. Limit MVP search to case-insensitive substring matches on `label`, `id`, and
   `tags`.
