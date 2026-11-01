import { beginFile } from "@fitloom/application";
import { fileService } from "@/server/files";
import {
  invocation,
  mutation,
  pageJson,
  privateJson,
  safeRoute,
} from "@/server/workspaces";

type Context = { params: Promise<{ tenant: string; location: string }> };
export const GET = (request: Request, context: Context) =>
  safeRoute(async () => {
    const p = await context.params;
    return pageJson(
      await fileService(request.headers).page(
        { tenantId: p.tenant, locationId: p.location },
        new URL(request.url).searchParams.get("offset") ?? 0,
      ),
    );
  });
export const POST = (request: Request, context: Context) =>
  mutation(request, async (input) => {
    const p = await context.params;
    return privateJson(
      await fileService(request.headers).execute(
        beginFile,
        invocation(input, {
          kind: "tenant",
          tenantId: p.tenant,
          locationId: p.location,
        }),
      ),
    );
  });
