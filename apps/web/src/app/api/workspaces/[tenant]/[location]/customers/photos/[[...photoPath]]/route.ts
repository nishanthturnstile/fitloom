import { CustomerError, identityEnvironment } from "@fitloom/application";
import { customerPhotoService } from "@/server/customer-photos";
import { customerHttpError } from "@/server/customers";
import { mutation, privateJson, safeRoute } from "@/server/workspaces";
export const dynamic = "force-dynamic";
type Context = {
  params: Promise<{ tenant: string; location: string; photoPath?: string[] }>;
};
export const POST = (request: Request, context: Context) =>
  mutation(
    request,
    async (input) => {
      const p = await context.params,
        path = p.photoPath ?? [],
        target = { tenantId: p.tenant, locationId: p.location },
        service = customerPhotoService(request.headers);
      if (new URL(request.url).search)
        throw new CustomerError("validation", "Unexpected query");
      if (path.length === 1 && path[0] === "slot")
        return privateJson(await service.slot(target, input));
      if (path.length === 2 && path[0] === "commands")
        return privateJson(
          await service.command(`customer-photo.${path[1]}`, target, input),
        );
      throw new CustomerError("unavailable", "Photo route unavailable");
    },
    { errorAdapter: customerHttpError },
  );
export const PUT = (request: Request, context: Context) =>
  safeRoute(
    async () => {
      const { config } = identityEnvironment(process.env);
      if (
        ![
          new URL(config.baseURL).origin,
          ...config.trustedOrigins.map((v) => new URL(v).origin),
        ].includes(request.headers.get("origin") ?? "")
      )
        throw new CustomerError("denied", "Origin denied");
      const p = await context.params,
        path = p.photoPath ?? [];
      if (
        path.length !== 2 ||
        path[0] !== "uploads" ||
        new URL(request.url).search
      )
        throw new CustomerError("unavailable", "Photo route unavailable");
      return privateJson(
        await customerPhotoService(request.headers).upload(
          { tenantId: p.tenant, locationId: p.location },
          path[1],
          request,
        ),
      );
    },
    false,
    customerHttpError,
  );
export const GET = (request: Request, context: Context) =>
  safeRoute(
    async () => {
      const p = await context.params,
        path = p.photoPath ?? [];
      if (
        path.length !== 2 ||
        path[0] !== "files" ||
        new URL(request.url).search
      )
        throw new CustomerError("unavailable", "Photo route unavailable");
      return customerPhotoService(request.headers).read(
        { tenantId: p.tenant, locationId: p.location },
        path[1],
      );
    },
    false,
    customerHttpError,
  );
