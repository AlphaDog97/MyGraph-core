---
status: in-progress
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

> **Status**: in-progress · **Priority**: high · **Created**: 2026-03-20

## Overview

Build a static knowledge-graph web app that reads structured content from a
repository folder, converts that content into graph nodes and edges, and
renders the result in the browser with React, Vite, and Cytoscape.js.

The MVP is successful when a contributor can:

1. organize graphs into categories within the agreed folder structure,
2. publish the repository to GitHub Pages,
3. open the Pages site, pick a category and graph from the UI, and see an
   interactive graph generated from those files,
4. zoom and pan the graph, and
5. search for nodes by text and quickly locate the matching items.

This spec covers the end-to-end authoring, navigation, and publishing flow. It
includes multi-category/multi-graph organization, runtime tag-based styling, a
visible legend, and basic graph management operations (move, delete).

## Design

### Product goals

- Keep the authoring workflow file-based and easy to understand.
- Keep the runtime fully static so it works on GitHub Pages without a backend.
- Support multiple categories and multiple graphs per category.
- Make node styling predictable, including user-controlled tag color mapping.
- Deliver a minimal, refined interface that feels modern, premium, and calm.
- Define a clear node model in TypeScript so the file format and rendered graph
  stay aligned.

### Repository structure (multi-category, multi-graph)

```text
/
├── graph-data/
│   ├── manifest.json                  ← auto-generated catalog of all categories/graphs
│   ├── ef-core/                       ← category folder
│   │   └── graph.json                 ← includes graphs[]; each graph has graphLabel + nodes[]
│   └── data-science/
│       └── graph.json
├── src/
│   ├── domain/
│   ├── data/
│   ├── components/
│   └── ...
└── .github/workflows/
```

- `graph-data/<category>/graph.json` is the user-managed source file for one
  category.
- Each category file contains `graphs[]`, and each graph entry includes
  `graphId`, `graphLabel`, and `nodes`.
- The build-time manifest enumerates every category and graph so the app can
  render navigation UI without scanning directories at runtime.

### Graph file format

Each category file contains multiple graph entries.

Example `graph-data/ef-core/graph.json`:

```json
{
  "categoryId": "ef-core",
  "graphs": [
    {
      "graphId": "dbcontext",
      "graphLabel": "DbContext",
      "nodes": [
        {
          "id": "dbcontext",
          "label": "DbContext",
          "tags": ["core", "session"],
          "links": []
        }
      ]
    }
  ]
}
```

Node fields remain the same as before:

Required: `id`, `label`, `tags`.
Optional: `description`, `links`.

Node IDs must be unique **within** a single graph file.

### Manifest format

`graph-data/manifest.json` is generated at build time and lists every
category and graph:

```json
{
  "categories": [
    {
      "id": "web-development",
      "label": "Web Development",
      "graphs": [
        { "id": "frontend-stack", "label": "Frontend Stack" },
        { "id": "backend-stack", "label": "Backend Stack" }
      ]
    },
    {
      "id": "data-science",
      "label": "Data Science",
      "graphs": [
        { "id": "ml-pipeline", "label": "ML Pipeline" }
      ]
    }
  ]
}
```

Category and graph labels are derived from folder names by replacing hyphens
with spaces and capitalizing words. The Vite plugin generates this manifest
automatically by scanning `graph-data/` at build time.

### Category and graph navigation

The toolbar includes a category dropdown placed **before** the search bar.

Navigation flow:

1. On load, the app reads the manifest and populates the category dropdown.
2. Selecting a category loads `graph-data/<category>/graph.json`.
3. The second dropdown is populated from `graphs[].graphLabel`.
4. Selecting a graph loads its `nodes` and renders it.
4. The app remembers the last viewed category and graph in browser storage.
5. On first visit, the first category and first graph are selected by default.

### Graph management operations

When a graph is selected, the toolbar exposes a small management menu (e.g. a
"⋯" or gear button) with the following actions:

- **Move to category** — opens a picker listing other categories; selecting one
  generates and downloads an updated `graph.json` in the target path, and shows
  instructions to move the file in the repository.
- **Delete graph** — shows a confirmation dialog explaining that the user
  should remove the corresponding folder from `graph-data/` in the repository;
  removes the graph from in-memory state so the UI updates immediately.

Because the app is static and cannot modify files on the server, these actions
produce guidance or file downloads rather than direct mutations. The user must
commit and redeploy to make changes permanent.

### Guest/local and logged-in/cloud persistence modes

The app supports two explicit persistence modes shown in the toolbar:

- **Local mode (guest):** continue using repository `graph-data/<category>/graph.json`
  as the source of truth, and save edits by downloading `graph.json`.
- **Cloud mode (logged-in email):** when a valid Appwrite email session exists,
  reads can use Appwrite Tables row data and saves write back to Appwrite
  Tables for the current `<category>/<graphId>`.

Cloud reads use Appwrite data in signed-in mode; local category files remain the source for bootstrap loading and parity checks.

### Runtime tag color editor

Same as before: discover tags from the currently loaded graph, let the user
assign colors via a modal, persist in `localStorage`. Tag color state is global
across all graphs (keyed by tag name).

### Node detail side panel

Clicking a node opens a right-side detail panel showing editable fields (label,
description, tags, links). The Save button downloads the full updated
`graph.json` reflecting the change, and updates the graph in-memory.

### Domain model

Updated shapes:

- `ManifestCategory`: category metadata from the manifest
- `ManifestGraph`: graph metadata within a category
- `Manifest`: full manifest structure
- `KnowledgeNodeFile`: raw node data from JSON (unchanged)
- `KnowledgeLinkFile`: raw link data (unchanged)
- `KnowledgeNode`: validated runtime model (unchanged)
- `KnowledgeEdge`: normalized edge (unchanged)
- `KnowledgeGraph`: aggregate nodes + edges + tags + warnings (unchanged)
- `TagColorAssignment`: tag → color mapping (unchanged)

### Data loading and transformation flow

1. Fetch `graph-data/manifest.json` on startup.
2. Populate category and graph dropdowns from the manifest.
3. When a graph is selected, fetch
   `graph-data/<category>/graph.json`.
4. Parse the JSON array into `KnowledgeNodeFile[]`.
5. Validate required fields and enforce unique node IDs within the graph.
6. Convert into `KnowledgeNode` instances.
7. Expand links into `KnowledgeEdge` instances.
8. Verify edge targets reference existing nodes.
9. Discover tags from loaded nodes.
10. Initialize tag-color state from browser storage.
11. Resolve border colors and convert to Cytoscape elements.
12. Render the graph, or show a validation error state.

### Tag color resolution and legend behavior

Unchanged from earlier design: white fill, gray border by default, first tag
with a user-assigned color determines the border color. Legend shows all tags
from the currently loaded graph.

### Edge relation color mapping and legend behavior

Edge relations are grouped into four visible types and rendered with consistent
line, arrow, and label colors:

- `Concept`: gray
- `Description`: green
- `Condition`: blue
- `Action`: yellow

A dedicated relation legend is shown in the graph area in addition to the tag
legend so users can identify the semantic meaning of each edge color quickly.

### Visual design direction

Unchanged: minimalist layout, restrained palette, glassmorphic surfaces,
polished typography, subtle motion, `prefers-reduced-motion` support.

### Layout strategy

Use an onion-style `concentric` layout by default so users can read the graph
from center concepts outward ring by ring:

- auto-detect root nodes (in-degree `0`) and fall back to highest out-degree
  when no strict root exists,
- compute directed depth from roots and map each depth to a dedicated ring,
- keep ring spacing wider (`minNodeSpacing`, `spacingFactor`) and include
  labels in overlap calculations for cleaner separation.

If the first radial fit still lands at the minimum zoom bound, rerun a compact
concentric pass with tighter spacing and refit to ensure the graph remains
visibly rendered instead of appearing blank.

Keep `fit` behavior resilient by allowing deeper zoom-out bounds and forcing a
final `fit` on `layoutstop`, so larger datasets remain visible when loaded.


### Search behavior

Unchanged: case-insensitive substring matching on `id`, `label`, and `tags`
within the currently loaded graph.

### UI scope

- Category dropdown (before search bar)
- Graph dropdown (after category dropdown)
- Graph management menu (move, delete)
- Graph canvas
- Search input
- Edit tag colors button
- Tag color editor modal
- Tag color legend
- Node detail side panel with editing
- Reset/fit controls
- Loading state
- Validation error state

### GitHub Pages compatibility

Unchanged: Vite build, correct `base`, static-only, GitHub Actions workflow.

### Documentation and sample data

Include two sample categories with at least one graph each:

1. `ef-core/graph.json` — EF Core concept graphs
2. `data-science/graph.json` — machine learning concepts

Update `PROMPT_TEMPLATE.md` to reflect category-level graph files:
one `graph-data/<category>/graph.json` containing `graphs[]`.

Update `README.md` with the new folder structure and navigation instructions.

### Out of scope

- in-browser graph editing that writes back to the repository
- drag-and-drop node placement persistence
- advanced analytics or graph algorithms
- fuzzy search, tag faceting, or clustering controls
- thousands-of-nodes performance optimization
- cross-graph linking (nodes linking to nodes in other graphs)

## Plan

- [x] Scaffold a React + Vite application suitable for GitHub Pages deployment.
- [x] Add Cytoscape.js and create the base graph rendering component.
- [x] Define TypeScript node and edge models, including a `KnowledgeNode` class
      for validation and normalization.
- [x] Implement a tag color editor UI, local persistence, and a visible legend.
- [x] Implement node border-color resolution based on user-selected tag colors.
- [x] Define and implement a minimal premium visual system for layout, surfaces,
      typography, and controls.
- [x] Add subtle motion for panel transitions, focus states, hover states, and
      graph viewport actions.
- [x] Add search, highlight/dim behavior, and reset/fit controls.
- [x] Add node detail side panel with editing and JSON download.
- [x] Configure GitHub Actions deployment to GitHub Pages.
- [x] Restructure `graph-data/` to `<category>/graph.json` format with
      `graphs[]` entries and per-graph `nodes` arrays.
- [ ] Update the Vite plugin to generate a hierarchical manifest from the new
      folder structure.
- [x] Update the data loader to fetch `graph-data/<category>/graph.json` and
      resolve selected graph nodes from `graphs[]`.
- [x] Add category dropdown and graph dropdown to the toolbar.
- [ ] Implement last-viewed persistence so the app reopens the same graph.
- [ ] Add graph management menu with move-to-category and delete actions.
- [x] Create sample data for two categories: `ef-core` and `data-science`.
- [x] Update `PROMPT_TEMPLATE.md` for category-level graph format.
- [x] Update `README.md` with new folder structure and navigation docs.
- [x] Add guest/local vs logged-in/cloud save modes with explicit UI status.
- [x] Wire Appwrite Tables read/write for logged-in email sessions.
- [x] Adjust graph layout strategy to reduce visible edge crossings in common directed graphs.
- [x] Constrain rendered edge tilt angles to avoid near-vertical labels and improve edge-label readability.

## Test

- [x] Run the local build successfully with the sample dataset.
- [ ] Confirm the manifest lists all categories and graphs from `graph-data/`.
- [ ] Confirm the category dropdown populates from the manifest.
- [x] Confirm selecting a category updates the graph dropdown.
- [x] Confirm selecting a graph loads and renders the correct `graph.json`.
- [x] Confirm switching between graphs in different categories works smoothly.
- [ ] Confirm the last-viewed graph is restored on page reload.
- [ ] Confirm the graph management menu appears for the selected graph.
- [ ] Confirm "Move to category" shows a category picker and provides guidance.
- [ ] Confirm "Delete graph" removes the graph from in-memory state with
      confirmation.
- [ ] Confirm nodes with multiple tags load and remain searchable by each tag.
- [ ] Confirm tag color editing updates legend and node borders immediately.
- [x] Confirm edge line and label colors follow Concept/Description/Condition/Action mapping.
- [ ] Confirm node style precedence: first color-assigned tag wins, gray
      when none is assigned.
- [x] Confirm a dedicated relation legend is visible with all four edge types.
- [ ] Confirm chosen tag colors persist across page refresh.
- [ ] Confirm node detail panel opens on click with editable fields.
- [ ] Confirm Save in node panel downloads updated `graph.json` and updates
      the graph in-memory.
- [ ] Confirm search matches `label`, `id`, and `tags`.
- [ ] Confirm an invalid `graph.json` produces a visible validation error.
- [ ] Confirm zoom, pan, and reset/fit controls work.
- [x] Confirm layout update reduces visible edge intersections in the sample graph.
- [ ] Deploy to GitHub Pages and verify the graph loads correctly.
- [x] Confirm guest mode keeps JSON download save behavior.
- [x] Confirm logged-in email mode shows cloud badge and attempts Tables save.
- [x] Confirm save mode text is always visible in toolbar.
- [x] Build verification: `npm run build` (2026-03-25).
- [x] Confirm layout keeps most edge slopes in diagonal/horizontal-friendly ranges (avoids near-90°) for label readability.
- [x] Confirm post-layout node positioning enforces configured edge-angle bounds even in sparse vertical edge outliers.
