import { identityEnvironment } from "@fitloom/application";
import { headers } from "next/headers";
import { identityService } from "../../server/identity";
import { AccountPanel } from "./account-panel";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "Your account | Fitloom",
  referrer: "no-referrer",
};
export default async function Account({
  searchParams,
}: {
  searchParams: Promise<{
    token?: string;
    error?: string;
    invite?: string;
    verified?: string;
  }>;
}) {
  let user = null;
  try {
    const current = await identityService().identity(await headers());
    user = { name: current.user.name, email: current.user.email };
  } catch {
    /* Account entry is public; protected routes enforce identity separately. */
  }
  const query = await searchParams;
  const { config } = identityEnvironment(process.env);
  return (
    <main className="account-shell">
      <aside className="account-intro">
        <a href="/" className="account-brand">
          fitloom
        </a>
        <div>
          <p className="account-eyebrow">MADE FOR YOUR EVERYDAY CRAFT</p>
          <h1>
            A place for
            <br />
            your craft.
          </h1>
          <p>
            Your work, your people, your shop.
            <br />
            Start with an account that belongs to you.
          </p>
        </div>
        <p className="account-footnote">Thoughtfully put together.</p>
      </aside>
      <AccountPanel
        initialUser={user}
        verificationComplete={query.verified === "1" && !query.error}
        {...(config.mode !== "production"
          ? {
              testingInboxURL:
                process.env.MAILPIT_PUBLIC_URL ??
                (config.mode === "test"
                  ? "http://127.0.0.1:24422"
                  : "http://127.0.0.1:24420"),
            }
          : {})}
        destination={
          query.invite && /^[0-9a-f-]{36}$/i.test(query.invite)
            ? `/invitations/${query.invite}`
            : "/workspaces"
        }
        {...(query.token ? { resetToken: query.token } : {})}
        {...(query.error ? { verificationError: query.error } : {})}
      />
    </main>
  );
}
