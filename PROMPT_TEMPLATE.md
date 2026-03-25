# Multi-Graph Prompt Template

Use these prompts when a single graph for one topic becomes too large or too tangled.  
New default workflow: **first split one big topic into several subgraphs**, then generate one `graph.json` per subgraph.

---

## Step 1: Topic Split Prompt (English)

```
I'm building a visual knowledge graph app. I don't want one giant graph for "{{TOPIC}}".
Please split this topic into several smaller, cleaner subgraphs.

Output requirements:
1. Return ONE JSON object with this shape:
{
  "topic": "{{TOPIC}}",
  "categoryId": "<kebab-case-category-id>",
  "subgraphs": [
    {
      "id": "<kebab-case-graph-id>",
      "label": "<Human-readable graph name>",
      "focus": "<What this subgraph covers>",
      "mustInclude": ["<concept1>", "<concept2>"]
    }
  ]
}
2. Create 3–7 subgraphs.
3. Each subgraph should be cohesive and narrowly focused.
4. Minimize overlap between subgraphs.
5. Together, all subgraphs should cover the topic comprehensively.
6. Use practical, folder-safe IDs in kebab-case.
7. Output JSON only (no markdown, no explanation).
```

---

## Step 1：主题拆分提示词（中文版）

```
我正在构建一个可视化知识图谱应用，不希望把“{{主题}}”做成一个巨大且线条交错的单图。
请先把这个主题拆成多个更清晰的小图。

输出要求：
1. 只输出一个 JSON 对象，格式如下：
{
  "topic": "{{主题}}",
  "categoryId": "<kebab-case-分类id>",
  "subgraphs": [
    {
      "id": "<kebab-case-图id>",
      "label": "<图名称>",
      "focus": "<这个子图聚焦什么>",
      "mustInclude": ["<概念1>", "<概念2>"]
    }
  ]
}
2. 拆分为 3–7 个子图。
3. 每个子图必须主题集中、边界清晰。
4. 子图之间尽量减少重复内容。
5. 所有子图合起来要完整覆盖该主题。
6. id 使用 kebab-case，方便直接作为文件夹名称。
7. 只输出 JSON，不要 markdown，不要解释文字。
```

---

## Step 2: Per-Subgraph Node Prompt (English)

Use this prompt **once per subgraph** from Step 1.

```
Generate nodes for ONE subgraph of "{{TOPIC}}".
Subgraph ID: "{{SUBGRAPH_ID}}"
Subgraph Label: "{{SUBGRAPH_LABEL}}"
Subgraph Focus: "{{SUBGRAPH_FOCUS}}"
Must-Include Concepts: {{MUST_INCLUDE_ARRAY}}

Return exactly ONE JSON array (this will be saved as graph.json).

Schema for every node:
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
1. Include all must-include concepts.
2. Keep this graph focused only on this subgraph scope.
3. "id" must be lowercase, URL-safe, and unique within this array.
4. "links.target" must reference an existing node in this same array.
5. Relationship "type" must be one of: "Concept", "Description", "Condition", "Action".
6. Use 4–7 tags total in this subgraph.
7. Ensure every node has at least one inbound or outbound link.
8. Prefer clean layered structure (core -> related -> detailed), and avoid unnecessary cross-links.
9. Output JSON array only (no markdown).
```

---

## Step 2：单个子图生成提示词（中文版）

对 Step 1 生成的每个子图，分别执行一次。

```
请为“{{主题}}”中的一个子图生成节点。
子图 ID："{{子图ID}}"
子图名称："{{子图名称}}"
子图焦点："{{子图焦点}}"
必须包含概念：{{必须包含概念数组}}

只返回一个 JSON 数组（将直接保存为 graph.json）。

每个节点必须符合：
{
  "id": "<url安全的唯一标识>",
  "label": "<简短显示名>",
  "description": "<一句话描述>",
  "tags": ["<标签1>", "<标签2>"],
  "links": [
    {
      "target": "<另一个节点的id>",
      "type": "<关系类型>",
      "label": "<可读的关系文字>"
    }
  ]
}

规则：
1. 必须覆盖“必须包含概念”中的全部内容。
2. 内容只聚焦当前子图范围，不要扩展到其他子图。
3. "id" 必须小写、URL 安全，并在当前数组内唯一。
4. "links.target" 必须引用当前数组内真实存在的节点 id。
5. "type" 只能是："Concept"、"Description"、"Condition"、"Action"。
6. 当前子图总共使用 4–7 个标签。
7. 每个节点至少有一条入边或出边。
8. 结构尽量分层（核心 -> 相关 -> 细节），避免不必要的交叉连线。
9. 只输出 JSON 数组，不要 markdown。
```

---

## Usage / 使用方法

1. Run **Step 1** prompt to get subgraph planning JSON.
2. Create a category folder using `categoryId`: `graph-data/<categoryId>/`.
3. For each item in `subgraphs`, run **Step 2** prompt once.
4. Save each returned array as:
   - `graph-data/<categoryId>/<subgraph.id>/graph.json`
5. Rebuild or refresh the app.

### Folder structure example

```
graph-data/
└── web-development/
    ├── frontend-core/
    │   └── graph.json
    ├── build-tooling/
    │   └── graph.json
    └── testing-quality/
        └── graph.json
```
