import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import type { createPool } from "@fitloom/db";
import { z } from "zod";
import { BodyReadError, readBoundedBody } from "./body.js";

const eventSchema = z.strictObject({
  eventId: z.uuid(),
  sourceId: z.uuid(),
  version: z.int().positive().max(2147483647),
  state: z.enum(["pending", "confirmed", "cancelled"]),
});
export function signFixture(
  bytes: Uint8Array,
  timestamp: string,
  secret: string,
) {
  return `v1=${createHmac("sha256", secret).update(`${timestamp}.`).update(bytes).digest("hex")}`;
}
export function fixtureInbox(options: {
  pool: ReturnType<typeof createPool>;
  secret: string;
  environment: "development" | "test";
  account: "local-fixture";
}): (request: Request) => Promise<Response> {
  if (options.secret.length < 32)
    throw new Error("Fixture verifier secret required");
  return async (request: Request) => {
    const reply = (status: number, message: string) =>
      Response.json(
        { message },
        { status, headers: { "Cache-Control": "no-store" } },
      );
    const timestamp = request.headers.get("x-fitloom-timestamp") ?? "",
      signature = request.headers.get("x-fitloom-signature") ?? "";
    if (
      !/^\d{10}$/.test(timestamp) ||
      Math.abs(Date.now() / 1000 - Number(timestamp)) > 300 ||
      !/^v1=[a-f0-9]{64}$/.test(signature)
    )
      return reply(401, "Invalid event signature");
    if (!request.headers.get("content-type")?.startsWith("application/json"))
      return reply(400, "JSON required");
    let raw: Buffer;
    try {
      raw = await readBoundedBody(request, {
        maxBytes: 16384,
        timeoutMs: 5000,
      });
    } catch (error) {
      return reply(
        error instanceof BodyReadError ? error.status : 400,
        "Invalid event body",
      );
    }
    if (Math.abs(Date.now() / 1000 - Number(timestamp)) > 300)
      return reply(401, "Expired event signature");
    const expected = signFixture(raw, timestamp, options.secret);
    if (!timingSafeEqual(Buffer.from(signature), Buffer.from(expected)))
      return reply(401, "Invalid event signature");
    let data: unknown;
    try {
      data = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(raw));
    } catch {
      return reply(400, "Invalid event");
    }
    const parsed = eventSchema.safeParse(data);
    if (!parsed.success) return reply(400, "Invalid event");
    const event = parsed.data;
    try {
      const result = await options.pool.query(
        "SELECT app.fixture_receipt($1,$2,$3,$4,$5,$6,$7) AS id",
        [
          options.account,
          options.environment,
          event.eventId,
          event.sourceId,
          event.version,
          event.state,
          createHash("sha256").update(raw).digest("hex"),
        ],
      );
      const receipt = z.object({ id: z.uuid() }).parse(result.rows[0]);
      return Response.json(
        { receiptId: receipt.id },
        { status: 202, headers: { "Cache-Control": "no-store" } },
      );
    } catch (error) {
      return reply(
        typeof error === "object" &&
          error !== null &&
          "code" in error &&
          error.code === "23505"
          ? 409
          : 503,
        "Event receipt unavailable",
      );
    }
  };
}
