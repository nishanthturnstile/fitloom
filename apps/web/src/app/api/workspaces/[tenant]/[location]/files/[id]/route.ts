import { CommandError, identityEnvironment } from "@fitloom/application";
import { fileService } from "@/server/files";
import { privateJson, safeRoute } from "@/server/workspaces";

type Context = {
  params: Promise<{ tenant: string; location: string; id: string }>;
};
export const GET = (request: Request, context: Context) =>
  safeRoute(async () => {
    const p = await context.params;
    return fileService(request.headers).download(
      { tenantId: p.tenant, locationId: p.location },
      p.id,
    );
  });
export const PUT = (request: Request, context: Context) =>
  safeRoute(async () => {
    const { config } = identityEnvironment(process.env);
    if (
      ![
        new URL(config.baseURL).origin,
        ...config.trustedOrigins.map((v) => new URL(v).origin),
      ].includes(request.headers.get("origin") ?? "")
    )
      throw new CommandError("access", "Origin denied");
    const p = await context.params;
    return privateJson(
      await fileService(request.headers).upload(
        { tenantId: p.tenant, locationId: p.location },
        p.id,
        request,
      ),
    );
  });
