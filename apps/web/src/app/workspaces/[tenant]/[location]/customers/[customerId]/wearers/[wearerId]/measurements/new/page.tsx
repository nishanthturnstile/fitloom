import { customerReturnToken } from "@fitloom/application/customer-contracts";
import { MeasurementEntry } from "@/components/measurements/measurement-entry";
import { PageUnavailable } from "@/components/workspace/page-unavailable";
import {
  type MeasurementPageParams,
  measurementPageContext,
} from "@/server/measurement-page-context";
export const metadata = { title: "Add measurements | Fitloom" };
export default async function NewMeasurement({
  params,
  searchParams,
}: {
  params: Promise<MeasurementPageParams>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [p, q] = await Promise.all([params, searchParams]),
    c = await measurementPageContext(p, true);
  if (c.kind === "unavailable")
    return <PageUnavailable title={c.message} href={`${c.base}/customers`} />;
  try {
    const schema = await c.service.intakeSchema(
        c.target,
        c.owner.bodySchemaRef,
      ),
      token = customerReturnToken.safeParse(q.return);
    return (
      <MeasurementEntry
        owner={c.owner}
        initialSchema={schema}
        bookPath={c.bookPath}
        api={`/api/workspaces/${p.tenant}/${p.location}/measurements`}
        returnToken={token.success ? token.data : null}
      />
    );
  } catch {
    return (
      <PageUnavailable
        title="Measurement entry is unavailable. Retry from the book."
        href={c.bookPath}
      />
    );
  }
}
