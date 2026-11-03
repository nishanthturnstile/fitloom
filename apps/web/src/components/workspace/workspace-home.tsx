import type {
  garmentPage,
  MasterCatalog,
} from "@fitloom/application/master-contracts";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type GarmentPage = ReturnType<typeof garmentPage.parse>;

export type HomeCatalog =
  | { kind: "unavailable" }
  | {
      kind: "ready";
      garments: {
        total: GarmentPage["total"];
        items: Pick<GarmentPage["items"][number], "id" | "label">[];
      };
      services: number;
      addons: number;
      catalog: MasterCatalog;
    };

export function WorkspaceHome({
  base,
  data,
  canReadRates,
}: {
  base: string;
  data: HomeCatalog;
  canReadRates: boolean;
}) {
  if (data.kind === "unavailable")
    return (
      <Alert>
        <AlertTitle>Catalog summary unavailable</AlertTitle>
        <AlertDescription>
          <p>
            Your catalog could not be loaded. Try again to see current totals.
          </p>
          <a href={base}>Refresh Home</a>
        </AlertDescription>
      </Alert>
    );
  const catalogHref = `${base}/settings/garments`;
  const summaries = [
    {
      label: "Available garments",
      value: data.garments.total,
      detail: "Active and visible in your catalog",
      href: catalogHref,
    },
    {
      label: "Available services",
      value: data.services,
      detail: "Active and visible in your catalog",
      href: `${catalogHref}?kind=service`,
    },
    {
      label: "Available add-ons",
      value: data.addons,
      detail: "Optional extras for your garments",
      href: `${catalogHref}?kind=addon`,
    },
    {
      label: "Starter library",
      value:
        data.catalog.starterBundleVersion === null
          ? "Not installed"
          : "Installed",
      detail: `${data.catalog.installedTemplateKeys.length} starter templates installed`,
      href: catalogHref,
    },
  ];
  return (
    <div className="flex min-w-0 flex-col gap-6">
      <section
        aria-label="Catalog summary"
        className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
      >
        {summaries.map((item) => (
          <Card key={item.label} size="sm">
            <CardHeader>
              <CardTitle>
                <h2>{item.label}</h2>
              </CardTitle>
              <CardDescription>{item.detail}</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="font-heading text-2xl tabular-nums">{item.value}</p>
              <a
                href={item.href}
                className="text-sm text-primary underline underline-offset-4"
              >
                Open{" "}
                {item.label === "Starter library"
                  ? "catalog"
                  : item.label.replace("Available ", "").toLowerCase()}
              </a>
            </CardContent>
          </Card>
        ))}
      </section>
      <div className="grid min-w-0 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>
              <h2>Garments in your catalog</h2>
            </CardTitle>
            <CardDescription>
              Shop-wide definitions, shown in catalog order.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {data.garments.items.length ? (
              <ul className="flex flex-col gap-3">
                {data.garments.items.map((item) => (
                  <li
                    key={item.id}
                    className="break-words border-b border-border pb-3 text-sm last:border-0 last:pb-0"
                  >
                    {item.label}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">
                No available garments yet. Open the catalog to create one or
                install starter templates.
              </p>
            )}
            <a
              href={catalogHref}
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              Open garment catalog
            </a>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>
              <h2>Prepare your catalog</h2>
            </CardTitle>
            <CardDescription>
              Current facts and recommended checks before taking work.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="flex flex-col gap-3 text-sm">
              <li>
                {data.garments.total > 0
                  ? "Available garments are present."
                  : "Add a garment or install starter templates."}
              </li>
              <li>
                {data.services > 0
                  ? "Available services are present."
                  : "Add the services your shop offers."}
              </li>
              <li>Add-ons are optional.</li>
            </ul>
            <a
              href={catalogHref}
              className="text-sm text-primary underline underline-offset-4"
            >
              Review garment forms
            </a>
            {canReadRates && (
              <a
                href={catalogHref}
                className="text-sm text-primary underline underline-offset-4"
              >
                Review rates in the catalog
              </a>
            )}
            <p className="text-xs text-muted-foreground">
              Form and rate review are staff tasks. Their completion is not
              tracked here.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
