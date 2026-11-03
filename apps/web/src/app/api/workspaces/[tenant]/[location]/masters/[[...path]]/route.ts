import { randomUUID } from "node:crypto";
import { MasterError } from "@fitloom/application";
import {
  masterEmptyQuery,
  masterHistoryQuery,
  masterKindFromResource,
  masterPageQuery,
} from "@fitloom/application/master-contracts";
import { masterService } from "@/server/masters";
import { mutation, privateJson, safeRoute } from "@/server/workspaces";
export const dynamic = "force-dynamic";
const notFound = () =>
  privateJson(
    {
      message: "Unknown master route",
      category: "validation",
      correlationId: randomUUID(),
    },
    404,
  );
type Context = {
  params: Promise<{ tenant: string; location: string; path?: string[] }>;
};
function query(request: Request) {
  const result = Object.create(null) as Record<string, string>;
  for (const [key, value] of new URL(request.url).searchParams) {
    // Zod can mistake this inherited name for a shape key instead of rejecting it.
    if (key === "__proto__")
      throw new MasterError("validation", "Invalid query key");
    if (Object.hasOwn(result, key))
      throw new MasterError("validation", "Duplicate query key");
    result[key] = value;
  }
  return result;
}
function check(
  schema: { safeParse: (input: unknown) => { success: boolean } },
  input: unknown,
) {
  if (!schema.safeParse(input).success)
    throw new MasterError("validation", "Invalid query");
  return input;
}
const empty = masterEmptyQuery,
  history = masterHistoryQuery;
export const GET = (request: Request, context: Context) =>
  safeRoute(async () => {
    const p = await context.params;
    const path = p.path ?? [];
    const target = { tenantId: p.tenant, locationId: p.location };
    const service = masterService(request.headers);
    const filters = query(request);
    if (path.length === 1 && path[0] === "catalog") {
      check(empty, filters);
      return privateJson(await service.catalog(target));
    }
    const selectedKind = masterKindFromResource(path[0]);
    if (!selectedKind) return notFound();
    if (path.length === 1)
      return privateJson(
        await service.page(
          target,
          selectedKind,
          check(masterPageQuery, filters),
        ),
      );
    const id = path[1];
    if (path.length === 3 && path[2] === "versions")
      return privateJson(
        await service.history(
          target,
          selectedKind,
          id,
          check(history, filters),
        ),
      );
    const exact = path.length === 4 && path[2] === "versions";
    if (path.length !== 2 && !exact) return notFound();
    check(empty, filters);
    const version = exact ? path[3] : null;
    switch (selectedKind) {
      case "garment":
        return privateJson(await service.garment(target, id, version));
      case "service":
        return privateJson(await service.service(target, id, version));
      case "addon":
        return privateJson(await service.addon(target, id, version));
    }
  }, true);
export const POST = async (request: Request, context: Context) => {
  const p = await context.params;
  const path = p.path ?? [];
  const large =
    path.length === 2 &&
    path[0] === "commands" &&
    (path[1] === "garment.save" || path[1] === "masters.starters.install");
  return mutation(
    request,
    async (input) => {
      check(empty, query(request));
      if (path.length !== 2 || path[0] !== "commands") return notFound();
      return privateJson(
        await masterService(request.headers).command(
          path[1],
          { tenantId: p.tenant, locationId: p.location },
          input,
        ),
      );
    },
    {
      ...(large ? { bodyLimit: "master-definition" } : {}),
      masterErrors: true,
    },
  );
};
