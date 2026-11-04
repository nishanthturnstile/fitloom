import { MeasurementError } from "@fitloom/application";
import { customerReturnToken } from "@fitloom/application/customer-contracts";
import { MeasurementEntry } from "@/components/measurements/measurement-entry";
import { PageUnavailable } from "@/components/workspace/page-unavailable";
import {
  type MeasurementPageParams,
  measurementPageContext,
} from "@/server/measurement-page-context";
export const metadata = { title: "Copy measurement version | Fitloom" };
export default async function CopyMeasurement({
  params,
  searchParams,
}: {
  params: Promise<
    MeasurementPageParams & { profileId: string; versionId: string }
  >;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [p, q] = await Promise.all([params, searchParams]),
    context = await measurementPageContext(p, true);
  if (context.kind === "unavailable")
    return (
      <PageUnavailable
        title={context.message}
        href={`${context.base}/customers`}
      />
    );
  try {
    const source = await context.service.detail(context.target, {
      customerId: p.customerId,
      wearerId: p.wearerId,
      profileId: p.profileId,
      versionId: p.versionId,
    });
    let target: Awaited<ReturnType<typeof context.service.currentIntake>>;
    try {
      target = await context.service.currentIntake(context.target, {
        customerId: p.customerId,
        wearerId: p.wearerId,
        schemaRef: source.schemaRef,
      });
    } catch (error) {
      if (!(error instanceof MeasurementError) || error.code !== "unavailable")
        throw error;
      target = {
        schemaRef: context.owner.bodySchemaRef,
        schema: await context.service.intakeSchema(
          context.target,
          context.owner.bodySchemaRef,
        ),
      };
    }
    const token = customerReturnToken.safeParse(q.return);
    return (
      <MeasurementEntry
        owner={context.owner}
        initialSchema={target.schema}
        initialRef={target.schemaRef}
        copySource={source}
        bookPath={context.bookPath}
        api={`/api/workspaces/${p.tenant}/${p.location}/measurements`}
        returnToken={token.success ? token.data : null}
      />
    );
  } catch {
    return (
      <PageUnavailable
        title="This source version is unavailable for reuse."
        href={context.bookPath}
      />
    );
  }
}
