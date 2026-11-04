import "server-only";
import { MeasurementError } from "@fitloom/application";
import { measurementService } from "./measurements";
import { workspacePageContext } from "./workspace-page-context";
export type MeasurementPageParams = {
  tenant: string;
  location: string;
  customerId: string;
  wearerId: string;
};
export async function measurementPageContext(
  p: MeasurementPageParams,
  entry = false,
) {
  const base = `/workspaces/${p.tenant}/${p.location}`,
    workspace = await workspacePageContext(p.tenant, p.location);
  const unavailable = {
    kind: "unavailable",
    base,
    message: "Measurement access is unavailable.",
  } as const;
  if (
    workspace.kind === "unavailable" ||
    !workspace.workspace.permissions.includes("measurements.read")
  )
    return unavailable;
  const service = measurementService(workspace.h);
  try {
    const owner = await service.context(workspace.target, {
      customerId: p.customerId,
      wearerId: p.wearerId,
      purpose: entry ? "entry" : "view",
    });
    return {
      kind: "ready",
      base,
      bookPath: `${base}/customers/${p.customerId}/wearers/${p.wearerId}/measurements`,
      owner,
      service,
      target: workspace.target,
      scope: { ...workspace.target, principalId: workspace.principalId },
    } as const;
  } catch (error) {
    return {
      ...unavailable,
      message:
        entry &&
        error instanceof MeasurementError &&
        error.code === "version-conflict"
          ? "Restore the customer and wearer before adding measurements."
          : error instanceof MeasurementError
            ? error.message
            : unavailable.message,
    };
  }
}
