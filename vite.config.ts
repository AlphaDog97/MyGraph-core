import { defineConfig, Plugin } from "vite";
import react from "@vitejs/plugin-react";
import * as fs from "node:fs";
import * as path from "node:path";

function graphDataPlugin(): Plugin {
  const graphDir = path.resolve(__dirname, "graph-data");
  const nodesDir = path.join(graphDir, "nodes");

  function generateManifest(): string[] {
    if (!fs.existsSync(nodesDir)) return [];
    return fs
      .readdirSync(nodesDir)
      .filter((f) => f.endsWith(".json"))
      .sort();
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
      const base = server.config.base || "/";
      server.middlewares.use((req, res, next) => {
        const prefix = `${base}graph-data/`;
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
      const nodesDir = path.join(graphDir, "nodes");

      if (!fs.existsSync(nodesDir)) return;

      const manifestPath = path.join(graphDir, "manifest.json");
      if (fs.existsSync(manifestPath)) {
        this.emitFile({
          type: "asset",
          fileName: "graph-data/manifest.json",
          source: fs.readFileSync(manifestPath, "utf-8"),
        });
      }

      for (const file of fs.readdirSync(nodesDir)) {
        if (!file.endsWith(".json")) continue;
        this.emitFile({
          type: "asset",
          fileName: `graph-data/nodes/${file}`,
          source: fs.readFileSync(path.join(nodesDir, file), "utf-8"),
        });
      }
    },
  };
}

export default defineConfig({
  plugins: [react(), graphDataPlugin(), copyGraphDataPlugin()],
  base: "/",
  publicDir: "public",
});
