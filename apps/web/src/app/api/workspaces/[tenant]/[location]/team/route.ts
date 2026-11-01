import { privateJson, safeRoute, workspaceService } from "@/server/workspaces";
export const dynamic = "force-dynamic";
export const GET = (
  request: Request,
  context: { params: Promise<{ tenant: string; location: string }> },
) =>
  safeRoute(async () => {
    const p = await context.params;
    return privateJson(
      await workspaceService(request.headers).team(
        { tenantId: p.tenant, locationId: p.location },
        new URL(request.url).searchParams.get("offset") ?? 0,
      ),
    );
  });
