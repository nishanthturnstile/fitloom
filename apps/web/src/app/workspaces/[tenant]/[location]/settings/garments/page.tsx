import { PageUnavailable } from "@/components/workspace/page-unavailable";
import { masterService } from "@/server/masters";
import { workspacePageContext } from "@/server/workspace-page-context";
import { GarmentSettings } from "./garment-settings";
export const dynamic = "force-dynamic";
export default async function GarmentSettingsPage({
  params,
  searchParams,
}: {
  params: Promise<{ tenant: string; location: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const p = await params,
    query = await searchParams;
  const context = await workspacePageContext(p.tenant, p.location),
    base = `/workspaces/${p.tenant}/${p.location}`;
  if (
    context.kind === "unavailable" ||
    !context.workspace.permissions.includes("masters.read")
  )
    return (
      <PageUnavailable title="Garment access is unavailable." href={base} />
    );
  const kind =
    query.kind === "service"
      ? "service"
      : query.kind === "addon"
        ? "addon"
        : "garment";
  try {
    const service = masterService(context.h);
    const [page, catalog] = await Promise.all([
      service.page(context.target, kind),
      service.catalog(context.target),
    ]);
    return (
      <div className="workspace-foundation">
        <GarmentSettings
          key={`${context.principalId}:${kind}`}
          workspace={{
            tenantId: context.workspace.tenantId,
            locationId: context.workspace.locationId,
            shopName: context.workspace.shopName,
            locationName: context.workspace.locationName,
            permissions: context.workspace.permissions,
          }}
          initialPage={page}
          initialCatalog={catalog}
          initialKind={kind}
          focusSearch={query.focus === "search"}
        />
      </div>
    );
  } catch {
    return (
      <PageUnavailable
        title="Garment settings are unavailable."
        href={base}
        retryHref={`${base}/settings/garments?kind=${kind}`}
      />
    );
  }
}
