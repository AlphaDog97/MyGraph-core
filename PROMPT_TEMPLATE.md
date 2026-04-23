# MyGraph Graph Data Prompt Template (Latest)

用于生成与当前代码（`src/data/loader.ts`）兼容的 `graph-data/<categoryId>/graph.json`。

---

## Prompt (EN)

```text
Generate graph data for topic "{{TOPIC}}".
Return JSON only (no markdown).

Output schema:
{
  "categoryId": "<kebab-case-topic-id>",
  "graphs": [
    {
      "graphId": "<kebab-case-concept-id>",
      "graphLabel": "<human-readable concept name>",
      "nodes": [
        {
          "id": "<url-safe-unique-id>",
          "label": "<short display name>",
          "description": "<optional one-sentence explanation>",
          "tags": ["<tag1>", "<tag2>"],
          "links": [
            {
              "target": "<another-node-id-in-same-graph>",
              "type": "<relationship-type>",
              "label": "<optional readable edge label>"
            }
          ]
        }
      ]
    }
  ]
}

Hard rules:
1) Create 4-10 graphs for the topic.
2) Each graph focuses on one core concept.
3) No cross-graph links; links must stay within the same graph.
4) `graphId`, `graphLabel`, and `nodes` are required for each graph.
5) Node required fields: `id`, `label`, `tags` (array of strings).
6) `links` is optional; if present, every link must have non-empty `target` and `type`.
7) Node IDs must be unique within each graph.
8) Every node should have at least one inbound or outbound link inside its graph.
9) Return JSON only.
10) Use only these four relation `type` values: `Concept`, `Description`, `Condition`, `Action`.
11) Prefer exact capitalization for relation `type` values to match UI legend.
```

---

## 提示词（中文）

```text
请为主题“{{主题}}”生成图谱数据。
只输出 JSON（不要 markdown）。

输出结构：
{
  "categoryId": "<kebab-case-主题id>",
  "graphs": [
    {
      "graphId": "<kebab-case-概念id>",
      "graphLabel": "<概念显示名称>",
      "nodes": [
        {
          "id": "<url安全唯一id>",
          "label": "<简短名称>",
          "description": "<可选一句话描述>",
          "tags": ["<标签1>", "<标签2>"],
          "links": [
            {
              "target": "<同一张图里的节点id>",
              "type": "<关系类型>",
              "label": "<可选关系文案>"
            }
          ]
        }
      ]
    }
  ]
}

硬性规则：
1）一个主题生成 4-10 张图。
2）每张图只聚焦一个核心概念。
3）禁止跨图链接，links 只能指向当前 graph 内节点。
4）每个 graph 必须有 `graphId`、`graphLabel`、`nodes`。
5）节点必填字段：`id`、`label`、`tags`（字符串数组）。
6）`links` 可选；若存在，每条 link 必须有非空 `target` 和 `type`。
7）每张图内节点 `id` 必须唯一。
8）每个节点至少有一条同图入边或出边。
9）只输出 JSON。
10）关系 `type` 只能使用这四种：`Concept`、`Description`、`Condition`、`Action`。
11）关系 `type` 推荐使用上述完全一致的大小写，便于和 UI 图例对齐。
```

---

## Save Guide

1. Save as `graph-data/<categoryId>/graph.json`.
2. Ensure `graph-data/manifest.json` includes the new category and graph labels.
3. Keep `graphs[].graphLabel` user-friendly for UI dropdown display.
