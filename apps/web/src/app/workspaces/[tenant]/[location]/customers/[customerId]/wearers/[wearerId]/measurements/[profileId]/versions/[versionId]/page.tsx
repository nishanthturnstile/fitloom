import { customerReturnToken } from "@fitloom/application/customer-contracts";
import { MeasurementDetail } from "@/components/measurements/measurement-detail";
import { PageUnavailable } from "@/components/workspace/page-unavailable";
import {
  type MeasurementPageParams,
  measurementPageContext,
} from "@/server/measurement-page-context";
export const metadata = { title: "Saved measurement version | Fitloom" };
export default async function Detail({
  params,
  searchParams,
}: {
  params: Promise<
    MeasurementPageParams & { profileId: string; versionId?: string }
  >;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [p, q] = await Promise.all([params, searchParams]),
    c = await measurementPageContext(p);
  if (c.kind === "unavailable")
    return <PageUnavailable title={c.message} href={`${c.base}/customers`} />;
  let data: Awaited<ReturnType<typeof c.service.detail>>;
  try {
    data = await c.service.detail(c.target, {
      customerId: p.customerId,
      wearerId: p.wearerId,
      profileId: p.profileId,
      ...(p.versionId ? { versionId: p.versionId } : {}),
    });
  } catch {
    return (
      <PageUnavailable
        title="This measurement version is unavailable."
        href={c.bookPath}
      />
    );
  }
  const token = customerReturnToken.safeParse(q.return);
  return (
    <MeasurementDetail
      data={data}
      owner={c.owner}
      bookPath={c.bookPath}
      api={`/api/workspaces/${p.tenant}/${p.location}/measurements/${p.customerId}/${p.wearerId}`}
      returnToken={token.success ? token.data : null}
    />
  );
}
