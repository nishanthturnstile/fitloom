import { PageHeader } from "@/components/workspace/page-header";
import { PageUnavailable } from "@/components/workspace/page-unavailable";
import { workspacePageContext } from "@/server/workspace-page-context";
import { CustomerForm } from "../customer-form";
export const metadata = { title: "New customer | Fitloom" };
export default async function NewCustomer({
  params,
}: {
  params: Promise<{ tenant: string; location: string }>;
}) {
  const p = await params,
    context = await workspacePageContext(p.tenant, p.location),
    base = `/workspaces/${p.tenant}/${p.location}`;
  if (
    context.kind === "unavailable" ||
    !context.workspace.permissions.includes("customers.manage")
  )
    return (
      <PageUnavailable title="Customer editing is unavailable." href={base} />
    );
  return (
    <>
      <PageHeader
        title="New customer"
        description={`${context.workspace.locationName} · Create a contact and optional self wearer.`}
      />
      <CustomerForm
        base={base}
        canRestore={context.workspace.permissions.includes("customers.archive")}
      />
    </>
  );
}
