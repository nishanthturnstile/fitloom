"use client";
import * as c from "@fitloom/application/import-contracts";
import { useCallback, useEffect, useRef, useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  useLeaveProtection,
  useNavigationGuard,
} from "@/components/workspace/navigation-guard";
import { ImportButton as Button } from "./import-button";
import {
  downloadImport,
  ImportRequestError,
  importDenied,
  importMessage,
  importRequest,
} from "./import-client";
import { ImportRecordEditor } from "./import-record-editor";
import { ImportSchemaEditor } from "./import-schema-editor";

type Family = ReturnType<typeof c.importFamily.parse>;
type Batch = ReturnType<typeof c.importBatch.parse>;
type Binding = ReturnType<typeof c.importSchemaBinding.parse>;
type Work =
  | { kind: "command"; path: string; bytes: string }
  | { kind: "chunk"; batchId: string }
  | { kind: "projection"; batchId: string };
type State = { kind: "idle" } | { kind: "working" | "uncertain"; work: Work };
const labels: Record<ReturnType<typeof c.importState.parse>, string> = {
  pending: "Pending",
  "in-progress": "In progress",
  created: "Created",
  reused: "Reused",
  "already-imported": "Already imported",
  skipped: "Skipped",
  "needs-review": "Needs review",
  failed: "Failed",
  cancelled: "Cancelled",
};
export function DomainImportPanel({
  family,
  api,
  initial,
}: {
  family: Family;
  api: string;
  initial: ReturnType<typeof c.importBatchList.parse>;
}) {
  const guard = useNavigationGuard(),
    [recent, setRecent] = useState(initial),
    [recentOffset, setRecentOffset] = useState(0),
    [namespace, setNamespace] = useState(""),
    [csv, setCSV] = useState(""),
    [fileName, setFileName] = useState(""),
    [bindings, setBindings] = useState<Binding[]>([]),
    [bindingDirty, setBindingDirty] = useState(false),
    [batch, setBatch] = useState<Batch | null>(null),
    [offset, setOffset] = useState(0),
    [dirtyRecords, setDirtyRecords] = useState<ReadonlySet<string>>(new Set()),
    [state, setState] = useState<State>({ kind: "idle" }),
    [message, setMessage] = useState(""),
    [denied, setDenied] = useState(false),
    [reading, setReading] = useState(false),
    [epoch, setEpoch] = useState(0);
  const live = useRef(true),
    fileReadId = useRef(0),
    readId = useRef(0),
    controller = useRef<AbortController | null>(null),
    locked = state.kind !== "idle",
    familyPath = `${api}/${family}`;
  useEffect(() => {
    live.current = true;
    return () => {
      live.current = false;
      controller.current?.abort();
    };
  }, []);
  const fail = useCallback((error: unknown) => {
    if (!live.current) return;
    setMessage(importMessage(error));
    if (importDenied(error)) {
      fileReadId.current++;
      setDenied(true);
      setBatch(null);
      setCSV("");
      setBindings([]);
      setRecent({ items: [], nextOffset: null });
      setDirtyRecords(new Set());
      setState({ kind: "idle" });
    }
  }, []);
  const markDirty = useCallback(
    (id: string, dirty: boolean) =>
      setDirtyRecords((previous) => {
        if (previous.has(id) === dirty) return previous;
        const next = new Set(previous);
        if (dirty) next.add(id);
        else next.delete(id);
        return next;
      }),
    [],
  );
  useLeaveProtection({
    active:
      !denied &&
      (state.kind !== "idle" ||
        dirtyRecords.size > 0 ||
        bindingDirty ||
        (!batch && Boolean(csv || namespace))),
    uncertain: state.kind === "uncertain",
    locked: state.kind === "working",
    noun: "import review",
  });
  const load = async (id: string, nextOffset = 0) => {
    const request = ++readId.current;
    controller.current?.abort();
    const current = new AbortController();
    controller.current = current;
    setReading(true);
    try {
      const result = await importRequest(
        `${familyPath}/status`,
        c.importBatch,
        { batchId: id, offset: nextOffset },
        current.signal,
      );
      if (live.current && request === readId.current) {
        setBatch(result);
        setOffset(nextOffset);
        setDirtyRecords(new Set());
      }
    } catch (error) {
      if (request === readId.current && !current.signal.aborted) fail(error);
    } finally {
      if (live.current && request === readId.current) setReading(false);
    }
  };
  const recentPage = async (nextOffset: number) => {
    if (!guard.confirmLeave()) return;
    try {
      const result = await importRequest(
        `${familyPath}/batches`,
        c.importBatchList,
        { offset: nextOffset },
      );
      if (live.current) {
        setRecent(result);
        setRecentOffset(nextOffset);
      }
    } catch (error) {
      fail(error);
    }
  };
  const recover = async (id: string) => {
    let result = await importRequest(`${familyPath}/status`, c.importBatch, {
        batchId: id,
      }),
      current = result,
      active = false;
    for (;;) {
      for (const row of current.items) {
        if (
          ["in-progress", "created", "reused", "already-imported"].includes(
            row.state,
          ) &&
          row.requestHash
        ) {
          const found = await importRequest(
            `${api}/recover`,
            c.importRecovered,
            {
              family,
              batchId: id,
              logicalRecordId: row.id,
              operationKey: row.operationKey,
              requestHash: row.requestHash,
            },
          );
          if (found.kind === "in-progress") active = true;
        }
      }
      if (current.nextOffset === null) break;
      current = await importRequest(`${familyPath}/status`, c.importBatch, {
        batchId: id,
        offset: current.nextOffset,
      });
    }
    result = await importRequest(`${familyPath}/status`, c.importBatch, {
      batchId: id,
      offset,
    });
    return { result, active };
  };
  const perform = async (work: Work, retry = false) => {
    readId.current++;
    controller.current?.abort();
    setReading(false);
    setState({ kind: "working", work });
    setMessage("");
    let committed: string | null = null;
    try {
      let result: Batch;
      if (work.kind === "command") {
        const response = await importRequest(
          work.path,
          c.importResponse,
          work.bytes,
        );
        committed = response.result.batchId;
        if (!live.current) return;
        setCSV("");
        setFileName("");
        setBindingDirty(false);
        if (
          response.result.state === "preview" ||
          response.result.state === "cancelled"
        )
          setDirtyRecords(new Set());
        result = await importRequest(`${familyPath}/status`, c.importBatch, {
          batchId: committed,
          offset: response.result.state === "preview" ? 0 : offset,
        });
        setMessage(
          response.result.state === "needs-review"
            ? "This group changed. Review the refreshed candidates before approving again."
            : response.result.state === "preview"
              ? "Dry-run saved. Review every group before committing. No customer or measurement records have been created."
              : "Review saved.",
        );
      } else if (work.kind === "projection")
        result = await importRequest(`${familyPath}/status`, c.importBatch, {
          batchId: work.batchId,
          offset,
        });
      else {
        if (retry) {
          const recovered = await recover(work.batchId);
          if (recovered.active) {
            setBatch(recovered.result);
            setState({ kind: "uncertain", work });
            setMessage(
              "A previous attempt is still active. Check recovery again before scheduling more work.",
            );
            return;
          }
        }
        result = await importRequest(`${familyPath}/chunk`, c.importBatch, {
          batchId: work.batchId,
        });
        setOffset(0);
        setMessage(
          result.state === "complete"
            ? "Import complete. All groups are created, reused, already imported or explicitly skipped."
            : result.state === "cancelled"
              ? "Import cancelled. Committed successes are preserved."
              : "Chunk settled. Review the counts and continue approved groups, or resolve failed groups.",
        );
      }
      if (!live.current) return;
      setBatch(result);
      setState({ kind: "idle" });
      setRecent(
        await importRequest(`${familyPath}/batches`, c.importBatchList, {
          offset: recentOffset,
        }),
      );
    } catch (error) {
      if (!live.current) return;
      if (importDenied(error)) {
        fail(error);
        return;
      }
      if (committed) {
        setState({
          kind: "uncertain",
          work: { kind: "projection", batchId: committed },
        });
        setMessage(
          "The operation completed. Reload its protected outcome without submitting another write.",
        );
        return;
      }
      const uncertain =
        !(error instanceof ImportRequestError) ||
        ["temporary", "busy"].includes(error.code);
      setState(uncertain ? { kind: "uncertain", work } : { kind: "idle" });
      setMessage(importMessage(error));
    }
  };
  const command = (action: "preview" | "decide" | "cancel", payload: unknown) =>
    void perform({
      kind: "command",
      path: `${familyPath}/commands/${action}`,
      bytes: JSON.stringify({
        payload,
        operationKey: crypto.randomUUID(),
        correlationId: crypto.randomUUID(),
      }),
    });
  const start = () => {
    const parsed = c.importPreviewRequest.safeParse({
      namespace,
      csv,
      bindings,
    });
    if (!parsed.success) {
      setMessage(
        "Enter a source namespace and a supported CSV before starting the dry-run.",
      );
      document.getElementById("import-namespace")?.focus();
      return;
    }
    setOffset(0);
    command("preview", parsed.data);
  };
  const review = (
    record: Batch["items"][number],
    decision: ReturnType<typeof c.importDecision.parse>,
  ) => {
    if (!batch) return;
    command("decide", {
      batchId: batch.id,
      recordId: record.id,
      expectedRevision: record.revision,
      decision,
      bindings,
    });
  };
  const resume = (id: string) => {
    if (!guard.confirmLeave()) return;
    fileReadId.current++;
    setCSV("");
    setFileName("");
    setBindings([]);
    setBindingDirty(false);
    setDirtyRecords(new Set());
    void load(id);
  };
  const newPreview = () => {
    if (!guard.confirmLeave()) return;
    readId.current++;
    controller.current?.abort();
    setReading(false);
    fileReadId.current++;
    setBatch(null);
    setNamespace("");
    setCSV("");
    setFileName("");
    setBindings([]);
    setBindingDirty(false);
    setDirtyRecords(new Set());
    setMessage("");
  };
  const expired = batch ? Date.parse(batch.expiresAt) <= Date.now() : false;
  if (denied)
    return (
      <Alert>
        <AlertDescription>
          Import access is unavailable. Private preview content has been
          removed.
        </AlertDescription>
      </Alert>
    );
  return (
    <section
      aria-label={`${family} import`}
      className="flex min-w-0 flex-col gap-6"
    >
      <div className="flex flex-wrap gap-4">
        <a
          className="text-primary underline"
          href={api.replace("/api/", "/").replace(/\/imports$/, "/customers")}
        >
          Back to customers
        </a>
        <Button
          type="button"
          variant="outline"
          disabled={locked}
          onClick={newPreview}
        >
          New dry-run
        </Button>
      </div>
      {message ? (
        <Alert>
          <AlertDescription role="status">{message}</AlertDescription>
        </Alert>
      ) : null}
      {state.kind === "uncertain" ? (
        <Button
          type="button"
          className="self-start"
          onClick={() => void perform(state.work, true)}
        >
          {state.work.kind === "chunk"
            ? "Recover import before retry"
            : "Retry exact import operation"}
        </Button>
      ) : null}
      {!batch ? (
        <Card>
          <CardHeader>
            <CardTitle>Start a reviewed import</CardTitle>
            <CardDescription>
              {family === "customers"
                ? "One source customer and its explicit wearers form one atomic group."
                : "One source profile and its full version history form one atomic group."}{" "}
              The dry-run checks the complete file. Committing is a separate
              action.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="import-namespace">
                  Source namespace
                </FieldLabel>
                <Input
                  id="import-namespace"
                  value={namespace}
                  maxLength={200}
                  disabled={locked}
                  onChange={(e) => setNamespace(e.target.value)}
                />
                <FieldDescription>
                  Use a stable, case-sensitive name for this source system.
                  Repeated source identities in this namespace cannot be
                  rebound.
                </FieldDescription>
              </Field>
              <Field>
                <FieldLabel htmlFor="import-file">CSV file</FieldLabel>
                <Input
                  id="import-file"
                  type="file"
                  accept=".csv,text/csv"
                  disabled={locked}
                  onChange={async (e) => {
                    const selection = ++fileReadId.current;
                    const file = e.target.files?.[0];
                    setCSV("");
                    setFileName("");
                    setMessage("");
                    if (!file) return;
                    try {
                      if (file.size > c.IMPORT_FILE_BYTES) {
                        setMessage("CSV exceeds 1 MiB.");
                        return;
                      }
                      const bytes = await file.arrayBuffer();
                      if (!live.current || selection !== fileReadId.current)
                        return;
                      let text: string;
                      try {
                        text = new TextDecoder("utf-8", { fatal: true }).decode(
                          bytes,
                        );
                      } catch {
                        setMessage("CSV must be valid UTF-8.");
                        return;
                      }
                      setCSV(text);
                      setFileName(file.name);
                      setMessage("");
                    } catch (error) {
                      if (live.current && selection === fileReadId.current)
                        fail(error);
                    }
                  }}
                />
                <FieldDescription>
                  UTF-8 CSV · up to 1 MiB and 200 data rows · 20 members per
                  group. {fileName ? `Selected: ${fileName}` : ""}
                </FieldDescription>
              </Field>
              {family === "customers" ? (
                <Button
                  type="button"
                  variant="outline"
                  className="self-start"
                  disabled={locked}
                  onClick={() =>
                    void downloadImport(
                      `${familyPath}/template`,
                      {},
                      "fitloom-customers-v1.csv",
                    ).catch(fail)
                  }
                >
                  Download customer CSV template
                </Button>
              ) : null}
              <Button
                type="button"
                className="self-start"
                disabled={locked || !csv || !namespace.trim()}
                onClick={start}
              >
                Preview complete CSV
              </Button>
            </FieldGroup>
          </CardContent>
        </Card>
      ) : null}
      {family === "measurements" ? (
        <ImportSchemaEditor
          api={api}
          bindings={bindings}
          disabled={locked || batch?.purged === true}
          onChange={(next) => {
            const parsed = c.importSchemaBinding
              .array()
              .max(20)
              .safeParse(next);
            if (parsed.success) {
              setBindings(parsed.data);
              setBindingDirty(true);
            } else setMessage("Check schema bindings and mappings.");
          }}
          onError={fail}
        />
      ) : null}
      {batch ? (
        <>
          <Card>
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <CardTitle>
                  {batch.state === "complete"
                    ? "Import complete"
                    : batch.state === "cancelled"
                      ? "Import cancelled"
                      : "Review and reconcile"}
                </CardTitle>
                <Badge variant="outline">{batch.state}</Badge>
              </div>
              <CardDescription>
                {batch.total} logical groups · {batch.csvRows.total} CSV data
                rows · {batch.csvRows.redundant} redundant rows ·{" "}
                {batch.csvRows.invalid} invalid-group rows. Preview expires{" "}
                {batch.expiresAt}.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex min-w-0 flex-col gap-5">
              <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
                {c.importState.options.map((state) => (
                  <div key={state}>
                    <dt className="text-sm text-muted-foreground">
                      {labels[state]}
                    </dt>
                    <dd className="font-mono text-xl">{batch.counts[state]}</dd>
                  </div>
                ))}
              </dl>
              {batch.purged ? (
                <Alert>
                  <AlertDescription>
                    Private preview content has been purged. Committed outcomes
                    and accepted source mappings remain protected and available.
                  </AlertDescription>
                </Alert>
              ) : expired ? (
                <Alert>
                  <AlertDescription>
                    This dry-run expired. Existing results remain recoverable.
                    New work needs a new dry-run.
                  </AlertDescription>
                </Alert>
              ) : null}
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  disabled={
                    locked ||
                    ((expired || batch.purged) &&
                      batch.counts["in-progress"] === 0) ||
                    batch.state === "complete" ||
                    batch.state === "cancelled" ||
                    dirtyRecords.size > 0
                  }
                  onClick={() =>
                    void perform(
                      { kind: "chunk", batchId: batch.id },
                      batch.counts["in-progress"] > 0,
                    )
                  }
                >
                  {batch.counts["in-progress"] > 0
                    ? "Recover active import"
                    : "Commit next approved chunk"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={locked}
                  onClick={() => {
                    if (guard.confirmLeave()) {
                      setEpoch((v) => v + 1);
                      setDirtyRecords(new Set());
                      setBindingDirty(false);
                      void perform({ kind: "projection", batchId: batch.id });
                    }
                  }}
                >
                  Refresh import status
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={
                    locked ||
                    batch.state === "complete" ||
                    batch.state === "cancelled"
                  }
                  onClick={() => {
                    if (
                      window.confirm(
                        "Cancel remaining import groups? Committed successes stay saved.",
                      )
                    )
                      command("cancel", { batchId: batch.id });
                  }}
                >
                  Cancel remaining groups
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={locked}
                  onClick={() =>
                    void downloadImport(
                      `${familyPath}/outcomes`,
                      { batchId: batch.id },
                      "fitloom-import-outcomes.json",
                    ).catch(fail)
                  }
                >
                  Download outcome JSON
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">
                Each chunk schedules at most 20 independent groups within its
                time budget. Failed and needs-review groups block successful
                completion. Repeated exact source groups report already
                imported.
              </p>
            </CardContent>
          </Card>
          {reading ? (
            <p role="status">Loading reviewed groups…</p>
          ) : (
            batch.items.map((record, index) => (
              <ImportRecordEditor
                key={`${record.id}:${record.revision}:${epoch}`}
                record={record}
                index={offset + index + 1}
                family={family}
                api={api}
                namespace={batch.namespace}
                disabled={
                  locked ||
                  expired ||
                  batch.purged ||
                  batch.state === "cancelled" ||
                  batch.state === "complete"
                }
                onReview={review}
                onDirty={markDirty}
                onError={fail}
              />
            ))
          )}
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={locked || reading || offset === 0}
              onClick={() => {
                if (guard.confirmLeave())
                  void load(batch.id, Math.max(0, offset - 25));
              }}
            >
              Previous import groups
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={locked || reading || batch.nextOffset === null}
              onClick={() => {
                if (guard.confirmLeave())
                  void load(batch.id, batch.nextOffset ?? 0);
              }}
            >
              Next import groups
            </Button>
          </div>
        </>
      ) : null}
      <Card>
        <CardHeader>
          <CardTitle>Your recent {family} imports</CardTitle>
          <CardDescription>
            Only batches created by your current account in this location appear
            here. Resume after reload without keeping CSV content in browser
            storage.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {recent.items.length ? (
            recent.items.map((item) => (
              <div
                key={item.id}
                className="flex flex-wrap items-center justify-between gap-3"
              >
                <p>
                  {item.createdAt} · {item.rowCount} rows · {item.state}
                </p>
                <Button
                  type="button"
                  variant="outline"
                  disabled={locked}
                  onClick={() => resume(item.id)}
                >
                  Resume import from {item.createdAt}
                </Button>
              </div>
            ))
          ) : (
            <p>No import batches yet.</p>
          )}
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={locked || recentOffset === 0}
              onClick={() => void recentPage(Math.max(0, recentOffset - 25))}
            >
              Newer import batches
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={locked || recent.nextOffset === null}
              onClick={() => void recentPage(recent.nextOffset ?? 0)}
            >
              Older import batches
            </Button>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
