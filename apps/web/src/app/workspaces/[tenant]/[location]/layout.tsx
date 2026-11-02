import type { ReactNode } from "react";
import { WorkspaceShell } from "@/components/workspace/workspace-shell";
import { workspacePageContext } from "@/server/workspace-page-context";
export const dynamic = "force-dynamic";
export default async function WorkspaceLayout({
  params,
  children,
}: {
  params: Promise<{ tenant: string; location: string }>;
  children: ReactNode;
}) {
  const p = await params;
  const context = await workspacePageContext(p.tenant, p.location);
  if (context.kind === "unavailable")
    return (
      <main className="workspace-foundation">
        <h1>This workspace is unavailable.</h1>
        <p>
          Your access may have changed, or the workspace could not be reached.
        </p>
        <a href="/workspaces">Choose an authorized workspace</a>
      </main>
    );
  return (
    <WorkspaceShell
      key={`${context.principalId}:${p.tenant}:${p.location}`}
      workspace={{
        tenantId: context.workspace.tenantId,
        locationId: context.workspace.locationId,
        shopName: context.workspace.shopName,
        locationName: context.workspace.locationName,
        permissions: context.workspace.permissions,
      }}
      choices={context.choices}
      locale={context.locale}
    >
      {children}
    </WorkspaceShell>
  );
}
