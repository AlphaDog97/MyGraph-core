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

## Usage

1. Copy the prompt above, replace `{{TOPIC}}` with your subject (e.g. "Web Development Stack", "Machine Learning Pipeline", "Cloud Infrastructure").
2. Send it to your preferred AI model.
3. Save each returned JSON block as a separate `.json` file in `graph-data/nodes/`.
4. Rebuild or refresh the app — the new nodes will appear in the graph automatically.
