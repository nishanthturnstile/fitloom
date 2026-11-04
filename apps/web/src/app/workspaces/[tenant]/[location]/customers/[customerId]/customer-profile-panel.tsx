"use client";
import {
  customerActivityPage,
  customerCommandPayloads,
  type customerDetail,
  customerErrorResponse,
  customerResponse,
  normalizeCustomerSearch,
  wearerBirthdayAllowed,
  wearerPage,
  wearerProfile,
} from "@fitloom/application/customer-contracts";
import type { PhotoOwner } from "@fitloom/application/customer-photo-contracts";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  useLeaveProtection,
  useNavigationGuard,
} from "@/components/workspace/navigation-guard";
import {
  CustomerPhotoEditor,
  type PhotoProtection,
} from "./customer-photo-editor";

type Detail = ReturnType<typeof customerDetail.parse>;
type Wearer = Detail["wearers"]["items"][number];
type Command =
  | "wearer.create"
  | "wearer.update"
  | "customer.archive"
  | "customer.restore"
  | "wearer.archive"
  | "wearer.restore";
type Pending = { command: Command; bytes: string };
type Operation =
  | { kind: "idle" }
  | { kind: "saving" | "uncertain" | "blocked"; pending: Pending };
type Editor =
  | { kind: "photo"; owner: PhotoOwner; title: string }
  | { kind: "wearer"; saved: Wearer | null }
  | {
      kind: "lifecycle";
      command: Exclude<Command, "wearer.create" | "wearer.update">;
      wearer: Wearer | null;
    }
  | null;
type Draft = {
  name: string;
  relationship: string;
  birthday: string;
  gender: string;
  height: string;
  heightUnit: "cm" | "in";
  weight: string;
  weightUnit: "kg" | "lb";
  notes: string;
  fit: string;
  fabric: string;
  design: string;
};
function draftFrom(saved: Wearer | null): Draft {
  const p = saved?.profile;
  return {
    name: p?.name ?? "",
    relationship: p?.relationship ?? "",
    birthday: p?.birthday ?? "",
    gender: p?.gender.kind === "self-described" ? p.gender.description : "",
    height: p?.height?.value ?? "",
    heightUnit: p?.height?.unit ?? "cm",
    weight: p?.weight?.value ?? "",
    weightUnit: p?.weight?.unit ?? "kg",
    notes: p?.notes ?? "",
    fit: p?.preferences.fit ?? "",
    fabric: p?.preferences.fabric ?? "",
    design: p?.preferences.design ?? "",
  };
}
const blank = (v: string) => v.trim() || null;
type PageState<T> =
  | { kind: "ready"; page: T }
  | { kind: "loading" }
  | { kind: "error"; message: string; denied: boolean };
// Both continuations discard old rows/counts on failure and cancel superseded reads.
function usePage<T>(
  url: string,
  schema: { parse: (value: unknown) => T },
  initial: T | null,
  enabled: boolean,
) {
  const [offset, setOffset] = useState(0),
    [revision, setRevision] = useState(0),
    [state, setState] = useState<PageState<T>>(
      initial ? { kind: "ready", page: initial } : { kind: "loading" },
    );
  useEffect(() => {
    if (!enabled) return;
    if (initial && offset === 0 && revision === 0) {
      setState({ kind: "ready", page: initial });
      return;
    }
    const controller = new AbortController();
    let active = true;
    setState({ kind: "loading" });
    void (async () => {
      try {
        const response = await fetch(`${url}?offset=${offset}&limit=25`, {
          cache: "no-store",
          signal: AbortSignal.any([
            controller.signal,
            AbortSignal.timeout(15000),
          ]),
        });
        if (!response.headers.get("content-type")?.includes("application/json"))
          throw Error("This list is unavailable. Try again.");
        const body: unknown = await response.json();
        if (!active) return;
        if (!response.ok) {
          const error = customerErrorResponse.safeParse(body);
          setState({
            kind: "error",
            message: error.success
              ? `${error.data.message} Reference: ${error.data.correlationId}`
              : "This list is unavailable. Try again.",
            denied:
              error.success &&
              (error.data.code === "denied" ||
                error.data.code === "session-expired"),
          });
          return;
        }
        const page = schema.parse(body);
        if (active) setState({ kind: "ready", page });
      } catch {
        if (active)
          setState({
            kind: "error",
            message: "This list is unavailable. Try again.",
            denied: false,
          });
      }
    })();
    return () => {
      active = false;
      controller.abort();
    };
  }, [url, schema, initial, enabled, offset, revision]);
  return { state, offset, setOffset, refresh: () => setRevision((r) => r + 1) };
}
export function CustomerProfilePanel({
  base,
  data,
  today,
  children,
  measurements,
}: {
  base: string;
  data: Detail;
  measurements: { read: boolean; manage: boolean };
  today: string;
  children: ReactNode;
}) {
  const [ready, setReady] = useState(false);
  const [photoProtection, setPhotoProtection] = useState<PhotoProtection>({
    active: false,
    uncertain: false,
    saving: false,
  });
  const [section, setSection] = useState("overview"),
    [editor, setEditor] = useState<Editor>(null),
    [draft, setDraft] = useState<Draft>(() => draftFrom(null)),
    [operation, setOperation] = useState<Operation>({ kind: "idle" }),
    [message, setMessage] = useState(""),
    [issues, setIssues] = useState<{ path: string; message: string }[]>([]),
    [readDenied, setReadDenied] = useState(false);
  const optional = useRef<HTMLDetailsElement>(null),
    guard = useNavigationGuard(),
    api = `${base.replace("/workspaces/", "/api/workspaces/")}/customers/${data.id}`;
  const wearers = usePage(
      `${api}/wearers`,
      wearerPage,
      data.wearers,
      !readDenied,
    ),
    activity = usePage(
      `${api}/activity`,
      customerActivityPage,
      null,
      section === "activity" && !readDenied,
    );
  const denied = readDenied || operation.kind === "blocked",
    busy = operation.kind === "saving" || photoProtection.saving,
    locked =
      operation.kind !== "idle" ||
      denied ||
      photoProtection.saving ||
      photoProtection.uncertain;
  const dirty =
    editor?.kind === "wearer" &&
    JSON.stringify(draft) !== JSON.stringify(draftFrom(editor.saved));
  useLeaveProtection({
    active: !!dirty || operation.kind !== "idle" || photoProtection.active,
    uncertain:
      operation.kind === "uncertain" ||
      operation.kind === "blocked" ||
      photoProtection.uncertain,
    locked,
    noun: editor?.kind === "wearer" ? "wearer" : "customer",
  });
  useEffect(() => {
    setReady(true);
    const hash = location.hash.slice(1);
    if (
      hash === "wearers" ||
      hash === "activity" ||
      (hash === "measurements" && measurements.read)
    )
      setSection(hash);
  }, [measurements.read]);
  useEffect(() => {
    if (
      (wearers.state.kind === "error" && wearers.state.denied) ||
      (activity.state.kind === "error" && activity.state.denied)
    )
      setReadDenied(true);
  }, [wearers.state, activity.state]);
  function selectSection(value: unknown) {
    if (typeof value !== "string" || editor || operation.kind !== "idle")
      return;
    setSection(value);
    history.replaceState(
      history.state,
      "",
      `${location.pathname}${location.search}#${value}`,
    );
  }
  function canManagePhoto(owner: PhotoOwner) {
    const wearerIdentity =
      owner.kind === "wearer-photo" ? owner.wearerId : null;
    return (
      data.capabilities.photosManage &&
      !data.archivedAt &&
      (!wearerIdentity ||
        rows.some((w) => w.id === wearerIdentity && !w.archivedAt))
    );
  }
  function close() {
    if (busy) return;
    if (guard.confirmLeave()) {
      setEditor(null);
      setOperation({ kind: "idle" });
      setIssues([]);
      setMessage("");
    }
  }
  function openWearer(saved: Wearer | null) {
    if (denied || editor) return;
    setDraft(draftFrom(saved));
    setEditor({ kind: "wearer", saved });
    setMessage("");
    setIssues([]);
  }
  function lifecycle(
    command: Exclude<Command, "wearer.create" | "wearer.update">,
    wearer: Wearer | null,
  ) {
    if (denied || editor) return;
    setEditor({ kind: "lifecycle", command, wearer });
    setMessage("");
    setIssues([]);
  }
  function showIssues(next: typeof issues) {
    next = next.map((i) => ({
      ...i,
      path: i.path.replace(/^preferences\./, ""),
    }));
    setIssues(next);
    if (optional.current) optional.current.open = true;
    requestAnimationFrame(() => {
      const first = next[0]?.path.split(".")[0];
      document.getElementById(`wearer-${first}`)?.focus();
    });
  }
  async function send(pending: Pending) {
    setOperation({ kind: "saving", pending });
    setMessage("");
    try {
      const response = await fetch(
        `${base.replace("/workspaces/", "/api/workspaces/")}/customers/commands/${pending.command}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: pending.bytes,
          signal: AbortSignal.timeout(15000),
        },
      );
      if (!response.headers.get("content-type")?.includes("application/json"))
        throw Error();
      const raw: unknown = await response.json(),
        parsed = customerResponse.safeParse(raw);
      if (!parsed.success) throw Error();
      const body = parsed.data;
      if (body.outcome === "saved" && response.ok) {
        const url = new URL(location.href);
        url.searchParams.set("saved", body.result.changed ? "1" : "unchanged");
        url.hash =
          editor?.kind === "lifecycle" && !editor.wearer
            ? "overview"
            : "wearers";
        history.replaceState(
          history.state,
          "",
          `${url.pathname}${url.search}${url.hash}`,
        );
        guard.commitReload();
        return;
      }
      if (
        body.outcome !== "error" ||
        body.code === "temporary" ||
        body.code === "invalid-response" ||
        body.code === "busy" ||
        body.code === "rate-limit"
      )
        throw Error();
      if (body.code === "denied" || body.code === "session-expired")
        setReadDenied(true);
      setOperation(
        body.code === "denied" || body.code === "session-expired"
          ? { kind: "blocked", pending }
          : { kind: "idle" },
      );
      setMessage(`${body.message} Reference: ${body.correlationId}`);
      showIssues(
        body.issues.map((i) => ({
          path: i.path.filter((p) => p !== "profile").join("."),
          message: i.message,
        })),
      );
    } catch {
      setOperation({ kind: "uncertain", pending });
      setMessage(
        "The save outcome is unknown. Retry the same request to recover its result.",
      );
    }
  }
  function dispatch(command: Command, payload: unknown) {
    const parsed = customerCommandPayloads[command].safeParse(payload);
    if (!parsed.success) {
      showIssues(
        parsed.error.issues.map((i) => ({
          path: i.path.filter((p) => p !== "profile").join("."),
          message: i.message,
        })),
      );
      return;
    }
    void send({
      command,
      bytes: JSON.stringify({
        operationKey: crypto.randomUUID(),
        correlationId: crypto.randomUUID(),
        payload: parsed.data,
      }),
    });
  }
  function saveWearer() {
    if (editor?.kind !== "wearer" || locked) return;
    const profile = {
      name: draft.name,
      relationship: blank(draft.relationship),
      birthday: blank(draft.birthday),
      gender: blank(draft.gender)
        ? { kind: "self-described", description: draft.gender }
        : { kind: "unspecified" },
      height: blank(draft.height)
        ? { value: draft.height, unit: draft.heightUnit }
        : null,
      weight: blank(draft.weight)
        ? { value: draft.weight, unit: draft.weightUnit }
        : null,
      notes: blank(draft.notes),
      preferences: {
        fit: blank(draft.fit),
        fabric: blank(draft.fabric),
        design: blank(draft.design),
      },
    };
    const parsed = wearerProfile.safeParse(profile);
    if (!parsed.success) {
      showIssues(
        parsed.error.issues.map((i) => ({
          path: i.path.join("."),
          message: i.message,
        })),
      );
      return;
    }
    if (!wearerBirthdayAllowed(parsed.data.birthday, today)) {
      showIssues([
        {
          path: "birthday",
          message: "Birthday cannot be in the future in this shop's timezone.",
        },
      ]);
      return;
    }
    dispatch(editor.saved ? "wearer.update" : "wearer.create", {
      customerId: data.id,
      ...(editor.saved
        ? { wearerId: editor.saved.id, expectedVersion: editor.saved.version }
        : {}),
      profile: parsed.data,
    });
  }
  const rows = wearers.state.kind === "ready" ? wearers.state.page.items : [];
  const repeated =
    editor?.kind === "wearer" &&
    rows.some(
      (w) =>
        w.id !== editor.saved?.id &&
        normalizeCustomerSearch(w.profile.name) ===
          normalizeCustomerSearch(draft.name),
    );
  const title =
    editor?.kind === "wearer"
      ? editor.saved
        ? "Edit wearer"
        : "Add wearer"
      : editor?.kind === "lifecycle"
        ? `${editor.command.endsWith("archive") ? "Archive" : "Restore"} ${editor.wearer ? "wearer" : "customer"}`
        : editor?.kind === "photo"
          ? editor.title
          : "Wearer";
  function field(
    key: Exclude<keyof Draft, "heightUnit" | "weightUnit">,
    label: string,
    type = "text",
    multiline = false,
  ) {
    const error = issues.find(
      (i) => i.path === key || i.path.startsWith(`${key}.`),
    );
    return (
      <Field data-invalid={!!error}>
        <FieldLabel htmlFor={`wearer-${key}`}>{label}</FieldLabel>
        {multiline ? (
          <textarea
            id={`wearer-${key}`}
            className="customer-filter min-h-24"
            value={draft[key]}
            onChange={(e) => setDraft((d) => ({ ...d, [key]: e.target.value }))}
            aria-invalid={!!error}
            aria-describedby={error ? `wearer-error-${key}` : undefined}
          />
        ) : (
          <Input
            id={`wearer-${key}`}
            type={type}
            value={draft[key]}
            onChange={(e) => setDraft((d) => ({ ...d, [key]: e.target.value }))}
            aria-invalid={!!error}
            aria-describedby={error ? `wearer-error-${key}` : undefined}
          />
        )}{" "}
        {error && (
          <p id={`wearer-error-${key}`} className="text-sm text-destructive">
            {error.message}
          </p>
        )}
      </Field>
    );
  }
  function wearerDetails(w: Wearer) {
    const p = w.profile;
    return (
      <details>
        <summary className="cursor-pointer">Wearer details</summary>
        <dl className="mt-3 grid gap-3 text-sm">
          {p.birthday && (
            <div>
              <dt>Birthday</dt>
              <dd>{p.birthday}</dd>
            </div>
          )}
          {p.gender.kind === "self-described" && (
            <div>
              <dt>Gender</dt>
              <dd className="break-words">{p.gender.description}</dd>
            </div>
          )}
          {p.height && (
            <div>
              <dt>Profile height</dt>
              <dd>
                {p.height.value} {p.height.unit}
              </dd>
            </div>
          )}
          {p.weight && (
            <div>
              <dt>Profile weight</dt>
              <dd>
                {p.weight.value} {p.weight.unit}
              </dd>
            </div>
          )}
          {Object.entries({ notes: p.notes, ...p.preferences }).map(
            ([key, value]) =>
              value ? (
                <div key={key}>
                  <dt>{key}</dt>
                  <dd className="whitespace-pre-wrap break-words">{value}</dd>
                </div>
              ) : null,
          )}
        </dl>
      </details>
    );
  }
  return (
    <>
      {denied && (
        <Alert>
          <AlertDescription>
            Your access changed. Further reads and edits are paused. Leave or
            restore access before an explicit retry.
          </AlertDescription>
        </Alert>
      )}
      <div className="mb-5 flex flex-wrap gap-3">
        {data.capabilities.photosRead && !denied && (
          <Button
            variant="outline"
            disabled={!ready || !!editor}
            onClick={() =>
              setEditor({
                kind: "photo",
                owner: { kind: "customer-avatar", customerId: data.id },
                title: "Customer photo",
              })
            }
          >
            Customer photo
          </Button>
        )}
        {data.capabilities.archive && !denied && (
          <Button
            variant="outline"
            disabled={!ready || !!editor || busy}
            onClick={() =>
              lifecycle(
                data.archivedAt ? "customer.restore" : "customer.archive",
                null,
              )
            }
          >
            {data.archivedAt ? "Restore customer" : "Archive customer"}
          </Button>
        )}
      </div>
      <Tabs value={section} onValueChange={selectSection}>
        <TabsList aria-label="Customer sections">
          <TabsTrigger value="overview" disabled={!ready || !!editor}>
            Overview
          </TabsTrigger>
          <TabsTrigger value="wearers" disabled={!ready || !!editor}>
            Wearers
          </TabsTrigger>
          {measurements.read ? (
            <TabsTrigger value="measurements" disabled={!ready || !!editor}>
              Measurements
            </TabsTrigger>
          ) : null}
          <TabsTrigger value="activity" disabled={!ready || !!editor}>
            Activity
          </TabsTrigger>
        </TabsList>
        <TabsContent value="overview">{children}</TabsContent>
        {measurements.read ? (
          <TabsContent value="measurements">
            <Card>
              <CardHeader>
                <CardTitle>Measurements by wearer</CardTitle>
                <CardDescription>
                  Choose a named wearer to open their body and garment
                  measurement book.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                {wearers.state.kind === "loading" ? (
                  <p role="status">Loading wearers…</p>
                ) : wearers.state.kind === "error" ? (
                  <Alert>
                    <AlertDescription>{wearers.state.message}</AlertDescription>
                  </Alert>
                ) : rows.length ? (
                  <ul className="flex flex-col gap-4">
                    {rows.map((w) => (
                      <li
                        key={w.id}
                        className="flex min-w-0 flex-col gap-3 rounded-lg border border-border p-4"
                      >
                        <p className="break-words font-medium">
                          {w.profile.name}
                        </p>
                        <div className="flex flex-wrap gap-3">
                          <a
                            className="text-primary underline"
                            href={`${base}/customers/${data.id}/wearers/${w.id}/measurements`}
                          >
                            Open measurements
                          </a>
                          {measurements.manage &&
                          !data.archivedAt &&
                          !w.archivedAt &&
                          !denied ? (
                            <a
                              className="text-primary underline"
                              href={`${base}/customers/${data.id}/wearers/${w.id}/measurements/new`}
                            >
                              Add measurements
                            </a>
                          ) : null}
                        </div>
                        {w.archivedAt ? (
                          <Badge variant="secondary">Archived wearer</Badge>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p>
                    No named wearers saved. Add a wearer before recording
                    measurements.
                  </p>
                )}
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    disabled={denied || wearers.offset === 0}
                    onClick={() =>
                      wearers.setOffset(Math.max(0, wearers.offset - 25))
                    }
                  >
                    Previous wearers
                  </Button>
                  <Button
                    variant="outline"
                    disabled={
                      denied ||
                      wearers.state.kind !== "ready" ||
                      wearers.state.page.nextOffset === null
                    }
                    onClick={() =>
                      wearers.state.kind === "ready" &&
                      wearers.state.page.nextOffset !== null &&
                      wearers.setOffset(wearers.state.page.nextOffset)
                    }
                  >
                    Next wearers
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        ) : null}
        <TabsContent value="wearers">
          <Card>
            <CardHeader>
              <CardTitle>
                <h2>Wearers</h2>
              </CardTitle>
              <CardDescription>
                {wearers.state.kind === "ready"
                  ? `${wearers.state.page.total} saved wearers`
                  : "Saved people for this customer."}
                {data.archivedAt
                  ? " · 0 selectable while this customer is archived"
                  : ""}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-5">
              {data.archivedAt ? (
                <p>
                  Restore the customer before editing or changing wearers.
                  Individual archive states are retained.
                </p>
              ) : (
                data.capabilities.manage &&
                !denied && (
                  <Button
                    className="self-start"
                    disabled={!ready || !!editor}
                    onClick={() => openWearer(null)}
                  >
                    Add wearer
                  </Button>
                )
              )}
              {wearers.state.kind === "loading" && (
                <p role="status">Loading wearers…</p>
              )}
              {wearers.state.kind === "error" && (
                <Alert>
                  <AlertDescription>{wearers.state.message}</AlertDescription>
                </Alert>
              )}
              {wearers.state.kind === "ready" &&
                (rows.length ? (
                  <ul className="flex flex-col gap-4">
                    {rows.map((w) => (
                      <li
                        key={w.id}
                        data-wearer-id={w.id}
                        className="flex min-w-0 flex-col gap-3 rounded-lg border border-border p-4"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <h2 className="min-w-0 break-words font-medium">
                            {w.profile.name}
                          </h2>
                          <Badge variant="outline">
                            {w.effectiveActive
                              ? "Active"
                              : w.archivedAt
                                ? "Archived"
                                : "Customer archived"}
                          </Badge>
                        </div>
                        {w.profile.relationship && (
                          <p className="break-words text-sm text-muted-foreground">
                            {w.profile.relationship}
                          </p>
                        )}
                        {wearerDetails(w)}
                        {data.capabilities.photosRead && !denied && (
                          <div className="flex flex-wrap gap-2">
                            {(["face", "body"] as const).map((role) => (
                              <Button
                                key={role}
                                size="sm"
                                variant="outline"
                                onClick={() =>
                                  setEditor({
                                    kind: "photo",
                                    owner: {
                                      kind: "wearer-photo",
                                      customerId: data.id,
                                      wearerId: w.id,
                                      role,
                                    },
                                    title: `${w.profile.name} · ${role} photo`,
                                  })
                                }
                              >
                                {role === "face" ? "Face photo" : "Body photo"}
                              </Button>
                            ))}
                          </div>
                        )}
                        {measurements.read && !denied ? (
                          <div className="flex flex-wrap gap-3">
                            <a
                              className="text-primary underline"
                              href={`${base}/customers/${data.id}/wearers/${w.id}/measurements`}
                            >
                              Open measurements
                            </a>
                            {measurements.manage &&
                            !data.archivedAt &&
                            !w.archivedAt ? (
                              <a
                                className="text-primary underline"
                                href={`${base}/customers/${data.id}/wearers/${w.id}/measurements/new`}
                              >
                                Add measurements
                              </a>
                            ) : null}
                          </div>
                        ) : null}
                        {!data.archivedAt && !denied && (
                          <div className="flex flex-wrap gap-2">
                            {data.capabilities.manage && !w.archivedAt && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => openWearer(w)}
                              >
                                Edit wearer
                              </Button>
                            )}
                            {data.capabilities.archive && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() =>
                                  lifecycle(
                                    w.archivedAt
                                      ? "wearer.restore"
                                      : "wearer.archive",
                                    w,
                                  )
                                }
                              >
                                {w.archivedAt
                                  ? "Restore wearer"
                                  : "Archive wearer"}
                              </Button>
                            )}
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p>No named wearers saved.</p>
                ))}
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  disabled={
                    denied ||
                    wearers.state.kind === "loading" ||
                    wearers.offset === 0
                  }
                  onClick={() =>
                    wearers.setOffset(Math.max(0, wearers.offset - 25))
                  }
                >
                  Previous wearers
                </Button>
                <Button
                  variant="outline"
                  disabled={
                    denied ||
                    wearers.state.kind !== "ready" ||
                    wearers.state.page.nextOffset === null
                  }
                  onClick={() => {
                    if (
                      wearers.state.kind === "ready" &&
                      wearers.state.page.nextOffset !== null
                    )
                      wearers.setOffset(wearers.state.page.nextOffset);
                  }}
                >
                  Next wearers
                </Button>
                <Button
                  variant="ghost"
                  disabled={denied || wearers.state.kind === "loading"}
                  onClick={wearers.refresh}
                >
                  Refresh wearers
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">
                Height and weight are profile attributes. Measurement entry
                belongs to the next build.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="activity">
          <Card>
            <CardHeader>
              <CardTitle>
                <h2>CRM activity</h2>
              </CardTitle>
              <CardDescription>
                Saved customer and wearer changes. No contact values are copied
                here.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              {activity.state.kind === "loading" && (
                <p role="status">Loading activity…</p>
              )}
              {activity.state.kind === "error" && (
                <Alert>
                  <AlertDescription>{activity.state.message}</AlertDescription>
                </Alert>
              )}
              {activity.state.kind === "ready" && (
                <>
                  <p role="status">{activity.state.page.total} changes</p>
                  {activity.state.page.items.length ? (
                    <ul className="flex flex-col gap-3">
                      {activity.state.page.items.map((item) => (
                        <li
                          key={item.id}
                          className="flex flex-col gap-1 border-b border-border pb-3"
                        >
                          <span>
                            {item.kind.replace(".", " · ")} · {item.actor}
                          </span>
                          <time dateTime={item.createdAt}>
                            {new Date(item.createdAt).toLocaleString()}
                          </time>
                          <span className="break-words text-sm text-muted-foreground">
                            Changed fields:{" "}
                            {item.changedFields.join(", ") || "None"} · version{" "}
                            {item.previousVersion} → {item.nextVersion}
                          </span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p>No CRM activity recorded.</p>
                  )}
                </>
              )}
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  disabled={
                    denied ||
                    activity.state.kind === "loading" ||
                    activity.offset === 0
                  }
                  onClick={() =>
                    activity.setOffset(Math.max(0, activity.offset - 25))
                  }
                >
                  Previous activity
                </Button>
                <Button
                  variant="outline"
                  disabled={
                    denied ||
                    activity.state.kind !== "ready" ||
                    activity.state.page.nextOffset === null
                  }
                  onClick={() => {
                    if (
                      activity.state.kind === "ready" &&
                      activity.state.page.nextOffset !== null
                    )
                      activity.setOffset(activity.state.page.nextOffset);
                  }}
                >
                  Next activity
                </Button>
                <Button
                  variant="ghost"
                  disabled={denied || activity.state.kind === "loading"}
                  onClick={activity.refresh}
                >
                  Refresh activity
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      <Sheet
        open={editor !== null}
        onOpenChange={(open) => {
          if (!open) close();
        }}
      >
        <SheetContent className="overflow-y-auto" showCloseButton={!busy}>
          <SheetHeader>
            <SheetTitle>{title}</SheetTitle>
            <SheetDescription>
              {editor?.kind === "photo"
                ? "Photos are private. Save a replacement explicitly; the existing photo stays until it succeeds."
                : editor?.kind === "wearer"
                  ? "A named person with independent preferences. Only the name is required."
                  : "History remains available. This changes availability for new work."}
            </SheetDescription>
          </SheetHeader>
          <div className="flex min-w-0 flex-col gap-4 px-4 pb-6">
            {message && (
              <Alert>
                <AlertDescription>{message}</AlertDescription>
              </Alert>
            )}
            {editor?.kind === "photo" ? (
              <CustomerPhotoEditor
                base={base}
                owner={editor.owner}
                canManage={canManagePhoto(editor.owner)}
                onProtection={setPhotoProtection}
              />
            ) : editor?.kind === "wearer" ? (
              <form
                noValidate
                onSubmit={(e) => {
                  e.preventDefault();
                  saveWearer();
                }}
                className="flex flex-col gap-5"
              >
                <fieldset disabled={locked}>
                  <FieldGroup>
                    {field("name", "Wearer name")}
                    {field("relationship", "Relationship (optional)")}
                    {repeated && (
                      <p role="status">
                        A saved wearer on this page has this name. Repeated
                        names are allowed; check the person before saving.
                      </p>
                    )}
                    <details ref={optional}>
                      <summary className="cursor-pointer font-medium">
                        Optional wearer details
                      </summary>
                      <FieldGroup className="mt-4">
                        {field("birthday", "Birthday", "date")}
                        {field("gender", "Gender (self-described)")}
                        <div className="grid grid-cols-2 gap-3">
                          {field("height", "Height")}
                          <Field>
                            <FieldLabel htmlFor="wearer-heightUnit">
                              Height unit
                            </FieldLabel>
                            <select
                              id="wearer-heightUnit"
                              className="customer-filter"
                              value={draft.heightUnit}
                              onChange={(e) => {
                                const value = e.target.value;
                                if (value === "cm" || value === "in")
                                  setDraft((d) => ({
                                    ...d,
                                    heightUnit: value,
                                  }));
                              }}
                            >
                              <option>cm</option>
                              <option>in</option>
                            </select>
                          </Field>
                          {field("weight", "Weight")}
                          <Field>
                            <FieldLabel htmlFor="wearer-weightUnit">
                              Weight unit
                            </FieldLabel>
                            <select
                              id="wearer-weightUnit"
                              className="customer-filter"
                              value={draft.weightUnit}
                              onChange={(e) => {
                                const value = e.target.value;
                                if (value === "kg" || value === "lb")
                                  setDraft((d) => ({
                                    ...d,
                                    weightUnit: value,
                                  }));
                              }}
                            >
                              <option>kg</option>
                              <option>lb</option>
                            </select>
                          </Field>
                        </div>
                        {field("notes", "Personal notes", "text", true)}
                        {field("fit", "Fit preferences", "text", true)}
                        {field("fabric", "Fabric preferences", "text", true)}
                        {field("design", "Design preferences", "text", true)}
                      </FieldGroup>
                    </details>
                  </FieldGroup>
                </fieldset>
                {issues.length > 0 && (
                  <ul role="alert">
                    {issues.map((i) => (
                      <li key={`${i.path}-${i.message}`}>
                        <a
                          href={`#wearer-${i.path.split(".")[0]}`}
                          className="text-primary underline"
                        >
                          {i.path}: {i.message}
                        </a>
                      </li>
                    ))}
                  </ul>
                )}
                {operation.kind === "idle" && !denied && (
                  <Button type="submit">Save wearer</Button>
                )}
                {busy && <Button disabled>Saving wearer…</Button>}
              </form>
            ) : (
              editor?.kind === "lifecycle" && (
                <>
                  <p className="break-words">
                    {title}:{" "}
                    <strong>
                      {editor.wearer?.profile.name ?? data.profile.name}
                    </strong>
                  </p>
                  <p>
                    {editor.wearer
                      ? "This person's history remains. The other wearers are unchanged."
                      : "The customer's history remains. Individual wearer archive states are unchanged; archived wearers stay archived after customer restore."}
                  </p>
                  {operation.kind === "idle" && !denied && (
                    <Button
                      onClick={() => {
                        if (editor?.kind !== "lifecycle") return;
                        dispatch(editor.command, {
                          customerId: data.id,
                          ...(editor.wearer
                            ? {
                                wearerId: editor.wearer.id,
                                expectedVersion: editor.wearer.version,
                              }
                            : { expectedVersion: data.version }),
                        });
                      }}
                    >
                      Confirm{" "}
                      {editor.command.endsWith("archive")
                        ? "archive"
                        : "restore"}
                    </Button>
                  )}
                  {busy && <Button disabled>Saving status…</Button>}
                </>
              )
            )}
            {(operation.kind === "uncertain" ||
              operation.kind === "blocked") && (
              <Button
                onClick={() => {
                  if (
                    operation.kind === "uncertain" ||
                    operation.kind === "blocked"
                  )
                    void send(operation.pending);
                }}
              >
                Retry save
              </Button>
            )}
            <Button variant="outline" disabled={busy} onClick={close}>
              Cancel
            </Button>
            {message && operation.kind === "idle" && (
              <Button
                variant="outline"
                onClick={() => {
                  if (guard.confirmLeave()) guard.commitReload();
                }}
              >
                Reload saved profile
              </Button>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
