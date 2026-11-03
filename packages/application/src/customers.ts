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
import * as c from "./customer-contracts.js";
import { canonicalCustomerPhone } from "./customer-phone.js";
import { CommandError, sqlState } from "./errors.js";
import type { Observe } from "./operations.js";
import { workspaceTarget } from "./workspace-contracts.js";

type Code = z.infer<typeof c.customerErrorCode>;
type Issue = z.infer<typeof c.customerIssue>;
type Result = z.infer<typeof c.customerDurableResult>;
export class CustomerError extends CommandError {
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
        : ["session-expired", "denied", "unavailable"].includes(code)
          ? "access"
          : ["busy", "version-conflict", "operation-conflict"].includes(code)
            ? "conflict"
            : "temporary",
      message,
    );
    this.code = code;
    this.issues = issues;
    this.correlationId = correlationId;
  }
}
class ReviewError extends CustomerError {
  readonly outcome: "review-expired" | "review-stale";
  constructor(outcome: "review-expired" | "review-stale") {
    super("operation-conflict", "Check duplicate customers again");
    this.outcome = outcome;
  }
}
function parse<T extends z.ZodType>(schema: T, raw: unknown): z.infer<T> {
  const result = schema.safeParse(raw);
  if (result.success) return result.data;
  const issues: Issue[] = [];
  for (const issue of result.error.issues.slice(0, 20)) {
    const safe = c.customerIssue.safeParse({
      path: issue.path.slice(0, 12),
      message: "Check this field",
    });
    if (safe.success) issues.push(safe.data);
  }
  throw new CustomerError("validation", "Check customer details", issues);
}
function databaseIssues(error: unknown, depth = 0): Issue[] {
  if (!(error instanceof Error) || depth > 8) return [];
  if (
    "detail" in error &&
    typeof error.detail === "string" &&
    error.detail.length <= 8192
  ) {
    try {
      const detail = z
        .object({
          issues: z
            .array(z.object({ path: z.array(z.unknown()).max(12) }))
            .max(20),
        })
        .safeParse(JSON.parse(error.detail));
      if (detail.success)
        return detail.data.issues.flatMap((issue) => {
          const safe = c.customerIssue.safeParse({
            path: issue.path,
            message: "Check this field",
          });
          return safe.success ? [safe.data] : [];
        });
    } catch {
      /* SQL/driver details never cross the boundary. */
    }
  }
  return databaseIssues(error.cause, depth + 1);
}
export function customerDatabaseError(error: unknown): CustomerError {
  if (error instanceof CustomerError) return error;
  switch (sqlState(error)) {
    case "FC001":
    case "55P03":
      return new CustomerError(
        "busy",
        "Customer is busy. Retry the same save.",
      );
    case "FC002":
      return new CustomerError("unavailable", "Customer or wearer unavailable");
    case "FC003":
      return new CustomerError(
        "version-conflict",
        "This record changed. Reload before editing.",
      );
    case "FC004":
      return new ReviewError("review-expired");
    case "FC005":
      return new ReviewError("review-stale");
    case "FC006":
      return new CustomerError(
        "rate-limit",
        "Too many duplicate checks. Try again shortly.",
      );
    case "FC007":
    case "P0002":
    case "P0003":
    case "23505":
      return new CustomerError(
        "operation-conflict",
        "Operation input or identity conflict",
      );
    case "42501":
      return new CustomerError("denied", "Customer access denied");
  }
  const state = sqlState(error);
  if (state?.startsWith("22") || state === "23514" || state === "23503")
    return new CustomerError(
      "validation",
      "Check customer details",
      databaseIssues(error),
    );
  if (error instanceof Error && error.message === "Database scope denied")
    return new CustomerError("denied", "Customer access denied");
  if (error instanceof CommandError)
    return new CustomerError(
      error.category === "access"
        ? "denied"
        : error.category === "validation"
          ? "validation"
          : error.category === "conflict"
            ? "operation-conflict"
            : "temporary",
      error.message,
    );
  return new CustomerError("temporary", "Customers unavailable. Try again.");
}
async function value<T extends z.ZodType>(
  db: TransactionDatabase,
  query: ReturnType<typeof sql>,
  schema: T,
): Promise<z.infer<T>> {
  const result = z
    .object({ rows: z.array(z.object({ value: z.unknown() })).length(1) })
    .parse(await db.execute(query));
  return schema.parse(result.rows[0]?.value);
}
function definition(
  name: z.infer<typeof c.customerCommandName>,
  input: z.ZodType,
): Command<unknown, Result> {
  const lifecycle = name.endsWith(".archive") || name.endsWith(".restore");
  return {
    kind: name,
    input,
    output: c.customerDurableResult,
    access: {
      kind: "tenant",
      permission: lifecycle ? "customers.archive" : "customers.manage",
      projection: "customer",
    },
    authorize: async (db) => {
      await db.execute(
        sql`SELECT app.customer_admit(${!lifecycle},${lifecycle})`,
      );
    },
    mapError: customerDatabaseError,
    async mutate(db, _authority, payload) {
      const result = await value(
        db,
        sql`SELECT app.customer_mutate(${name},${JSON.stringify(payload)}::jsonb) AS value`,
        c.customerDurableResult,
      );
      const review = result.kind === "review-required";
      const entityId =
        result.kind === "review-required"
          ? result.reviewId
          : result.kind === "wearer-saved"
            ? result.wearerId
            : result.customerId;
      const next = result.kind === "review-required" ? 0 : result.version;
      return {
        result,
        audit: {
          entityKind: review
            ? "customer_review"
            : name.startsWith("wearer.")
              ? "wearer"
              : "customer",
          entityId,
          reason: name,
          changedFields: !review && result.changed ? ["profile"] : [],
          previousVersion: !review && result.changed ? next - 1 : next,
          nextVersion: next,
        },
        jobs: [],
      };
    },
  };
}
const commands = {
  "customer.create": definition("customer.create", c.customerCreate),
  "customer.update": definition("customer.update", c.customerUpdate),
  "customer.archive": definition("customer.archive", c.customerLifecycle),
  "customer.restore": definition("customer.restore", c.customerLifecycle),
  "wearer.create": definition("wearer.create", c.wearerCreate),
  "wearer.update": definition("wearer.update", c.wearerUpdate),
  "wearer.archive": definition("wearer.archive", c.wearerLifecycle),
  "wearer.restore": definition("wearer.restore", c.wearerLifecycle),
};
const advisoryInput = z.strictObject({
  phone: canonicalCustomerPhone,
  customerId: c.customerId.nullable().default(null),
});
export const customerDuplicateCheck = z.strictObject({
  candidateCount: z.int().nonnegative(),
  candidates: z.array(c.duplicateCandidate).max(5),
});
async function readWithinDeadline<T>(pending: Promise<T>): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const expired = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(
      () =>
        reject(
          new CustomerError("temporary", "Customer read timed out. Try again."),
        ),
      15000,
    );
  });
  try {
    return await Promise.race([pending, expired]);
  } finally {
    clearTimeout(timer);
  }
}
export function createCustomerService(dependencies: {
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
    try {
      return await readWithinDeadline(
        (async () => {
          const identity = await dependencies.resolveIdentity();
          return withScope(
            dependencies.pool,
            { kind: "tenant", ...scope, principalId: identity.principalId },
            run,
          );
        })(),
      );
    } catch (error) {
      throw customerDatabaseError(error);
    }
  }
  async function check<T>(
    target: unknown,
    run: (db: TransactionDatabase, token: string) => Promise<T>,
  ): Promise<T> {
    return readWithinDeadline(
      (async () => {
        const token = await read(target, (db) =>
          value(
            db,
            sql`SELECT app.customer_check_begin(true) AS value`,
            z.uuid(),
          ),
        );
        try {
          return await read(target, (db) => run(db, token));
        } finally {
          await read(target, async (db) => {
            await db.execute(
              sql`SELECT app.customer_check_end(${token}::uuid)`,
            );
          }).catch(() => {});
        }
      })(),
    );
  }
  async function review(
    target: unknown,
    id: unknown,
    correlationId: string = randomUUID(),
  ) {
    const identity = parse(c.duplicateReviewId, id);
    return check(target, async (db, token) => {
      const raw = await value(
        db,
        sql`SELECT app.customer_review_read(${identity}::uuid,${token}::uuid) AS value`,
        z.record(z.string(), z.unknown()),
      );
      return c.customerResponse.parse({ ...raw, correlationId });
    });
  }
  return {
    async page(target: unknown, query: unknown = {}) {
      const q = parse(c.customerSearchQuery, query);
      return read(target, (db) =>
        value(
          db,
          sql`SELECT app.customer_page(${JSON.stringify(q)}::jsonb) AS value`,
          c.customerPage,
        ),
      );
    },
    async detail(target: unknown, id: unknown) {
      const identity = parse(c.customerId, id);
      return read(target, (db) =>
        value(
          db,
          sql`SELECT app.customer_detail(${identity}::uuid) AS value`,
          c.customerDetail,
        ),
      );
    },
    async wearers(target: unknown, id: unknown, query: unknown = {}) {
      const identity = parse(c.customerId, id),
        q = parse(c.customerContinuationQuery, query);
      return read(target, (db) =>
        value(
          db,
          sql`SELECT app.customer_wearers_page(${identity}::uuid,${q.offset},${q.limit}) AS value`,
          c.wearerPage,
        ),
      );
    },
    async activity(target: unknown, id: unknown, query: unknown = {}) {
      const identity = parse(c.customerId, id),
        q = parse(c.customerContinuationQuery, query);
      return read(target, (db) =>
        value(
          db,
          sql`SELECT app.customer_activity_page(${identity}::uuid,${q.offset},${q.limit}) AS value`,
          c.customerActivityPage,
        ),
      );
    },
    async duplicateCheck(target: unknown, input: unknown) {
      const p = parse(advisoryInput, input);
      return check(target, (db, token) =>
        value(
          db,
          sql`SELECT app.customer_duplicate_check(${JSON.stringify(p.phone)}::jsonb,${p.customerId}::uuid,${token}::uuid) AS value`,
          customerDuplicateCheck,
        ),
      );
    },
    review,
    async command(
      name: unknown,
      target: unknown,
      envelope: unknown,
    ): Promise<z.infer<typeof c.customerResponse>> {
      const selected = parse(c.customerCommandName, name),
        scope = parse(workspaceTarget, target);
      const request = parse(
        c.customerInvocation(c.customerCommandPayloads[selected]),
        envelope,
      );
      if (
        Buffer.byteLength(JSON.stringify(request), "utf8") >
        c.CUSTOMER_PROFILE_REQUEST_BYTES
      )
        throw new CustomerError(
          "body-too-large",
          "Request too large",
          [],
          request.correlationId,
        );
      try {
        const outcome = await execute(commands[selected], {
          ...request,
          scope: { kind: "tenant", ...scope },
        });
        if (outcome.result.kind === "review-required")
          return review(scope, outcome.result.reviewId, request.correlationId);
        return c.customerResponse.parse({
          outcome: "saved",
          result: outcome.result,
          correlationId: request.correlationId,
        });
      } catch (error) {
        if (error instanceof ReviewError) {
          const intent = z
            .object({ intent: z.object({ reviewId: c.duplicateReviewId }) })
            .parse(request.payload);
          return c.customerResponse.parse({
            outcome: error.outcome,
            reviewId: intent.intent.reviewId,
            correlationId: request.correlationId,
          });
        }
        const mapped = customerDatabaseError(error);
        const issues =
          selected === "customer.create"
            ? mapped.issues.map((issue) =>
                issue.path[0] === "profile" && issue.path[1] === "birthday"
                  ? c.customerIssue.parse({
                      ...issue,
                      path: ["selfWearer", "attributes", "birthday"],
                    })
                  : issue,
              )
            : mapped.issues;
        throw new CustomerError(
          mapped.code,
          mapped.message,
          issues,
          request.correlationId,
        );
      }
    },
  };
}
