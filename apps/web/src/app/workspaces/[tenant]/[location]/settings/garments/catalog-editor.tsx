"use client";
import * as c from "@fitloom/application/master-contracts";
import { useState } from "react";
import { Control, type Issues } from "./editor-controls";
import { RateControl } from "./eligibility-editor";
import { type Row, rate, resource, response } from "./master-client";
export type CatalogItem =
  | ReturnType<typeof c.serviceVersion.parse>
  | ReturnType<typeof c.addonVersion.parse>
  | ReturnType<typeof c.pricedAddonVersion.parse>;
export const catalogItemSchema = (kind: "service" | "addon") => ({
  parse(input: unknown): CatalogItem {
    if (kind === "service") return c.serviceVersion.parse(input);
    const priced = c.pricedAddonVersion.safeParse(input);
    return priced.success ? priced.data : c.addonVersion.parse(input);
  },
});
export type CatalogDraft = (
  | { kind: "new" }
  | { kind: "saved"; row: Row; current: CatalogItem }
) &
  (
    | { entity: "service"; label: string }
    | { entity: "addon"; label: string; amount: string }
  );
export function CatalogEditor({
  draft,
  history,
  base,
  disabled,
  canManage,
  busy,
  dirty,
  issues,
  onChange,
  onSave,
  onClose,
  onReload,
  onMoreHistory,
}: {
  draft: CatalogDraft;
  history: ReturnType<typeof c.masterHistoryPage.parse> | null;
  base: string;
  disabled: boolean;
  canManage: boolean;
  busy: boolean;
  dirty: boolean;
  issues: Issues;
  onChange: (draft: CatalogDraft) => void;
  onSave: () => void;
  onClose: () => void;
  onReload: () => void;
  onMoreHistory: () => Promise<void>;
}) {
  const [snapshot, setSnapshot] = useState<CatalogItem | null>(null),
    [error, setError] = useState("");
  async function inspect(versionId: string) {
    if (draft.kind !== "saved") return;
    try {
      setSnapshot(
        await response(
          fetch(
            `${base}/${resource(draft.entity)}/${draft.row.id}/versions/${versionId}`,
            { cache: "no-store" },
          ),
          catalogItemSchema(draft.entity),
        ),
      );
      setError("");
    } catch {
      setError("Saved revision could not be reached. Try again.");
    }
  }
  return (
    <>
      <section
        className="master-editor"
        aria-label={
          draft.entity === "service" ? "Service editor" : "Add-on editor"
        }
      >
        <div className="master-editor-heading">
          <h2>
            {draft.kind === "new"
              ? `New ${draft.entity === "service" ? "service" : "add-on"}`
              : draft.current.label}
          </h2>
          <span>
            {draft.kind === "saved"
              ? `Revision ${draft.current.revision} · ${draft.row.active ? "active" : "inactive"}`
              : "Unsaved"}
            {dirty ? " · unsaved changes" : ""}
          </span>
        </div>
        {!canManage && (
          <p>Read-only view. Your role cannot publish catalog changes.</p>
        )}
        {issues.length > 0 && (
          <div className="master-error-summary" role="alert">
            {issues.map((i) => (
              <p key={`${i.path.join(".")}-${i.message}`}>{i.message}</p>
            ))}
          </div>
        )}
        <fieldset disabled={disabled} className="master-edit-fields">
          <div className="master-section">
            <h3>
              {draft.entity === "service"
                ? "Service identity"
                : "Add-on identity and price"}
            </h3>
            <Control
              label={
                draft.entity === "service" ? "Service name" : "Add-on name"
              }
              path={["label"]}
              issues={issues}
            >
              {(props) => (
                <input
                  {...props}
                  value={draft.label}
                  maxLength={100}
                  onChange={(e) =>
                    onChange({ ...draft, label: e.target.value })
                  }
                />
              )}
            </Control>
            {draft.entity === "addon" &&
              (draft.kind === "new" || "amount" in draft.current) && (
                <RateControl
                  optional={false}
                  label="Add-on price (INR)"
                  value={draft.amount}
                  path={["amount"]}
                  issues={issues}
                  onChange={(amount) =>
                    onChange({ ...draft, amount: amount ?? "" })
                  }
                />
              )}
            <p className="master-muted">
              Saving creates a new revision. Garment history keeps the labels
              saved with each garment version.
            </p>
          </div>
        </fieldset>
        <div className="master-save-bar">
          <div className="master-actions">
            {canManage && (
              <button
                type="button"
                className="master-primary"
                disabled={disabled || !dirty}
                onClick={onSave}
              >
                Save new version
              </button>
            )}
            {draft.kind === "saved" && (
              <button type="button" disabled={busy} onClick={onReload}>
                Reload saved version
              </button>
            )}
            <button type="button" disabled={busy} onClick={onClose}>
              Cancel
            </button>
          </div>
        </div>
      </section>
      <aside
        className="master-inspector"
        key={draft.kind === "saved" ? draft.current.id : `new-${draft.entity}`}
      >
        <h2>Saved history</h2>
        {error && <p role="alert">{error}</p>}
        {snapshot && (
          <section aria-label="Historical catalog record">
            <h3>Saved revision {snapshot.revision}</h3>
            <p>{snapshot.label}</p>
            {"amount" in snapshot && (
              <p>Saved add-on price: {rate(snapshot.amount)}</p>
            )}
          </section>
        )}
        <ol>
          {history?.items.map((v) => (
            <li key={v.id}>
              <button
                type="button"
                disabled={busy}
                onClick={() => void inspect(v.id)}
              >
                Revision {v.revision}
              </button>
              <small>{new Date(v.createdAt).toLocaleString()}</small>
            </li>
          ))}
        </ol>
        {history?.nextOffset !== null && history && (
          <button
            type="button"
            disabled={busy}
            onClick={() => void onMoreHistory()}
          >
            More history
          </button>
        )}
      </aside>
    </>
  );
}
