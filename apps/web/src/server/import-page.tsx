import "server-only";
import { ImportError } from "@fitloom/application";
import { DomainImportPanel } from "@/components/imports/domain-import-panel";
import { PageHeader } from "@/components/workspace/page-header";
import { PageUnavailable } from "@/components/workspace/page-unavailable";
import { domainImportService } from "./domain-imports";
import { workspacePageContext } from "./workspace-page-context";
export async function importPage(
  params: Promise<{ tenant: string; location: string }>,
  family: "customers" | "measurements",
) {
  const p = await params,
    context = await workspacePageContext(p.tenant, p.location),
    base = `/workspaces/${p.tenant}/${p.location}`;
  if (
    context.kind === "unavailable" ||
    !context.workspace.permissions.includes(`${family}.import`)
  )
    return (
      <PageUnavailable title="Import access is unavailable." href={base} />
    );
  try {
    const initial = await domainImportService(context.h).batches(
      family,
      context.target,
    );
    return (
      <>
        <PageHeader
          eyebrow={context.workspace.shopName}
          title={
            family === "customers"
              ? "Import customers and wearers"
              : "Import measurement histories"
          }
          description={`${context.workspace.locationName} · Review complete source groups before committing.`}
        />
        <DomainImportPanel
          key={`${context.principalId}:${p.tenant}:${p.location}:${family}`}
          family={family}
          api={`/api${base}/imports`}
          initial={initial}
        />
      </>
    );
  } catch (error) {
    return (
      <PageUnavailable
        title={
          error instanceof ImportError
            ? error.message
            : "Imports are temporarily unavailable."
        }
        href={base}
      />
    );
  }
}
