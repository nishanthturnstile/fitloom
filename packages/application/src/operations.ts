import { z } from "zod";

const count = z.int().nonnegative();
const queue = z.strictObject({
  pending: count,
  running: count,
  failed: count,
  ready: count,
  expiredClaims: count,
  oldestReadySeconds: z.number().nonnegative().nullable(),
});
export const foundationStatus = z.strictObject({
  observedAt: z.iso.datetime({ offset: true }),
  database: z.strictObject({ state: z.literal("available") }),
  worker: z.strictObject({
    state: z.enum(["unknown", "stale", "observed"]),
    lastSeenAt: z.iso.datetime({ offset: true }).nullable(),
    ageSeconds: z.number().nonnegative().nullable(),
  }),
  queues: z.strictObject({
    foundation: queue,
    mail: queue,
    outbox: z.strictObject({
      pending: count,
      oldestSeconds: z.number().nonnegative().nullable(),
    }),
  }),
  backups: z.strictObject({
    state: z.literal("unknown"),
    owner: z.literal("external"),
  }),
});
export type DiagnosticEvent = {
  event:
    | "command_finished"
    | "command_failed"
    | "job_finished"
    | "mail_finished"
    | "operator_finished"
    | "operator_failed";
  correlationId: string | null;
  operationId: string | null;
  jobId: string | null;
  tenantId: string | null;
  locationId: string | null;
  kind: string;
  attempt: number;
  elapsedMs: number;
  outcome: string;
  errorCategory: string | null;
};
export type Observe = (event: DiagnosticEvent) => void;
// Diagnostics must never change a business result or a committed transaction.
export function emit(observe: Observe | undefined, event: DiagnosticEvent) {
  try {
    observe?.(event);
  } catch {}
}
