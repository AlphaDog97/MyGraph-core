# MyGraph Site

MyGraph is a private, database-backed knowledge graph workspace built with ChatGPT Sites.
It lives in the `site/` directory of the MyGraph-core repository and deploys
independently from the core package and Vite demo.

## Features

- Browse the imported MyGraph categories and graphs.
- Search and inspect graph nodes and relationships.
- Create, edit, and delete categories, graphs, nodes, and relationships.
- Persist data in Cloudflare D1.
- Sign in with GitHub or an email account through Supabase Auth.
- Use WebMCP tools for structured graph operations in supported clients.

## Local development

```bash
pnpm install
pnpm run db:generate
pnpm run dev
```

The production build is created with `pnpm run build`.

Runtime secrets are configured in the Sites project. Do not commit a local
`.env` file; `.env.example` documents the required public configuration names.
