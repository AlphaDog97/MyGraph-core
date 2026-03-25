# Single-File Multi-Cluster Prompt Template

Use this template when you want to generate **one `graph.json` file** for a topic, while keeping it visually split into multiple smaller clusters.

> Goal: keep one file output, but structure links so the graph naturally forms several subgraphs/components instead of one tangled network.

---

## Prompt (English)

```
I'm building a visual knowledge graph for "{{TOPIC}}".
Please generate all nodes as ONE JSON array (this will be saved as a single graph.json file).

Important structure requirement:
- Do NOT make one giant fully connected network.
- Internally divide the topic into 3–7 thematic clusters.
- Dense links are allowed within the same cluster.
- Keep cross-cluster links minimal (0–2 bridge links per cluster pair if truly necessary).
- The final result should read like multiple smaller subgraphs inside one file.

Each node must use this schema:
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

Rules:
1. Output exactly ONE JSON array (no markdown).
2. "id" must be lowercase, URL-safe, unique in this array.
3. "links.target" must reference an existing node id in this array.
4. "type" must be one of: "Concept", "Description", "Condition", "Action".
5. Use 4–10 tags total across the whole topic.
6. Every node must have at least one inbound or outbound link.
7. Add one cluster tag to every node using this format: "cluster:<kebab-case-name>".
8. Avoid unnecessary cross-cluster links to reduce edge crossings.
9. Prefer layered direction inside each cluster (core -> related -> detailed).

Now generate the JSON array.
```

---

## Prompt（中文版）

```
我正在为“{{主题}}”构建可视化知识图谱。
请一次性生成所有节点，并输出为一个 JSON 数组（将保存为单个 graph.json 文件）。

结构要求（重点）：
- 不要把全主题做成一个高度互连的大网。
- 在同一个文件内，将主题拆成 3–7 个子簇（cluster）。
- 同一簇内可以相对密集连接。
- 不同簇之间的连接尽量少（只有确实必要时再加，建议每对簇 0–2 条桥接边）。
- 最终效果应当是：一个文件中包含多个更清晰的小子图。

每个节点必须符合以下结构：
{
  "id": "<url安全的唯一标识>",
  "label": "<简短显示名>",
  "description": "<一句话描述>",
  "tags": ["<标签1>", "<标签2>"],
  "links": [
    {
      "target": "<另一个节点id>",
      "type": "<关系类型>",
      "label": "<可读关系文字>"
    }
  ]
}

规则：
1. 只输出一个 JSON 数组（不要 markdown）。
2. "id" 必须小写、URL 安全、且在当前数组内唯一。
3. "links.target" 必须引用当前数组中存在的节点 id。
4. "type" 只能是："Concept"、"Description"、"Condition"、"Action"。
5. 全主题总标签数建议 4–10 个。
6. 每个节点至少有一条入边或出边。
7. 每个节点都必须增加一个簇标签，格式为："cluster:<kebab-case-name>"。
8. 尽量减少跨簇连接，避免线条交错。
9. 每个簇内部尽量保持分层方向（核心 -> 相关 -> 细节）。

现在请输出 JSON 数组。
```

---

## Usage / 使用方法

1. Copy one prompt above and replace `{{TOPIC}}` / `{{主题}}`.
2. Send to your AI model.
3. Save returned JSON array to one file:
   - `graph-data/<category>/<graph-name>/graph.json`
4. Rebuild or refresh the app.

### Folder example

```
graph-data/
└── ef-core/
    └── ef-core-overview/
        └── graph.json
```
