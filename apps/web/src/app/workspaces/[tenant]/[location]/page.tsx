import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { fileService } from "@/server/files";
import { identityService } from "@/server/identity";
import { workspaceService } from "@/server/workspaces";
import { WorkspacePanel } from "./workspace-panel";
export const dynamic = "force-dynamic";
export default async function Workspace({
  params,
}: {
  params: Promise<{ tenant: string; location: string }>;
}) {
  const h = await headers();
  let actor: Awaited<
    ReturnType<ReturnType<typeof identityService>["identity"]>
  >;
  try {
    actor = await identityService().identity(h);
  } catch {
    redirect("/account");
  }
  const p = await params,
    service = workspaceService(h),
    target = { tenantId: p.tenant, locationId: p.location };
  try {
    const workspace = await service.view(target);
    const [choices, team, preference, files] = await Promise.all([
      service.choices(),
      workspace.permissions.includes("access.manage")
        ? service.team(target)
        : Promise.resolve(null),
      service.preferences(),
      workspace.permissions.includes("files.read")
        ? fileService(h).page(target)
        : Promise.resolve({ items: [], total: 0, nextOffset: null }),
    ]);
    return (
      <main className="workspace-shell">
        <header className="workspace-top">
          <a href="/workspaces">fitloom / workspaces</a>
          <a href="/account">Your account</a>
        </header>
        <WorkspacePanel
          key={`${actor.principalId}:${p.tenant}:${p.location}`}
          workspace={workspace}
          files={files.items}
          fileTotal={files.total}
          fileNext={files.nextOffset}
          choices={
            choices.some(
              (c) =>
                c.tenantId === workspace.tenantId &&
                c.locationId === workspace.locationId,
            )
              ? choices
              : [
                  {
                    tenantId: workspace.tenantId,
                    locationId: workspace.locationId,
                    shopName: workspace.shopName,
                    locationName: workspace.locationName,
                  },
                  ...choices,
                ]
          }
          team={team}
          principalId={actor.principalId}
          locale={preference?.locale ?? "en"}
        />
      </main>
    );
  } catch {
    return (
      <main className="workspace-shell">
        <h1>This workspace is unavailable.</h1>
        <p>Your access may have changed.</p>
        <a href="/workspaces">Choose an authorized workspace</a>
      </main>
    );
  }
}
