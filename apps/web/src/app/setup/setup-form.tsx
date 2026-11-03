"use client";
import {
  completedSetupSchema,
  type SetupDraft,
  setupDraftSchema,
} from "@fitloom/application/workspace-contracts";
import { type FormEvent, useState } from "react";
export function SetupForm({
  initial,
  version,
  tenantId,
}: {
  initial: SetupDraft;
  version: number;
  tenantId: string | null;
}) {
  const [draft, setDraft] = useState(initial),
    [currentVersion, setVersion] = useState(version),
    [saved, setSaved] = useState(JSON.stringify(initial)),
    [busy, setBusy] = useState<"saving" | "creating" | "starting" | null>(null),
    [notice, setNotice] = useState("");
  async function send(path: string, payload: unknown) {
    const response = await fetch(path, {
      method: "POST",
      signal: AbortSignal.timeout(20000),
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        operationKey: crypto.randomUUID(),
        correlationId: crypto.randomUUID(),
        payload,
      }),
    });
    const value: unknown = await response.json();
    if (!response.ok)
      throw new Error(
        typeof value === "object" &&
          value !== null &&
          "message" in value &&
          typeof value.message === "string"
          ? value.message
          : "Setup could not be saved",
      );
    return value;
  }
  async function persist(profile: SetupDraft) {
    const result = await send("/api/setup", {
      ...profile,
      expectedVersion: currentVersion,
    });
    if (
      typeof result !== "object" ||
      result === null ||
      !("result" in result) ||
      typeof result.result !== "object" ||
      result.result === null ||
      !("version" in result.result) ||
      typeof result.result.version !== "number"
    )
      throw new Error("Setup response unavailable");
    setVersion(result.result.version);
    setSaved(JSON.stringify(profile));
    return result.result.version;
  }
  async function save() {
    setBusy("saving");
    setNotice("");
    try {
      await persist(draft);
      setNotice(
        "Progress saved. You can return to this setup from another session.",
      );
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Try again");
    } finally {
      setBusy(null);
    }
  }
  async function provision() {
    setBusy("creating");
    setNotice("");
    try {
      const completed = completedSetupSchema.safeParse(draft);
      if (!completed.success)
        throw new Error(
          completed.error.issues
            .map((issue) => `${issue.path.join(" ")}: ${issue.message}`)
            .join(". "),
        );
      const profile = completed.data;
      const version =
        currentVersion === 0 || JSON.stringify(profile) !== saved
          ? await persist(profile)
          : currentVersion;
      await send("/api/setup/provision", {
        ...profile,
        expectedVersion: version,
      });
      window.location.assign("/workspaces");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Try again");
    } finally {
      setBusy(null);
    }
  }
  function textField(
    key:
      | "shopName"
      | "locationName"
      | "ownerName"
      | "ownerPhone"
      | "address"
      | "timezone",
    label: string,
    max: number,
  ) {
    return (
      <label>
        {label}
        <input
          name={key}
          value={draft[key]}
          maxLength={max}
          onChange={(e) => setDraft({ ...draft, [key]: e.target.value })}
        />
      </label>
    );
  }
  return (
    <section className="setup-paper account-card">
      <p className="account-eyebrow">
        SHOP SETUP / YOUR PROGRESS IS SAVED ON REQUEST
      </p>
      <h1>Make room for your work.</h1>
      {tenantId ? (
        <>
          <p>
            This setup already created a shop. Continue to your workspaces or
            deliberately begin a new shop.
          </p>
          <a href="/workspaces">Open workspaces →</a>
          <button
            type="button"
            disabled={Boolean(busy)}
            className="account-secondary"
            onClick={async () => {
              setBusy("starting");
              try {
                await send("/api/setup/begin", {
                  expectedVersion: currentVersion,
                  createAnother: true,
                });
                window.location.reload();
              } catch (error) {
                setNotice(error instanceof Error ? error.message : "Try again");
              } finally {
                setBusy(null);
              }
            }}
          >
            Create another shop
          </button>
        </>
      ) : (
        <>
          <form
            aria-busy={Boolean(busy)}
            onSubmit={(event: FormEvent<HTMLFormElement>) => {
              event.preventDefault();
              void provision();
            }}
          >
            <fieldset disabled={Boolean(busy)}>
              <div className="setup-grid">
                {textField("shopName", "Shop name", 200)}
                <label>
                  Business mode
                  <select
                    value={draft.businessMode}
                    onChange={(e) =>
                      setDraft(
                        setupDraftSchema.parse({
                          ...draft,
                          businessMode: e.target.value,
                        }),
                      )
                    }
                  >
                    <option value="tailoring">Tailoring</option>
                    <option value="boutique">Boutique</option>
                    <option value="mixed">Tailoring & boutique</option>
                  </select>
                </label>
                {textField("ownerName", "Owner contact name", 200)}
                {textField("ownerPhone", "Owner contact phone", 30)}
                {textField("locationName", "First location name", 200)}
                {textField(
                  "timezone",
                  "Location timezone, e.g. Asia/Kolkata",
                  100,
                )}
              </div>
              {textField("address", "Location address", 1000)}
              <label className="setup-consent">
                <input
                  type="checkbox"
                  checked={draft.consentAccepted}
                  onChange={(e) =>
                    setDraft({ ...draft, consentAccepted: e.target.checked })
                  }
                />
                I confirm I am authorized to create this business workspace and
                store the information I provide.
              </label>
              <div className="setup-actions">
                <button
                  type="submit"
                  disabled={Boolean(busy)}
                  aria-busy={busy === "creating"}
                >
                  {busy === "creating" ? "Creating shop…" : "Create shop →"}
                </button>
                <button
                  type="button"
                  className="account-secondary"
                  disabled={Boolean(busy)}
                  aria-busy={busy === "saving"}
                  onClick={() => void save()}
                >
                  {busy === "saving" ? "Saving progress…" : "Save progress"}
                </button>
              </div>
            </fieldset>
          </form>
          <p className="account-muted">
            Create shop saves your latest details first. You can also save
            incomplete progress and finish later. Your verified account email
            becomes the owner contact email.
          </p>
        </>
      )}
      <p role="status" className="account-notice">
        {notice}
      </p>
    </section>
  );
}
