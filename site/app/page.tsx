import { getGraphDetail, listWorkspace } from "@/app/lib/graph-store";
import { WorkspaceShell } from "@/app/components/workspace-shell";
import { requirePageUser } from "@/app/lib/auth";
import type { GraphDetail } from "@/app/lib/types";

export const dynamic = "force-dynamic";

export default async function Home() {
  const user = await requirePageUser();
  const workspace = await listWorkspace();
  const initialGraph =
    workspace.graphs.find((graph) => graph.slug === "dbcontext") ??
    workspace.graphs[0] ??
    null;
  const initialCategoryId =
    initialGraph?.categoryId ?? workspace.categories[0]?.id ?? "";
  const initialDetails = (
    await Promise.all(
      workspace.graphs
        .filter((graph) => graph.categoryId === initialCategoryId)
        .map((graph) => getGraphDetail(graph.id)),
    )
  ).filter((detail): detail is GraphDetail => detail !== null);

  return (
    <WorkspaceShell
      user={user}
      initialWorkspace={workspace}
      initialDetails={initialDetails}
    />
  );
}
