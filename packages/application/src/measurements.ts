import { randomUUID } from "node:crypto";
import {
  type createPool,
  type TransactionDatabase,
  withScope,
} from "@fitloom/db";
import { sql } from "drizzle-orm";
import { z } from "zod";
import {
  type Command,
  createCommandExecutor,
  type Identity,
} from "./commands.js";
import { databaseValue as value } from "./database-value.js";
import { CommandError, sqlState } from "./errors.js";
import * as c from "./measurement-contracts.js";
import {
  compareMeasurements,
  projectMeasurementTrend,
} from "./measurement-reuse.js";
import type { Observe } from "./operations.js";
import { workspaceTarget } from "./workspace-contracts.js";

type Code = z.infer<typeof c.measurementErrorCode>;
type Issue = z.infer<typeof c.measurementIssue>;
type Result = z.infer<typeof c.measurementResult>;
export class MeasurementError extends CommandError {
  readonly code: Code;
  readonly issues: Issue[];
  readonly correlationId: string;
  constructor(
    code: Code,
    message: string,
    issues: Issue[] = [],
    correlationId: string = randomUUID(),
  ) {
    super(
      code === "validation" || code.startsWith("body-")
        ? "validation"
        : code === "denied" ||
            code === "unavailable" ||
            code === "session-expired"
          ? "access"
          : [
                "version-conflict",
                "operation-conflict",
                "schema-stale",
                "busy",
              ].includes(code)
            ? "conflict"
            : "temporary",
      message,
    );
    this.code = code;
    this.issues = issues;
    this.correlationId = correlationId;
  }
}
function parse<T extends z.ZodType>(schema: T, raw: unknown): z.infer<T> {
  const result = schema.safeParse(raw);
  if (result.success) return result.data;
  const issues = result.error.issues.slice(0, 30).flatMap((issue) => {
    const parsed = c.measurementIssue.safeParse({
      path: issue.path.slice(0, 8),
      message: "Check this field",
    });
    return parsed.success ? [parsed.data] : [];
  });
  throw new MeasurementError("validation", "Check measurement details", issues);
}
function databaseIssues(error: unknown, depth = 0): Issue[] {
  if (!(error instanceof Error) || depth > 8) return [];
  if (
    "detail" in error &&
    typeof error.detail === "string" &&
    error.detail.length <= 8192
  ) {
    try {
      const parsed = z
        .object({ issues: z.array(c.measurementIssue).max(30) })
        .safeParse(JSON.parse(error.detail));
      if (parsed.success) return parsed.data.issues;
    } catch {
      /* Never expose driver details. */
    }
  }
  return databaseIssues(error.cause, depth + 1);
}
export function measurementDatabaseError(error: unknown): MeasurementError {
  if (error instanceof MeasurementError) return error;
  const state = sqlState(error);
  switch (state) {
    case "FM001":
    case "FC002":
      return new MeasurementError(
        "unavailable",
        "Measurement or owner unavailable",
      );
    case "FM002":
      return new MeasurementError(
        "version-conflict",
        "This record changed. Reload before editing.",
      );
    case "FM003":
      return new MeasurementError(
        "schema-stale",
        "The measurement schema changed. Review the current schema.",
      );
    case "FM004":
      return new MeasurementError(
        "validation",
        "Check measurement details",
        databaseIssues(error),
      );
    case "FM005":
    case "FC007":
    case "P0002":
    case "P0003":
    case "23505":
      return new MeasurementError(
        "operation-conflict",
        "Operation input or identity conflict",
      );
    case "FM006":
      return new MeasurementError(
        "configuration-unavailable",
        "Shop timezone configuration unavailable",
      );
    case "55P03":
    case "FC001":
      return new MeasurementError(
        "busy",
        "Measurement is busy. Retry the same save.",
      );
    case "42501":
      return new MeasurementError("denied", "Measurement access denied");
  }
  if (state?.startsWith("22") || state === "23514" || state === "23503")
    return new MeasurementError(
      "validation",
      "Check measurement details",
      databaseIssues(error),
    );
  if (error instanceof Error && error.message === "Database scope denied")
    return new MeasurementError("denied", "Measurement access denied");
  if (error instanceof CommandError)
    return new MeasurementError(
      error.category === "access"
        ? "denied"
        : error.category === "validation"
          ? "validation"
          : error.category === "conflict"
            ? "operation-conflict"
            : "temporary",
      error.message,
    );
  return new MeasurementError(
    "temporary",
    "Measurements unavailable. Try again.",
  );
}
function command(
  name: z.infer<typeof c.measurementCommandName>,
): Command<unknown, Result> {
  const lifecycle =
    name === "measurement.archive" || name === "measurement.restore";
  return {
    kind: name,
    input: c.measurementCommandPayloads[name],
    output: c.measurementResult,
    access: {
      kind: "tenant",
      permission: lifecycle ? "measurements.archive" : "measurements.manage",
      projection: "measurement",
    },
    authorize: async (db, _authority, payload) => {
      await db.execute(
        sql`SELECT app.measurement_admit(${!lifecycle},${lifecycle})`,
      );
      const parsed = c.measurementCommandPayloads[name].parse(payload);
      if ("photos" in parsed && parsed.photos.kind === "replace")
        await db.execute(sql`SELECT app.measurement_photo_admit(true)`);
    },
    mapError: measurementDatabaseError,
    async mutate(db, _authority, payload) {
      const result = await value(
        db,
        sql`SELECT app.measurement_mutate(${name},${JSON.stringify(payload)}::jsonb) AS value`,
        c.measurementResult,
      );
      return {
        result,
        audit: {
          entityKind: "measurement",
          entityId: result.profileId,
          reason: name,
          changedFields: result.changed
            ? [lifecycle ? "archived" : "content"]
            : [],
          previousVersion: result.changed
            ? result.revision - 1
            : result.revision,
          nextVersion: result.revision,
        },
        jobs: [],
      };
    },
  };
}
const commands = {
  "measurement.create": command("measurement.create"),
  "measurement.revise": command("measurement.revise"),
  "measurement.archive": command("measurement.archive"),
  "measurement.restore": command("measurement.restore"),
};
export function createMeasurementService(dependencies: {
  pool: ReturnType<typeof createPool>;
  resolveIdentity: () => Promise<Identity>;
  observe?: Observe;
}) {
  const execute = createCommandExecutor(dependencies);
  async function read<T>(
    target: unknown,
    run: (db: TransactionDatabase) => Promise<T>,
  ): Promise<T> {
    const scope = parse(workspaceTarget, target);
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      return await Promise.race([
        (async () => {
          const identity = await dependencies.resolveIdentity();
          return withScope(
            dependencies.pool,
            { kind: "tenant", ...scope, principalId: identity.principalId },
            run,
          );
        })(),
        new Promise<never>((_resolve, reject) => {
          timer = setTimeout(
            () =>
              reject(
                new MeasurementError("temporary", "Measurement read timed out"),
              ),
            15000,
          );
        }),
      ]);
    } catch (error) {
      throw measurementDatabaseError(error);
    } finally {
      clearTimeout(timer);
    }
  }
  return {
    context(target: unknown, query: unknown) {
      const q = parse(c.measurementContextQuery, query);
      return read(target, (db) =>
        value(
          db,
          sql`SELECT app.measurement_context(${q.customerId}::uuid,${q.wearerId}::uuid,${q.purpose === "entry"}) AS value`,
          c.measurementContext,
        ),
      );
    },
    bookGarments(target: unknown, query: unknown) {
      const { customerId, wearerId, ...q } = parse(
        c.measurementGarmentQuery,
        query,
      );
      return read(target, (db) =>
        value(
          db,
          sql`SELECT app.measurement_book_garments(${customerId}::uuid,${wearerId}::uuid,${JSON.stringify(q)}::jsonb) AS value`,
          c.measurementGarments,
        ),
      );
    },
    garments(target: unknown, query: unknown) {
      const { customerId, wearerId, ...q } = parse(
        c.measurementGarmentQuery,
        query,
      );
      return read(target, (db) =>
        value(
          db,
          sql`SELECT app.measurement_garments(${customerId}::uuid,${wearerId}::uuid,${JSON.stringify(q)}::jsonb) AS value`,
          c.measurementGarments,
        ),
      );
    },
    currentIntake(target: unknown, query: unknown) {
      const q = parse(c.measurementCurrentIntakeQuery, query);
      return read(target, (db) =>
        value(
          db,
          sql`SELECT app.measurement_current_intake(${q.customerId}::uuid,${q.wearerId}::uuid,${JSON.stringify(q.schemaRef)}::jsonb) AS value`,
          c.measurementCurrentIntake,
        ),
      );
    },
    compare(target: unknown, query: unknown) {
      const q = parse(c.measurementCompareQuery, query);
      return read(target, async (db) =>
        compareMeasurements(
          await value(
            db,
            sql`SELECT app.measurement_compare_sources(${q.customerId}::uuid,${q.wearerId}::uuid,${JSON.stringify(q.versions)}::jsonb) AS value`,
            z.array(c.measurementDetail).min(2).max(4),
          ),
          q.unit,
        ),
      );
    },
    trend(target: unknown, query: unknown) {
      const { customerId, wearerId, profileId, ...q } = parse(
        c.measurementTrendQuery,
        query,
      );
      return read(target, async (db) =>
        projectMeasurementTrend(
          await value(
            db,
            sql`SELECT app.measurement_trend(${customerId}::uuid,${wearerId}::uuid,${profileId}::uuid,${JSON.stringify(q)}::jsonb) AS value`,
            c.measurementTrendRaw,
          ),
          q.unit,
        ),
      );
    },
    capture(target: unknown, query: unknown) {
      const q = parse(c.measurementCaptureQuery, query);
      return read(target, (db) =>
        value(
          db,
          sql`SELECT app.measurement_capture(${q.customerId}::uuid,${q.wearerId}::uuid,${q.profileId}::uuid,${q.versionId}::uuid) AS value`,
          c.measurementCapture,
        ),
      );
    },
    bodySchema: (target: unknown) =>
      read(target, (db) =>
        value(
          db,
          sql`SELECT app.measurement_body_current() AS value`,
          c.measurementSchemaRef,
        ),
      ),
    intakeSchema(target: unknown, ref: unknown) {
      const parsed = parse(c.measurementSchemaRef, ref);
      return read(target, (db) =>
        value(
          db,
          sql`SELECT app.measurement_intake(${JSON.stringify(parsed)}::jsonb,false) AS value`,
          c.measurementSchema,
        ),
      );
    },
    detail(target: unknown, query: unknown) {
      const q = parse(c.measurementExactQuery, query);
      return read(target, (db) =>
        value(
          db,
          sql`SELECT app.measurement_detail(${q.customerId}::uuid,${q.wearerId}::uuid,${q.profileId}::uuid,${q.versionId}::uuid) AS value`,
          c.measurementDetail,
        ),
      );
    },
    history(target: unknown, query: unknown) {
      const q = parse(c.measurementHistoryQuery, query);
      return read(target, (db) =>
        value(
          db,
          sql`SELECT app.measurement_history(${q.customerId}::uuid,${q.wearerId}::uuid,${q.profileId}::uuid,${q.beforeSequence}::integer,${q.limit}) AS value`,
          c.measurementHistory,
        ),
      );
    },
    book(target: unknown, query: unknown) {
      const { customerId, wearerId, ...q } = parse(
        c.measurementBookQuery,
        query,
      );
      return read(target, (db) =>
        value(
          db,
          sql`SELECT app.measurement_book(${customerId}::uuid,${wearerId}::uuid,${JSON.stringify(q)}::jsonb) AS value`,
          c.measurementBook,
        ),
      );
    },
    async command(name: unknown, target: unknown, invocation: unknown) {
      const selected = parse(c.measurementCommandName, name),
        scope = parse(workspaceTarget, target),
        request = parse(
          c.measurementInvocation(c.measurementCommandPayloads[selected]),
          invocation,
        );
      if (
        Buffer.byteLength(JSON.stringify(request), "utf8") >
        c.MEASUREMENT_REQUEST_BYTES
      )
        throw new MeasurementError(
          "validation",
          "Measurement request too large",
          [],
          request.correlationId,
        );
      try {
        return await execute(commands[selected], {
          ...request,
          scope: { kind: "tenant", ...scope },
        });
      } catch (error) {
        const mapped = measurementDatabaseError(error);
        throw new MeasurementError(
          mapped.code,
          mapped.message,
          mapped.issues,
          request.correlationId,
        );
      }
    },
  };
}
