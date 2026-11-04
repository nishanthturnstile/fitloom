import { createHash, createHmac } from "node:crypto";
import { isIP } from "node:net";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import {
  authSchema,
  type createPool,
  withDatabaseTransaction,
} from "@fitloom/db";
import { betterAuth } from "better-auth";
import { twoFactor } from "better-auth/plugins/two-factor";
import { sql } from "drizzle-orm";
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { z } from "zod";
import { BodyReadError, readBoundedBody } from "./body.js";
import { principalId, requestHash } from "./commands.js";
import { CommandError, sqlState } from "./errors.js";
import { encryptMail } from "./mail.js";
import { emit, foundationStatus, type Observe } from "./operations.js";
import {
  operatorCommandInput,
  operatorCommandResult,
  operatorJobSummary,
  operatorTenantView,
  pageOf,
  pageOffset,
} from "./workspace-contracts.js";

const configSchema = z.strictObject({
  mode: z.enum(["development", "test", "production"]),
  baseURL: z.url(),
  trustedOrigins: z.array(z.url()),
  secret: z.string().min(32),
  mailKey: z.string().min(32),
  proxyHeader: z
    .string()
    .regex(/^[a-z0-9-]+$/)
    .optional(),
});
export type AuthConfig = z.infer<typeof configSchema>;
const principalRow = z.object({
  rows: z.array(z.object({ id: principalId, active: z.boolean() })).length(1),
});
const boolRow = z.object({
  rows: z.array(z.object({ allowed: z.boolean() })).length(1),
});
const hash = (value: string) =>
  createHash("sha256").update(value).digest("hex");
const allowedPaths = new Set([
  "/sign-up/email",
  "/sign-in/email",
  "/sign-out",
  "/get-session",
  "/list-sessions",
  "/revoke-session",
  "/revoke-sessions",
  "/revoke-other-sessions",
  "/send-verification-email",
  "/verify-email",
  "/request-password-reset",
  "/reset-password",
  "/change-password",
  "/two-factor/enable",
  "/two-factor/disable",
  "/two-factor/get-totp-uri",
  "/two-factor/verify-totp",
  "/two-factor/verify-backup-code",
  "/two-factor/generate-backup-codes",
]);
const mfaPaths = new Set([
  "/two-factor/verify-totp",
  "/two-factor/verify-backup-code",
]);
const sensitivePaths = new Set([
  "/sign-up/email",
  "/sign-in/email",
  "/request-password-reset",
  "/reset-password",
  "/send-verification-email",
  "/change-password",
]);
function response(status: number, message: string) {
  return Response.json(
    { message },
    {
      status,
      headers: {
        "Cache-Control": "no-store",
        "Referrer-Policy": "no-referrer",
      },
    },
  );
}
class RollbackResponse extends Error {
  readonly response: Response;
  constructor(value: Response) {
    super("Auth transaction aborted");
    this.response = value;
  }
}
function cookieHeaders(request: Request, result: Response) {
  const cookies = new Map<string, string>();
  for (const cookie of (request.headers.get("cookie") ?? "").split(";")) {
    const pos = cookie.indexOf("=");
    if (pos > 0)
      cookies.set(cookie.slice(0, pos).trim(), cookie.slice(pos + 1));
  }
  for (const cookie of result.headers.getSetCookie()) {
    const pair = cookie.split(";")[0] ?? "";
    const pos = pair.indexOf("=");
    if (pos > 0) cookies.set(pair.slice(0, pos), pair.slice(pos + 1));
  }
  return new Headers({
    cookie: [...cookies].map(([k, v]) => `${k}=${v}`).join("; "),
  });
}

export function createIdentityService(dependencies: {
  pool: ReturnType<typeof createPool>;
  config: AuthConfig;
  onFailure?: (category: string) => void;
  observe?: Observe;
}) {
  const config = configSchema.parse(dependencies.config);
  const origins = new Set([
    new URL(config.baseURL).origin,
    ...config.trustedOrigins.map((value) => new URL(value).origin),
  ]);
  if (
    config.mode === "production" &&
    [...origins].some((value) => !value.startsWith("https://"))
  )
    throw new Error("Production authentication requires HTTPS origins");
  const pool = dependencies.pool;
  const database = drizzle(pool, { schema: authSchema });
  async function enqueue(
    db: NodePgDatabase<typeof authSchema>,
    kind: "verification" | "recovery",
    data: { user: { id: string; email: string }; url: string; token: string },
  ) {
    const expires =
      kind === "verification"
        ? z
            .object({ exp: z.number() })
            .parse(
              JSON.parse(
                Buffer.from(
                  data.token.split(".")[1] ?? "",
                  "base64url",
                ).toString("utf8"),
              ),
            ).exp * 1000
        : Date.now() + 3600_000;
    await db.execute(
      sql`INSERT INTO app.auth_mail(user_id,kind,token_hash,encrypted_payload,expires_at) VALUES(${data.user.id},${kind},${hash(data.token)},${encryptMail({ to: data.user.email, url: data.url, kind }, config.mailKey)},${new Date(expires)}) ON CONFLICT(kind,token_hash) DO NOTHING`,
    );
  }
  function runtime(
    db: NodePgDatabase<typeof authSchema>,
    onMailFailure: () => void = () => {},
  ) {
    return betterAuth({
      appName: "Fitloom",
      baseURL: config.baseURL,
      secret: config.secret,
      trustedOrigins: [...origins],
      database: drizzleAdapter(db, {
        provider: "pg",
        schema: authSchema,
        transaction: true,
      }),
      emailAndPassword: {
        enabled: true,
        requireEmailVerification: true,
        minPasswordLength: 12,
        maxPasswordLength: 128,
        resetPasswordTokenExpiresIn: 3600,
        revokeSessionsOnPasswordReset: true,
        sendResetPassword: async (data) => {
          try {
            await enqueue(db, "recovery", data);
          } catch {
            onMailFailure();
            throw new Error("Email persistence unavailable");
          }
        },
      },
      emailVerification: {
        sendOnSignUp: true,
        sendOnSignIn: false,
        autoSignInAfterVerification: false,
        expiresIn: 3600,
        sendVerificationEmail: async (data) => {
          try {
            await enqueue(db, "verification", data);
          } catch {
            onMailFailure();
            throw new Error("Email persistence unavailable");
          }
        },
      },
      session: {
        expiresIn: 8 * 3600,
        updateAge: 3600,
        freshAge: 900,
        cookieCache: { enabled: false },
      },
      user: { changeEmail: { enabled: false } },
      advanced: {
        disableCSRFCheck: false,
        disableOriginCheck: false,
        useSecureCookies: new URL(config.baseURL).protocol === "https:",
        defaultCookieAttributes: { httpOnly: true, sameSite: "lax" },
        ipAddress: { ipAddressHeaders: ["x-fitloom-client-ip"] },
      },
      rateLimit: {
        enabled: true,
        storage: "database",
        customStorage: {
          async consume(key, rule) {
            const bucket = createHmac("sha256", config.secret)
              .update(`better-auth:${key}`)
              .digest("hex");
            const allowed =
              boolRow.parse(
                await db.execute(
                  sql`SELECT app.auth_admit(${bucket},${rule.max},${rule.window}) AS allowed`,
                ),
              ).rows[0]?.allowed ?? false;
            return { allowed, retryAfter: allowed ? null : rule.window };
          },
        },
        window: 60,
        max: 100,
        customRules: {
          "/sign-in/email": { window: 60, max: 30 },
          "/sign-up/email": { window: 60, max: 30 },
          "/request-password-reset": { window: 60, max: 30 },
          "/send-verification-email": { window: 60, max: 30 },
          "/two-factor/*": { window: 60, max: 30 },
        },
      },
      plugins: [
        twoFactor({
          issuer: "Fitloom",
          skipVerificationOnEnable: false,
          accountLockout: {
            enabled: true,
            maxFailedAttempts: 5,
            durationSeconds: 900,
          },
        }),
      ],
      databaseHooks: {
        user: {
          create: {
            after: async (user) => {
              await db.execute(
                sql`SELECT * FROM app.ensure_principal(${user.id})`,
              );
            },
          },
        },
      },
      logger: { disabled: true },
      onAPIError: { throw: true },
    });
  }
  const reader = runtime(database);
  async function identity(headers: Headers) {
    const session = await reader.api.getSession({ headers });
    if (!session) throw new CommandError("access", "Sign in required");
    if (!session.user.emailVerified)
      throw new CommandError("access", "Email verification required");
    const principal = principalRow.parse(
      await database.execute(
        sql`SELECT * FROM app.ensure_principal(${session.user.id})`,
      ),
    ).rows[0];
    if (!principal?.active)
      throw new CommandError("access", "Identity disabled");
    return {
      principalId: principal.id,
      user: session.user,
      session: session.session,
    };
  }
  async function requireOperator(headers: Headers, permission: string) {
    const current = await identity(headers);
    const allowed = boolRow.parse(
      await database.execute(
        sql`SELECT app.operator_admitted(${current.user.id},${current.session.id},${permission}) AS allowed`,
      ),
    ).rows[0]?.allowed;
    if (!allowed)
      throw new CommandError(
        "access",
        "Recent operator MFA and explicit grant required",
      );
    return current;
  }
  async function handle(request: Request): Promise<Response> {
    const url = new URL(request.url),
      path = url.pathname.slice("/api/auth".length);
    if (
      !allowedPaths.has(path) &&
      !/^\/reset-password\/[a-zA-Z0-9_-]+$/.test(path)
    )
      return response(404, "Unknown authentication route");
    if (!["GET", "POST"].includes(request.method))
      return response(405, "Method not allowed");
    let body: Record<string, unknown> = {};
    if (request.method === "POST") {
      if (!origins.has(request.headers.get("origin") ?? ""))
        return response(403, "Origin denied");
      if (!request.headers.get("content-type")?.startsWith("application/json"))
        return response(415, "JSON required");
      if (Number(request.headers.get("content-length") ?? 0) > 16384)
        return response(413, "Request too large");
      let text: string;
      try {
        text = new TextDecoder("utf-8", { fatal: true }).decode(
          await readBoundedBody(request, { maxBytes: 16384, timeoutMs: 5000 }),
        );
      } catch (error) {
        return response(
          error instanceof BodyReadError ? error.status : 400,
          "Invalid or incomplete request body",
        );
      }
      try {
        body = z.record(z.string(), z.unknown()).parse(JSON.parse(text));
      } catch {
        return response(400, "Invalid request");
      }
      if (body.trustDevice === true || body.method === "otp")
        return response(400, "Authenticator challenges are required");
      if (path === "/change-password") body.revokeOtherSessions = true;
    }
    for (const value of [
      body.callbackURL,
      body.redirectTo,
      url.searchParams.get("callbackURL"),
    ]) {
      if (value === undefined || value === null || value === "") continue;
      if (typeof value !== "string") return response(400, "Invalid callback");
      let callback: URL;
      try {
        callback = new URL(value, config.baseURL);
      } catch {
        return response(400, "Invalid callback");
      }
      if (
        !origins.has(callback.origin) ||
        !["/", "/account", "/account/reset"].includes(callback.pathname)
      )
        return response(400, "Callback denied");
    }
    const headers = new Headers(request.headers);
    const address = config.proxyHeader
      ? request.headers.get(config.proxyHeader)
      : null;
    headers.set(
      "x-fitloom-client-ip",
      address && isIP(address) ? address : "127.0.0.1",
    );
    headers.delete("x-forwarded-for");
    headers.delete("x-real-ip");
    headers.set(
      "cookie",
      (headers.get("cookie") ?? "")
        .split(";")
        .filter((value) => !value.split("=")[0]?.includes("trust_device"))
        .join(";"),
    );
    if (
      request.method === "POST" &&
      (sensitivePaths.has(path) || path.startsWith("/two-factor/"))
    ) {
      const emailPath = [
        "/sign-up/email",
        "/sign-in/email",
        "/request-password-reset",
        "/send-verification-email",
      ].includes(path);
      const current = emailPath
        ? null
        : await reader.api.getSession({ headers });
      const challenge =
        (headers.get("cookie") ?? "")
          .split(";")
          .find((value) => value.trim().split("=")[0]?.endsWith(".two_factor"))
          ?.trim() ?? "anonymous";
      const subject =
        emailPath && typeof body.email === "string"
          ? body.email.trim().toLowerCase()
          : current
            ? `user:${current.user.id}`
            : path === "/reset-password" && typeof body.token === "string"
              ? `reset:${body.token}`
              : `challenge:${challenge}`;
      for (const { value, budget } of [
        {
          value: `network:${path}:${headers.get("x-fitloom-client-ip")}`,
          budget: 30,
        },
        { value: `subject:${path}:${subject}`, budget: 5 },
      ]) {
        const bucket = createHmac("sha256", config.secret)
          .update(value)
          .digest("hex");
        const allowed = boolRow.parse(
          await database.execute(
            sql`SELECT app.auth_admit(${bucket},${budget},60) AS allowed`,
          ),
        ).rows[0]?.allowed;
        if (!allowed) return response(429, "Please wait before trying again");
      }
    }
    const input = new Request(request.url, {
      method: request.method,
      headers,
      ...(request.method === "POST" ? { body: JSON.stringify(body) } : {}),
    });
    try {
      return await withDatabaseTransaction(pool, async (db) => {
        let mailFailed = false;
        const auth = runtime(db, () => {
          mailFailed = true;
        });
        let verificationId: string | undefined;
        if (path === "/verify-email") {
          const selected = z
            .object({ rows: z.array(z.object({ id: z.uuid() })) })
            .parse(
              await db.execute(
                sql`SELECT id FROM app.auth_mail WHERE kind='verification' AND token_hash=${hash(url.searchParams.get("token") ?? "")} AND consumed_at IS NULL AND expires_at>now() FOR UPDATE`,
              ),
            );
          verificationId = selected.rows[0]?.id;
          if (!verificationId)
            return response(400, "Invalid or expired verification link");
        }
        if (
          [
            "/two-factor/disable",
            "/two-factor/enable",
            "/two-factor/get-totp-uri",
            "/two-factor/generate-backup-codes",
          ].includes(path)
        ) {
          const current = await auth.api.getSession({ headers });
          if (current) {
            const operator = boolRow.parse(
              await db.execute(
                sql`SELECT app.operator_has_grant(${current.user.id},'') AS allowed`,
              ),
            ).rows[0]?.allowed;
            if (operator && path === "/two-factor/disable")
              return response(
                403,
                "Operator MFA recovery requires administrative review",
              );
            if (operator && current.user.twoFactorEnabled) {
              const fresh = boolRow.parse(
                await db.execute(
                  sql`SELECT app.operator_admitted(${current.user.id},${current.session.id},'') AS allowed`,
                ),
              ).rows[0]?.allowed;
              if (!fresh)
                return response(
                  403,
                  "Verify your authenticator before changing operator security",
                );
            }
          }
        }
        const stepUp = mfaPaths.has(path)
          ? await auth.api.getSession({ headers })
          : null;
        if (stepUp) {
          const locked = boolRow.parse(
            await db.execute(
              sql`SELECT EXISTS(SELECT FROM public.two_factor WHERE user_id=${stepUp.user.id} AND locked_until>now()) AS allowed`,
            ),
          ).rows[0]?.allowed;
          if (locked)
            return response(429, "Authenticator attempts temporarily locked");
        }
        const result = await auth.handler(input);
        if (stepUp && result.status === 401)
          await db.execute(
            sql`UPDATE public.two_factor SET failed_verification_count=coalesce(failed_verification_count,0)+1,locked_until=CASE WHEN coalesce(failed_verification_count,0)+1>=5 THEN now()+interval '15 minutes' ELSE locked_until END WHERE user_id=${stepUp.user.id}`,
          );
        if (stepUp && result.status < 400)
          await db.execute(
            sql`UPDATE public.two_factor SET failed_verification_count=0,locked_until=NULL WHERE user_id=${stepUp.user.id}`,
          );

        if (mailFailed || result.status >= 500)
          throw new RollbackResponse(
            response(503, "Authentication temporarily unavailable"),
          );
        if (result.status < 400) {
          if (verificationId)
            await db.execute(
              sql`UPDATE app.auth_mail SET consumed_at=now(),encrypted_payload=NULL WHERE id=${verificationId}`,
            );
          const current = await auth.api.getSession({
            headers: cookieHeaders(input, result),
          });
          if (current) {
            const principal = principalRow.parse(
              await db.execute(
                sql`SELECT * FROM app.ensure_principal(${current.user.id})`,
              ),
            ).rows[0];
            if (!principal?.active)
              throw new RollbackResponse(response(403, "Identity disabled"));
            if (path === "/two-factor/enable")
              await db.execute(
                sql`UPDATE app.operator_challenges SET verified_at='-infinity' WHERE session_id IN (SELECT id FROM public.session WHERE user_id=${current.user.id})`,
              );
            if (mfaPaths.has(path) && current.user.twoFactorEnabled) {
              await db.execute(
                sql`INSERT INTO app.operator_challenges(session_id,method) VALUES(${current.session.id},${path.endsWith("verify-totp") ? "totp" : "backup-code"}) ON CONFLICT(session_id) DO UPDATE SET verified_at=now(),method=excluded.method`,
              );
            }
            if (path === "/change-password")
              await db.execute(
                sql`DELETE FROM ${authSchema.session} WHERE user_id=${current.user.id}`,
              );
          }
        }
        const output = new Response(result.body, {
          status: result.status,
          headers: result.headers,
        });
        output.headers.set("Cache-Control", "no-store");
        output.headers.set("Referrer-Policy", "no-referrer");
        return output;
      });
    } catch (error) {
      if (error instanceof RollbackResponse) return error.response;
      dependencies.onFailure?.(sqlState(error) ?? "internal");
      return response(503, "Authentication temporarily unavailable");
    }
  }
  function operatorError(error: unknown): never {
    if (error instanceof CommandError) throw error;
    const state = sqlState(error);
    if (state === "42501")
      throw new CommandError("access", "Operator action denied");
    if (state === "P0003")
      throw new CommandError(
        "conflict",
        "Operator command input or target changed",
      );
    if (state?.startsWith("22"))
      throw new CommandError("validation", "Invalid operator command");
    throw new CommandError("temporary", "Operator action unavailable");
  }
  async function operatorCommand(headers: Headers, input: unknown) {
    const parsed = operatorCommandInput.safeParse(input);
    if (!parsed.success)
      throw new CommandError("validation", "Invalid operator command");
    const data = parsed.data;
    const permission = data.action.startsWith("job.")
      ? "jobs.manage"
      : data.action.startsWith("tenant.")
        ? "tenants.manage"
        : data.action === "owner.recover"
          ? "owners.recover"
          : "sessions.revoke";
    const started = performance.now();
    const { operationKey, correlationId, ...semantic } = data;
    try {
      const actor = await requireOperator(headers, permission);
      const outcome = await withDatabaseTransaction(pool, async (db) => {
        const stored = z
          .object({
            rows: z.array(z.object({ value: operatorCommandResult })).length(1),
          })
          .parse(
            await db.execute(
              sql`SELECT app.operator_execute(${actor.user.id},${actor.session.id},${data.action},${operationKey},${requestHash(semantic)},${data.reason},${correlationId}::uuid,${"tenantId" in data ? data.tenantId : null}::uuid,${"principalId" in data ? data.principalId : null}::uuid,${"jobId" in data ? data.jobId : null}::uuid) AS value`,
            ),
          );
        const outcome = stored.rows[0]?.value;
        if (!outcome) throw new Error("Missing operator result");
        if (data.action === "owner.recover" && !outcome.replayed) {
          const admitted = boolRow.parse(
            await db.execute(
              sql`SELECT app.auth_admit(${`operator-recovery:${data.principalId}`},5,3600) AS allowed`,
            ),
          ).rows[0]?.allowed;
          if (!admitted)
            throw new CommandError(
              "temporary",
              "Recovery request limit reached",
            );
          const email = z
            .object({ rows: z.array(z.object({ value: z.email() })).length(1) })
            .parse(
              await db.execute(
                sql`SELECT app.operator_recovery_email(${actor.user.id},${actor.session.id},${data.tenantId}::uuid,${data.principalId}::uuid) AS value`,
              ),
            ).rows[0]?.value;
          if (!email) throw new Error("Missing owner");
          let mailFailed = false;
          const result = await runtime(db, () => {
            mailFailed = true;
          }).api.requestPasswordReset({
            body: {
              email,
              redirectTo: new URL("/account/reset", config.baseURL).href,
            },
          });
          if (mailFailed || !result.status)
            throw new Error("Recovery persistence unavailable");
        }
        return outcome;
      });
      emit(dependencies.observe, {
        event: "operator_finished",
        correlationId,
        operationId: outcome.operationId,
        jobId: "jobId" in data ? data.jobId : null,
        tenantId: "tenantId" in data ? data.tenantId : null,
        locationId: null,
        kind: data.action,
        attempt: 1,
        elapsedMs: Math.round(performance.now() - started),
        outcome: outcome.replayed ? "replayed" : "committed",
        errorCategory: null,
      });
      return outcome;
    } catch (error) {
      emit(dependencies.observe, {
        event: "operator_failed",
        correlationId,
        operationId: null,
        jobId: "jobId" in data ? data.jobId : null,
        tenantId: "tenantId" in data ? data.tenantId : null,
        locationId: null,
        kind: data.action,
        attempt: 1,
        elapsedMs: Math.round(performance.now() - started),
        outcome: "rejected",
        errorCategory:
          error instanceof CommandError
            ? error.category
            : sqlState(error) === "42501"
              ? "access"
              : "database",
      });
      return operatorError(error);
    }
  }
  async function operatorTenants(headers: Headers, query: unknown) {
    const parsed = z.string().trim().max(200).safeParse(query);
    if (!parsed.success) throw new CommandError("validation", "Invalid lookup");
    const actor = await requireOperator(headers, "tenants.read");
    try {
      const rows = z
        .object({
          rows: z
            .array(z.object({ value: z.array(operatorTenantView) }))
            .length(1),
        })
        .parse(
          await database.execute(
            sql`SELECT app.operator_tenants(${actor.user.id},${actor.session.id},${parsed.data}) AS value`,
          ),
        );
      return rows.rows[0]?.value ?? [];
    } catch (error) {
      return operatorError(error);
    }
  }
  return {
    async admitMeasurementCardRequest(headers: Headers) {
      const forwarded = config.proxyHeader
        ? headers.get(config.proxyHeader)
        : null;
      const address = forwarded && isIP(forwarded) ? forwarded : "127.0.0.1";
      const bucket = createHmac("sha256", config.secret)
        .update(`network:/measurement-cards/:id:${address}`)
        .digest("hex");
      return (
        boolRow.parse(
          await database.execute(
            sql`SELECT app.auth_admit(${bucket},60,60) AS allowed`,
          ),
        ).rows[0]?.allowed === true
      );
    },
    async handle(request: Request): Promise<Response> {
      try {
        return await handle(request);
      } catch {
        return response(503, "Authentication temporarily unavailable");
      }
    },
    identity,
    requireOperator,
    operatorCommand,
    operatorTenants,
    async operatorTenantPage(
      headers: Headers,
      query: unknown,
      offset: unknown = 0,
    ) {
      const input = z
        .strictObject({ query: z.string().trim().max(200), offset: pageOffset })
        .safeParse({ query, offset });
      if (!input.success) throw new CommandError("validation", "Invalid page");
      const actor = await requireOperator(headers, "tenants.read");
      try {
        const rows = z
          .object({
            rows: z
              .array(z.object({ value: pageOf(operatorTenantView) }))
              .length(1),
          })
          .parse(
            await database.execute(
              sql`SELECT app.operator_tenant_page(${actor.user.id},${actor.session.id},${input.data.query},${input.data.offset}) AS value`,
            ),
          );
        const result = rows.rows[0]?.value;
        if (!result) throw new Error("Missing page");
        return result;
      } catch (error) {
        return operatorError(error);
      }
    },
    async operatorJobsPage(headers: Headers, offset: unknown = 0) {
      const parsed = pageOffset.safeParse(offset);
      if (!parsed.success) throw new CommandError("validation", "Invalid page");
      const actor = await requireOperator(headers, "jobs.manage");
      try {
        const rows = z
          .object({
            rows: z
              .array(z.object({ value: pageOf(operatorJobSummary) }))
              .length(1),
          })
          .parse(
            await database.execute(
              sql`SELECT app.operator_job_page(${actor.user.id},${actor.session.id},${parsed.data}) AS value`,
            ),
          );
        const result = rows.rows[0]?.value;
        if (!result) throw new Error("Missing page");
        return result;
      } catch (error) {
        return operatorError(error);
      }
    },
    async operationalStatus(headers: Headers) {
      const actor = await requireOperator(headers, "jobs.manage");
      try {
        const rows = z
          .object({
            rows: z.array(z.object({ value: foundationStatus })).length(1),
          })
          .parse(
            await database.execute(
              sql`SELECT app.foundation_status(${actor.user.id},${actor.session.id}) AS value`,
            ),
          );
        const status = rows.rows[0]?.value;
        if (!status) throw new Error("Missing status");
        return status;
      } catch (error) {
        return operatorError(error);
      }
    },
  };
}
export type IdentityService = ReturnType<typeof createIdentityService>;
