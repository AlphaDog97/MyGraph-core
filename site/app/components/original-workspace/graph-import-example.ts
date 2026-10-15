export const IMPORT_EXAMPLE = JSON.stringify({
  graphLabel: "EF Core 基础",
  nodes: [
    {
      id: "dbcontext", label: "DbContext", description: "数据库上下文，负责查询与保存。", tags: ["EF Core"],
      links: [{ target: "dbset", type: "Concept", label: "包含" }],
    },
    { id: "dbset", label: "DbSet", description: "表示一类实体的查询入口。", tags: ["EF Core"], links: [] },
  ],
}, null, 2);

export const IMPORT_AI_PROMPT = `请将我接下来提供的主题整理成 MyGraph 图谱 JSON，仅输出 JSON，不要解释。
格式为 {"graphLabel":"图谱名称","nodes":[{"id":"唯一ID","label":"节点标题","description":"解释","tags":["标签"],"links":[{"target":"另一个节点ID","type":"Concept","label":"关系名称"}]}]}。
节点 id 必须在当前图谱内唯一，links.target 必须引用同图谱中存在的节点 id。没有关系时 links 为 []。
关系 type 优先使用 Concept、Description、Condition、Action。图谱、节点和关系合计不超过 400 条。
如果需要多个图谱，输出 {"graphs":[{"graphId":"唯一图谱ID","graphLabel":"图谱名称","nodes":[...]}]}。
我的主题是：`;
