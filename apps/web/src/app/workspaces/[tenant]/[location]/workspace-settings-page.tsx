import { PageHeader } from "@/components/workspace/page-header";
import { PageUnavailable } from "@/components/workspace/page-unavailable";
import { WorkspaceDestinations } from "@/components/workspace/workspace-destinations";
import { workspacePageContext } from "@/server/workspace-page-context";
import { workspaceService } from "@/server/workspaces";
import { WorkspacePanel } from "./workspace-panel";

export async function WorkspaceSettingsPage({
  params,
  section,
}: {
  params: Promise<{ tenant: string; location: string }>;
  section: "shop" | "preferences" | "access";
}) {
  const p = await params,
    context = await workspacePageContext(p.tenant, p.location);
  const base = `/workspaces/${p.tenant}/${p.location}`;
  if (context.kind === "unavailable")
    return <PageUnavailable title="Settings are unavailable." href={base} />;
  if (
    section === "access" &&
    !context.workspace.permissions.includes("access.manage")
  )
    return (
      <PageUnavailable
        title="People and access management is unavailable."
        href={base}
      />
    );
  try {
    const team =
      section === "access"
        ? await workspaceService(context.h).team(context.target)
        : null;
    const title =
      section === "shop"
        ? "Shop profile"
        : section === "access"
          ? "People & access"
          : "Settings";
    return (
      <>
        <PageHeader
          eyebrow={context.workspace.shopName}
          title={title}
          description={
            section === "preferences"
              ? "Configure your workspace and personal preferences."
              : `Settings for ${context.workspace.locationName}.`
          }
        />
        {section === "preferences" && (
          <WorkspaceDestinations workspace={context.workspace} />
        )}
        <div className="workspace-shell">
          <WorkspacePanel
            key={`${context.principalId}:${section}`}
            section={section}
            workspace={context.workspace}
            team={team}
            principalId={context.principalId}
            locale={context.locale}
          />
        </div>
      </>
    );
  } catch {
    return (
      <PageUnavailable
        title="Settings are unavailable."
        href={base}
        retryHref={`${base}/settings${section === "preferences" ? "" : `/${section}`}`}
      />
    );
  }
}
