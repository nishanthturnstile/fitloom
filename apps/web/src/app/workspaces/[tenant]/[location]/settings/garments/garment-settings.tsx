"use client";
import {
  copyHistoricalDefinition,
  definitionIdentities,
  masterRequestFits,
} from "@fitloom/application/garment-definition";
import * as c from "@fitloom/application/master-contracts";
import {
  type WorkspaceView,
  workspaceView,
} from "@fitloom/application/workspace-contracts";
import { useEffect, useEffectEvent, useRef, useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useLeaveProtection } from "@/components/workspace/navigation-guard";
import { PageHeader } from "@/components/workspace/page-header";
import {
  type CatalogDraft,
  CatalogEditor,
  type CatalogItem,
  catalogItemSchema,
} from "./catalog-editor";
import { controlId, type Issues } from "./editor-controls";
import { ConstructionStep } from "./editor-steps/construction";
import { IdentityStep } from "./editor-steps/identity";
import { MeasurementsStep } from "./editor-steps/measurements";
import {
  EligibilityEditor,
  emptyRates,
  type RateDraft,
  ratesFrom,
} from "./eligibility-editor";
import { type EditorStep, GarmentEditor, issueStep } from "./garment-editor";
import { GarmentPreview } from "./garment-preview";
import {
  ApiError,
  type Detail,
  detailSchema,
  type Page,
  pageSchema,
  type Row,
  rate,
  resource,
  response,
} from "./master-client";
import { MasterHistory } from "./master-history";
import {
  MasterRegister,
  type RegisterFilters,
  type RegisterRead,
} from "./master-register";
import { MoveBeforeDialog } from "./move-before-dialog";
import { StarterLibrary } from "./starter-library";

type History = ReturnType<typeof c.masterHistoryPage.parse>;
type Draft = (
  | { kind: "new"; definition: c.GarmentDefinition }
  | {
      kind: "saved";
      current: Detail;
      definition: c.GarmentDefinition;
      active: boolean;
    }
) & { rates: RateDraft };
type Notice = {
  kind: "idle" | "error" | "conflict" | "uncertain" | "access";
  message: string;
};
type Workspace = Pick<
  WorkspaceView,
  "tenantId" | "locationId" | "shopName" | "locationName" | "permissions"
>;
function blank(): c.GarmentDefinition {
  return {
    formatVersion: 1,
    label: "",
    category: "Custom",
    applicability: "unspecified",
    iconId: null,
    help: "",
    illustrationId: null,
    sections: [],
    fields: [],
    constructionGroups: [],
    services: [],
    addons: [],
    sourceVersionId: null,
  };
}
function normalizeIssues(issues: Issues): Issues {
  return issues.map((issue) => {
    const path = issue.path[0] === "payload" ? issue.path.slice(1) : issue.path;
    return {
      ...issue,
      path: [
        "fields",
        "sections",
        "constructionGroups",
        "iconId",
        "label",
        "category",
        "help",
      ].includes(String(path[0]))
        ? ["definition", ...path]
        : path,
    };
  });
}
export function GarmentSettings({
  workspace,
  initialPage,
  initialCatalog,
  initialKind,
  focusSearch,
}: {
  workspace: Workspace;
  initialPage: Page;
  initialCatalog: c.MasterCatalog;
  initialKind: "garment" | "service" | "addon";
  focusSearch: boolean;
}) {
  const base = `/api/workspaces/${workspace.tenantId}/${workspace.locationId}/masters`;
  const [permissions, setPermissions] = useState(workspace.permissions);
  const [priceAccess, setPriceAccess] = useState(
    workspace.permissions.includes("masters.rates.read"),
  );
  const canManage =
    priceAccess &&
    ["masters.read", "masters.manage", "masters.rates.read"].every((p) =>
      permissions.includes(p),
    );
  const [editorOpen, setEditorOpen] = useState(false);
  const [pendingSearchFocus, setPendingSearchFocus] = useState(false);
  const [pendingEditorFocus, setPendingEditorFocus] = useState(false);
  const [editorStep, setEditorStep] = useState<EditorStep>("identity");
  const [editorRail, setEditorRail] = useState<"preview" | "history">(
    "preview",
  );
  const [editorOrigin, setEditorOrigin] = useState<"standard" | "custom">(
    "custom",
  );
  const [pendingIssue, setPendingIssue] = useState<Issues[number] | null>(null);
  const [offset, setOffset] = useState(0);
  const [page, setPage] = useState(initialPage),
    [catalog, setCatalog] = useState(initialCatalog),
    [kind, setKind] = useState<"garment" | "service" | "addon">(initialKind);
  const [filters, setFilters] = useState<RegisterFilters>({
    search: "",
    active: "active",
    origin: "all",
    visibility: "available",
    applicability: "",
  });
  const [registerRead, setRegisterRead] = useState<RegisterRead>({
    kind: "ready",
  });
  const filterTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const readSequence = useRef(0),
    readAbort = useRef<AbortController | null>(null),
    filterRequest = useRef(filters);
  const refreshAfterFilters = useEffectEvent((next: RegisterFilters) => {
    void refreshRegister(0, next);
  });
  useEffect(() => {
    if (filterRequest.current === filters) return;
    const timer = setTimeout(() => refreshAfterFilters(filters), 250);
    filterTimer.current = timer;
    return () => clearTimeout(timer);
  }, [filters]);
  useEffect(() => () => readAbort.current?.abort(), []);
  function changeFilters(next: RegisterFilters) {
    setRecentMove(null);
    focusAfterRead.current = null;
    readAbort.current?.abort();
    readSequence.current++;
    setOffset(0);
    setRegisterRead({ kind: "loading" });
    setFilters(next);
  }
  const [recentMove, setRecentMove] = useState<Row | null>(null);
  const focusAfterRead = useRef<string | null>(null);
  function revealEditor() {
    if (kind === "garment") setEditorOpen(true);
    setPendingEditorFocus(true);
  }
  useEffect(() => {
    if (!pendingEditorFocus || (kind === "garment" && !editorOpen)) return;
    const editor = document.getElementById("master-editor-workbench");
    editor?.scrollIntoView({ block: "start" });
    editor?.focus({ preventScroll: true });
    setPendingEditorFocus(false);
  }, [pendingEditorFocus, editorOpen, kind]);
  const [itemSnapshot, setItemSnapshot] = useState<CatalogItem | null>(null);
  const [itemDraft, setItemDraft] = useState<CatalogDraft | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null),
    [history, setHistory] = useState<History | null>(null),
    [snapshot, setSnapshot] = useState<Detail | null>(null),
    [busy, setBusy] = useState(false),
    [notice, setNotice] = useState<Notice>({ kind: "idle", message: "" }),
    [issues, setIssues] = useState<Issues>([]),
    [announcement, setAnnouncement] = useState(""),
    [moving, setMoving] = useState<Row | null>(null);
  const pending = useRef<{
      action: string;
      semantic: string;
      body: string;
    } | null>(null),
    retry = useRef<(() => Promise<void>) | null>(null);
  const garmentDirty =
    draft !== null &&
    (draft.kind === "new" ||
      JSON.stringify(draft.definition) !==
        JSON.stringify(draft.current.definition) ||
      JSON.stringify(draft.rates) !== JSON.stringify(ratesFrom(draft.current)));
  const itemDirty =
    itemDraft !== null &&
    (itemDraft.kind === "new" ||
      itemDraft.label !== itemDraft.current.label ||
      (itemDraft.entity === "addon" &&
        itemDraft.amount !==
          ("amount" in itemDraft.current ? itemDraft.current.amount : "")));
  const dirty = garmentDirty || itemDirty;
  const draftNoun = itemDraft ? "catalog" : "garment";
  const unresolved =
    notice.kind === "uncertain" ||
    (notice.kind === "access" && pending.current !== null);
  const locked = busy || unresolved;
  const writable =
    canManage &&
    notice.kind !== "access" &&
    (draft?.kind !== "saved" ||
      c.pricedGarmentDetail.safeParse(draft.current).success);
  useEffect(() => {
    if (locked || registerRead.kind !== "ready" || !focusAfterRead.current)
      return;
    const element = document.getElementById(
      `master-row-${focusAfterRead.current}`,
    );
    element?.focus();
    if (element && document.activeElement === element)
      focusAfterRead.current = null;
  }, [registerRead, locked]);
  useLeaveProtection({
    active: dirty || unresolved,
    uncertain: unresolved,
    noun: draftNoun,
    locked,
  });
  useEffect(() => {
    const focus = () => {
      setEditorOpen(false);
      setPendingSearchFocus(true);
    };
    if (focusSearch) focus();
    window.addEventListener("fitloom:catalog-search", focus);
    return () => window.removeEventListener("fitloom:catalog-search", focus);
  }, [focusSearch]);
  useEffect(() => {
    if (!pendingSearchFocus || editorOpen) return;
    document.querySelector<HTMLInputElement>("#catalog-prefix")?.focus();
    setPendingSearchFocus(false);
  }, [pendingSearchFocus, editorOpen]);
  const hasGarmentDraft = kind === "garment" && draft !== null;
  function focusIssue(issue: Issues[number]) {
    setEditorOpen(true);
    setEditorStep(issueStep(issue.path));
    setPendingIssue(issue);
  }
  useEffect(() => {
    const first = issues.find((issue) => issue.path[0] !== "starters");
    if (!hasGarmentDraft || !first) return;
    setEditorOpen(true);
    setEditorStep(issueStep(first.path));
    setPendingIssue(first);
  }, [issues, hasGarmentDraft]);
  useEffect(() => {
    if (!editorOpen || !pendingIssue || locked) return;
    const control = document.getElementById(controlId(pendingIssue.path));
    if (control?.offsetParent !== null) control?.focus();
    if (!control || document.activeElement !== control)
      document.getElementById("editor-error-summary")?.focus();
    setPendingIssue(null);
  }, [pendingIssue, editorOpen, locked]);
  const discard = () =>
    !(dirty || unresolved) ||
    window.confirm(
      unresolved
        ? "Discard local edits? The save may already have completed."
        : `Discard unsaved ${draftNoun} changes?`,
    );
  function edit(definition: c.GarmentDefinition) {
    setDraft((current) => (current ? { ...current, definition } : current));
    setIssues([]);
    pending.current = null;
    if (notice.kind !== "access") setNotice({ kind: "idle", message: "" });
  }
  function failed(error: unknown, mutation = false) {
    if (error instanceof ApiError) {
      if (error.status === 403) {
        setPriceAccess(false);
        setSnapshot(null);
        setItemSnapshot(null);
      }
      setIssues(
        kind === "garment" ? normalizeIssues(error.issues) : error.issues,
      );
      setNotice((previous) =>
        (previous.kind === "uncertain" ||
          (previous.kind === "access" && pending.current !== null)) &&
        !mutation &&
        error.status !== 403
          ? previous
          : {
              kind:
                error.status === 403
                  ? "access"
                  : error.status === 409
                    ? "conflict"
                    : error.status >= 500 && mutation
                      ? "uncertain"
                      : "error",
              message:
                error.status === 403
                  ? "Your access has changed. Local edits are preserved."
                  : error.status === 409
                    ? "Another change won. Your edits are preserved. The catalog changed or a name is already in use. Reload the saved version or refresh the register, then resolve any name collision before trying again."
                    : error.message,
            },
      );
      // Access loss does not prove whether an earlier uncertain command committed.
      // Read errors must never discard the original command envelope.
      if (mutation && error.status < 500 && error.status !== 403)
        pending.current = null;
    } else
      setNotice((previous) =>
        (previous.kind === "uncertain" ||
          (previous.kind === "access" && pending.current !== null)) &&
        !mutation
          ? previous
          : {
              kind: mutation ? "uncertain" : "error",
              message: mutation
                ? "The connection was interrupted. This operation may have completed. Retry the same operation to check."
                : "Catalog settings are unavailable. Your draft is preserved. Try the read again.",
            },
      );
  }
  async function refreshAccess() {
    setBusy(true);
    try {
      const authority = await response(
        fetch(base.replace(/\/masters$/, ""), { cache: "no-store" }),
        workspaceView,
      );
      setPermissions(authority.permissions);
      const allowed = authority.permissions.includes("masters.rates.read");
      setPriceAccess(allowed);
      // Exact versions are fetched again under the refreshed authority.
      setSnapshot(null);
      setItemSnapshot(null);
      const writable =
        allowed &&
        authority.permissions.includes("masters.read") &&
        authority.permissions.includes("masters.manage");
      setNotice({
        kind: !writable ? "access" : pending.current ? "uncertain" : "idle",
        message: !writable
          ? "Access refreshed. Your local draft is preserved in a read-only view."
          : pending.current
            ? "Access refreshed. Retry the same operation to reconcile the pending result."
            : "Access refreshed. Your local draft is preserved.",
      });
    } catch (error) {
      failed(error);
    } finally {
      setBusy(false);
    }
  }
  async function inspectItem(versionId: string) {
    if (itemDraft?.kind !== "saved") return;
    setBusy(true);
    try {
      setItemSnapshot(
        await response(
          fetch(
            `${base}/${resource(itemDraft.entity)}/${itemDraft.row.id}/versions/${versionId}`,
            { cache: "no-store" },
          ),
          catalogItemSchema(itemDraft.entity),
        ),
      );
    } catch (error) {
      failed(error);
    } finally {
      setBusy(false);
    }
  }
  async function moreGarmentHistory() {
    if (draft?.kind !== "saved" || !history || history.nextOffset === null)
      return;
    setBusy(true);
    try {
      const next = await response(
        fetch(
          `${base}/garments/${draft.current.garmentId}/versions?offset=${history.nextOffset}`,
          { cache: "no-store" },
        ),
        c.masterHistoryPage,
      );
      setHistory({ ...next, items: [...history.items, ...next.items] });
    } catch (error) {
      failed(error);
    } finally {
      setBusy(false);
    }
  }
  async function command<T>(
    action: string,
    payload: unknown,
    schema: { parse: (input: unknown) => T },
  ) {
    const semantic = JSON.stringify(payload);
    if (
      !pending.current ||
      pending.current.action !== action ||
      pending.current.semantic !== semantic
    ) {
      const envelope = {
        operationKey: crypto.randomUUID(),
        correlationId: crypto.randomUUID(),
        payload,
      };
      if (
        (action === "garment.save" || action === "masters.starters.install") &&
        !masterRequestFits(envelope)
      )
        throw new ApiError(413, {
          message: "This definition exceeds the request size limit",
          category: "validation",
          correlationId: envelope.correlationId,
        });
      pending.current = { action, semantic, body: JSON.stringify(envelope) };
    }
    return response(
      fetch(`${base}/commands/${action}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: pending.current.body,
        signal: AbortSignal.timeout(20000),
      }),
      schema,
    );
  }
  async function refresh(
    offset = 0,
    selectedKind = kind,
    readFilters = filters,
  ) {
    if (filterTimer.current !== null) clearTimeout(filterTimer.current);
    filterRequest.current = readFilters;
    const sequence = ++readSequence.current;
    readAbort.current?.abort();
    const controller = new AbortController();
    readAbort.current = controller;
    setRegisterRead({ kind: "loading" });
    const query = new URLSearchParams({
      search: readFilters.search,
      active: readFilters.active,
      origin: selectedKind === "addon" ? "all" : readFilters.origin,
      visibility:
        selectedKind === "addon" ? "available" : readFilters.visibility,
      offset: String(offset),
      ...(readFilters.applicability && selectedKind === "garment"
        ? { applicability: readFilters.applicability }
        : {}),
    });
    try {
      const [next, state] = await Promise.all([
        response(
          fetch(`${base}/${resource(selectedKind)}?${query}`, {
            cache: "no-store",
            signal: AbortSignal.any([
              controller.signal,
              AbortSignal.timeout(15000),
            ]),
          }),
          pageSchema(selectedKind),
        ),
        response(
          fetch(`${base}/catalog`, {
            cache: "no-store",
            signal: AbortSignal.any([
              controller.signal,
              AbortSignal.timeout(15000),
            ]),
          }),
          c.masterCatalog,
        ),
      ]);
      if (sequence !== readSequence.current || controller.signal.aborted)
        return null;
      setPage(next);
      setOffset(offset);
      setCatalog(state);
      setRegisterRead({ kind: "ready" });
      return next;
    } catch (error) {
      if (sequence !== readSequence.current || controller.signal.aborted)
        return null;
      setRegisterRead({
        kind: "error",
        access: error instanceof ApiError && error.status === 403,
      });
      throw error;
    }
  }
  async function refreshRegister(offset = 0, nextFilters = filters) {
    try {
      if (await refresh(offset, kind, nextFilters))
        setNotice((previous) =>
          previous.kind === "uncertain" ||
          previous.kind === "conflict" ||
          (previous.kind === "access" && pending.current !== null)
            ? previous
            : { kind: "idle", message: "Register refreshed." },
        );
    } catch (error) {
      failed(error);
    }
  }
  async function load(row: Row, force = false) {
    if (kind !== "garment") {
      await loadItem(row, kind);
      return;
    }
    if (!force && !discard()) return;
    setBusy(true);
    try {
      const [current, versions] = await Promise.all([
        response(
          fetch(`${base}/garments/${row.id}`, { cache: "no-store" }),
          detailSchema,
        ),
        response(
          fetch(`${base}/garments/${row.id}/versions`, { cache: "no-store" }),
          c.masterHistoryPage,
        ),
      ]);
      if (
        current.version !== row.version ||
        current.definition.label !== row.label
      )
        await refresh(offset);
      setEditorOrigin("origin" in row ? row.origin : "custom");
      setEditorStep("identity");
      setDraft({
        kind: "saved",
        current,
        definition: current.definition,
        rates: ratesFrom(current),
        active: row.active,
      });
      setHistory(versions);
      setItemSnapshot(null);
      setSnapshot(null);
      setIssues([]);
      setNotice({ kind: "idle", message: "" });
      pending.current = null;
      revealEditor();
    } catch (error) {
      failed(error);
    } finally {
      setBusy(false);
    }
  }
  async function save() {
    if (!draft || !writable) return;
    retry.current = save;
    const payload =
      draft.kind === "new"
        ? {
            mode: "create",
            definition: draft.definition,
            ...draft.rates,
            currency: "INR",
          }
        : "baseRate" in draft.current
          ? {
              mode: "update",
              garmentId: draft.current.garmentId,
              expectedVersion: draft.current.version,
              definition: draft.definition,
              ...draft.rates,
              currency: "INR",
            }
          : null;
    if (!payload) {
      setNotice({
        kind: "access",
        message:
          "Rate access is required to save the complete definition. Local edits are preserved.",
      });
      return;
    }
    const parsed = c.garmentSave.safeParse(payload);
    if (!parsed.success) {
      setIssues(normalizeIssues(c.masterIssues(parsed.error)));
      setNotice({
        kind: "error",
        message: "Check the highlighted configuration.",
      });
      return;
    }
    setBusy(true);
    try {
      const saved = await command(
        "garment.save",
        parsed.data,
        c.masterCommandResponse(c.garmentSaveResult),
      );
      const [current, versions] = await Promise.all([
        response(
          fetch(`${base}/garments/${saved.result.garmentId}`, {
            cache: "no-store",
          }),
          detailSchema,
        ),
        response(
          fetch(`${base}/garments/${saved.result.garmentId}/versions`, {
            cache: "no-store",
          }),
          c.masterHistoryPage,
        ),
      ]);
      setDraft({
        kind: "saved",
        current,
        definition: current.definition,
        rates: ratesFrom(current),
        active: draft.kind === "new" ? true : draft.active,
      });
      setHistory(versions);
      setItemSnapshot(null);
      setSnapshot(null);
      setIssues([]);
      await refresh();
      pending.current = null;
      setNotice({
        kind: "idle",
        message: `Saved revision ${saved.result.revision}.`,
      });
    } catch (error) {
      failed(error, true);
    } finally {
      setBusy(false);
    }
  }
  async function rowMutation(
    action: "garment.lifecycle" | "masters.reorder",
    payload: unknown,
    row?: { id: string; active: boolean },
  ) {
    retry.current = async () => {
      await rowMutation(action, payload, row);
    };
    let activeState: boolean | undefined;
    setBusy(true);
    try {
      const saved = await command(
        action,
        payload,
        action === "garment.lifecycle"
          ? c.masterCommandResponse(c.garmentLifecycleResult)
          : c.masterCommandResponse(c.catalogCommandResult),
      );
      if (action === "garment.lifecycle" && row) {
        const lifecycle = c.garmentLifecycleResult.parse(saved.result);
        activeState = lifecycle.active;
        // Lifecycle changes the header token only. Keep unsaved definition and
        // rate edits so toggling status never discards local work.
        setDraft((previous) =>
          previous?.kind === "saved" && previous.current.garmentId === row.id
            ? {
                ...previous,
                current: { ...previous.current, version: lifecycle.version },
                active: lifecycle.active,
              }
            : previous,
        );
      }
      const reorder = c.masterReorder.safeParse(payload);
      if (action === "masters.reorder" && reorder.success) {
        const id = reorder.data.movedId;
        setRecentMove(page.items.find((item) => item.id === id) ?? null);
        focusAfterRead.current = id;
      }
      await refresh();
      pending.current = null;
      setNotice({
        kind: "idle",
        message:
          action === "garment.lifecycle"
            ? activeState === undefined
              ? "Garment status updated."
              : activeState
                ? "Garment marked active."
                : "Garment marked inactive."
            : "Catalog order updated.",
      });
      return true;
    } catch (error) {
      failed(error, true);
      return false;
    } finally {
      setBusy(false);
    }
  }
  async function toggleGarmentActive(next: boolean) {
    if (draft?.kind !== "saved") return;
    const garmentId = draft.current.garmentId;
    const previous = draft.active;
    // Flip immediately so the control responds, then revert if the command fails.
    setDraft((current) =>
      current?.kind === "saved" && current.current.garmentId === garmentId
        ? { ...current, active: next }
        : current,
    );
    const saved = await rowMutation(
      "garment.lifecycle",
      {
        garmentId,
        expectedVersion: draft.current.version,
        active: next,
      },
      { id: garmentId, active: previous },
    );
    if (!saved)
      setDraft((current) =>
        current?.kind === "saved" && current.current.garmentId === garmentId
          ? { ...current, active: previous }
          : current,
      );
  }
  async function historical(versionId: string) {
    if (draft?.kind !== "saved") return;
    setBusy(true);
    setEditorRail("preview");
    try {
      setSnapshot(
        await response(
          fetch(
            `${base}/garments/${draft.current.garmentId}/versions/${versionId}`,
            { cache: "no-store" },
          ),
          detailSchema,
        ),
      );
    } catch (error) {
      failed(error);
    } finally {
      setBusy(false);
    }
  }
  async function copyHistory() {
    if (draft?.kind !== "saved" || !snapshot || !writable || !discard()) return;
    setBusy(true);
    try {
      const latest = await response(
        fetch(`${base}/garments/${draft.current.garmentId}`, {
          cache: "no-store",
        }),
        detailSchema,
      );
      if (!("baseRate" in latest)) throw new ApiError(403, {});
      const copied = copyHistoricalDefinition({
        definition: snapshot.definition,
        sourceVersionId: snapshot.garmentVersionId,
        registry: definitionIdentities(latest.definition).map((n) => ({
          nodeId: n.id,
          signature: n.signature,
          retiredRevision: null,
        })),
        newId: () => crypto.randomUUID(),
      });
      setDraft({
        ...draft,
        current: latest,
        rates: ratesFrom(latest),
        definition: {
          ...copied,
          services: latest.definition.services,
          addons: latest.definition.addons,
        },
      });
      setSnapshot(null);
      setIssues([]);
      pending.current = null;
      setNotice({
        kind: "idle",
        message: `Copied revision ${snapshot.revision} into an unsaved draft. Saved rates and eligibility are preserved.`,
      });
    } catch (error) {
      failed(error);
    } finally {
      setBusy(false);
    }
  }
  async function tab(next: typeof kind) {
    if (next === kind || !discard()) return;
    setBusy(true);
    try {
      await refresh(0, next);
      setKind(next);
      setEditorOpen(false);
      setRecentMove(null);
      focusAfterRead.current = null;
      const url = new URL(window.location.href);
      if (next === "garment") url.searchParams.delete("kind");
      else url.searchParams.set("kind", next);
      window.history.replaceState(null, "", url);
      setItemDraft(null);
      setDraft(null);
      setHistory(null);
      setItemSnapshot(null);
      setSnapshot(null);
      pending.current = null;
      setIssues([]);
      setNotice({ kind: "idle", message: "" });
    } catch (error) {
      failed(error);
    } finally {
      setBusy(false);
    }
  }
  async function fetchItem(row: Row, entity: "service" | "addon") {
    const item = await response(
      fetch(`${base}/${resource(entity)}/${row.id}`, { cache: "no-store" }),
      catalogItemSchema(entity),
    );
    const headers = await response(
      fetch(
        `${base}/${resource(entity)}?${new URLSearchParams({ search: item.label, active: "all", visibility: "all" })}`,
        { cache: "no-store" },
      ),
      pageSchema(entity),
    );
    const header = headers.items.find((h) => h.id === row.id);
    if (!header || header.currentVersionId !== item.id)
      throw new ApiError(409, {});
    return { item, header };
  }
  async function loadItem(row: Row | null, entity: "service" | "addon") {
    if (!row || !discard()) return;
    setBusy(true);
    try {
      const [{ item, header }, versions] = await Promise.all([
        fetchItem(row, entity),
        response(
          fetch(`${base}/${resource(entity)}/${row.id}/versions`, {
            cache: "no-store",
          }),
          c.masterHistoryPage,
        ),
      ]);
      setItemDraft(
        entity === "service"
          ? {
              kind: "saved",
              entity,
              row: header,
              current: item,
              label: item.label,
            }
          : {
              kind: "saved",
              entity,
              row: header,
              current: item,
              label: item.label,
              amount: "amount" in item ? item.amount : "",
            },
      );
      setDraft(null);
      setHistory(versions);
      setItemSnapshot(null);
      setIssues([]);
      pending.current = null;
      setNotice({ kind: "idle", message: "" });
      await refresh(offset, entity);
      revealEditor();
    } catch (error) {
      failed(error);
    } finally {
      setBusy(false);
    }
  }
  async function saveItem() {
    if (!itemDraft || !canManage) return;
    retry.current = saveItem;
    const d = itemDraft;
    const payload =
      d.entity === "service"
        ? c.serviceSave.safeParse(
            d.kind === "new"
              ? { mode: "create", label: d.label }
              : {
                  mode: "update",
                  serviceId: d.row.id,
                  expectedVersion: d.row.version,
                  label: d.label,
                },
          )
        : c.addonSave.safeParse(
            d.kind === "new"
              ? {
                  mode: "create",
                  label: d.label,
                  amount: d.amount,
                  currency: "INR",
                }
              : {
                  mode: "update",
                  addonId: d.row.id,
                  expectedVersion: d.row.version,
                  label: d.label,
                  amount: d.amount,
                  currency: "INR",
                },
          );
    if (!payload.success) {
      setIssues(c.masterIssues(payload.error));
      setNotice({
        kind: "error",
        message: "Check the highlighted configuration.",
      });
      return;
    }
    setBusy(true);
    try {
      let id: string;
      if (d.entity === "service") {
        const saved = await command(
          "service.save",
          payload.data,
          c.masterCommandResponse(c.serviceSaveResult),
        );
        id = saved.result.serviceId;
      } else {
        const saved = await command(
          "addon.save",
          payload.data,
          c.masterCommandResponse(c.addonSaveResult),
        );
        id = saved.result.addonId;
      }
      const item = await response(
        fetch(`${base}/${resource(d.entity)}/${id}`, { cache: "no-store" }),
        catalogItemSchema(d.entity),
      );
      const headers = await response(
        fetch(
          `${base}/${resource(d.entity)}?${new URLSearchParams({ search: item.label, active: "all", visibility: "all" })}`,
          { cache: "no-store" },
        ),
        pageSchema(d.entity),
      );
      const row = headers.items.find((h) => h.id === id);
      if (!row || row.currentVersionId !== item.id) throw new ApiError(409, {});
      const versions = await response(
        fetch(`${base}/${resource(d.entity)}/${id}/versions`, {
          cache: "no-store",
        }),
        c.masterHistoryPage,
      );
      setItemDraft(
        d.entity === "service"
          ? {
              kind: "saved",
              entity: d.entity,
              row,
              current: item,
              label: item.label,
            }
          : {
              kind: "saved",
              entity: d.entity,
              row,
              current: item,
              label: item.label,
              amount: "amount" in item ? item.amount : "",
            },
      );
      setHistory(versions);
      setItemSnapshot(null);
      await refresh();
      pending.current = null;
      setIssues([]);
      setNotice({ kind: "idle", message: `Saved revision ${item.revision}.` });
    } catch (error) {
      failed(error, true);
    } finally {
      setBusy(false);
    }
  }
  async function moreItemHistory() {
    if (itemDraft?.kind !== "saved" || !history || history.nextOffset === null)
      return;
    setBusy(true);
    try {
      const next = await response(
        fetch(
          `${base}/${resource(itemDraft.entity)}/${itemDraft.row.id}/versions?offset=${history.nextOffset}`,
          { cache: "no-store" },
        ),
        c.masterHistoryPage,
      );
      setHistory({ ...next, items: [...history.items, ...next.items] });
    } catch (error) {
      failed(error);
    } finally {
      setBusy(false);
    }
  }
  async function catalogMutation(
    action:
      | "service.lifecycle"
      | "addon.lifecycle"
      | "masters.visibility"
      | "masters.starters.install",
    payload: unknown,
  ) {
    retry.current = () => catalogMutation(action, payload);
    setBusy(true);
    const previousCatalog = catalog;
    const visibilityChange = c.masterVisibility.safeParse(payload);
    if (action === "masters.visibility" && visibilityChange.success)
      setCatalog((state) => ({
        ...state,
        hideStandardGarments: visibilityChange.data.hideStandardGarments,
        hideStandardServices: visibilityChange.data.hideStandardServices,
      }));
    try {
      let message = "Catalog settings updated.";
      if (action === "service.lifecycle")
        await command(
          action,
          payload,
          c.masterCommandResponse(c.serviceLifecycleResult),
        );
      else if (action === "addon.lifecycle")
        await command(
          action,
          payload,
          c.masterCommandResponse(c.addonLifecycleResult),
        );
      else if (action === "masters.starters.install") {
        const result = await command(
          action,
          payload,
          c.masterCommandResponse(c.starterInstallResult),
        );
        message = result.replayed
          ? "Starter installation replayed. The original result was recovered."
          : result.result.catalogVersion ===
              c.starterInstall.parse(payload).expectedCatalogVersion
            ? "Starter library is already installed. Existing edits are preserved."
            : "Starter library installed. Missing records were added with unset rates; existing edits are preserved.";
      } else
        await command(
          action,
          payload,
          c.masterCommandResponse(c.catalogCommandResult),
        );
      const serviceChange = c.serviceLifecycle.safeParse(payload);
      const addonChange = c.addonLifecycle.safeParse(payload);
      const affectedId =
        action === "service.lifecycle" && serviceChange.success
          ? serviceChange.data.serviceId
          : action === "addon.lifecycle" && addonChange.success
            ? addonChange.data.addonId
            : null;
      if (
        affectedId &&
        itemDraft?.kind === "saved" &&
        itemDraft.row.id === affectedId
      ) {
        const { item, header } = await fetchItem(
          itemDraft.row,
          itemDraft.entity,
        );
        setItemDraft(
          itemDraft.entity === "service"
            ? { ...itemDraft, current: item, row: header, label: item.label }
            : {
                ...itemDraft,
                current: item,
                row: header,
                label: item.label,
                amount: "amount" in item ? item.amount : "",
              },
        );
      }
      await refresh();
      pending.current = null;
      setIssues([]);
      setNotice({ kind: "idle", message });
    } catch (error) {
      if (
        action === "masters.visibility" &&
        error instanceof ApiError &&
        error.status < 500
      )
        setCatalog(previousCatalog);
      failed(error, true);
    } finally {
      setBusy(false);
    }
  }
  const definition = draft?.definition;
  const current = draft?.kind === "saved" ? draft.current : null;
  const historicalRates = c.pricedGarmentDetail.safeParse(snapshot);
  const recovery = (
    <>
      {notice.kind === "uncertain" && canManage && (
        <Button
          type="button"
          disabled={busy}
          onClick={() => void retry.current?.()}
        >
          Retry same operation
        </Button>
      )}
      {(notice.kind === "conflict" || dirty) && draft?.kind === "saved" && (
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            type="button"
            disabled={locked}
            onClick={() =>
              void load(
                {
                  id: draft.current.garmentId,
                  active: draft.active,
                  label: draft.definition.label,
                  version: draft.current.version,
                  revision: draft.current.revision,
                  currentVersionId: c.masterVersionId.parse(
                    draft.current.garmentVersionId,
                  ),
                },
                false,
              )
            }
          >
            Reload saved version
          </Button>
          <Button
            variant="ghost"
            type="button"
            disabled={locked}
            onClick={() =>
              setNotice({
                kind: "idle",
                message:
                  "Your unsaved edits are retained. Reload saved version when ready to refresh the base.",
              })
            }
          >
            Keep editing
          </Button>
        </div>
      )}
    </>
  );
  return (
    <>
      <div hidden={editorOpen && kind === "garment"}>
        <PageHeader
          eyebrow="Shop settings"
          title="Garments and services"
          description={
            <>
              {workspace.shopName} · {workspace.locationName}. These definitions
              apply to the whole shop.
            </>
          }
        />
        <nav className="master-tabs catalog-tabs" aria-label="Master catalogs">
          {(["garment", "service", "addon"] as const).map((value) => (
            <button
              type="button"
              key={value}
              className="catalog-tab"
              disabled={locked}
              aria-pressed={kind === value}
              onClick={() => void tab(value)}
            >
              {value === "garment"
                ? "Garments"
                : value === "service"
                  ? "Services"
                  : "Add-ons"}
            </button>
          ))}
        </nav>
      </div>
      <div className="catalog-feedback">
        {(busy || notice.message) && (
          <Alert
            className="my-4"
            variant={notice.kind === "idle" ? "default" : "destructive"}
            role={notice.kind === "idle" ? "status" : "alert"}
          >
            <AlertTitle>
              {busy
                ? "Working…"
                : notice.kind === "conflict"
                  ? "Saved version changed"
                  : notice.kind === "uncertain"
                    ? "Result not confirmed"
                    : notice.kind === "access"
                      ? "Access changed"
                      : notice.kind === "error"
                        ? "Action needs attention"
                        : "Catalog updated"}
            </AlertTitle>
            <AlertDescription>
              {busy
                ? "Please wait for the current operation to finish."
                : notice.message}
            </AlertDescription>
          </Alert>
        )}
        <Button
          variant="ghost"
          size="sm"
          className="mb-3"
          disabled={busy}
          onClick={() => void refreshAccess()}
        >
          Refresh access
        </Button>
        {issues.some((issue) => issue.path[0] === "starters") && (
          <ul
            className="master-error-summary"
            aria-label="Starter installation errors"
          >
            {issues
              .filter((issue) => issue.path[0] === "starters")
              .map((issue) => (
                <li key={issue.path.join(".")}>{issue.message}</li>
              ))}
          </ul>
        )}
        <span className="sr-only" aria-live="polite">
          {announcement}
        </span>
        {!(itemDraft || (draft && editorOpen)) && recovery}
      </div>
      <div hidden={editorOpen && kind === "garment"}>
        {draft && kind === "garment" && (
          <button
            type="button"
            className="editor-resume"
            onClick={() => {
              setEditorOpen(true);
              revealEditor();
            }}
          >
            Resume editing {draft.definition.label || "garment"}
          </button>
        )}
        <StarterLibrary
          catalog={catalog}
          writable={canManage}
          locked={locked || notice.kind === "access"}
          onInstall={() =>
            void catalogMutation("masters.starters.install", {
              bundleVersion: catalog.supportedBundleVersion,
              expectedCatalogVersion: catalog.catalogVersion,
            })
          }
          onVisibility={(change) =>
            void catalogMutation("masters.visibility", {
              expectedCatalogVersion: catalog.catalogVersion,
              ...change,
            })
          }
        />
        <MasterRegister
          kind={kind}
          page={page}
          offset={offset}
          filters={filters}
          read={registerRead}
          recentMove={recentMove}
          selectedId={
            current?.garmentId ??
            (itemDraft?.kind === "saved" ? itemDraft.row.id : null)
          }
          locked={locked}
          writable={writable}
          canReadRates={priceAccess}
          onFilters={changeFilters}
          onRefresh={(offset) => void refreshRegister(offset)}
          onOpen={(row) => {
            setRecentMove(null);
            void load(row);
          }}
          onMoveBefore={setMoving}
          onMoveEnd={(row) =>
            void rowMutation("masters.reorder", {
              kind,
              movedId: row.id,
              beforeId: null,
              expectedCatalogVersion: catalog.catalogVersion,
            })
          }
          onLifecycle={(row) => {
            if (
              (current?.garmentId === row.id ||
                (itemDraft?.kind === "saved" && itemDraft.row.id === row.id)) &&
              !discard()
            )
              return;
            if (kind === "garment")
              void rowMutation(
                "garment.lifecycle",
                {
                  garmentId: row.id,
                  expectedVersion: row.version,
                  active: !row.active,
                },
                row,
              );
            else
              void catalogMutation(
                kind === "service" ? "service.lifecycle" : "addon.lifecycle",
                {
                  [kind === "service" ? "serviceId" : "addonId"]: row.id,
                  expectedVersion: row.version,
                  active: !row.active,
                },
              );
          }}
          onCreate={() => {
            if (!discard()) return;
            if (kind === "garment") {
              setEditorStep("identity");
              setEditorRail("preview");
              setEditorOrigin("custom");
              setDraft({
                kind: "new",
                definition: blank(),
                rates: emptyRates(),
              });
              setItemDraft(null);
            } else {
              setItemDraft(
                kind === "service"
                  ? { kind: "new", entity: kind, label: "" }
                  : { kind: "new", entity: kind, label: "", amount: "" },
              );
              setDraft(null);
            }
            setHistory(null);
            setItemSnapshot(null);
            setSnapshot(null);
            setIssues([]);
            setNotice({ kind: "idle", message: "" });
            pending.current = null;
            revealEditor();
          }}
        />
      </div>
      <div
        className={draft || itemDraft ? "" : "workspace-shell garment-shell"}
        hidden={kind === "garment" && draft !== null && !editorOpen}
      >
        <div
          id="master-editor-workbench"
          tabIndex={-1}
          className={draft || itemDraft ? "" : "master-layout"}
        >
          {kind === "garment" && draft && definition ? (
            <GarmentEditor
              name={definition.label || "New garment"}
              origin={editorOrigin}
              revision={current?.revision ?? null}
              active={draft.kind === "saved" ? draft.active : null}
              onActive={(value) => void toggleGarmentActive(value)}
              canChangeActive={writable && !locked}
              step={editorStep}
              onStep={setEditorStep}
              rail={editorRail}
              onRail={setEditorRail}
              writable={writable}
              locked={locked}
              busy={busy}
              definition={definition}
              dirty={garmentDirty}
              issues={issues}
              onIssue={focusIssue}
              onBack={() => {
                setEditorOpen(false);
                setPendingSearchFocus(true);
              }}
              onSave={() => void save()}
              onCancel={() => {
                if (!discard()) return;
                setDraft(null);
                setEditorOpen(false);
                setHistory(null);
                setItemSnapshot(null);
                setSnapshot(null);
                setIssues([]);
                pending.current = null;
                setNotice({ kind: "idle", message: "Local draft closed." });
              }}
              identity={
                <IdentityStep
                  definition={definition}
                  issues={issues}
                  onChange={edit}
                />
              }
              measurements={
                <MeasurementsStep
                  definition={definition}
                  issues={issues}
                  onChange={edit}
                  announce={setAnnouncement}
                />
              }
              construction={
                <ConstructionStep
                  definition={definition}
                  issues={issues}
                  onChange={edit}
                  announce={setAnnouncement}
                />
              }
              eligibility={
                <EligibilityEditor
                  base={base}
                  onAccessLost={failed}
                  definition={definition}
                  current={current}
                  rates={draft.rates}
                  panel={editorStep === "addons" ? "addons" : "services"}
                  showRates={priceAccess}
                  disabled={!writable || locked}
                  issues={issues}
                  onChange={(definition, rates) => {
                    edit(definition);
                    setDraft((d) => (d ? { ...d, definition, rates } : d));
                  }}
                />
              }
              preview={
                <>
                  <div className="master-panel-heading">
                    <h2>
                      {snapshot
                        ? `Saved revision ${snapshot.revision}`
                        : "Form preview"}
                    </h2>
                    {snapshot && (
                      <button type="button" onClick={() => setSnapshot(null)}>
                        Preview draft
                      </button>
                    )}
                  </div>
                  <GarmentPreview
                    definition={snapshot?.definition ?? definition}
                  />
                  {snapshot && (
                    <section
                      className="master-history"
                      aria-label="Historical eligibility"
                    >
                      <h3>Saved eligibility · revision {snapshot.revision}</h3>
                      {priceAccess && historicalRates.success && (
                        <p>
                          Saved base default:{" "}
                          {rate(historicalRates.data.baseRate)}
                        </p>
                      )}
                      <h4>Eligible services</h4>
                      {snapshot.definition.services.length ? (
                        <ul>
                          {snapshot.definition.services.map((service) => (
                            <li key={service.serviceId}>
                              {service.savedLabel}
                              {priceAccess && historicalRates.success
                                ? ` · override ${rate(historicalRates.data.serviceOverrides.find((s) => s.serviceId === service.serviceId)?.rateOverride ?? null)}`
                                : ""}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p>No eligible services.</p>
                      )}
                      <h4>Eligible add-ons</h4>
                      {snapshot.definition.addons.length ? (
                        <ul>
                          {snapshot.definition.addons.map((addon) => (
                            <li key={addon.addonId}>{addon.savedLabel}</li>
                          ))}
                        </ul>
                      ) : (
                        <p>No eligible add-ons.</p>
                      )}
                    </section>
                  )}

                  {snapshot && writable && (
                    <button
                      type="button"
                      disabled={locked}
                      onClick={() => void copyHistory()}
                    >
                      Copy from previous version
                    </button>
                  )}
                </>
              }
              recovery={recovery}
              history={
                <MasterHistory
                  history={history}
                  currentVersionId={current?.garmentVersionId ?? null}
                  selectedVersionId={snapshot?.garmentVersionId ?? null}
                  disabled={locked}
                  onInspect={(id) => void historical(id)}
                  onMore={() => void moreGarmentHistory()}
                />
              }
            />
          ) : itemDraft ? (
            <CatalogEditor
              key={
                itemDraft.kind === "saved"
                  ? itemDraft.current.id
                  : `new-${itemDraft.entity}`
              }
              draft={itemDraft}
              history={history}
              snapshot={itemSnapshot}
              showRates={priceAccess}
              recovery={recovery}
              onInspect={(id) => void inspectItem(id)}
              disabled={!canManage || locked || notice.kind === "access"}
              canManage={canManage && notice.kind !== "access"}
              locked={locked}
              busy={busy}
              dirty={itemDirty}
              issues={issues}
              onChange={(next) => {
                setItemDraft(next);
                pending.current = null;
                setIssues([]);
                setNotice({ kind: "idle", message: "" });
              }}
              onSave={() => void saveItem()}
              onClose={() => {
                if (discard()) {
                  setItemDraft(null);
                  setHistory(null);
                  setItemSnapshot(null);
                  pending.current = null;
                  setIssues([]);
                  setNotice({ kind: "idle", message: "Local draft closed." });
                }
              }}
              onReload={() => {
                if (!locked)
                  void loadItem(
                    itemDraft.kind === "saved" ? itemDraft.row : null,
                    itemDraft.entity,
                  );
              }}
              onMoreHistory={moreItemHistory}
            />
          ) : (
            <section className="master-empty-panel">
              <span className="account-eyebrow">
                {kind === "garment" ? "SCHEMA WORKBENCH" : "SHOP CATALOG"}
              </span>
              <h2>
                {kind === "garment"
                  ? "A place for every dimension."
                  : kind === "service"
                    ? "Services offered by your shop"
                    : "The finishing details"}
              </h2>
              <p>
                {kind === "garment"
                  ? "Select a garment to inspect its schema and saved history, or create a custom garment. No dimensions are required until you add them."
                  : "Select a record to inspect saved history, or create a custom record for your shop."}
              </p>
            </section>
          )}
        </div>
      </div>
      <div className="workspace-shell garment-shell">
        {moving && (
          <MoveBeforeDialog
            base={base}
            kind={kind}
            row={moving}
            onClose={() => setMoving(null)}
            onChoose={(anchor) => {
              const row = moving;
              setMoving(null);
              void rowMutation("masters.reorder", {
                kind,
                movedId: row.id,
                beforeId: anchor,
                expectedCatalogVersion: catalog.catalogVersion,
              });
            }}
          />
        )}
      </div>
    </>
  );
}
