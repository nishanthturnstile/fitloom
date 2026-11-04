import { MeasurementComparison } from "@/components/measurements/measurement-comparison";
import { PageUnavailable } from "@/components/workspace/page-unavailable";
import {
  type MeasurementPageParams,
  measurementPageContext,
} from "@/server/measurement-page-context";
export const metadata = { title: "Compare measurements | Fitloom" };
export default async function Compare({
  params,
}: {
  params: Promise<MeasurementPageParams>;
}) {
  const p = await params,
    c = await measurementPageContext(p);
  if (c.kind === "unavailable")
    return <PageUnavailable title={c.message} href={`${c.base}/customers`} />;
  return (
    <MeasurementComparison
      owner={c.owner}
      bookPath={c.bookPath}
      api={`/api/workspaces/${p.tenant}/${p.location}/measurements/${p.customerId}/${p.wearerId}`}
    />
  );
}
