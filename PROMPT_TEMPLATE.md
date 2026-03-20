# Node Generation Prompt Template

Copy the prompt below and send it to any AI model (ChatGPT, Claude, etc.). Replace the `{{TOPIC}}` placeholder with the subject area you want to map. The model will produce a set of JSON files that you can drop directly into `graph-data/nodes/`.

---

## Prompt

```
I'm building a visual knowledge graph. Please generate a set of knowledge-graph node files in JSON format for the topic: {{TOPIC}}.

Requirements:

1. Generate 8–15 nodes that cover the key concepts, tools, or entities related to the topic.
2. Each node must be a separate JSON object (I will save each one as its own .json file).
3. Every node must follow this exact schema:

{
  "id": "<url-safe-unique-id>",
  "label": "<Short Display Name>",
  "description": "<One-sentence explanation of what this node represents.>",
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
- "id": lowercase, URL-safe, unique across all nodes (e.g. "react", "machine-learning", "postgres").
- "label": human-readable display name (e.g. "React", "Machine Learning", "PostgreSQL").
- "description": a concise sentence describing the node.
- "tags": 1–3 tags that categorize this node (e.g. "frontend", "database", "language"). Reuse tags across nodes so the graph can be filtered by category.
- "links": array of outbound relationships to other nodes you generate. Each link needs:
  - "target": the id of the target node (must exist in the set you generate).
  - "type": a machine-readable relation kind (e.g. "uses", "depends-on", "alternative-to", "part-of", "extends").
  - "label": a short human-readable description of the relationship (e.g. "bundled by", "runs on", "alternative to").

Additional guidelines:
- Make sure links only reference node IDs that exist in the set you produce.
- Create a connected graph: every node should have at least one inbound or outbound link.
- Use a consistent, small set of tags (4–7 distinct tags total) so coloring by tag is meaningful.
- Use a consistent, small set of relationship types (3–6 distinct types total).
- Output each node as a separate JSON code block so I can easily copy each one into its own file.
- Name suggestion: use the node's id as the filename, e.g. "react.json", "postgres.json".

Please generate the nodes now.
```

---

## Prompt（中文版）

```
我正在构建一个可视化知识图谱。请为以下主题生成一组知识图谱节点的 JSON 文件：{{主题}}。

要求：

1. 生成 8–15 个节点，覆盖该主题下的关键概念、工具或实体。
2. 每个节点必须是一个独立的 JSON 对象（我会将每个节点保存为单独的 .json 文件）。
3. 每个节点必须严格遵循以下格式：

{
  "id": "<url安全的唯一标识>",
  "label": "<简短的显示名称>",
  "description": "<一句话描述该节点代表什么。>",
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
- "id"：小写、URL 安全、在所有节点中唯一（例如 "react"、"machine-learning"、"postgres"）。
- "label"：人类可读的显示名称（例如 "React"、"机器学习"、"PostgreSQL"）。
- "description"：简洁的一句话描述。
- "tags"：1–3 个分类标签（例如 "前端"、"数据库"、"编程语言"）。请在多个节点间复用标签，以便按类别进行图谱过滤和着色。
- "links"：指向你生成的其他节点的关系数组。每个 link 需要：
  - "target"：目标节点的 id（必须是你生成的节点集中存在的 id）。
  - "type"：机器可读的关系类型（例如 "uses"、"depends-on"、"alternative-to"、"part-of"、"extends"）。
  - "label"：简短的人类可读关系描述（例如 "依赖于"、"运行在"、"是…的替代方案"）。

额外要求：
- 确保 links 中引用的节点 ID 都存在于你生成的节点集合中。
- 构建一个连通图：每个节点至少要有一条入边或出边。
- 使用一组统一的少量标签（总共 4–7 个不同标签），这样按标签着色才有意义。
- 使用一组统一的少量关系类型（总共 3–6 种不同类型）。
- 将每个节点输出为单独的 JSON 代码块，方便我逐个复制到文件中。
- 文件名建议：使用节点的 id 作为文件名，例如 "react.json"、"postgres.json"。

请现在生成这些节点。
```

---

## Usage / 使用方法

1. Copy the prompt above (English or Chinese), replace `{{TOPIC}}` / `{{主题}}` with your subject (e.g. "Web Development Stack" / "Web 开发技术栈").
2. Send it to your preferred AI model.
3. Save each returned JSON block as a separate `.json` file in `graph-data/nodes/`.
4. Rebuild or refresh the app — the new nodes will appear in the graph automatically.
