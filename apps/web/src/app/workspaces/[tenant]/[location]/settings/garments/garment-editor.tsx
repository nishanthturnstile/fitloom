"use client";
import type * as c from "@fitloom/application/master-contracts";
import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Issues } from "./editor-controls";
import { EditorSaveBar } from "./editor-save-bar";

export const editorSteps = [
  { id: "identity", label: "Identity" },
  { id: "measurements", label: "Measurements" },
  { id: "construction", label: "Construction" },
  { id: "services", label: "Services & rates" },
  { id: "addons", label: "Add-ons" },
  { id: "review", label: "Preview & history" },
] as const;
export type EditorStep = (typeof editorSteps)[number]["id"];
export function issueStep(path: readonly (string | number)[]): EditorStep {
  const key = path[0] === "definition" ? path[1] : path[0];
  if (key === "fields" || key === "sections") return "measurements";
  if (key === "constructionGroups") return "construction";
  if (
    key === "services" ||
    key === "baseRate" ||
    key === "serviceOverrides" ||
    key === "currency"
  )
    return "services";
  if (key === "addons") return "addons";
  return "identity";
}
export function GarmentEditor(props: {
  name: string;
  origin: string;
  revision: number | null;
  active: boolean | null;
  canChangeActive: boolean;
  onActive: (active: boolean) => void;
  step: EditorStep;
  onStep: (step: EditorStep) => void;
  rail: "preview" | "history";
  onRail: (rail: "preview" | "history") => void;
  definition: c.GarmentDefinition;
  dirty: boolean;
  writable: boolean;
  locked: boolean;
  busy: boolean;
  issues: Issues;
  onIssue: (issue: Issues[number]) => void;
  onSave: () => void;
  onCancel: () => void;
  onBack: () => void;
  identity: ReactNode;
  measurements: ReactNode;
  construction: ReactNode;
  eligibility: ReactNode;
  preview: ReactNode;
  history: ReactNode;
  recovery: ReactNode;
}) {
  const { step, definition } = props;
  return (
    <section
      className="garment-editor master-editor"
      aria-label="Garment schema editor"
      data-step={step}
    >
      <header className="editor-heading">
        <div className="flex flex-col gap-3">
          <Button
            variant="ghost"
            size="sm"
            className="w-fit"
            onClick={props.onBack}
          >
            ← Back to garments
          </Button>
          <h1 className="font-heading text-2xl font-medium tracking-tight">
            {props.name}
          </h1>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">{props.origin}</Badge>
            <Badge variant="secondary">
              {props.active === null
                ? "Unsaved"
                : props.active
                  ? "Active"
                  : "Inactive"}
            </Badge>
            {props.revision !== null && (
              <span className="font-mono text-xs text-muted-foreground">
                Revision {props.revision}
              </span>
            )}
            <span className="text-xs text-muted-foreground">
              {props.dirty ? "Unsaved changes" : "No unsaved changes"}
            </span>
          </div>
        </div>
        <div className="flex flex-col items-start gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              props.onRail("preview");
              props.onStep("review");
            }}
          >
            Preview
          </Button>
          {props.active !== null && (
            <div>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={props.active}
                  disabled={!props.canChangeActive}
                  aria-describedby="editor-active-help"
                  onChange={(event) => props.onActive(event.target.checked)}
                />
                Active garment
              </label>
              <p
                id="editor-active-help"
                className="mt-1 max-w-64 text-xs text-muted-foreground"
              >
                Status saves immediately for the whole shop. Saved schema
                versions are unchanged.
              </p>
            </div>
          )}
        </div>
      </header>
      <nav aria-label="Garment editor steps" className="editor-steps">
        <ol>
          {editorSteps.map((item, index) => (
            <li key={item.id}>
              <button
                type="button"
                aria-current={step === item.id ? "step" : undefined}
                aria-label={`${item.label} step`}
                onClick={() => props.onStep(item.id)}
              >
                <span className="font-mono text-xs">{index + 1}</span>
                {item.label}
                {props.issues.some(
                  (issue) => issueStep(issue.path) === item.id,
                ) && (
                  <span
                    className="text-destructive"
                    role="img"
                    aria-label="Has errors"
                  >
                    !
                  </span>
                )}
              </button>
            </li>
          ))}
        </ol>
      </nav>
      {props.issues.length > 0 && (
        <div
          id="editor-error-summary"
          tabIndex={-1}
          role="alert"
          className="editor-errors"
        >
          <p>Check this configuration:</p>
          <ul>
            {props.issues.map((issue) => (
              <li key={`${issue.path.join(".")}-${issue.message}`}>
                <button type="button" onClick={() => props.onIssue(issue)}>
                  {issue.message}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
      {!props.writable && (
        <p className="text-sm text-muted-foreground">
          Read-only view. Your role cannot publish garment changes.
        </p>
      )}
      <div className="editor-body">
        <form
          id="garment-definition-form"
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            if (props.writable && !props.locked) props.onSave();
          }}
        >
          <fieldset
            className="editor-domain"
            disabled={!props.writable || props.locked}
          >
            <div id="editor-step-identity" hidden={step !== "identity"}>
              {props.identity}
            </div>
            <div id="editor-step-measurements" hidden={step !== "measurements"}>
              {props.measurements}
            </div>
            <div id="editor-step-construction" hidden={step !== "construction"}>
              {props.construction}
            </div>
          </fieldset>
          <div
            id={`editor-step-${step === "addons" ? "addons" : "services"}`}
            className="editor-domain"
            hidden={step !== "services" && step !== "addons"}
          >
            {props.eligibility}
          </div>
          <section
            id="editor-step-review"
            hidden={step !== "review"}
            className="editor-review"
          >
            <h3 className="font-heading text-lg font-medium">
              Inspect this garment
            </h3>
            <p className="text-sm text-muted-foreground">
              Review the current draft in Preview or select a saved revision
              from History. No wearer values are saved here.
            </p>
            <dl className="mt-5 grid grid-cols-2 gap-4 text-sm">
              <div>
                <dt>Measurements</dt>
                <dd className="font-mono">{definition.fields.length}</dd>
              </div>
              <div>
                <dt>Construction groups</dt>
                <dd className="font-mono">
                  {definition.constructionGroups.length}
                </dd>
              </div>
            </dl>
          </section>
        </form>
        <aside className="editor-rail" aria-label="Preview and saved history">
          <Tabs
            value={props.rail}
            onValueChange={(value) => {
              if (value === "preview" || value === "history")
                props.onRail(value);
            }}
          >
            <TabsList variant="line">
              <TabsTrigger value="preview">Preview</TabsTrigger>
              <TabsTrigger value="history">History</TabsTrigger>
            </TabsList>
            <TabsContent value="preview" keepMounted>
              {props.preview}
            </TabsContent>
            <TabsContent value="history" keepMounted>
              {props.history}
            </TabsContent>
          </Tabs>
        </aside>
      </div>
      <EditorSaveBar
        dirty={props.dirty}
        definition={definition}
        writable={props.writable}
        locked={props.locked}
        busy={props.busy}
        form="garment-definition-form"
        recovery={props.recovery}
        onCancel={props.onCancel}
      />
    </section>
  );
}
