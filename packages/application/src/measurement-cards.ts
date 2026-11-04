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
import * as c from "./measurement-card-contracts.js";
import { measurementInvocation } from "./measurement-contracts.js";
import { MeasurementError, measurementDatabaseError } from "./measurements.js";
import type { Observe } from "./operations.js";
import { workspaceTarget } from "./workspace-contracts.js";

function parse<T extends z.ZodType>(schema: T, input: unknown): z.infer<T> {
  const result = schema.safeParse(input);
  if (!result.success)
    throw new MeasurementError(
      "validation",
      "Check measurement card selections",
    );
  return result.data;
}
function definition(
  name: z.infer<typeof c.measurementCardCommandName>,
): Command<unknown, z.infer<typeof c.measurementCardResult>> {
  return {
    kind: name,
    input: c.measurementCardPayloads[name],
    output: c.measurementCardResult,
    access: {
      kind: "tenant",
      permission:
        name === "measurement-card.create"
          ? "measurements.cards.manage"
          : "measurements.read",
      projection: "measurement-card",
    },
    mapError: measurementDatabaseError,
    async authorize(db, _authority, input) {
      if (name === "measurement-card.create")
        await db.execute(sql`SELECT app.measurement_card_manager()`);
      else {
        const p = parse(c.measurementCardRevoke, input);
        await db.execute(
          sql`SELECT app.measurement_card_revoke_authorize(${p.customerId}::uuid,${p.wearerId}::uuid,${p.cardId}::uuid)`,
        );
      }
    },
    async mutate(db, _authority, input) {
      const p = parse(c.measurementCardPayloads[name], input),
        result = await value(
          db,
          sql`SELECT app.measurement_card_mutate(${name},${JSON.stringify(p)}::jsonb) AS value`,
          c.measurementCardResult,
        );
      return {
        result,
        audit: {
          entityKind: "measurement_card",
          entityId: result.cardId,
          reason: name,
          changedFields: result.changed
            ? [name === "measurement-card.create" ? "issued" : "revoked"]
            : [],
          previousVersion:
            name === "measurement-card.create"
              ? null
              : result.changed
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
  "measurement-card.create": definition("measurement-card.create"),
  "measurement-card.revoke": definition("measurement-card.revoke"),
};
export function createMeasurementCardService(options: {
  pool: ReturnType<typeof createPool>;
  resolveIdentity: () => Promise<Identity>;
  observe?: Observe;
}) {
  const execute = createCommandExecutor(options);
  async function scoped<T>(
    target: unknown,
    run: (db: TransactionDatabase) => Promise<T>,
  ) {
    const selected = parse(workspaceTarget, target);
    try {
      const actor = await options.resolveIdentity();
      return await withScope(
        options.pool,
        { kind: "tenant", ...selected, principalId: actor.principalId },
        run,
      );
    } catch (error) {
      throw measurementDatabaseError(error);
    }
  }
  return {
    async command(name: unknown, target: unknown, input: unknown) {
      const selected = parse(c.measurementCardCommandName, name),
        scope = parse(workspaceTarget, target),
        p = parse(
          measurementInvocation(c.measurementCardPayloads[selected]),
          input,
        );
      try {
        return c.measurementCardResponse.parse(
          await execute(commands[selected], {
            ...p,
            scope: { kind: "tenant", ...scope },
          }),
        );
      } catch (error) {
        throw measurementDatabaseError(error);
      }
    },
    preview(target: unknown, input: unknown) {
      const p = parse(c.measurementCardPreviewQuery, input);
      return scoped(target, (db) =>
        value(
          db,
          sql`SELECT app.measurement_card_projection(${p.customerId}::uuid,${p.wearerId}::uuid,${JSON.stringify(p.selections)}::jsonb,false) AS value`,
          c.measurementCardProjection,
        ),
      );
    },
    list(target: unknown, input: unknown) {
      const p = parse(c.measurementCardListQuery, input);
      return scoped(target, (db) =>
        value(
          db,
          sql`SELECT app.measurement_card_list(${p.customerId}::uuid,${p.wearerId}::uuid,${JSON.stringify(p.after)}::jsonb) AS value`,
          c.measurementCardList,
        ),
      );
    },
    async resolve(id: unknown) {
      const actor = await options.resolveIdentity();
      try {
        const admitted = await withScope(
          options.pool,
          { kind: "principal", principalId: actor.principalId },
          (db) =>
            value(
              db,
              sql`SELECT app.measurement_card_admit() AS value`,
              z.boolean(),
            ),
        );
        if (!admitted)
          throw new MeasurementError(
            "rate-limit",
            "Please wait before opening another measurement card",
          );
        const selected = c.measurementCardId.safeParse(id);
        if (!selected.success)
          throw new MeasurementError(
            "unavailable",
            "Measurement card unavailable",
          );
        return await withScope(
          options.pool,
          { kind: "principal", principalId: actor.principalId },
          (db) =>
            value(
              db,
              sql`SELECT app.measurement_card_resolve(${selected.data}::uuid) AS value`,
              c.measurementCardResolved,
            ),
        );
      } catch (error) {
        const mapped = measurementDatabaseError(error);
        throw ["denied", "unavailable", "validation"].includes(mapped.code)
          ? new MeasurementError("unavailable", "Measurement card unavailable")
          : mapped;
      }
    },
  };
}
