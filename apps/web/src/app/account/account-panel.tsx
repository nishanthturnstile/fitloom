"use client";
import { type FormEvent, useState } from "react";

type User = { name: string; email: string };
type View =
  | "signin"
  | "register"
  | "recover"
  | "reset"
  | "challenge"
  | "backup"
  | { kind: "verification"; email: string };
class AuthRequestError extends Error {
  readonly code: string;
  constructor(message: string, code: string) {
    super(message);
    this.code = code;
  }
}
function field(form: FormData, key: string) {
  const value = form.get(key);
  return typeof value === "string" ? value : "";
}
async function request(path: string, body: Record<string, unknown>) {
  const response = await fetch(`/api/auth${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data: unknown = await response.json();
  if (!response.ok)
    throw new AuthRequestError(
      typeof data === "object" &&
        data !== null &&
        "message" in data &&
        typeof data.message === "string"
        ? data.message
        : "The request could not complete.",
      typeof data === "object" &&
        data !== null &&
        "code" in data &&
        typeof data.code === "string"
        ? data.code
        : "",
    );
  return data;
}
export function AccountPanel({
  initialUser,
  resetToken,
  verificationError,
  verificationComplete = false,
  testingInboxURL,
  destination = "/workspaces",
}: {
  initialUser: User | null;
  resetToken?: string;
  verificationError?: string;
  verificationComplete?: boolean;
  testingInboxURL?: string;
  destination?: string;
}) {
  const [user, setUser] = useState(resetToken ? null : initialUser),
    [view, setView] = useState<View>(resetToken ? "reset" : "signin"),
    [busy, setBusy] = useState(false),
    [notice, setNotice] = useState(
      verificationError
        ? "That link could not be verified. Request a fresh email."
        : verificationComplete
          ? "Email verified. Sign in to continue."
          : "",
    ),
    [enrollment, setEnrollment] = useState<{
      uri: string;
      codes: string[];
    } | null>(null);
  const verificationCallback = destination.startsWith("/invitations/")
    ? `/account?verified=1&invite=${destination.split("/").at(-1)}`
    : "/account?verified=1";
  async function refresh() {
    const response = await fetch("/api/session", { cache: "no-store" });
    const data: unknown = await response.json();
    if (
      response.ok &&
      typeof data === "object" &&
      data !== null &&
      "email" in data &&
      typeof data.email === "string" &&
      "name" in data &&
      typeof data.name === "string"
    )
      setUser({ email: data.email, name: data.name });
    else setUser(null);
  }
  async function run(action: () => Promise<void>) {
    setBusy(true);
    setNotice("");
    try {
      await action();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Please try again.");
    } finally {
      setBusy(false);
    }
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (typeof view === "object") return;
    const form = new FormData(event.currentTarget);
    await run(async () => {
      const email = field(form, "email"),
        password = field(form, "password");
      if (view === "register") {
        await request("/sign-up/email", {
          name: field(form, "name"),
          email,
          password,
          callbackURL: verificationCallback,
        });
        setView({ kind: "verification", email });
      } else if (view === "recover") {
        await request("/request-password-reset", {
          email,
          redirectTo: "/account/reset",
        });
        setNotice(
          "If that email has an account, a recovery link is on its way.",
        );
      } else if (view === "reset") {
        await request("/reset-password", {
          token: resetToken,
          newPassword: password,
        });
        window.history.replaceState(null, "", "/account");
        setView("signin");
        setUser(null);
        setNotice("Password updated. Sign in with your new password.");
      } else if (view === "challenge" || view === "backup") {
        await request(
          view === "backup"
            ? "/two-factor/verify-backup-code"
            : "/two-factor/verify-totp",
          { code: field(form, "code") },
        );
        await refresh();
        window.location.assign(destination);
        setView("signin");
        setNotice("Challenge verified.");
      } else {
        let data: unknown;
        try {
          data = await request("/sign-in/email", { email, password });
        } catch (error) {
          if (
            error instanceof AuthRequestError &&
            error.code === "EMAIL_NOT_VERIFIED"
          ) {
            setView({ kind: "verification", email });
            return;
          }
          throw error;
        }
        if (
          typeof data === "object" &&
          data !== null &&
          "twoFactorRedirect" in data &&
          data.twoFactorRedirect === true
        ) {
          setView("challenge");
          setNotice("Enter the code from your authenticator.");
        } else {
          await refresh();
          window.location.assign(destination);
        }
      }
    });
  }
  return (
    <section className="account-card" aria-label="Account access">
      {user ? (
        <>
          <p className="account-eyebrow">YOUR ACCOUNT</p>
          <a href="/workspaces">Your workspaces →</a>
          <h2>{user.name}</h2>
          <p className="account-muted">{user.email}</p>
          <div className="account-rule" />
          <h3>Account security</h3>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              const form = new FormData(event.currentTarget);
              void run(async () => {
                const data = await request("/two-factor/enable", {
                  password: field(form, "password"),
                  issuer: "Fitloom",
                });
                if (
                  typeof data !== "object" ||
                  data === null ||
                  !("totpURI" in data) ||
                  typeof data.totpURI !== "string" ||
                  !("backupCodes" in data) ||
                  !Array.isArray(data.backupCodes) ||
                  !data.backupCodes.every((code) => typeof code === "string")
                )
                  throw new Error("Could not prepare enrollment.");
                setEnrollment({ uri: data.totpURI, codes: data.backupCodes });
              });
            }}
          >
            <label>
              Current password
              <input
                name="password"
                type="password"
                autoComplete="current-password"
                required
                maxLength={128}
              />
            </label>
            <button type="submit" disabled={busy}>
              Set up authenticator
            </button>
          </form>
          {enrollment ? (
            <div className="account-enrollment">
              <p>
                Add Fitloom to your authenticator, then enter a generated code
                below. Save these backup codes privately.
              </p>
              <a href={enrollment.uri}>Open authenticator</a>
              <details>
                <summary>Show backup codes</summary>
                <ul>
                  {enrollment.codes.map((code) => (
                    <li key={code}>
                      <code>{code}</code>
                    </li>
                  ))}
                </ul>
              </details>
            </div>
          ) : null}
          <form
            onSubmit={(event) => {
              event.preventDefault();
              const form = new FormData(event.currentTarget);
              void run(async () => {
                await request("/two-factor/verify-totp", {
                  code: field(form, "code"),
                });
                setEnrollment(null);
                setNotice("Authenticator challenge verified.");
              });
            }}
          >
            <label>
              Authenticator code
              <input
                name="code"
                inputMode="numeric"
                autoComplete="one-time-code"
                required
                maxLength={6}
                minLength={6}
              />
            </label>
            <button type="submit" disabled={busy} className="account-secondary">
              Verify challenge
            </button>
          </form>
          <button
            type="button"
            disabled={busy}
            className="account-text"
            onClick={() =>
              void run(async () => {
                await request("/sign-out", {});
                setUser(null);
                setEnrollment(null);
                setView("signin");
              })
            }
          >
            Sign out
          </button>
        </>
      ) : typeof view === "object" ? (
        <>
          <p className="account-eyebrow">VERIFY YOUR EMAIL</p>
          <h2>Check your email</h2>
          <p>Your account needs email verification before you can sign in.</p>
          <p className="account-muted">
            Open the verification link sent to {view.email}, then return to sign
            in.
          </p>
          {testingInboxURL ? (
            <p className="account-muted">
              Development emails are captured in Mailpit and do not arrive in
              your real inbox.{" "}
              <a href={testingInboxURL} target="_blank" rel="noreferrer">
                Open Mailpit →
              </a>
            </p>
          ) : null}
          <div className="account-verification-actions">
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                setView("signin");
                setNotice(
                  "After opening your verification link, sign in with your email and password.",
                );
              }}
            >
              Continue to sign in →
            </button>
            <button
              type="button"
              className="account-secondary"
              disabled={busy}
              onClick={() =>
                void run(async () => {
                  await request("/send-verification-email", {
                    email: view.email,
                    callbackURL: verificationCallback,
                  });
                  setNotice(
                    "If verification is needed, a fresh email is on its way.",
                  );
                })
              }
            >
              Resend verification email
            </button>
          </div>
        </>
      ) : (
        <>
          <p className="account-eyebrow">
            {view === "register"
              ? "BEGIN WITH YOUR ACCOUNT"
              : view === "recover" || view === "reset"
                ? "RECOVER ACCESS"
                : view === "challenge" || view === "backup"
                  ? "ONE MORE STEP"
                  : "WELCOME BACK"}
          </p>
          <h2>
            {view === "register"
              ? "Create an account"
              : view === "recover"
                ? "Forgot your password?"
                : view === "reset"
                  ? "Choose a new password"
                  : view === "challenge" || view === "backup"
                    ? "Verify it’s you"
                    : "Sign in to Fitloom"}
          </h2>
          <form onSubmit={submit}>
            {view === "register" ? (
              <label>
                Your name
                <input
                  name="name"
                  autoComplete="name"
                  required
                  maxLength={100}
                />
              </label>
            ) : null}
            {view === "signin" || view === "register" || view === "recover" ? (
              <label>
                Email address
                <input
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  maxLength={254}
                />
              </label>
            ) : null}
            {view === "signin" || view === "register" || view === "reset" ? (
              <label>
                Password
                <input
                  name="password"
                  type="password"
                  autoComplete={
                    view === "signin" ? "current-password" : "new-password"
                  }
                  required
                  minLength={view === "signin" ? 1 : 12}
                  maxLength={128}
                />
              </label>
            ) : null}
            {view === "challenge" || view === "backup" ? (
              <label>
                {view === "backup" ? "Backup code" : "Authenticator code"}
                <input
                  name="code"
                  autoComplete="one-time-code"
                  inputMode={view === "challenge" ? "numeric" : "text"}
                  required
                  maxLength={80}
                />
              </label>
            ) : null}
            {view === "register" || view === "reset" ? (
              <p className="account-muted">Use at least 12 characters.</p>
            ) : null}
            <button type="submit" disabled={busy}>
              {busy
                ? "Please wait…"
                : view === "register"
                  ? "Create account →"
                  : view === "recover"
                    ? "Send recovery link →"
                    : view === "reset"
                      ? "Update password →"
                      : view === "challenge" || view === "backup"
                        ? "Verify code →"
                        : "Sign in →"}
            </button>
          </form>
          <nav className="account-links" aria-label="Account options">
            {view === "signin" ? (
              <>
                <button type="button" onClick={() => setView("register")}>
                  Create account
                </button>
                <button type="button" onClick={() => setView("recover")}>
                  Forgot password?
                </button>
              </>
            ) : view === "challenge" || view === "backup" ? (
              <button
                type="button"
                onClick={() =>
                  setView(view === "backup" ? "challenge" : "backup")
                }
              >
                {view === "backup" ? "Use authenticator" : "Use a backup code"}
              </button>
            ) : (
              <button type="button" onClick={() => setView("signin")}>
                Back to sign in
              </button>
            )}
          </nav>
          {view === "signin" ? (
            <form
              className="account-resend"
              onSubmit={(event) => {
                event.preventDefault();
                const form = new FormData(event.currentTarget);
                void run(async () => {
                  await request("/send-verification-email", {
                    email: field(form, "email"),
                    callbackURL: verificationCallback,
                  });
                  setNotice(
                    "If verification is needed, a fresh email is on its way.",
                  );
                });
              }}
            >
              <details>
                <summary>Need another verification email?</summary>
                <label>
                  Email address
                  <input
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                  />
                </label>
                <button
                  type="submit"
                  disabled={busy}
                  className="account-secondary"
                >
                  Resend verification
                </button>
              </details>
            </form>
          ) : null}
          {testingInboxURL &&
          view !== "reset" &&
          view !== "challenge" &&
          view !== "backup" ? (
            <p className="account-muted">
              Development email goes to the local test inbox.{" "}
              <a href={testingInboxURL} target="_blank" rel="noreferrer">
                Open Mailpit →
              </a>
            </p>
          ) : null}
        </>
      )}
      <p role="status" aria-live="polite" className="account-notice">
        {notice}
      </p>
    </section>
  );
}
