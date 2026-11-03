import { PageHeader } from "@/components/workspace/page-header";
import { PageUnavailable } from "@/components/workspace/page-unavailable";
import { fileService } from "@/server/files";
import { workspacePageContext } from "@/server/workspace-page-context";
import { PrivateFiles } from "../private-files";
export default async function Files({
  params,
}: {
  params: Promise<{ tenant: string; location: string }>;
}) {
  const p = await params,
    context = await workspacePageContext(p.tenant, p.location),
    base = `/workspaces/${p.tenant}/${p.location}`;
  if (
    context.kind === "unavailable" ||
    !context.workspace.permissions.includes("files.read")
  )
    return (
      <PageUnavailable title="Private files are unavailable." href={base} />
    );
  try {
    const page = await fileService(context.h).page(context.target);
    return (
      <>
        <PageHeader
          title="Private files"
          description="Images stay private to authorized workspace users."
        />
        <div className="workspace-shell">
          <PrivateFiles
            key={context.principalId}
            workspace={context.workspace}
            files={page.items}
            total={page.total}
            next={page.nextOffset}
          />
        </div>
      </>
    );
  } catch {
    return (
      <PageUnavailable
        title="Private files are unavailable."
        href={base}
        retryHref={`${base}/files`}
      />
    );
  }
}
