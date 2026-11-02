import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { identityService } from "@/server/identity";
import { masterService } from "@/server/masters";
import { workspaceService } from "@/server/workspaces";
import { GarmentSettings } from "./garment-settings";
export const dynamic = "force-dynamic";
export default async function GarmentSettingsPage({
  params,
}: {
  params: Promise<{ tenant: string; location: string }>;
}) {
  const h = await headers();
  try {
    await identityService().identity(h);
  } catch {
    redirect("/account");
  }
  const p = await params;
  const target = { tenantId: p.tenant, locationId: p.location };
  try {
    const service = workspaceService(h);
    const workspace = await service.view(target);
    if (!workspace.permissions.includes("masters.read"))
      return (
        <main className="workspace-shell">
          <h1>Garment access is unavailable.</h1>
          <p>Your role needs permission to view garments and services.</p>
          <a href={`/workspaces/${p.tenant}/${p.location}`}>
            Return to workspace
          </a>
        </main>
      );
    const [page, catalog, choices, preferences] = await Promise.all([
      masterService(h).page(target, "garment"),
      masterService(h).catalog(target),
      service.choices(),
      service.preferences(),
    ]);
    const selected = {
      ...target,
      shopName: workspace.shopName,
      locationName: workspace.locationName,
      permissions: workspace.permissions,
    };
    return (
      <main className="workspace-shell garment-shell">
        <GarmentSettings
          workspace={selected}
          initialPage={page}
          initialCatalog={catalog}
          choices={
            choices.some(
              (c) => c.tenantId === p.tenant && c.locationId === p.location,
            )
              ? choices
              : [
                  {
                    ...target,
                    shopName: workspace.shopName,
                    locationName: workspace.locationName,
                  },
                  ...choices,
                ]
          }
          locale={preferences?.locale ?? "en"}
        />
      </main>
    );
  } catch {
    return (
      <main className="workspace-shell">
        <h1>Garment settings are unavailable.</h1>
        <p>
          Your access may have changed, or the workspace could not be reached.
        </p>
        <a href={`/workspaces/${p.tenant}/${p.location}/settings/garments`}>
          Try again
        </a>
        <p>
          <a href="/workspaces">Choose an authorized workspace</a>
        </p>
      </main>
    );
  }
}
