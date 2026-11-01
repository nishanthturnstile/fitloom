// Schema generation only. This is not the application's auth admission configuration.
import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { betterAuth } from "better-auth";
import { twoFactor } from "better-auth/plugins/two-factor";
import { drizzle } from "drizzle-orm/node-postgres";

export const auth = betterAuth({
  database: drizzleAdapter(
    drizzle({
      connection: {
        connectionString: "postgresql://localhost/fitloom_schema_generation",
      },
    }),
    { provider: "pg" },
  ),
  emailAndPassword: { enabled: true, requireEmailVerification: true },
  session: { cookieCache: { enabled: false } },
  rateLimit: { enabled: true, storage: "database" },
  plugins: [twoFactor()],
});
