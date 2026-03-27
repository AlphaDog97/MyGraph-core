# MyGraph-core

一个以知识图谱为核心的数据与渲染基础仓库：

- 保留本地图谱数据模型、解析与 Cytoscape 元素转换能力。
- 移除 Appwrite 云存储与鉴权耦合。
- 支持打包并发布为 npm 包，供其他项目复用。

## 开发（Demo App）

```bash
npm install
npm run dev
```

## 构建

```bash
# 构建演示应用 + 核心 npm 包
npm run build

# 仅构建 npm 包
npm run build:lib
```

## npm 包信息

- 包名：`@mygraph/core`
- 入口：`dist/index.js`
- 类型声明：`dist/lib.d.ts`

### 导出内容

`@mygraph/core` 当前导出：

- `src/domain/types.ts`
- `src/domain/edgeTypes.ts`
- `src/data/loader.ts`
- `src/data/tagStorage.ts`

示例：

```ts
import { buildGraphFromRaw, toCytoscapeElements } from "@mygraph/core";
```

## graph-data 结构

```text
graph-data/
├── ef-core/
│   └── graph.json
└── data-science/
    └── graph.json
```

每个 `graph-data/<category>/graph.json` 都是一个对象，包含 `graphs[]`。

## LeanSpec

仓库使用 LeanSpec 进行规范驱动开发，规格文件在 `specs/` 目录。
