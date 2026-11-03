import { CustomerError } from "@fitloom/application";
import { PageHeader } from "@/components/workspace/page-header";
import { PageUnavailable } from "@/components/workspace/page-unavailable";
import { customerService } from "@/server/customers";
import { workspacePageContext } from "@/server/workspace-page-context";
import {
  CustomerRegister,
  type CustomerRegisterState,
} from "./customer-register";
export const metadata = { title: "Customers | Fitloom" };
export default async function Customers({
  params,
}: {
  params: Promise<{ tenant: string; location: string }>;
}) {
  const p = await params,
    context = await workspacePageContext(p.tenant, p.location),
    base = `/workspaces/${p.tenant}/${p.location}`;
  if (
    context.kind === "unavailable" ||
    !context.workspace.permissions.includes("customers.read")
  )
    return (
      <PageUnavailable title="Customer access is unavailable." href={base} />
    );
  let initial: CustomerRegisterState;
  try {
    initial = {
      kind: "ready",
      page: await customerService(context.h).page(context.target),
    };
  } catch (error) {
    initial = {
      kind: "error",
      message:
        error instanceof CustomerError
          ? error.message
          : "Customers unavailable. Try again.",
      code: error instanceof CustomerError ? error.code : "temporary",
    };
  }
  return (
    <>
      <PageHeader
        eyebrow={context.workspace.shopName}
        title="Customers"
        description={`${context.workspace.locationName} · Contacts and named wearers for this location.`}
      />
      <CustomerRegister
        canManage={context.workspace.permissions.includes("customers.manage")}
        scope={{ ...context.target, principalId: context.principalId }}
        initial={initial}
      />
    </>
  );
}
