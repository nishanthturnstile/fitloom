import { identityEnvironment, MeasurementError } from "@fitloom/application";
import {
  measurementCardCommandName,
  measurementCardListQuery,
  measurementCardPreviewQuery,
} from "@fitloom/application/measurement-card-contracts";
import {
  measurementBookFilters,
  measurementCommandName,
  measurementCompareFilters,
  measurementContextQuery,
  measurementGarmentFilters,
  measurementHistoryFilters,
  measurementSchemaRef,
  measurementTrendFilters,
} from "@fitloom/application/measurement-contracts";
import { measurementPhotoCommandName } from "@fitloom/application/measurement-photo-contracts";
import { measurementCardService } from "@/server/measurement-cards";
import { measurementPhotoService } from "@/server/measurement-photos";
import {
  measurementHttpError,
  measurementService,
} from "@/server/measurements";
import { mutation, privateJson, safeRoute } from "@/server/workspaces";
export const dynamic = "force-dynamic";
type Context = {
  params: Promise<{ tenant: string; location: string; path?: string[] }>;
};
function noQuery(request: Request) {
  if (new URL(request.url).searchParams.size)
    throw new MeasurementError("validation", "Unexpected query parameters");
}
function parse<T>(schema: { parse: (value: unknown) => T }, input: unknown): T {
  try {
    return schema.parse(input);
  } catch {
    throw new MeasurementError("validation", "Check measurement request");
  }
}
export const GET = (request: Request, context: Context) =>
  safeRoute(
    async () => {
      noQuery(request);
      const p = await context.params,
        path = p.path ?? [],
        target = { tenantId: p.tenant, locationId: p.location },
        service = measurementService(request.headers);
      const owner = { customerId: path[0], wearerId: path[1] };
      if (path.length === 7 && path[3] === "versions" && path[5] === "photos")
        return measurementPhotoService(request.headers).read(target, {
          ...owner,
          profileId: path[2],
          versionId: path[4],
          fileId: path[6],
        });
      if (path.length === 2)
        return privateJson(await service.context(target, owner));
      if (path.length === 3)
        return privateJson(
          await service.detail(target, { ...owner, profileId: path[2] }),
        );
      if (path.length === 6 && path[3] === "versions" && path[5] === "capture")
        return privateJson(
          await service.capture(target, {
            ...owner,
            profileId: path[2],
            versionId: path[4],
          }),
        );
      if (path.length === 5 && path[3] === "versions")
        return privateJson(
          await service.detail(target, {
            ...owner,
            profileId: path[2],
            versionId: path[4],
          }),
        );
      throw new MeasurementError(
        "unavailable",
        "Measurement route unavailable",
      );
    },
    false,
    measurementHttpError,
  );
export const POST = async (request: Request, context: Context) => {
  const p = await context.params,
    path = p.path ?? [],
    target = { tenantId: p.tenant, locationId: p.location };
  return mutation(
    request,
    async (input) => {
      noQuery(request);
      const service = measurementService(request.headers),
        owner = { customerId: path[0], wearerId: path[1] };
      if (
        path.length === 2 &&
        path[0] === "commands" &&
        measurementCardCommandName.safeParse(path[1]).success
      )
        return privateJson(
          await measurementCardService(request.headers).command(
            path[1],
            target,
            input,
          ),
        );
      if (path.length === 3 && path[2] === "cards")
        return privateJson(
          await measurementCardService(request.headers).list(target, {
            ...parse(
              measurementCardListQuery.omit({
                customerId: true,
                wearerId: true,
              }),
              input,
            ),
            ...owner,
          }),
        );
      if (path.length === 3 && path[2] === "card-preview")
        return privateJson(
          await measurementCardService(request.headers).preview(target, {
            ...parse(
              measurementCardPreviewQuery.omit({
                customerId: true,
                wearerId: true,
              }),
              input,
            ),
            ...owner,
          }),
        );
      if (
        path.length === 2 &&
        path[0] === "commands" &&
        measurementPhotoCommandName.safeParse(path[1]).success
      )
        return privateJson(
          await measurementPhotoService(request.headers).command(
            path[1],
            target,
            input,
          ),
        );
      if (
        path.length === 2 &&
        path[0] === "commands" &&
        measurementCommandName.safeParse(path[1]).success
      )
        return privateJson(await service.command(path[1], target, input));
      if (path.length === 3 && path[2] === "compare")
        return privateJson(
          await service.compare(target, {
            ...parse(measurementCompareFilters, input),
            ...owner,
          }),
        );
      if (path.length === 4 && path[3] === "trend")
        return privateJson(
          await service.trend(target, {
            ...parse(measurementTrendFilters, input),
            ...owner,
            profileId: path[2],
          }),
        );
      if (path.length === 3 && path[2] === "book")
        return privateJson(
          await service.book(target, {
            ...parse(measurementBookFilters, input),
            ...owner,
          }),
        );
      if (path.length === 3 && path[2] === "book-garments")
        return privateJson(
          await service.bookGarments(target, {
            ...parse(measurementGarmentFilters, input),
            ...owner,
          }),
        );
      if (path.length === 3 && path[2] === "garments")
        return privateJson(
          await service.garments(target, {
            ...parse(measurementGarmentFilters, input),
            ...owner,
          }),
        );
      if (path.length === 3 && path[2] === "entry") {
        const empty = parse(
          measurementContextQuery.pick({ purpose: true }),
          input,
        );
        return privateJson(
          await service.context(target, {
            ...owner,
            ...empty,
            purpose: "entry",
          }),
        );
      }
      if (path.length === 3 && path[2] === "current-intake") {
        return privateJson(
          await service.currentIntake(target, {
            ...owner,
            schemaRef: parse(measurementSchemaRef, input),
          }),
        );
      }
      if (path.length === 3 && path[2] === "intake") {
        const ref = parse(measurementSchemaRef, input);
        await service.context(target, owner);
        return privateJson(await service.intakeSchema(target, ref));
      }
      if (path.length === 4 && path[3] === "history")
        return privateJson(
          await service.history(target, {
            ...parse(measurementHistoryFilters, input),
            ...owner,
            profileId: path[2],
          }),
        );
      throw new MeasurementError(
        "unavailable",
        "Measurement route unavailable",
      );
    },
    {
      ...(path.length === 2 && path[0] === "commands"
        ? { bodyLimit: "measurement" }
        : {}),
      errorAdapter: measurementHttpError,
    },
  );
};

export const PUT = (request: Request, context: Context) =>
  safeRoute(
    async () => {
      const { config } = identityEnvironment(process.env);
      if (
        ![
          new URL(config.baseURL).origin,
          ...config.trustedOrigins.map((value) => new URL(value).origin),
        ].includes(request.headers.get("origin") ?? "")
      )
        throw new MeasurementError("denied", "Origin denied");
      noQuery(request);
      const p = await context.params,
        path = p.path ?? [];
      if (path.length !== 3 || path[0] !== "photos" || path[1] !== "uploads")
        throw new MeasurementError("unavailable", "Photo route unavailable");
      return privateJson(
        await measurementPhotoService(request.headers).upload(
          { tenantId: p.tenant, locationId: p.location },
          path[2],
          request,
        ),
      );
    },
    false,
    measurementHttpError,
  );
