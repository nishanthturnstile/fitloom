import { identityService } from "@/server/identity";
import { pageJson, safeRoute } from "@/server/workspaces";
export const GET = (request: Request) =>
  safeRoute(async () => {
    const search = new URL(request.url).searchParams;
    return pageJson(
      await identityService().operatorTenantPage(
        request.headers,
        search.get("query") ?? "",
        search.get("offset") ?? 0,
      ),
    );
  });
