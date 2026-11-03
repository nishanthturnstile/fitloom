import { updateWorkspace } from "@fitloom/application";
import {
  invocation,
  mutation,
  pageJson,
  privateJson,
  safeRoute,
  workspaceService,
} from "@/server/workspaces";
export const dynamic = "force-dynamic";
type Context = { params: Promise<{ tenant: string; location: string }> };
export const GET = (request: Request, context: Context) =>
  safeRoute(async () => {
    const p = await context.params;
    const service = workspaceService(request.headers);
    const target = { tenantId: p.tenant, locationId: p.location };
    return new URL(request.url).searchParams.get("view") === "all"
      ? pageJson(
          await service.allLocationsPage(
            target,
            new URL(request.url).searchParams.get("offset") ?? 0,
          ),
        )
      : privateJson(await service.view(target));
  });
export const PATCH = (request: Request, context: Context) =>
  mutation(request, async (input) => {
    const p = await context.params;
    return privateJson(
      await workspaceService(request.headers).execute(
        updateWorkspace,
        invocation(input, {
          kind: "tenant",
          tenantId: p.tenant,
          locationId: p.location,
        }),
      ),
    );
  });
