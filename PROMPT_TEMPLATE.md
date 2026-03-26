# Concept-Per-Graph Prompt Template

Use this template when you want one topic (e.g. `EF Core`) to be split into **multiple independent graphs**.

> Target outcome: each core concept becomes its own `graph.json`, and there are **no links across different graphs**.

---

## Step 1: Topic Split Prompt (English) 

```
I'm building a visual knowledge graph project.
For topic "{{TOPIC}}", generate multiple independent graphs (one graph per core concept), not one merged graph.

Output format (JSON only, no markdown):
{
  "categoryId": "<kebab-case-topic-id>",
  "graphs": [
    {
      "graphId": "<kebab-case-concept-id>",
      "graphLabel": "<human-readable concept name>",
      "nodes": [
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
      ]
    }
  ]
}

Hard rules:
1. Create 4–10 graphs for the topic.
2. Each graph focuses on one core concept (example for EF Core: `dbcontext`, `change-tracker`, `migrations`, etc.).
3. Links in one graph may only target nodes inside that same graph.
4. No cross-graph links. Zero exceptions.
5. Node `id` values must be unique within their own graph.
6. Relationship `type` must be one of: "Concept", "Description", "Condition", "Action".
7. Every node must have at least one inbound or outbound link within the same graph.
8. Return JSON only.
```

---

## Step 2：单个子图生成提示词（中文版）

```
我正在构建一个可视化知识图谱项目。
请把“{{主题}}”拆分成多个相互独立的图（每个核心概念一张图），不要生成一张合并大图。

输出格式（只输出 JSON，不要 markdown）：
{
  "categoryId": "<kebab-case-主题id>",
  "graphs": [
    {
      "graphId": "<kebab-case-概念id>",
      "graphLabel": "<概念名称>",
      "nodes": [
        {
          "id": "<url安全唯一标识>",
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
      ]
    }
  ]
}

硬性规则：
1. 该主题生成 4–10 张图。
2. 每张图只聚焦一个核心概念（例如 EF Core 可拆成 `dbcontext`、`change-tracker`、`migrations` 等）。
3. 某张图内的 links 只能指向这张图内的节点。
4. 严禁跨图链接（0 条，不能例外）。
5. 节点 `id` 在各自图内必须唯一。
6. `type` 只能是："Concept"、"Description"、"Condition"、"Action"。
7. 每个节点至少有一条同图内的入边或出边。
8. 只输出 JSON。
```

---

## Save Guide / 落盘方式

1. Run prompt and get one JSON object.
2. Save the whole JSON object to:
   - `graph-data/<categoryId>/graph.json`
3. Example:
   - `graph-data/ef-core/graph.json`

Important: keep `graphs[].graphLabel` for UI display names, and keep each graph's
node list in `graphs[].nodes`.
