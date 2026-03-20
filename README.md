# MyGraph – Visual Knowledge Graph

An interactive, static knowledge-graph explorer built with React, Vite, and Cytoscape.js. Add structured JSON files, deploy to GitHub Pages, and browse your knowledge graph in the browser.

## Quick start

```bash
npm install
npm run dev
```

Open the URL printed in the terminal (usually `http://localhost:5173/MyGraph/`).

## Adding nodes

Place one JSON file per node in `graph-data/nodes/`. The file name is not significant; the `id` field inside the JSON is what matters.

### Required fields

| Field   | Type       | Description                          |
| ------- | ---------- | ------------------------------------ |
| `id`    | `string`   | Stable unique identifier (URL-safe). |
| `label` | `string`   | Display name shown in the graph.     |
| `tags`  | `string[]` | Zero or more tag identifiers.        |

### Optional fields

| Field         | Type       | Description                              |
| ------------- | ---------- | ---------------------------------------- |
| `description` | `string`   | Short explanatory text (future use).     |
| `links`       | `object[]` | Outbound relationship declarations.      |

### Link object fields

| Field    | Type     | Required | Description                       |
| -------- | -------- | -------- | --------------------------------- |
| `target` | `string` | yes      | Target node `id`.                 |
| `type`   | `string` | yes      | Machine-readable relation kind.   |
| `label`  | `string` | no       | Human-readable edge label.        |

### Example node file

```json
{
  "id": "react",
  "label": "React",
  "description": "UI library for building component-driven interfaces.",
  "tags": ["frontend", "ui-framework"],
  "links": [
    {
      "target": "vite",
      "type": "used-with",
      "label": "bundled by"
    }
  ]
}
```

## Multi-tag nodes

Nodes can carry multiple tags. The order of tags in the `tags` array matters for color resolution: the first tag with a user-assigned color determines the node's border color. All tags remain searchable regardless of color assignment.

## Runtime tag color editing

Click **Edit tag colors** in the toolbar to open the tag color editor. Pick a color for any discovered tag. Changes update the graph and legend immediately.

- Tag colors are stored in browser `localStorage`, so they persist across refreshes on the same device/browser.
- Clearing a tag's color reverts nodes (that relied on that tag) to the default gray border.
- Cross-device sync is not supported.

### Accepted color examples

The editor provides preset color swatches. Custom hex input is not included in the MVP.

## Default node styling

| Condition                         | Fill  | Border       |
| --------------------------------- | ----- | ------------ |
| No tag has a chosen color         | white | medium gray  |
| At least one tag has a color      | white | that color   |

Border color is resolved by scanning the node's `tags` array in order and using the first tag that currently has a user-assigned color.

## Search

Type in the search bar (or press `/`) to filter nodes. Search matches against `id`, `label`, and `tags` using case-insensitive substring matching. Matched nodes are highlighted; non-matching nodes and edges are dimmed. Press `Escape` or clear the field to reset.

## Deploying to GitHub Pages

1. Push your changes to `main`.
2. The included GitHub Actions workflow (`.github/workflows/deploy.yml`) builds the site and deploys it to GitHub Pages automatically.
3. Enable **Pages** in your repository settings (Settings → Pages → Source: GitHub Actions).

## What happens when validation fails

If any node file contains invalid JSON, is missing required fields, or contains duplicate IDs, the app shows a readable on-screen error summary listing every problem. Fix the source files and redeploy.

## Building for production

```bash
npm run build
```

The output is in `dist/` and can be served by any static file host.

## Visual design

The app aims for a clean, minimal, premium interface:

- Inter typeface with clear hierarchy
- Glassmorphic toolbar and legend panels
- Subtle animations for panel transitions, hover, and focus states
- Reduced-motion support where practical
- Graph canvas as the visual focal point

## LeanSpec

This repository uses LeanSpec to capture non-trivial work as lightweight specs. See `specs/` for details.

```bash
lean-spec list        # list existing specs
lean-spec validate    # validate spec structure
```
