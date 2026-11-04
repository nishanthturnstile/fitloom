import { customerReturnToken } from "@fitloom/application/customer-contracts";
import { MeasurementBook } from "@/components/measurements/measurement-book";
import { PageUnavailable } from "@/components/workspace/page-unavailable";
import {
  type MeasurementPageParams,
  measurementPageContext,
} from "@/server/measurement-page-context";
export const metadata = { title: "Measurements | Fitloom" };
export default async function Book({
  params,
  searchParams,
}: {
  params: Promise<MeasurementPageParams>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [p, q] = await Promise.all([params, searchParams]);
  const c = await measurementPageContext(p);
  if (c.kind === "unavailable")
    return <PageUnavailable title={c.message} href={`${c.base}/customers`} />;
  const token = customerReturnToken.safeParse(q.return);
  return (
    <MeasurementBook
      owner={c.owner}
      scope={c.scope}
      bookPath={c.bookPath}
      returnToken={token.success ? token.data : null}
    />
  );
}
