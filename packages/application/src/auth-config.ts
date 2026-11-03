import { z } from "zod";
import type { AuthConfig } from "./auth.js";
import { mailConfig } from "./mail.js";

export function identityEnvironment(env: NodeJS.ProcessEnv) {
  const mode = z
    .enum(["development", "test", "production"])
    .parse(env.FITLOOM_ENV ?? env.NODE_ENV ?? "development");
  const config: AuthConfig = {
    mode,
    baseURL: z.url().parse(env.AUTH_BASE_URL),
    trustedOrigins: (env.AUTH_TRUSTED_ORIGINS ?? "").split(",").filter(Boolean),
    secret: z.string().min(32).parse(env.AUTH_SECRET),
    mailKey: z.string().min(32).parse(env.MAIL_ENCRYPTION_KEY),
    ...(env.AUTH_PROXY_HEADER ? { proxyHeader: env.AUTH_PROXY_HEADER } : {}),
  };
  const provider = z
    .enum(["mailpit", "resend"])
    .parse(env.MAIL_PROVIDER ?? "mailpit");
  if ((mode === "production") !== (provider === "resend"))
    throw new Error(
      "Use Mailpit for development/tests and Resend for production",
    );
  return {
    config,
    authDatabaseURL: z.string().min(1).parse(env.AUTH_DATABASE_URL),
  };
}

export function mailWorkerEnvironment(env: NodeJS.ProcessEnv) {
  const mode = z
    .enum(["development", "test", "production"])
    .parse(env.FITLOOM_ENV ?? env.NODE_ENV ?? "development");
  const mail = mailConfig.parse(
    env.MAIL_PROVIDER === "resend"
      ? { provider: "resend", apiKey: env.RESEND_API_KEY, from: env.MAIL_FROM }
      : {
          provider: "mailpit",
          host: env.MAILPIT_HOST ?? "127.0.0.1",
          port: env.MAILPIT_SMTP_PORT ?? "24421",
          from: env.MAIL_FROM ?? "fitloom@example.test",
        },
  );
  if ((mode === "production") !== (mail.provider === "resend"))
    throw new Error(
      "Use Mailpit for development/tests and Resend for production",
    );
  return {
    mail,
    secret: z.string().min(32).parse(env.MAIL_ENCRYPTION_KEY),
    databaseURL: z.string().min(1).parse(env.WORKER_DATABASE_URL),
  };
}
