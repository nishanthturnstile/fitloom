"use client";
import {
  copyHistoricalDefinition,
  definitionIdentities,
  estimatedDefinitionBytes,
  masterRequestFits,
} from "@fitloom/application/garment-definition";
import * as c from "@fitloom/application/master-contracts";
import type {
  WorkspaceChoice,
  WorkspaceView,
} from "@fitloom/application/workspace-contracts";
import { useEffect, useRef, useState } from "react";
import {
  type CatalogDraft,
  CatalogEditor,
  catalogItemSchema,
} from "./catalog-editor";
import {
  Control,
  controlId,
  FieldEditor,
  GroupEditor,
  Illustration,
  type Issues,
  move,
  newField,
  nodeId,
  Ordered,
} from "./editor-controls";
import {
  EligibilityEditor,
  emptyRates,
  type RateDraft,
  ratesFrom,
} from "./eligibility-editor";
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
import { MoveBeforeDialog } from "./move-before-dialog";

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
  choices,
  locale,
}: {
  workspace: Workspace;
  initialPage: Page;
  initialCatalog: c.MasterCatalog;
  choices: WorkspaceChoice[];
  locale: string;
}) {
  const base = `/api/workspaces/${workspace.tenantId}/${workspace.locationId}/masters`;
  const canManage = [
    "masters.read",
    "masters.manage",
    "masters.rates.read",
  ].every((p) => workspace.permissions.includes(p));
  const [offset, setOffset] = useState(0);
  const [page, setPage] = useState(initialPage),
    [catalog, setCatalog] = useState(initialCatalog),
    [kind, setKind] = useState<"garment" | "service" | "addon">("garment");
  const [search, setSearch] = useState(""),
    [active, setActive] = useState("active"),
    [origin, setOrigin] = useState("all"),
    [visibility, setVisibility] = useState("available"),
    [applicability, setApplicability] = useState("");
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
    retry = useRef<(() => Promise<void>) | null>(null),
    allowUnload = useRef(false);
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
  const locked = busy || notice.kind === "uncertain";
  const writable =
    canManage &&
    notice.kind !== "access" &&
    (draft?.kind !== "saved" ||
      c.pricedGarmentDetail.safeParse(draft.current).success);
  useEffect(() => {
    if (!dirty) return;
    const unload = (event: BeforeUnloadEvent) => {
      if (allowUnload.current) {
        allowUnload.current = false;
        return;
      }
      event.preventDefault();
      event.returnValue = "";
    };
    const click = (event: MouseEvent) => {
      if (
        event.ctrlKey ||
        event.metaKey ||
        event.shiftKey ||
        event.altKey ||
        !(event.target instanceof Element)
      )
        return;
      const link = event.target.closest<HTMLAnchorElement>("a[href]");
      if (!link || link.target === "_blank") return;
      const url = new URL(link.href, location.href);
      if (url.origin === location.origin && url.href !== location.href) {
        if (
          !window.confirm(
            `Discard unsaved ${draftNoun} changes and leave this page?`,
          )
        ) {
          event.preventDefault();
          event.stopPropagation();
        } else allowUnload.current = true;
      }
    };
    window.addEventListener("beforeunload", unload);
    document.addEventListener("click", click, true);
    return () => {
      window.removeEventListener("beforeunload", unload);
      document.removeEventListener("click", click, true);
    };
  }, [dirty, draftNoun]);
  const discard = () =>
    !(dirty || notice.kind === "uncertain") ||
    window.confirm(
      notice.kind === "uncertain"
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
      setIssues(
        kind === "garment" ? normalizeIssues(error.issues) : error.issues,
      );
      setNotice({
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
      });
      if (error.status < 500) pending.current = null;
    } else
      setNotice({
        kind: mutation ? "uncertain" : "error",
        message: mutation
          ? "The connection was interrupted. This operation may have completed. Retry the same operation to check."
          : "Garment settings are unavailable. Try refreshing the register.",
      });
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
  async function refresh(offset = 0, selectedKind = kind) {
    const query = new URLSearchParams({
      search,
      active,
      origin,
      visibility,
      offset: String(offset),
      ...(applicability && selectedKind === "garment" ? { applicability } : {}),
    });
    const [next, state] = await Promise.all([
      response(
        fetch(`${base}/${resource(selectedKind)}?${query}`, {
          cache: "no-store",
        }),
        pageSchema(selectedKind),
      ),
      response(
        fetch(`${base}/catalog`, { cache: "no-store" }),
        c.masterCatalog,
      ),
    ]);
    setPage(next);
    setOffset(offset);
    setCatalog(state);
  }
  async function refreshRegister(offset = 0) {
    setBusy(true);
    try {
      await refresh(offset);
      setNotice({ kind: "idle", message: "Register refreshed." });
    } catch (error) {
      failed(error);
    } finally {
      setBusy(false);
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
      setDraft({
        kind: "saved",
        current,
        definition: current.definition,
        rates: ratesFrom(current),
        active: row.active,
      });
      setHistory(versions);
      setSnapshot(null);
      setIssues([]);
      setNotice({ kind: "idle", message: "" });
      pending.current = null;
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
      setItemDraft(null);
      setDraft(null);
      setHistory(null);
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
      setIssues([]);
      pending.current = null;
      setNotice({ kind: "idle", message: "" });
      await refresh(offset, entity);
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
  const rows = page.items;
  const definition = draft?.definition;
  const current = draft?.kind === "saved" ? draft.current : null;
  const historicalRates = c.pricedGarmentDetail.safeParse(snapshot);
  return (
    <>
      <header className="workspace-top">
        <a href={`/workspaces/${workspace.tenantId}/${workspace.locationId}`}>
          fitloom / workspace
        </a>
        <a href="/account">Your account</a>
      </header>
      <div className="workspace-heading">
        <div>
          <p className="account-eyebrow">SHOP SETTINGS</p>
          <h1>Garments and services</h1>
          <p className="master-muted">
            {workspace.shopName} · {workspace.locationName}. These definitions
            apply to the whole shop.
          </p>
        </div>
        <label>
          Switch shop or location
          <select
            aria-label="Switch shop or location"
            disabled={locked}
            value={`${workspace.tenantId}/${workspace.locationId}`}
            onChange={async (event) => {
              const value = event.target.value;
              if (!discard()) return;
              const [tenantId, locationId] = value.split("/");
              setBusy(true);
              try {
                const result = await fetch("/api/preferences", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    operationKey: crypto.randomUUID(),
                    correlationId: crypto.randomUUID(),
                    payload: { locale, tenantId, locationId },
                  }),
                });
                if (!result.ok) throw new Error("Workspace switch failed");
                allowUnload.current = true;
                window.location.assign(
                  `/workspaces/${value}/settings/garments`,
                );
              } catch (error) {
                failed(error);
              } finally {
                setBusy(false);
              }
            }}
          >
            {choices.map((choice) => (
              <option
                key={`${choice.tenantId}/${choice.locationId}`}
                value={`${choice.tenantId}/${choice.locationId}`}
              >
                {choice.shopName} · {choice.locationName}
              </option>
            ))}
          </select>
        </label>
      </div>
      <nav className="master-tabs" aria-label="Master catalogs">
        {(["garment", "service", "addon"] as const).map((value) => (
          <button
            type="button"
            key={value}
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
      <p
        className="master-notice"
        role={notice.kind === "idle" ? "status" : "alert"}
      >
        {busy ? "Working…" : notice.message}
      </p>
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
      {notice.kind === "uncertain" && (
        <button
          type="button"
          disabled={busy}
          onClick={() => void retry.current?.()}
        >
          Retry same operation
        </button>
      )}
      {(notice.kind === "conflict" || dirty) && draft?.kind === "saved" && (
        <div className="master-actions">
          <button
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
          </button>
          <button
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
          </button>
        </div>
      )}
      <details className="master-library">
        <summary>Library setup</summary>
        <div className="master-library-grid">
          <section>
            <h2>Starter library</h2>
            <p>
              Shirt, Blouse, Trouser, New stitching and Alteration. Rates start
              unset. Installation adds missing starter records and preserves
              your existing edits.
            </p>
            <p>
              {catalog.starterBundleVersion
                ? `Installed: ${catalog.starterBundleVersion}`
                : "No starter library installed yet."}
            </p>
            {canManage && (
              <button
                type="button"
                disabled={locked || notice.kind === "access"}
                onClick={() =>
                  void catalogMutation("masters.starters.install", {
                    bundleVersion: catalog.supportedBundleVersion,
                    expectedCatalogVersion: catalog.catalogVersion,
                  })
                }
              >
                Install starter library
              </button>
            )}
          </section>
          <section>
            <h2>Standard visibility</h2>
            <p>
              Hide standards from available lists. Saved bindings and custom
              records are retained.
            </p>
            <fieldset
              disabled={!canManage || locked || notice.kind === "access"}
            >
              <label className="master-check">
                <input
                  type="checkbox"
                  checked={catalog.hideStandardGarments}
                  onChange={(e) =>
                    void catalogMutation("masters.visibility", {
                      expectedCatalogVersion: catalog.catalogVersion,
                      hideStandardGarments: e.target.checked,
                      hideStandardServices: catalog.hideStandardServices,
                    })
                  }
                />
                Hide standard garments
              </label>
              <label className="master-check">
                <input
                  type="checkbox"
                  checked={catalog.hideStandardServices}
                  onChange={(e) =>
                    void catalogMutation("masters.visibility", {
                      expectedCatalogVersion: catalog.catalogVersion,
                      hideStandardGarments: catalog.hideStandardGarments,
                      hideStandardServices: e.target.checked,
                    })
                  }
                />
                Hide standard services
              </label>
            </fieldset>
          </section>
        </div>
      </details>
      <div className="master-layout">
        <aside className="master-register" aria-label="Master register">
          <div className="master-register-top">
            <h2>
              {kind === "garment"
                ? "Garments"
                : kind === "service"
                  ? "Services"
                  : "Add-ons"}
            </h2>
            <span>{page.total} total</span>
          </div>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void refreshRegister();
            }}
          >
            <fieldset disabled={locked}>
              <label className="master-control">
                <span>Search by name prefix</span>
                <input
                  value={search}
                  maxLength={100}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </label>
              <div className="master-filter-grid">
                <label>
                  Status
                  <select
                    aria-label="Status"
                    value={active}
                    onChange={(e) => setActive(e.target.value)}
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="all">All statuses</option>
                  </select>
                </label>
                <label>
                  Origin
                  <select
                    aria-label="Origin"
                    value={origin}
                    onChange={(e) => setOrigin(e.target.value)}
                  >
                    <option value="all">All origins</option>
                    <option value="standard">Standard</option>
                    <option value="custom">Custom</option>
                  </select>
                </label>
                <label>
                  Visibility
                  <select
                    aria-label="Visibility"
                    value={visibility}
                    onChange={(e) => setVisibility(e.target.value)}
                  >
                    <option value="available">Available</option>
                    <option value="all">Include hidden standards</option>
                  </select>
                </label>
                {kind === "garment" && (
                  <label>
                    Applicability
                    <select
                      aria-label="Applicability filter"
                      value={applicability}
                      onChange={(e) => setApplicability(e.target.value)}
                    >
                      <option value="">All applicability</option>
                      {c.applicability.options.map((v) => (
                        <option key={v} value={v}>
                          {v}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
              </div>
              <button type="submit">Refresh register</button>
            </fieldset>
          </form>
          {writable && kind === "garment" && (
            <button
              type="button"
              className="master-primary"
              disabled={locked}
              onClick={() => {
                if (!discard()) return;
                setDraft({
                  kind: "new",
                  definition: blank(),
                  rates: emptyRates(),
                });
                setHistory(null);
                setSnapshot(null);
                setIssues([]);
                setNotice({ kind: "idle", message: "" });
                pending.current = null;
              }}
            >
              Create custom garment
            </button>
          )}
          {canManage && kind !== "garment" && (
            <button
              type="button"
              className="master-primary"
              disabled={locked || notice.kind === "access"}
              onClick={() => {
                if (!discard()) return;
                setItemDraft(
                  kind === "service"
                    ? { kind: "new", entity: kind, label: "" }
                    : { kind: "new", entity: kind, label: "", amount: "" },
                );
                setDraft(null);
                setHistory(null);
                setIssues([]);
                pending.current = null;
                setNotice({ kind: "idle", message: "" });
              }}
            >
              Create custom {kind === "service" ? "service" : "add-on"}
            </button>
          )}
          {rows.length === 0 ? (
            <p className="master-empty">
              No {resource(kind)} match this view.
              {kind === "garment" && page.total === 0
                ? " Create a custom garment or adjust the filters."
                : ""}
            </p>
          ) : (
            <ul className="master-rows">
              {rows.map((row) => (
                <li
                  key={row.id}
                  data-selected={
                    current?.garmentId === row.id ||
                    (itemDraft?.kind === "saved" && itemDraft.row.id === row.id)
                  }
                >
                  <button
                    type="button"
                    className="master-row-name"
                    disabled={locked}
                    onClick={() => void load(row)}
                  >
                    {row.label}
                  </button>
                  <small>
                    {row.active ? "Active" : "Inactive"} ·{" "}
                    {"origin" in row ? row.origin : "custom"} · revision{" "}
                    {row.revision}
                  </small>
                  {"baseRate" in row && (
                    <small>Default {rate(row.baseRate)}</small>
                  )}
                  {"amount" in row && <small>{rate(row.amount)}</small>}
                  {writable && (
                    <div className="master-row-actions">
                      <button
                        type="button"
                        disabled={locked}
                        onClick={() => {
                          if (
                            (current?.garmentId === row.id ||
                              (itemDraft?.kind === "saved" &&
                                itemDraft.row.id === row.id)) &&
                            !discard()
                          )
                            return;
                          if (kind !== "garment") {
                            void catalogMutation(
                              kind === "service"
                                ? "service.lifecycle"
                                : "addon.lifecycle",
                              {
                                [kind === "service" ? "serviceId" : "addonId"]:
                                  row.id,
                                expectedVersion: row.version,
                                active: !row.active,
                              },
                            );
                            return;
                          }
                          void rowMutation(
                            "garment.lifecycle",
                            {
                              garmentId: row.id,
                              expectedVersion: row.version,
                              active: !row.active,
                            },
                            row,
                          );
                        }}
                      >
                        {row.active ? "Deactivate" : "Restore"}
                      </button>
                      <button
                        type="button"
                        disabled={locked}
                        onClick={() => setMoving(row)}
                      >
                        Move before…
                      </button>
                      <button
                        type="button"
                        disabled={locked}
                        onClick={() =>
                          void rowMutation("masters.reorder", {
                            kind,
                            movedId: row.id,
                            beforeId: null,
                            expectedCatalogVersion: catalog.catalogVersion,
                          })
                        }
                      >
                        Move to end
                      </button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
          <div className="master-actions">
            <button
              type="button"
              disabled={locked || offset === 0}
              onClick={() => void refreshRegister(Math.max(0, offset - 50))}
            >
              Previous page
            </button>
            <button
              type="button"
              disabled={locked || page.nextOffset === null}
              onClick={() => void refreshRegister(page.nextOffset ?? 0)}
            >
              Next page
            </button>
            <button
              type="button"
              disabled={locked}
              onClick={() => void refreshRegister(0)}
            >
              First page
            </button>
          </div>
        </aside>
        {kind === "garment" && draft && definition ? (
          <>
            <section
              className="master-editor"
              aria-label="Garment schema editor"
            >
              <div className="master-editor-heading">
                <h2>
                  {draft.kind === "new"
                    ? "New garment"
                    : definition.label || "Garment schema"}
                </h2>
                <span>
                  {draft.kind === "saved"
                    ? `Revision ${draft.current.revision} · ${draft.active ? "active" : "inactive"}`
                    : "Unsaved"}
                  {dirty ? " · unsaved changes" : ""}
                </span>
              </div>
              {issues.length > 0 && (
                <div className="master-error-summary" role="alert">
                  <p>Check this configuration:</p>
                  <ul>
                    {issues.map((issue) => (
                      <li key={`${issue.path.join(".")}-${issue.message}`}>
                        <button
                          type="button"
                          onClick={() =>
                            document
                              .getElementById(controlId(issue.path))
                              ?.focus()
                          }
                        >
                          {issue.message}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {!writable && (
                <p className="master-muted">
                  Read-only view. Your role cannot publish garment changes.
                </p>
              )}
              <fieldset
                disabled={!writable || locked}
                className="master-edit-fields"
              >
                <div className="master-section">
                  <h3>01 · Garment identity</h3>
                  <div className="master-grid">
                    <Control
                      label="Garment name"
                      path={["definition", "label"]}
                      issues={issues}
                    >
                      {(props) => (
                        <input
                          {...props}
                          maxLength={100}
                          value={definition.label}
                          onChange={(e) =>
                            edit({ ...definition, label: e.target.value })
                          }
                        />
                      )}
                    </Control>
                    <Control
                      label="Category"
                      path={["definition", "category"]}
                      issues={issues}
                    >
                      {(props) => (
                        <input
                          {...props}
                          maxLength={100}
                          value={definition.category}
                          onChange={(e) =>
                            edit({ ...definition, category: e.target.value })
                          }
                        />
                      )}
                    </Control>
                    <label className="master-control">
                      <span>Applicability</span>
                      <select
                        aria-label="Applicability"
                        value={definition.applicability}
                        onChange={(e) =>
                          edit({
                            ...definition,
                            applicability: c.applicability.parse(
                              e.target.value,
                            ),
                          })
                        }
                      >
                        {c.applicability.options.map((v) => (
                          <option key={v} value={v}>
                            {v}
                          </option>
                        ))}
                      </select>
                    </label>
                    <Illustration
                      label="Garment icon"
                      value={definition.iconId}
                      onChange={(value) =>
                        edit({ ...definition, iconId: value })
                      }
                    />
                  </div>
                  {draft.kind === "saved" && (
                    <label className="master-check">
                      <input
                        type="checkbox"
                        checked={draft.active}
                        disabled={!canManage || locked}
                        onChange={(e) =>
                          void toggleGarmentActive(e.target.checked)
                        }
                      />
                      Active garment — applies to the whole shop; saved schema
                      versions are unchanged.
                    </label>
                  )}
                  <Control
                    label="Garment guidance"
                    path={["definition", "help"]}
                    issues={issues}
                  >
                    {(props) => (
                      <textarea
                        {...props}
                        value={definition.help}
                        maxLength={500}
                        onChange={(e) =>
                          edit({ ...definition, help: e.target.value })
                        }
                      />
                    )}
                  </Control>
                  <Illustration
                    label="Guidance illustration"
                    value={definition.illustrationId}
                    onChange={(value) =>
                      edit({ ...definition, illustrationId: value })
                    }
                  />
                </div>
                <div className="master-section">
                  <h3>02 · Sections and dimensions</h3>
                  <p className="master-muted">
                    Changing a dimension's type or measurement meaning starts a
                    new dimension. Earlier versions remain readable.
                  </p>
                  {definition.sections.map((section, index) => (
                    <fieldset
                      key={section.id}
                      className="master-node"
                      aria-label={`Section ${index + 1}`}
                    >
                      <legend>Section {index + 1}</legend>
                      <Ordered
                        label={section.label || "section"}
                        index={index}
                        total={definition.sections.length}
                        onMove={(d) => {
                          edit({
                            ...definition,
                            sections: move(definition.sections, index, d),
                          });
                          setAnnouncement(
                            `${section.label} moved to position ${index + d + 1}`,
                          );
                        }}
                        removeDisabled={definition.fields.some(
                          (f) => f.sectionId === section.id,
                        )}
                        onRemove={() =>
                          edit({
                            ...definition,
                            sections: definition.sections.filter(
                              (s) => s.id !== section.id,
                            ),
                          })
                        }
                      />
                      <Control
                        label="Section label"
                        path={["definition", "sections", index, "label"]}
                        issues={issues}
                      >
                        {(props) => (
                          <input
                            {...props}
                            value={section.label}
                            maxLength={100}
                            onChange={(e) =>
                              edit({
                                ...definition,
                                sections: definition.sections.map((s) =>
                                  s.id === section.id
                                    ? { ...s, label: e.target.value }
                                    : s,
                                ),
                              })
                            }
                          />
                        )}
                      </Control>
                      {definition.fields.some(
                        (f) => f.sectionId === section.id,
                      ) && (
                        <small>
                          Move or remove this section's dimensions before
                          removing it.
                        </small>
                      )}
                    </fieldset>
                  ))}
                  <button
                    type="button"
                    disabled={definition.sections.length >= 10}
                    onClick={() =>
                      edit({
                        ...definition,
                        sections: [
                          ...definition.sections,
                          { id: nodeId(), label: "New section" },
                        ],
                      })
                    }
                  >
                    Add section
                  </button>
                  {definition.fields.map((field, index) => (
                    <FieldEditor
                      key={field.id}
                      field={field}
                      index={index}
                      definition={definition}
                      issues={issues}
                      announce={setAnnouncement}
                      onChange={(next) =>
                        edit({
                          ...definition,
                          fields: definition.fields.map((f) =>
                            f.id === field.id ? next : f,
                          ),
                        })
                      }
                      onRemove={() =>
                        edit({
                          ...definition,
                          fields: definition.fields.filter(
                            (f) => f.id !== field.id,
                          ),
                        })
                      }
                      onMove={(d) => {
                        edit({
                          ...definition,
                          fields: move(definition.fields, index, d),
                        });
                        setAnnouncement(
                          `${field.label} moved to position ${index + d + 1}`,
                        );
                      }}
                    />
                  ))}
                  <button
                    type="button"
                    disabled={
                      definition.fields.length >= 60 ||
                      definition.sections.length === 0
                    }
                    onClick={() => {
                      const section = definition.sections[0];
                      if (section)
                        edit({
                          ...definition,
                          fields: [
                            ...definition.fields,
                            newField("length", section.id),
                          ],
                        });
                    }}
                  >
                    Add dimension
                  </button>
                  {definition.sections.length === 0 && (
                    <small>
                      Add a section before adding dimensions. An empty schema is
                      also valid.
                    </small>
                  )}
                </div>
                <div className="master-section">
                  <h3>03 · Construction choices</h3>
                  {definition.constructionGroups.map((group, index) => (
                    <GroupEditor
                      key={group.id}
                      group={group}
                      index={index}
                      total={definition.constructionGroups.length}
                      issues={issues}
                      announce={setAnnouncement}
                      onChange={(next) =>
                        edit({
                          ...definition,
                          constructionGroups: definition.constructionGroups.map(
                            (g) => (g.id === group.id ? next : g),
                          ),
                        })
                      }
                      onRemove={() =>
                        edit({
                          ...definition,
                          constructionGroups:
                            definition.constructionGroups.filter(
                              (g) => g.id !== group.id,
                            ),
                        })
                      }
                      onMove={(d) => {
                        edit({
                          ...definition,
                          constructionGroups: move(
                            definition.constructionGroups,
                            index,
                            d,
                          ),
                        });
                        setAnnouncement(
                          `${group.label} moved to position ${index + d + 1}`,
                        );
                      }}
                    />
                  ))}
                  <button
                    type="button"
                    disabled={definition.constructionGroups.length >= 12}
                    onClick={() =>
                      edit({
                        ...definition,
                        constructionGroups: [
                          ...definition.constructionGroups,
                          {
                            id: nodeId(),
                            kind: "single",
                            label: "New construction group",
                            required: false,
                            help: "",
                            illustrationId: null,
                            choices: [
                              {
                                id: nodeId(),
                                label: "Plain",
                                illustrationId: null,
                                active: true,
                              },
                            ],
                          },
                        ],
                      })
                    }
                  >
                    Add construction group
                  </button>
                </div>
              </fieldset>
              <EligibilityEditor
                base={base}
                definition={definition}
                current={current}
                rates={draft.rates}
                showRates={workspace.permissions.includes("masters.rates.read")}
                disabled={!writable || locked}
                issues={issues}
                onChange={(definition, rates) => {
                  edit(definition);
                  setDraft((d) => (d ? { ...d, definition, rates } : d));
                }}
              />
              <div className="master-save-bar">
                <span>
                  {Math.ceil(estimatedDefinitionBytes(definition) / 1024)} KiB
                  estimated · {Math.round(c.MASTER_DEFINITION_BYTES / 1024)} KiB
                  stored limit · {Math.round(c.MASTER_REQUEST_BYTES / 1024)} KiB
                  request limit
                </span>
                <div className="master-actions">
                  {writable && (
                    <button
                      type="button"
                      className="master-primary"
                      disabled={locked || !dirty}
                      onClick={() => void save()}
                    >
                      Save new version
                    </button>
                  )}
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => {
                      if (!discard()) return;
                      setDraft(null);
                      setHistory(null);
                      setSnapshot(null);
                      setIssues([]);
                      pending.current = null;
                      setNotice({
                        kind: "idle",
                        message: "Local draft closed.",
                      });
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </section>
            <aside className="master-inspector">
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
              <GarmentPreview definition={snapshot?.definition ?? definition} />
              {snapshot && (
                <section
                  className="master-history"
                  aria-label="Historical eligibility"
                >
                  <h3>Saved eligibility · revision {snapshot.revision}</h3>
                  {historicalRates.success && (
                    <p>
                      Saved base default: {rate(historicalRates.data.baseRate)}
                    </p>
                  )}
                  <h4>Eligible services</h4>
                  {snapshot.definition.services.length ? (
                    <ul>
                      {snapshot.definition.services.map((service) => (
                        <li key={service.serviceId}>
                          {service.savedLabel}
                          {historicalRates.success
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
              {draft.kind === "saved" && (
                <section className="master-history">
                  <h3>Saved history</h3>
                  <ol>
                    {history?.items.map((version) => (
                      <li key={version.id}>
                        <button
                          type="button"
                          disabled={locked}
                          aria-pressed={
                            snapshot?.garmentVersionId ===
                            c.garmentVersionId.parse(version.id)
                          }
                          onClick={() => void historical(version.id)}
                        >
                          Revision {version.revision}
                        </button>
                        <small>
                          {new Date(version.createdAt).toLocaleString()}
                        </small>
                      </li>
                    ))}
                  </ol>
                  {history?.nextOffset !== null && history && (
                    <button
                      type="button"
                      disabled={locked}
                      onClick={async () => {
                        setBusy(true);
                        try {
                          const next = await response(
                            fetch(
                              `${base}/garments/${draft.current.garmentId}/versions?offset=${history.nextOffset}`,
                            ),
                            c.masterHistoryPage,
                          );
                          setHistory({
                            ...next,
                            items: [...history.items, ...next.items],
                          });
                        } catch (error) {
                          failed(error);
                        } finally {
                          setBusy(false);
                        }
                      }}
                    >
                      More history
                    </button>
                  )}
                </section>
              )}
            </aside>
          </>
        ) : itemDraft ? (
          <CatalogEditor
            key={
              itemDraft.kind === "saved"
                ? itemDraft.current.id
                : `new-${itemDraft.entity}`
            }
            draft={itemDraft}
            history={history}
            base={base}
            disabled={!canManage || locked || notice.kind === "access"}
            canManage={canManage && notice.kind !== "access"}
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
    </>
  );
}
