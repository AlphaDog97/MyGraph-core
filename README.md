# MyGraph – Visual Knowledge Graph

An interactive, static knowledge-graph explorer built with React, Vite, and Cytoscape.js. Organize graphs into categories, deploy to GitHub Pages, and browse your knowledge graphs in the browser.

## Quick start

```bash
npm install
npm run dev
```

Open the URL printed in the terminal (usually `http://localhost:5173/`).

## Folder structure

```
graph-data/
├── web-development/               ← category folder
│   ├── frontend-stack/            ← graph folder
│   │   └── graph.json             ← all nodes for this graph
│   └── backend-stack/
│       └── graph.json
└── data-science/                  ← another category
    └── ml-pipeline/
        └── graph.json
```

- Each **category** is a top-level folder inside `graph-data/`.
- Each **graph** is a subfolder within a category, containing a single `graph.json`.
- `graph.json` holds a **JSON array** with all nodes for that graph.
- `manifest.json` is generated automatically at build time — do not edit it manually.

## Graph file format

Each `graph.json` is a JSON array of node objects:

```json
[
  {
    "id": "react",
    "label": "React",
    "description": "UI library for building component-driven interfaces.",
    "tags": ["frontend", "ui-framework"],
    "links": [
      { "target": "vite", "type": "used-with", "label": "bundled by" }
    ]
  },
  {
    "id": "vite",
    "label": "Vite",
    "description": "Next-generation frontend build tool.",
    "tags": ["tooling", "build"],
    "links": []
  }
]
```

### Required fields

| Field   | Type       | Description                          |
| ------- | ---------- | ------------------------------------ |
| `id`    | `string`   | Stable unique identifier (URL-safe). |
| `label` | `string`   | Display name shown in the graph.     |
| `tags`  | `string[]` | Zero or more tag identifiers.        |

### Optional fields

| Field         | Type       | Description                              |
| ------------- | ---------- | ---------------------------------------- |
| `description` | `string`   | Short explanatory text.                  |
| `links`       | `object[]` | Outbound relationship declarations.      |

### Link object fields

| Field    | Type     | Required | Description                       |
| -------- | -------- | -------- | --------------------------------- |
| `target` | `string` | yes      | Target node `id`.                 |
| `type`   | `string` | yes      | Machine-readable relation kind.   |
| `label`  | `string` | no       | Human-readable edge label.        |

Node IDs must be unique within each `graph.json`. They do not need to be unique across different graphs.

## UI features

### Category and graph navigation

Use the dropdowns in the toolbar to switch between categories and graphs. The app remembers your last selection across page refreshes.

### Graph management

Click the **⋯** button next to the graph selector to:

- **Move to category** — downloads `graph.json` and shows instructions for moving the folder.
- **Delete graph** — removes the graph from the current view and shows instructions for deleting the folder from the repository.

Since this is a static app, these operations provide guidance and file downloads rather than modifying files directly. Commit and redeploy to make changes permanent.

### Save mode (local vs cloud)

The toolbar shows an explicit save mode badge to avoid confusion:

- **Local mode · Guest**: uses local `graph-data` files and downloads `graph.json` when saving node edits.
- **Cloud mode · your-email@example.com**: if an Appwrite email session is active, node edits are saved with the normalized Appwrite multi-table schema.

If cloud read fails, the app automatically falls back to local `graph-data` for loading.

#### Appwrite Tables configuration

The repository now includes a versioned Appwrite schema at:

- `appwrite.json`
- `appwrite/schemas/mygraph-tables.json`

Initialize Appwrite CLI and push schema changes:

```bash
# Install CLIs (if needed)
npm install -g appwrite-cli lean-spec

# Configure the target project (requires server API key)
export APPWRITE_API_KEY=<server-api-key>
./scripts/apply-appwrite-schema.sh
```

This repo is pre-configured to push against:
- Endpoint: `https://sgp.cloud.appwrite.io/v1`
- Project: `69bd040e000949b8a413`
- Database: `69bd042e000bc22ca3f4`

Set these Vite environment variables in `.env.local` to enable cloud mode:

```bash
VITE_APPWRITE_ENDPOINT=https://<your-appwrite-endpoint>/v1
VITE_APPWRITE_PROJECT_ID=<project-id>
VITE_APPWRITE_DATABASE_ID=<database-id>
VITE_APPWRITE_TABLE_GRAPHS_ID=graphs
VITE_APPWRITE_TABLE_NODES_ID=nodes
VITE_APPWRITE_TABLE_EDGES_ID=edges
VITE_APPWRITE_TABLE_TAGS_ID=tags
VITE_APPWRITE_TABLE_NODE_TAGS_ID=node_tags
VITE_APPWRITE_TABLE_USER_PREFERENCES_ID=user_preferences
```

Without this config, the app always stays in local mode.

Cloud access policy:

- Anonymous users can only read graphs with `visibility=public`.
- Logged-in users can write only graphs where `owner_user_id` matches their Appwrite account ID.
- Unauthenticated users cannot write to cloud tables and remain local-only.

#### One-time legacy migration (single-table -> multi-table)

Use the offline migration script to move legacy rows (JSON `nodes` per row) into the normalized schema:

```bash
APPWRITE_ENDPOINT=https://<endpoint>/v1 \
APPWRITE_PROJECT_ID=<project-id> \
APPWRITE_DATABASE_ID=<database-id> \
APPWRITE_TABLE_OLD_NODES_ID=<legacy-table-id> \
APPWRITE_TABLE_GRAPHS_ID=<graphs-table-id> \
APPWRITE_TABLE_NODES_ID=<nodes-table-id> \
APPWRITE_TABLE_EDGES_ID=<edges-table-id> \
APPWRITE_TABLE_TAGS_ID=<tags-table-id> \
APPWRITE_TABLE_NODE_TAGS_ID=<node-tags-table-id> \
APPWRITE_API_KEY=<server-api-key> \
node scripts/migrate-single-table-to-multi-table.mjs --dry-run
```

Remove `--dry-run` to execute writes.

### Authentication

The built-in auth module supports **email-only authentication**:

- **Email registration**
- **Email login**
- **Guest mode**

GitHub OAuth and other third-party OAuth login flows are intentionally removed from UI and service logic.

When you stay in guest mode, all graph browsing/editing remains available and
data is handled in local mode unless a valid cloud session is active.

### Node detail panel

Click any node to open a side panel showing its details. You can edit the label, description, tags, and links. The **Save** button downloads an updated `graph.json` with your changes and updates the graph in-memory.

### Tag color editing

Click **Edit tag colors** to assign colors to tags. Colors are stored in browser `localStorage` and persist across refreshes. The first tag (in array order) with an assigned color determines the node's border color.

### Search

Type in the search bar (or press `/`) to filter nodes. Search matches `id`, `label`, and `tags` using case-insensitive substring matching. Press `Escape` to clear.


## Generating content with AI

See `PROMPT_TEMPLATE.md` for ready-to-use prompts (English and Chinese) that you can send to any AI model to generate a `graph.json` for your topic.

## Deploying to GitHub Pages

1. Push your changes to `main`.
2. The included GitHub Actions workflow builds and deploys automatically.
3. Enable **Pages** in repository settings (Settings → Pages → Source: GitHub Actions).

## What happens when validation fails

If a `graph.json` contains invalid JSON, is missing required fields, or has duplicate IDs, the app shows a readable on-screen error summary. Fix the file and redeploy.

## Building for production

```bash
npm run build
```

Output is in `dist/`.

## LeanSpec

This repository uses LeanSpec for spec-driven development. See `specs/` for details.
