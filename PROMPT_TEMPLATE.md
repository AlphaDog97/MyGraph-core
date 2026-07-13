# MyGraph Graph Data Prompt Template

用于生成与 `@mygraph/core` schema v1 兼容的 `graph-data/<categoryId>/graph.json`。

## Prompt (EN)

```text
Generate graph data for topic "{{TOPIC}}".
Return JSON only (no markdown).

Output schema:
{
  "schemaVersion": 1,
  "categoryId": "<kebab-case-topic-id>",
  "graphs": [
    {
      "graphId": "<kebab-case-concept-id>",
      "graphLabel": "<human-readable concept name>",
      "nodes": [
        {
          "id": "<unique-id-within-this-graph>",
          "globalConceptId": "<optional-stable-cross-graph-concept-id>",
          "label": "<short display name>",
          "description": "<optional one-sentence explanation>",
          "tags": ["<tag1>", "<tag2>"],
          "links": [
            {
              "target": "<another-node-id-in-the-same-graph>",
              "type": "<Concept|Description|Condition|Action>",
              "label": "<optional readable edge label>"
            }
          ]
        }
      ]
    }
  ]
}

Hard rules:
1) Use schemaVersion 1.
2) Create 4-10 graphs for the topic; each graph focuses on one core concept.
3) Links must stay inside the same graph.
4) graphId, graphLabel, and nodes are required for every graph.
5) Node id, label, and tags are required; node IDs must be unique within that graph.
6) Use only Concept, Description, Condition, or Action for relation type.
7) Every link target must exist in the same graph.
8) Avoid duplicate edges and accidental self-links.
9) globalConceptId is optional. Add it only when nodes in different graphs truly represent the same stable concept. Do not reuse it for merely related concepts.
10) Return JSON only.
```

## 提示词（中文）

```text
请为主题“{{主题}}”生成知识图谱数据，只输出 JSON，不要 Markdown。

输出结构：
{
  "schemaVersion": 1,
  "categoryId": "<kebab-case-主题-id>",
  "graphs": [
    {
      "graphId": "<kebab-case-概念-id>",
      "graphLabel": "<概念显示名称>",
      "nodes": [
        {
          "id": "<当前 graph 内唯一 id>",
          "globalConceptId": "<可选的跨图稳定概念 id>",
          "label": "<简短名称>",
          "description": "<可选的一句话说明>",
          "tags": ["<标签1>", "<标签2>"],
          "links": [
            {
              "target": "<同一 graph 内的另一个节点 id>",
              "type": "<Concept|Description|Condition|Action>",
              "label": "<可选关系文案>"
            }
          ]
        }
      ]
    }
  ]
}

硬性规则：
1）使用 schemaVersion 1。
2）一个主题生成 4-10 张图，每张图只聚焦一个核心概念。
3）禁止跨图 links，target 必须存在于当前 graph。
4）每个 graph 必须包含 graphId、graphLabel、nodes。
5）节点必须包含 id、label、tags；id 在当前 graph 内唯一。
6）关系 type 只能使用 Concept、Description、Condition、Action。
7）避免重复关系和无意义的自引用。
8）globalConceptId 可选；只有不同图中的节点确实是同一个稳定概念时才填写，不能因为概念相关就复用。
9）只输出 JSON。
```

## Save Guide

1. 保存为 `graph-data/<categoryId>/graph.json`。
2. 确保 `graph-data/manifest.json` 包含该分类和图。
3. 在 Demo 中检查 `warnings` / diagnostics 后再提交数据。
