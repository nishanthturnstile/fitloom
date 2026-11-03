import { pageJson, safeRoute, workspaceService } from "@/server/workspaces";
export const dynamic = "force-dynamic";
export const GET = (request: Request) =>
  safeRoute(async () =>
    pageJson(
      await workspaceService(request.headers).choicePage(
        new URL(request.url).searchParams.get("offset") ?? 0,
      ),
    ),
  );
