import { getGraphDetail, listWorkspace } from "@/app/lib/graph-store";
import { WorkspaceShell } from "@/app/components/workspace-shell";
import { requirePageUser } from "@/app/lib/auth";

export const dynamic = "force-dynamic";

export default async function Home() {
  const user = await requirePageUser();
  const workspace = await listWorkspace();
  const initialGraph =
    workspace.graphs.find((graph) => graph.slug === "dbcontext") ??
    workspace.graphs[0] ??
    null;
  const detail = initialGraph ? await getGraphDetail(initialGraph.id) : null;

  return (
    <WorkspaceShell
      user={user}
      initialWorkspace={workspace}
      initialDetail={detail}
    />
  );
}
