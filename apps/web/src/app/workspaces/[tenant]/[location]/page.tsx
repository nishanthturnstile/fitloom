import { PageHeader } from "@/components/workspace/page-header";
import { PageUnavailable } from "@/components/workspace/page-unavailable";
import { WorkspaceDestinations } from "@/components/workspace/workspace-destinations";
import { workspacePageContext } from "@/server/workspace-page-context";
export default async function Workspace({
  params,
}: {
  params: Promise<{ tenant: string; location: string }>;
}) {
  const p = await params,
    context = await workspacePageContext(p.tenant, p.location);
  if (context.kind === "unavailable")
    return (
      <PageUnavailable
        title="This workspace is unavailable."
        href="/workspaces"
      />
    );
  return (
    <>
      <PageHeader
        eyebrow="Your workspace"
        title={context.workspace.shopName}
        description={`${context.workspace.locationName} · Manage your catalog, shop settings, and authorized workspace tools.`}
      />
      <WorkspaceDestinations workspace={context.workspace} />
      <a
        href={`/workspaces/${p.tenant}/${p.location}/settings`}
        className="mt-6 inline-block text-sm text-primary underline underline-offset-4"
      >
        Your access and personal preferences
      </a>
    </>
  );
}
