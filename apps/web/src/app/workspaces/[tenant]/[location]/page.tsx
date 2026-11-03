import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PageHeader } from "@/components/workspace/page-header";
import { PageUnavailable } from "@/components/workspace/page-unavailable";
import { WorkspaceDestinations } from "@/components/workspace/workspace-destinations";
import {
  type HomeCatalog,
  WorkspaceHome,
} from "@/components/workspace/workspace-home";
import { masterService } from "@/server/masters";
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
  let catalog: HomeCatalog = { kind: "unavailable" };
  const canReadMasters = context.workspace.permissions.includes("masters.read");
  if (canReadMasters) {
    const service = masterService(context.h);
    try {
      const [garments, services, addons, status] = await Promise.all([
        service.page(context.target, "garment", { limit: 5 }),
        service.page(context.target, "service", { limit: 1 }),
        service.page(context.target, "addon", { limit: 1 }),
        service.catalog(context.target),
      ]);
      catalog = {
        kind: "ready",
        garments: {
          total: garments.total,
          items: garments.items.map(({ id, label }) => ({ id, label })),
        },
        services: services.total,
        addons: addons.total,
        catalog: status,
      };
    } catch {
      // A failed read must not become a successful zero count.
    }
  }
  const base = `/workspaces/${p.tenant}/${p.location}`;
  return (
    <>
      <PageHeader
        eyebrow={context.workspace.shopName}
        title="Home"
        description={`${context.workspace.locationName} · Manage your catalog, shop settings, and authorized workspace tools.`}
      />
      {context.workspace.permissions.includes("customers.read") && (
        <Card className="mb-5">
          <CardHeader>
            <CardTitle>Customer book</CardTitle>
            <CardDescription>
              Find contacts and named wearers for this location.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <a
              href={`${base}/customers?focus=search`}
              className="text-sm font-medium text-primary underline underline-offset-4"
            >
              Find a customer
            </a>
            {context.workspace.permissions.includes("customers.manage") && (
              <a
                href={`${base}/customers/new`}
                className="ml-5 text-sm font-medium text-primary underline"
              >
                Add customer
              </a>
            )}
          </CardContent>
        </Card>
      )}
      {canReadMasters && (
        <WorkspaceHome
          base={base}
          data={catalog}
          canReadRates={context.workspace.permissions.includes(
            "masters.rates.read",
          )}
        />
      )}
      <section aria-label="Workspace tools" className="mt-8">
        <h2 className="mb-4 font-heading text-lg font-medium">
          Workspace tools
        </h2>
        <WorkspaceDestinations workspace={context.workspace} />
      </section>
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>
            <h2>Measurements</h2>
          </CardTitle>
          <CardDescription>Next build</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Wearer measurements, orders and production will be available here as
            those tools are added.
          </p>
        </CardContent>
      </Card>
      <a
        href={`/workspaces/${p.tenant}/${p.location}/settings`}
        className="mt-6 inline-block text-sm text-primary underline underline-offset-4"
      >
        Your access and personal preferences
      </a>
    </>
  );
}
