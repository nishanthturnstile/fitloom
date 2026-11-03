import {
  customerId,
  customerReturnToken,
} from "@fitloom/application/customer-contracts";
import { PageHeader } from "@/components/workspace/page-header";
import { PageUnavailable } from "@/components/workspace/page-unavailable";
import { customerService } from "@/server/customers";
import { workspacePageContext } from "@/server/workspace-page-context";
import { CustomerForm } from "../../customer-form";
export const metadata = { title: "Edit customer | Fitloom" };
export default async function EditCustomer({
  params,
  searchParams,
}: {
  params: Promise<{ tenant: string; location: string; customerId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = await searchParams,
    token = customerReturnToken.safeParse(query.return);
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
  const id = customerId.safeParse(p.customerId);
  if (!id.success)
    return (
      <PageUnavailable
        title="Customer unavailable."
        href={`${base}/customers`}
      />
    );
  try {
    const saved = await customerService(context.h).detail(
      context.target,
      id.data,
    );
    if (saved.archivedAt)
      return (
        <PageUnavailable
          title="Restore this customer before editing."
          href={`${base}/customers/${id.data}${token.success ? `?return=${token.data}` : ""}`}
        />
      );
    return (
      <>
        <a
          href={`${base}/customers/${id.data}${token.success ? `?return=${token.data}` : ""}`}
          className="text-primary underline"
        >
          {saved.profile.name} · Profile
        </a>
        <PageHeader
          title="Edit customer"
          description="Contact and wearer names are independent."
        />
        <CustomerForm
          base={base}
          saved={saved}
          canRestore={context.workspace.permissions.includes(
            "customers.archive",
          )}
        />
      </>
    );
  } catch {
    return (
      <PageUnavailable
        title="Customer unavailable."
        href={`${base}/customers`}
      />
    );
  }
}
