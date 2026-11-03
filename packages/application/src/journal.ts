import { sql } from "drizzle-orm";
import { z } from "zod";
import { type Command, uuid } from "./commands.js";
import { balances, positiveMoneyInput } from "./decimals.js";

const line = z.strictObject({
  accountCode: z.string().regex(/^[a-z][a-z0-9_.]{0,79}$/),
  side: z.enum(["debit", "credit"]),
  amount: positiveMoneyInput,
});
const source = {
  sourceKind: z.string().min(1).max(100),
  sourceId: uuid,
  currency: z.literal("INR"),
};
const input = z.discriminatedUnion("kind", [
  z
    .strictObject({
      kind: z.literal("posting"),
      ...source,
      lines: z.array(line).min(2).max(200),
    })
    .superRefine((value, ctx) => {
      if (
        !balances(
          value.lines.filter((l) => l.side === "debit").map((l) => l.amount),
          value.lines.filter((l) => l.side === "credit").map((l) => l.amount),
        )
      )
        ctx.addIssue({ code: "custom", message: "Journal must balance" });
    }),
  z.strictObject({ kind: z.literal("reversal"), ...source, reversalOf: uuid }),
]);
const output = z.strictObject({ entryId: uuid });
// Foundation mechanism only. Business modules must supply approved posting matrices.
export const postJournal: Command<
  z.infer<typeof input>,
  z.infer<typeof output>
> = {
  kind: "journal.post",
  access: {
    kind: "tenant",
    permission: "journal.post",
    projection: "journal-reference",
  },
  input,
  output,
  async mutate(db, _authority, payload) {
    const rows = z
      .object({ rows: z.array(z.object({ id: uuid })).length(1) })
      .parse(
        await db.execute(
          sql`SELECT app.post_journal(${payload.sourceKind},${payload.sourceId}::uuid,${payload.currency},${JSON.stringify(payload.kind === "posting" ? payload.lines : [])}::jsonb,${payload.kind === "reversal" ? payload.reversalOf : null}::uuid) AS id`,
        ),
      );
    const entryId = rows.rows[0]?.id;
    if (!entryId) throw new Error("Missing journal entry");
    return {
      result: { entryId },
      audit: {
        entityKind: "journal-entry",
        changedFields: ["journalEntry"],
        entityId: entryId,
        reason:
          payload.kind === "posting"
            ? "Post balanced journal"
            : "Reverse journal",
        previousVersion: null,
        nextVersion: null,
      },
      jobs: [],
    };
  },
};
