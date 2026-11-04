import { customerReturnToken } from "@fitloom/application/customer-contracts";
import { MeasurementEntry } from "@/components/measurements/measurement-entry";
import { PageUnavailable } from "@/components/workspace/page-unavailable";
import {
  type MeasurementPageParams,
  measurementPageContext,
} from "@/server/measurement-page-context";
export const metadata = { title: "Revise measurements | Fitloom" };
export default async function EditMeasurement({
  params,
  searchParams,
}: {
  params: Promise<MeasurementPageParams & { profileId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [p, q] = await Promise.all([params, searchParams]);
  const context = await measurementPageContext(p, true);
  if (context.kind === "unavailable")
    return (
      <PageUnavailable
        title={context.message}
        href={`${context.base}/customers`}
      />
    );
  try {
    const data = await context.service.detail(context.target, {
      customerId: p.customerId,
      wearerId: p.wearerId,
      profileId: p.profileId,
    });
    if (!data.effectiveActive)
      return (
        <PageUnavailable
          title="Restore this profile before revising measurements."
          href={context.bookPath}
        />
      );
    const token = customerReturnToken.safeParse(q.return);
    return (
      <MeasurementEntry
        owner={context.owner}
        initialSchema={data.document.schema}
        revision={data}
        bookPath={context.bookPath}
        api={`/api/workspaces/${p.tenant}/${p.location}/measurements`}
        returnToken={token.success ? token.data : null}
      />
    );
  } catch {
    return (
      <PageUnavailable
        title="Measurement revision is unavailable. Retry from the book."
        href={context.bookPath}
      />
    );
  }
}
