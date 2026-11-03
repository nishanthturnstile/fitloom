import { CustomerError } from "@fitloom/application";
import {
  customerId,
  customerReturnToken,
} from "@fitloom/application/customer-contracts";
import { formatCustomerPhone } from "@fitloom/application/customer-phone";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PageHeader } from "@/components/workspace/page-header";
import { PageUnavailable } from "@/components/workspace/page-unavailable";
import { customerService } from "@/server/customers";
import { workspacePageContext } from "@/server/workspace-page-context";
import { CustomerProfilePanel } from "./customer-profile-panel";
export const metadata = { title: "Customer profile | Fitloom" };
export default async function Customer({
  params,
  searchParams,
}: {
  params: Promise<{ tenant: string; location: string; customerId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [p, query] = await Promise.all([params, searchParams]),
    context = await workspacePageContext(p.tenant, p.location),
    base = `/workspaces/${p.tenant}/${p.location}`;
  if (
    context.kind === "unavailable" ||
    !context.workspace.permissions.includes("customers.read")
  )
    return (
      <PageUnavailable title="Customer access is unavailable." href={base} />
    );
  const id = customerId.safeParse(p.customerId);
  if (!id.success) notFound();
  let data: Awaited<ReturnType<ReturnType<typeof customerService>["detail"]>>;
  try {
    data = await customerService(context.h).detail(context.target, id.data);
  } catch (error) {
    if (
      error instanceof CustomerError &&
      (error.code === "unavailable" || error.code === "validation")
    )
      notFound();
    return (
      <PageUnavailable
        title="This customer is unavailable."
        href={`${base}/customers`}
        retryHref={`${base}/customers/${id.data}`}
      />
    );
  }
  const token = customerReturnToken.safeParse(query.return),
    back = `${base}/customers${token.success ? `?return=${token.data}` : ""}`;
  return (
    <>
      <a
        href={back}
        className="mt-6 inline-block text-sm text-primary underline underline-offset-4"
      >
        ← Back to customers
      </a>
      {query.saved === "1" && <p role="status">Changes saved.</p>}
      {query.saved === "unchanged" && <p role="status">No changes to save.</p>}
      {data.capabilities.manage && !data.archivedAt && (
        <a
          href={`${base}/customers/${id.data}/edit${token.success ? `?return=${token.data}` : ""}`}
          className="my-4 inline-block text-primary underline"
        >
          Edit customer
        </a>
      )}
      <PageHeader
        eyebrow={context.workspace.shopName}
        title={data.profile.name}
        description={`${context.workspace.locationName} · Customer profile`}
      />
      <div className="mb-5 flex flex-wrap gap-2">
        <Badge variant={data.archivedAt ? "secondary" : "outline"}>
          {data.archivedAt ? "Archived" : "Active"}
        </Badge>
        {data.profile.segment ? (
          <Badge variant="secondary">
            {data.profile.segment} · staff-assigned
          </Badge>
        ) : null}
        {data.profile.tags.map((tag) => (
          <Badge key={tag} variant="outline">
            {tag}
          </Badge>
        ))}
      </div>
      <CustomerProfilePanel
        base={base}
        data={data}
        today={new Intl.DateTimeFormat("en-CA", {
          timeZone: context.workspace.timezone ?? "UTC",
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        }).format(new Date())}
      >
        <Card>
          <CardHeader>
            <CardTitle>Contact</CardTitle>
            <CardDescription>Saved details for this location.</CardDescription>
          </CardHeader>
          <CardContent>
            <dl className="grid gap-4 text-sm">
              <div>
                <dt className="text-muted-foreground">Phone</dt>
                <dd>{formatCustomerPhone(data.profile.phone)}</dd>
              </div>
              {data.profile.email ? (
                <div>
                  <dt className="text-muted-foreground">Email</dt>
                  <dd className="break-all">{data.profile.email}</dd>
                </div>
              ) : null}
              {data.profile.address ? (
                <div>
                  <dt className="text-muted-foreground">Address</dt>
                  <dd className="whitespace-pre-line break-words">
                    {Object.values(data.profile.address)
                      .filter(Boolean)
                      .join("\n")}
                  </dd>
                </div>
              ) : null}
              {data.profile.gstin && (
                <div>
                  <dt>GSTIN</dt>
                  <dd>{data.profile.gstin}</dd>
                </div>
              )}
              {Object.entries(data.profile.preferences).map(([kind, value]) =>
                value ? (
                  <div key={kind}>
                    <dt>{kind} preferences</dt>
                    <dd className="whitespace-pre-wrap break-words">{value}</dd>
                  </div>
                ) : null,
              )}
              {data.profile.notes ? (
                <div>
                  <dt className="text-muted-foreground">Notes</dt>
                  <dd className="whitespace-pre-wrap break-words">
                    {data.profile.notes}
                  </dd>
                </div>
              ) : null}
            </dl>
          </CardContent>
        </Card>
      </CustomerProfilePanel>
    </>
  );
}
