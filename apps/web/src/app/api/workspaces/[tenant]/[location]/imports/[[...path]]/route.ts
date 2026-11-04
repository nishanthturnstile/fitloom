import { ImportError, importTemplate } from "@fitloom/application";
import * as c from "@fitloom/application/import-contracts";
import { measurementSchemaRef } from "@fitloom/application/measurement-contracts";
import { z } from "zod";
import { domainImportService, importHttpError } from "@/server/domain-imports";
import { mutation, privateJson } from "@/server/workspaces";
export const dynamic = "force-dynamic";
type Context = {
  params: Promise<{ tenant: string; location: string; path?: string[] }>;
};
const batch = z.strictObject({
  batchId: c.importBatchId,
  offset: z.int().min(0).max(100000).default(0),
});
export async function POST(request: Request, context: Context) {
  const p = await context.params,
    path = p.path ?? [],
    target = { tenantId: p.tenant, locationId: p.location };
  return mutation(
    request,
    async (input) => {
      if (new URL(request.url).searchParams.size)
        throw new ImportError("validation", "Unexpected query parameters");
      const service = domainImportService(request.headers);
      if (path.length === 1 && path[0] === "recover")
        return privateJson(await service.recover(target, input));
      const f = c.importFamily.safeParse(path[0]);
      if (!f.success)
        throw new ImportError("unavailable", "Import route unavailable");
      const family = f.data;
      if (path.length === 2 && path[1] === "batches") {
        const q = z
          .strictObject({ offset: z.int().min(0).max(100000).default(0) })
          .parse(input);
        return privateJson(await service.batches(family, target, q.offset));
      }
      await service.access(family, target);
      if (
        path.length === 3 &&
        path[1] === "commands" &&
        ["preview", "decide", "cancel"].includes(path[2] ?? "")
      )
        return privateJson(
          await service.command(
            `${family === "customers" ? "customer-import" : "measurement-import"}.${path[2]}`,
            target,
            input,
          ),
        );
      if (path.length === 2 && path[1] === "status") {
        const q = batch.parse(input);
        return privateJson(
          await service.status(family, target, q.batchId, q.offset),
        );
      }
      if (path.length === 2 && path[1] === "chunk") {
        const q = c.importBatchRequest.parse(input);
        return privateJson(await service.chunk(family, target, q.batchId));
      }
      if (path.length === 2 && path[1] === "outcomes") {
        const q = c.importBatchRequest.parse(input);
        const response = privateJson(
          await service.outcomes(family, target, q.batchId),
        );
        response.headers.set(
          "Content-Disposition",
          'attachment; filename="fitloom-import-outcomes.json"',
        );
        return response;
      }
      if (
        family === "measurements" &&
        path.length === 2 &&
        path[1] === "schemas"
      )
        return privateJson(await service.schemas(target, input));
      if (
        family === "measurements" &&
        path.length === 2 &&
        path[1] === "manifest"
      )
        return privateJson(await service.manifest(target, input));
      if (
        family === "measurements" &&
        path.length === 2 &&
        path[1] === "owner-mapping"
      )
        return privateJson(await service.ownerMapping(target, input));
      if (path.length === 2 && path[1] === "template") {
        const manifest =
          family === "measurements"
            ? await service.manifest(
                target,
                z
                  .strictObject({
                    schemaKey: c.importSourceId,
                    schemaRef: measurementSchemaRef,
                  })
                  .parse(input),
              )
            : null;
        if (family === "customers") z.strictObject({}).parse(input);
        return new Response(importTemplate(family, manifest ?? undefined), {
          headers: {
            "Content-Type": "text/csv; charset=utf-8",
            "Content-Disposition": `attachment; filename="fitloom-${family}-v1.csv"`,
            "Cache-Control": "private, no-store",
            "X-Content-Type-Options": "nosniff",
          },
        });
      }
      throw new ImportError("unavailable", "Import route unavailable");
    },
    {
      bodyLimit:
        path[1] === "commands" &&
        (path[2] === "preview" || path[2] === "decide")
          ? "import-preview"
          : "measurement",
      errorAdapter: importHttpError,
    },
  );
}
