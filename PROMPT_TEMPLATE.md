# Node Generation Prompt Template

Copy the prompt below and send it to any AI model (ChatGPT, Claude, etc.). Replace the `{{TOPIC}}` placeholder with the subject area you want to map. The model will produce a single JSON array containing all nodes, which you save as `graph.json` inside a graph folder.

---

## Prompt (English)

```
I'm building a visual knowledge graph. Please generate all nodes for the topic "{{TOPIC}}" as a single JSON array.

Requirements:

1. Generate as many nodes as needed to thoroughly cover the key concepts, tools, or entities related to the topic. Don't limit yourself — include all important items.
2. Output all nodes as ONE JSON array (not separate objects).
3. Every node must follow this schema:

{
  "id": "<url-safe-unique-id>",
  "label": "<Short Display Name>",
  "description": "<One-sentence explanation.>",
  "tags": ["<tag1>", "<tag2>"],
  "links": [
    {
      "target": "<id-of-another-node>",
      "type": "<relationship-type>",
      "label": "<human-readable edge label>"
    }
  ]
}

Field rules:
- "id": lowercase, URL-safe, unique across all nodes (e.g. "react", "machine-learning").
- "label": human-readable display name (e.g. "React", "Machine Learning").
- "description": a concise sentence describing the node.
- "tags": 1–3 tags that categorize this node. Reuse tags across nodes for meaningful filtering.
- "links": outbound relationships to other nodes in this array. Each link needs:
  - "target": the id of the target node (must exist in the array).
  - "type": MUST be one of: "Concept", "Description", "Condition", "Action".
  - "label": a short human-readable description (e.g. "bundled by", "runs on").

Additional guidelines:
- Links must only reference IDs that exist in the array you produce.
- Every node should have at least one inbound or outbound link (connected graph).
- Use 4–7 distinct tags total.
- Restrict all relationship types to this fixed set only: "Concept", "Description", "Condition", "Action".
- Structure the graph as a radial hierarchy (center → outer layers):
  - Put broad, high-level concepts near the center (core/foundation nodes).
  - Put specialized, derived, or implementation details in outer layers.
  - Prefer edges that point from inner/core nodes to outer/derived nodes.
  - Avoid linking outer-layer nodes directly back to inner/core hubs.
  - Avoid skip-layer links (e.g., center directly to far outer ring). Prefer links only between adjacent layers.
- Output the entire array as a single JSON code block.

Please generate the nodes now.
```

---

## Prompt（中文版）

```
我正在构建一个可视化知识图谱。请为以下主题生成所有节点，输出为一个 JSON 数组："{{主题}}"。

要求：

1. 生成足够多的节点来全面覆盖该主题下的关键概念、工具或实体，不要限制数量，重要的内容都应该包含进来。
2. 将所有节点输出为一个 JSON 数组（不是单独的对象）。
3. 每个节点必须遵循以下格式：

{
  "id": "<url安全的唯一标识>",
  "label": "<简短的显示名称>",
  "description": "<一句话描述。>",
  "tags": ["<标签1>", "<标签2>"],
  "links": [
    {
      "target": "<另一个节点的id>",
      "type": "<关系类型>",
      "label": "<可读的边标签>"
    }
  ]
}

字段规则：
- "id"：小写、URL 安全、在所有节点中唯一（例如 "react"、"machine-learning"）。
- "label"：人类可读的显示名称（例如 "React"、"机器学习"）。
- "description"：简洁的一句话描述。
- "tags"：1–3 个分类标签。请在多个节点间复用标签。
- "links"：指向数组中其他节点的关系。每个 link 需要：
  - "target"：目标节点的 id（必须存在于数组中）。
  - "type"：必须且只能是以下四种之一："Concept"、"Description"、"Condition"、"Action"。
  - "label"：简短的人类可读关系描述（例如 "依赖于"、"运行在"）。

额外要求：
- links 中引用的节点 ID 必须存在于数组中。
- 构建一个连通图：每个节点至少要有一条入边或出边。
- 总共使用 4–7 个不同标签。
- 关系类型只允许使用固定四种："Concept"、"Description"、"Condition"、"Action"。
- 图结构尽量按“中心 → 外围”的层次扩散：
  - 更大、更基础、更抽象的概念放在中心层（核心节点）。
  - 细分、派生、实现层面的概念放在外层。
  - 尽量让关系从中心层指向外层。
  - 避免外层节点再直接连回中心核心节点。
  - 避免跨层跳连（例如中心层直接连到最外层），优先只连接相邻层。
- 将整个数组输出为一个 JSON 代码块。

请现在生成这些节点。
```

---

## Usage / 使用方法

1. Copy the prompt above (English or Chinese), replace `{{TOPIC}}` / `{{主题}}` with your subject.
2. Send it to your preferred AI model.
3. Create a folder structure: `graph-data/<category>/<graph-name>/`
4. Save the returned JSON array as `graph.json` inside that folder.
5. Rebuild or refresh the app — the new graph will appear in the category dropdown.

### Folder structure example

```
graph-data/
├── web-development/
│   ├── frontend-stack/
│   │   └── graph.json       ← paste the AI output here
│   └── backend-stack/
│       └── graph.json
└── data-science/
    └── ml-pipeline/
        └── graph.json
```
