import { CustomerError } from "@fitloom/application";
import {
  customerCommandName,
  customerContinuationQuery,
  customerDirectoryQuery,
} from "@fitloom/application/customer-contracts";
import { customerHttpError, customerService } from "@/server/customers";
import { mutation, privateJson, safeRoute } from "@/server/workspaces";
export const dynamic = "force-dynamic";
type Context = {
  params: Promise<{ tenant: string; location: string; path?: string[] }>;
};
function query(request: Request) {
  const result: Record<string, string> = {};
  for (const [key, value] of new URL(request.url).searchParams) {
    if (key in result)
      throw new CustomerError("validation", "Invalid or duplicate query key");
    result[key] = value;
  }
  return result;
}
function filters<T>(
  schema: { safeParse: (input: unknown) => { success: boolean; data?: T } },
  input: unknown,
): T {
  const result = schema.safeParse(input);
  if (!result.success || result.data === undefined)
    throw new CustomerError("validation", "Invalid query");
  return result.data;
}
export const GET = (request: Request, context: Context) =>
  safeRoute(
    async () => {
      const p = await context.params,
        path = p.path ?? [],
        target = { tenantId: p.tenant, locationId: p.location };
      const service = customerService(request.headers),
        q = query(request);
      if (path.length === 0)
        return privateJson(
          await service.page(target, filters(customerDirectoryQuery, q)),
        );
      if (path.length === 1) {
        if (Object.keys(q).length)
          throw new CustomerError("validation", "Unexpected query");
        return privateJson(await service.detail(target, path[0]));
      }
      if (
        path.length === 2 &&
        (path[1] === "wearers" || path[1] === "activity")
      ) {
        const selected = filters(customerContinuationQuery, q);
        return privateJson(await service[path[1]](target, path[0], selected));
      }
      throw new CustomerError("unavailable", "Customer route unavailable");
    },
    false,
    customerHttpError,
  );
export const POST = async (request: Request, context: Context) => {
  const p = await context.params,
    path = p.path ?? [],
    target = { tenantId: p.tenant, locationId: p.location };
  const profile =
    path.length === 2 &&
    path[0] === "commands" &&
    [
      "customer.create",
      "customer.update",
      "wearer.create",
      "wearer.update",
    ].includes(path[1] ?? "");
  return mutation(
    request,
    async (input) => {
      if (Object.keys(query(request)).length)
        throw new CustomerError("validation", "Unexpected query");
      const service = customerService(request.headers);
      if (path.length === 1 && path[0] === "search")
        return privateJson(await service.page(target, input));
      if (path.length === 1 && path[0] === "duplicate-check")
        return privateJson(await service.duplicateCheck(target, input));
      if (path.length === 3 && path[0] === "reviews" && path[2] === "read") {
        if (
          input === null ||
          typeof input !== "object" ||
          Array.isArray(input) ||
          Object.keys(input).length
        )
          throw new CustomerError("validation", "Unexpected review input");
        const response = await service.review(target, path[1]);
        return privateJson(response, response.outcome === "saved" ? 200 : 409);
      }
      if (
        path.length === 2 &&
        path[0] === "commands" &&
        customerCommandName.safeParse(path[1]).success
      ) {
        const response = await service.command(path[1], target, input);
        return privateJson(response, response.outcome === "saved" ? 200 : 409);
      }
      throw new CustomerError("unavailable", "Customer route unavailable");
    },
    {
      ...(profile ? { bodyLimit: "customer-profile" as const } : {}),
      errorAdapter: customerHttpError,
    },
  );
};
