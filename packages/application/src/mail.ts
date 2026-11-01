import {
  createCipheriv,
  createDecipheriv,
  hkdfSync,
  randomBytes,
} from "node:crypto";
import type { createPool } from "@fitloom/db";
import nodemailer from "nodemailer";
import { z } from "zod";
import { emit, type Observe } from "./operations.js";

export const mailConfig = z.discriminatedUnion("provider", [
  z.strictObject({
    provider: z.literal("mailpit"),
    host: z.enum(["127.0.0.1", "localhost", "mailpit", "mailpit-test"]),
    port: z.coerce.number().int().min(1).max(65535),
    from: z.email(),
  }),
  z.strictObject({
    provider: z.literal("resend"),
    apiKey: z.string().min(20),
    from: z.email(),
  }),
]);
export type MailConfig = z.infer<typeof mailConfig>;
const mailPayload = z.strictObject({
  to: z.email(),
  url: z.url(),
  kind: z.enum(["verification", "recovery", "invitation"]),
});
function key(secret: string) {
  return Buffer.from(hkdfSync("sha256", secret, "fitloom", "auth-mail-v1", 32));
}
export function encryptMail(
  payload: z.infer<typeof mailPayload>,
  secret: string,
): string {
  const nonce = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(secret), nonce);
  const encrypted = Buffer.concat([
    cipher.update(JSON.stringify(mailPayload.parse(payload)), "utf8"),
    cipher.final(),
  ]);
  return [
    "v1",
    nonce.toString("base64url"),
    cipher.getAuthTag().toString("base64url"),
    encrypted.toString("base64url"),
  ].join(".");
}
function decryptMail(value: string, secret: string) {
  const [version, iv, tag, body] = value.split(".");
  if (version !== "v1" || !iv || !tag || !body)
    throw new Error("Invalid encrypted mail");
  const decipher = createDecipheriv(
    "aes-256-gcm",
    key(secret),
    Buffer.from(iv, "base64url"),
  );
  decipher.setAuthTag(Buffer.from(tag, "base64url"));
  return mailPayload.parse(
    JSON.parse(
      Buffer.concat([
        decipher.update(Buffer.from(body, "base64url")),
        decipher.final(),
      ]).toString("utf8"),
    ),
  );
}
export function createMailTransport(config: MailConfig) {
  const parsed = mailConfig.parse(config);
  const transport = nodemailer.createTransport(
    parsed.provider === "mailpit"
      ? {
          host: parsed.host,
          port: parsed.port,
          secure: false,
          ignoreTLS: true,
          connectionTimeout: 5000,
          greetingTimeout: 5000,
          socketTimeout: 10000,
        }
      : {
          host: "smtp.resend.com",
          port: 465,
          secure: true,
          auth: { user: "resend", pass: parsed.apiKey },
          connectionTimeout: 5000,
          greetingTimeout: 5000,
          socketTimeout: 10000,
        },
  );
  return {
    async send(input: z.infer<typeof mailPayload>, id: string) {
      const result = await transport.sendMail({
        from: parsed.from,
        to: input.to,
        subject:
          input.kind === "invitation"
            ? "Your Fitloom workspace invitation"
            : input.kind === "verification"
              ? "Verify your Fitloom email"
              : "Reset your Fitloom password",
        text: `${input.kind === "invitation" ? "Join your invited workspace" : input.kind === "verification" ? "Verify your email" : "Reset your password"}: ${input.url}\n\nThis link expires. If you did not request it, you can ignore this email.`,
        headers: { "Resend-Idempotency-Key": `fitloom-auth/${id}` },
        messageId: `<${id}@fitloom.local>`,
        disableFileAccess: true,
        disableUrlAccess: true,
      });
      if (result.accepted.length !== 1 || result.rejected.length)
        throw new Error("SMTP did not accept the message");
    },
    close() {
      transport.close();
    },
  };
}
export type MailTransport = ReturnType<typeof createMailTransport>;
export async function deliverAuthMail(dependencies: {
  pool: ReturnType<typeof createPool>;
  secret: string;
  transport: MailTransport;
  observe?: Observe;
}) {
  const claimed = z
    .object({
      rows: z.array(
        z.object({
          id: z.uuid(),
          kind: z.string(),
          encrypted_payload: z.string(),
          attempt: z.number().int(),
        }),
      ),
    })
    .parse(await dependencies.pool.query("SELECT * FROM app.mail_claim()"));
  const mail = claimed.rows[0];
  if (!mail) return false;
  const started = performance.now();
  let accepted = false;
  try {
    await dependencies.transport.send(
      decryptMail(mail.encrypted_payload, dependencies.secret),
      mail.id,
    );
    accepted = true;
  } catch {
    /* Persist a safe category, never SMTP diagnostics or recovery URLs. */
  }
  try {
    await dependencies.pool.query("SELECT app.mail_finished($1,$2,$3)", [
      mail.id,
      mail.attempt,
      accepted,
    ]);
  } catch {
    emit(dependencies.observe, {
      event: "mail_finished",
      correlationId: mail.id,
      jobId: mail.id,
      operationId: null,
      tenantId: null,
      locationId: null,
      kind: mail.kind,
      attempt: mail.attempt,
      elapsedMs: Math.round(performance.now() - started),
      outcome: accepted
        ? "smtp_accepted_settlement_unknown"
        : "settlement_unknown",
      errorCategory: "settlement_unavailable",
    });
    throw new Error("Mail settlement unavailable");
  }
  emit(dependencies.observe, {
    event: "mail_finished",
    correlationId: mail.id,
    jobId: mail.id,
    operationId: null,
    tenantId: null,
    locationId: null,
    kind: mail.kind,
    attempt: mail.attempt,
    elapsedMs: Math.round(performance.now() - started),
    outcome: accepted ? "smtp_accepted" : "smtp_not_accepted",
    errorCategory: accepted ? null : "smtp_unavailable",
  });
  return true;
}
