import { defineConfig, Plugin } from "vite";
import react from "@vitejs/plugin-react";
import * as fs from "node:fs";
import * as path from "node:path";

function labelFromId(id: string): string {
  return id
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

interface ManifestGraph {
  id: string;
  label: string;
}
interface ManifestCategory {
  id: string;
  label: string;
  graphs: ManifestGraph[];
}
interface Manifest {
  categories: ManifestCategory[];
}

interface MultiGraphCategoryFile {
  categoryId?: string;
  graphs?: Array<{
    graphId?: string;
    graphLabel?: string;
    nodes?: unknown[];
  }>;
}

function parseCategoryGraphFile(filePath: string): ManifestGraph[] {
  try {
    const raw = fs.readFileSync(filePath, "utf-8");
    const parsed = JSON.parse(raw) as MultiGraphCategoryFile;
    if (!Array.isArray(parsed.graphs)) return [];
    return parsed.graphs
      .filter((g) => typeof g?.graphId === "string" && g.graphId.trim() !== "")
      .map((g) => ({
        id: g.graphId as string,
        label:
          typeof g.graphLabel === "string" && g.graphLabel.trim() !== ""
            ? g.graphLabel
            : labelFromId(g.graphId as string),
      }));
  } catch {
    return [];
  }
}

function graphDataPlugin(): Plugin {
  const graphDir = path.resolve(__dirname, "graph-data");

  function generateManifest(): Manifest {
    const categories: ManifestCategory[] = [];
    if (!fs.existsSync(graphDir)) return { categories };

    for (const catEntry of fs
      .readdirSync(graphDir, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .sort((a, b) => a.name.localeCompare(b.name))) {
      const catDir = path.join(graphDir, catEntry.name);
      const graphMap = new Map<string, ManifestGraph>();

      // New mode: graph-data/<category>/graph.json with { graphs: [...] }
      const categoryGraphFile = path.join(catDir, "graph.json");
      if (fs.existsSync(categoryGraphFile)) {
        for (const graph of parseCategoryGraphFile(categoryGraphFile)) {
          graphMap.set(graph.id, graph);
        }
      }

      // Legacy mode: graph-data/<category>/<graph>/graph.json
      for (const graphEntry of fs
        .readdirSync(catDir, { withFileTypes: true })
        .filter((d) => d.isDirectory())
        .sort((a, b) => a.name.localeCompare(b.name))) {
        const graphFile = path.join(catDir, graphEntry.name, "graph.json");
        if (fs.existsSync(graphFile)) {
          graphMap.set(graphEntry.name, {
            id: graphEntry.name,
            label: labelFromId(graphEntry.name),
          });
        }
      }

      const graphs = [...graphMap.values()].sort((a, b) =>
        a.label.localeCompare(b.label)
      );

      if (graphs.length > 0) {
        categories.push({
          id: catEntry.name,
          label: labelFromId(catEntry.name),
          graphs,
        });
      }
    }

    return { categories };
  }

  function writeManifest() {
    const manifest = generateManifest();
    fs.writeFileSync(
      path.join(graphDir, "manifest.json"),
      JSON.stringify(manifest, null, 2) + "\n"
    );
  }

  return {
    name: "graph-data-manifest",

    buildStart() {
      writeManifest();
    },

    configureServer(server) {
      const configuredBase = server.config.base || "/";
      const devBase = configuredBase.startsWith("/") ? configuredBase : "/";
      server.middlewares.use((req, res, next) => {
        const prefix = `${devBase}graph-data/`;
        if (!req.url?.startsWith(prefix)) return next();

        const relPath = req.url.slice(prefix.length);

        if (relPath === "manifest.json") {
          writeManifest();
        }

        const filePath = path.join(graphDir, relPath);
        if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
          res.setHeader("Content-Type", "application/json");
          res.end(fs.readFileSync(filePath));
        } else {
          res.statusCode = 404;
          res.end("Not found");
        }
      });
    },
  };
}

function copyGraphDataPlugin(): Plugin {
  return {
    name: "copy-graph-data",
    apply: "build",
    generateBundle() {
      const graphDir = path.resolve(__dirname, "graph-data");
      if (!fs.existsSync(graphDir)) return;

      const walk = (dir: string, rel: string) => {
        for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
          const full = path.join(dir, entry.name);
          const entryRel = rel ? `${rel}/${entry.name}` : entry.name;
          if (entry.isDirectory()) {
            walk(full, entryRel);
          } else {
            this.emitFile({
              type: "asset",
              fileName: `graph-data/${entryRel}`,
              source: fs.readFileSync(full, "utf-8"),
            });
          }
        }
      };

      walk(graphDir, "");
    },
  };
}

export default defineConfig({
  plugins: [react(), graphDataPlugin(), copyGraphDataPlugin()],
  base: "./",
  publicDir: false,
});
