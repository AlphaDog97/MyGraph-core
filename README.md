# MyGraph-core

MyGraph-core 是一个面向知识图谱场景的 TypeScript 核心库，提供图数据模型、版本化文档解析、结构化诊断、数据源适配、跨图聚合和 Cytoscape 元素转换能力。仓库同时保留一个 2D/3D Demo App，用于验证图数据和交互效果。

## 核心能力

- **稳定图模型**：节点、关系、标签、Manifest 和来源信息均有明确类型。
- **安全跨图聚合**：普通节点使用 `categoryId + graphId + nodeId` 作用域身份；只有相同 `globalConceptId` 的节点才会跨图合并。
- **结构化诊断**：检测无效节点、重复 ID、断链、未知关系类型、重复边、自引用和孤立节点。
- **可插拔数据源**：`GraphSource` 可由 HTTP、本地内存或业务项目自己的后端实现。
- **请求缓存**：同一分类文件在一次工作区生命周期中只加载一次，避免总览页重复请求。
- **可视化适配**：输出 Cytoscape 元素，同时保留与 3D 总览兼容的 provenance。
- **本地优先**：核心包不依赖 Appwrite；云端能力应通过独立 `GraphSource` adapter 接入。

## 快速开始

```bash
npm install
npm run dev
```

构建与验证：

```bash
npm run typecheck
npm test
npm run build
npm pack --dry-run
```

## 在项目中使用

```ts
import {
  HttpGraphSource,
  buildGraphFromRaw,
  loadAllGraphsAsKnowledgeGraph,
  loadManifest,
} from "@mygraph/core";

const source = new HttpGraphSource({
  baseUrl: "/knowledge/graph-data/",
});

const manifest = await loadManifest(source);
const overview = await loadAllGraphsAsKnowledgeGraph(manifest, source);
```

也可以实现自定义数据源：

```ts
import type { GraphSource } from "@mygraph/core";

const source: GraphSource = {
  async loadManifest() {
    return api.getManifest();
  },
  async loadCategory(categoryId) {
    return api.getCategoryGraphs(categoryId);
  },
};
```

## 图数据格式

推荐使用 `schemaVersion: 1`：

```json
{
  "schemaVersion": 1,
  "categoryId": "ef-core",
  "graphs": [
    {
      "graphId": "dbcontext",
      "graphLabel": "DbContext",
      "nodes": [
        {
          "id": "dbcontext",
          "label": "DbContext",
          "description": "EF Core 的核心会话对象。",
          "tags": ["core"],
          "links": [
            {
              "target": "dbset",
              "type": "Concept",
              "label": "暴露实体集合"
            }
          ]
        }
      ]
    }
  ]
}
```

旧文件没有 `schemaVersion` 时仍按 v1 读取。

### 节点身份规则

`id` 只要求在当前 graph 内唯一。3D 总览默认生成作用域 ID，因此不同图中相同的 `id` 不会误合并。

当多个图中的节点确实表示同一个全局概念时，显式增加：

```json
{
  "id": "local-dbcontext",
  "globalConceptId": "dotnet.ef-core.dbcontext",
  "label": "DbContext",
  "tags": ["core"]
}
```

只有 `globalConceptId` 完全一致的节点才会聚合，并保留全部来源信息。

## Diagnostics

`KnowledgeGraph.diagnostics` 返回结构化结果：

```ts
interface GraphDiagnostic {
  severity: "error" | "warning" | "info";
  code: string;
  path: string;
  message: string;
  suggestion?: string;
}
```

Demo 仍使用 `warnings` 显示重要问题；业务项目可使用 `diagnostics` 构建图谱健康检查界面。

## 目录

```text
src/
├── domain/       # 类型、关系类型、诊断
├── data/         # GraphSource、加载、聚合、存储
└── components/   # Demo 可视化组件
```

## LeanSpec

仓库使用 LeanSpec 进行规范驱动开发，规格文件位于 `specs/`。
