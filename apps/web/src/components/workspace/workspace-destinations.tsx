import type { WorkspaceView } from "@fitloom/application/workspace-contracts";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function WorkspaceDestinations({
  workspace,
}: {
  workspace: WorkspaceView;
}) {
  const base = `/workspaces/${workspace.tenantId}/${workspace.locationId}`;
  const destinations = [
    {
      title: "Shop profile",
      description: "Business details, owner contact, and location information.",
      href: `${base}/settings/shop`,
    },
    ...(workspace.permissions.includes("masters.read")
      ? [
          {
            title: "Garments and services",
            description:
              "Manage garment definitions, services, add-ons, and their saved history.",
            href: `${base}/settings/garments`,
          },
        ]
      : []),
    ...(workspace.permissions.includes("access.manage")
      ? [
          {
            title: "People & access",
            description:
              "Manage invitations, location grants, and roles within your current authority.",
            href: `${base}/settings/access`,
          },
        ]
      : []),
    ...(workspace.permissions.includes("files.read")
      ? [
          {
            title: "Private files",
            description:
              "Upload, download, and retire authorized private images.",
            href: `${base}/files`,
          },
        ]
      : []),
  ];
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {destinations.map((item) => (
        <Card key={item.href} size="sm">
          <CardHeader>
            <CardTitle>{item.title}</CardTitle>
            <CardDescription>{item.description}</CardDescription>
          </CardHeader>
          <CardContent>
            <a
              href={item.href}
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              Open {item.title.toLowerCase()}
            </a>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
