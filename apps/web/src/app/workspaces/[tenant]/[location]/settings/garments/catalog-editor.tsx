"use client";
import * as c from "@fitloom/application/master-contracts";
import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FieldGroup } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Control, type Issues } from "./editor-controls";
import { EditorSaveBar } from "./editor-save-bar";
import { RateControl } from "./eligibility-editor";
import { type Row, rate } from "./master-client";
import { MasterHistory } from "./master-history";
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
export function CatalogEditor(props: {
  draft: CatalogDraft;
  history: ReturnType<typeof c.masterHistoryPage.parse> | null;
  snapshot: CatalogItem | null;
  showRates: boolean;
  disabled: boolean;
  locked: boolean;
  canManage: boolean;
  busy: boolean;
  dirty: boolean;
  issues: Issues;
  recovery: ReactNode;
  onChange: (draft: CatalogDraft) => void;
  onSave: () => void;
  onClose: () => void;
  onReload: () => void;
  onInspect: (versionId: string) => void;
  onMoreHistory: () => Promise<void>;
}) {
  const { draft, snapshot } = props;
  const noun = draft.entity === "service" ? "service" : "add-on";
  return (
    <section
      className="garment-editor catalog-editor master-editor"
      aria-label={
        draft.entity === "service" ? "Service editor" : "Add-on editor"
      }
    >
      <header className="editor-heading">
        <div>
          <p className="mb-2 text-xs text-muted-foreground">
            Shop catalog · {noun}
          </p>
          <h2 className="font-heading text-2xl font-medium tracking-tight">
            {draft.kind === "new" ? `New ${noun}` : draft.current.label}
          </h2>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Badge variant="outline">
              {draft.kind === "new"
                ? "Unsaved"
                : draft.row.active
                  ? "Active"
                  : "Inactive"}
            </Badge>
            {draft.kind === "saved" && (
              <span className="font-mono text-xs text-muted-foreground">
                Revision {draft.current.revision}
              </span>
            )}
          </div>
        </div>
      </header>
      {!props.canManage && (
        <p className="mb-4 text-sm text-muted-foreground">
          Read-only view. Your role cannot publish catalog changes.
        </p>
      )}
      {props.issues.length > 0 && (
        <div className="editor-errors" role="alert">
          {props.issues.map((issue) => (
            <p key={`${issue.path.join(".")}-${issue.message}`}>
              {issue.message}
            </p>
          ))}
        </div>
      )}
      <div className="editor-body">
        <form
          id="catalog-definition-form"
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            if (!props.disabled) props.onSave();
          }}
        >
          <fieldset disabled={props.disabled} className="editor-domain">
            <h3>
              {draft.entity === "service"
                ? "Service identity"
                : "Add-on identity and price"}
            </h3>
            <FieldGroup>
              <Control
                label={
                  draft.entity === "service" ? "Service name" : "Add-on name"
                }
                path={["label"]}
                issues={props.issues}
              >
                {(control) => (
                  <Input
                    {...control}
                    value={draft.label}
                    maxLength={100}
                    onChange={(event) =>
                      props.onChange({ ...draft, label: event.target.value })
                    }
                  />
                )}
              </Control>
              {draft.entity === "addon" &&
                props.showRates &&
                (draft.kind === "new" || "amount" in draft.current) && (
                  <RateControl
                    optional={false}
                    label="Add-on price (INR)"
                    value={draft.amount}
                    path={["amount"]}
                    issues={props.issues}
                    onChange={(amount) =>
                      props.onChange({ ...draft, amount: amount ?? "" })
                    }
                  />
                )}
            </FieldGroup>
            <p className="mt-5 text-sm text-muted-foreground">
              {draft.entity === "service"
                ? "Garments hold their own base rates and service overrides."
                : "This price is separate from garment base rates and service overrides. Zero is a valid price; up to six decimal places are supported."}
            </p>
            <p className="mt-3 text-xs text-muted-foreground">
              Saving creates a new revision. Garment history keeps the labels
              saved with each garment version. Status changes are available in
              the register.
            </p>
          </fieldset>
        </form>
        <aside className="editor-rail">
          {snapshot && (
            <section
              aria-label="Historical catalog record"
              className="mb-5 rounded-md border border-border bg-muted/40 p-4"
            >
              <h3>Saved revision {snapshot.revision}</h3>
              <p className="break-words text-sm">{snapshot.label}</p>
              {props.showRates && "amount" in snapshot && (
                <p className="mt-2 font-mono text-sm">
                  Saved add-on price: {rate(snapshot.amount)}
                </p>
              )}
            </section>
          )}
          <MasterHistory
            history={props.history}
            currentVersionId={draft.kind === "saved" ? draft.current.id : null}
            selectedVersionId={snapshot?.id ?? null}
            disabled={props.busy}
            onInspect={props.onInspect}
            onMore={() => void props.onMoreHistory()}
          />
        </aside>
      </div>
      <EditorSaveBar
        dirty={props.dirty}
        writable={props.canManage}
        locked={props.disabled}
        busy={props.busy}
        form="catalog-definition-form"
        recovery={
          <>
            {props.recovery}
            {draft.kind === "saved" && (
              <Button
                variant="outline"
                size="sm"
                disabled={props.locked}
                onClick={props.onReload}
              >
                Reload saved version
              </Button>
            )}
          </>
        }
        onCancel={props.onClose}
      />
    </section>
  );
}
