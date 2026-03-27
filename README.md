# MyGraph-core

MyGraph-core 是一个面向知识图谱场景的前端核心库，提供**图数据模型、解析加载、以及 Cytoscape 可视化元素转换**能力。它既可以作为 Demo App 的运行基础，也可以作为独立 npm 包接入其他项目。

## 这个项目是做什么的？

- 统一图谱数据结构（节点、边、标签等）与类型定义。
- 提供从 `graph-data` 原始 JSON 到渲染数据的标准化转换。
- 将通用能力抽离成 `@mygraph/core`，避免业务项目重复实现同一套图谱基础设施。

## 为什么使用这个库？

- **复用性高**：核心逻辑打包成 npm 包，多个项目可直接共享。
- **关注点清晰**：把“图谱基础能力”和“业务/后端接入”解耦。
- **类型安全**：TypeScript 类型定义完整，降低数据结构变更风险。
- **可维护性好**：通过 LeanSpec 管理需求与演进过程，文档与实现同步。

## 快速开始

### 1) 安装依赖

```bash
npm install
```

### 2) 启动本地 Demo

```bash
npm run dev
```

### 3) 构建

```bash
# 构建演示应用 + 核心 npm 包
npm run build

# 仅构建 npm 包
npm run build:lib
```

### 4) 在项目中使用

```ts
import { buildGraphFromRaw, toCytoscapeElements } from "@mygraph/core";
```

> 包名：`@mygraph/core`  
> JS 入口：`dist/index.js`  
> 类型声明：`dist/lib.d.ts`

## 应用流程（推荐）

下面是一条从 AI 生成模板到项目落地的标准流程：

1. **让 AI 生成图谱模板**
   - 使用约定结构输出分类与图数据（如 `categoryId`、`graphs[]`、`nodes[]`、`edges[]`）。
2. **整理为仓库目录结构**
   - 将每个主题放在 `graph-data/<category>/graph.json`。
3. **把文件放入项目**
   - 直接提交到仓库的 `graph-data/` 目录。
4. **加载并转换数据**
   - 通过 core 提供的 loader/transform 能力转换为 Cytoscape 元素。
5. **在界面中调试与验证**
   - 启动 Demo，检查节点关系、标签颜色、搜索与交互是否符合预期。

示例目录：

```text
graph-data/
├── ef-core/
│   └── graph.json
└── data-science/
    └── graph.json
```

每个 `graph-data/<category>/graph.json` 都是一个对象，包含 `graphs[]`。

## 导出模块

`@mygraph/core` 当前主要导出：

- `src/domain/types.ts`
- `src/domain/edgeTypes.ts`
- `src/data/loader.ts`
- `src/data/tagStorage.ts`

## LeanSpec

仓库使用 LeanSpec 进行规范驱动开发，规格文件位于 `specs/` 目录。
