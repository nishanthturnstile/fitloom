"use client";
import {
  type CustomerPage,
  customerErrorResponse,
  customerPage,
  customerSearchQuery,
  customerSegment,
  customerText,
  normalizeCustomerSearch,
} from "@fitloom/application/customer-contracts";
import { formatCustomerPhone } from "@fitloom/application/customer-phone";
import { type MouseEvent, useEffect, useRef, useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  type CustomerReturnScope,
  clearCustomerReturns,
} from "@/components/workspace/customer-return-session";
import {
  type CustomerRegisterQuery,
  readCustomerReturn,
  rememberCustomerReturn,
} from "@/components/workspace/customer-return-state";
import { useNavigationGuard } from "@/components/workspace/navigation-guard";
import { cn } from "@/lib/utils";
export type CustomerRegisterState =
  | { kind: "ready"; page: CustomerPage }
  | { kind: "loading" }
  | { kind: "error"; message: string; code: string };
export function CustomerRegister({
  scope,
  initial,
  canManage,
}: {
  scope: CustomerReturnScope;
  initial: CustomerRegisterState;
  canManage: boolean;
}) {
  const base = `/workspaces/${scope.tenantId}/${scope.locationId}`,
    api = `/api/workspaces/${scope.tenantId}/${scope.locationId}/customers`;
  const [request, setRequest] = useState<{
    query: CustomerRegisterQuery;
    cause: "initial" | "input" | "refresh" | "restore" | "page";
  }>({ query: customerSearchQuery.parse({}), cause: "initial" });
  const [state, setState] = useState(initial),
    [view, setView] = useState<"table" | "cards">("table"),
    [tag, setTag] = useState(""),
    [tagError, setTagError] = useState("");
  const searchRef = useRef<HTMLInputElement>(null),
    generation = useRef(0),
    restoring = useRef(false),
    focusRow = useRef<string | null>(null);
  const guard = useNavigationGuard(),
    q = request.query;
  useEffect(() => {
    const url = new URL(location.href),
      stored = readCustomerReturn(scope, url.searchParams.get("return"));
    if (stored) {
      restoring.current = true;
      focusRow.current = stored.focusedId;
      setView(stored.view);
      setRequest({ query: stored.query, cause: "restore" });
    }
    const focus = () => searchRef.current?.focus();
    if (url.searchParams.get("focus") === "search") focus();
    window.addEventListener("fitloom:customer-search", focus);
    return () => window.removeEventListener("fitloom:customer-search", focus);
  }, [scope]);
  useEffect(() => {
    if (request.cause === "initial") return;
    const current = ++generation.current,
      controller = new AbortController();
    setState({ kind: "loading" });
    const parsed = customerSearchQuery.safeParse(request.query);
    if (!parsed.success) {
      setState({
        kind: "error",
        message:
          "Use a search of at most 120 characters and up to five valid tags.",
        code: "validation",
      });
      return () => controller.abort();
    }
    const timer = setTimeout(
      async () => {
        const timeout = setTimeout(() => controller.abort(), 15000);
        try {
          const response = await fetch(`${api}/search`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(parsed.data),
            signal: controller.signal,
            cache: "no-store",
          });
          if (
            !response.headers.get("content-type")?.includes("application/json")
          )
            throw new Error("Customer search is unavailable. Try again.");
          const body: unknown = await response.json();
          if (current !== generation.current) return;
          if (!response.ok) {
            const error = customerErrorResponse.safeParse(body);
            if (error.success) {
              if (
                error.data.code === "denied" ||
                error.data.code === "session-expired"
              )
                clearCustomerReturns();
              setState({
                kind: "error",
                message: error.data.message,
                code: error.data.code,
              });
              return;
            }
            throw new Error("Customer search is unavailable. Try again.");
          }
          const page = customerPage.parse(body);
          restoring.current = false;
          setState({ kind: "ready", page });
        } catch (error) {
          if (current === generation.current)
            setState({
              kind: "error",
              message: controller.signal.aborted
                ? "Customer search timed out. Try again."
                : error instanceof Error &&
                    error.message ===
                      "Customer search is unavailable. Try again."
                  ? error.message
                  : "Customer search is unavailable. Try again.",
              code: "temporary",
            });
        } finally {
          clearTimeout(timeout);
        }
      },
      request.cause === "input" ? 250 : 0,
    );
    return () => {
      generation.current++;
      clearTimeout(timer);
      controller.abort();
    };
  }, [api, request]);
  useEffect(() => {
    if (restoring.current || state.kind !== "ready" || !focusRow.current)
      return;
    const id = focusRow.current;
    focusRow.current = null;
    const frame = requestAnimationFrame(() => {
      for (const node of document.querySelectorAll<HTMLElement>(
        `[data-customer-id="${id}"]`,
      ))
        if (node.getClientRects().length) {
          node.focus();
          break;
        }
    });
    return () => cancelAnimationFrame(frame);
  }, [state]);
  function update(patch: Partial<CustomerRegisterQuery>) {
    focusRow.current = null;
    setRequest((previous) => ({
      query: { ...previous.query, ...patch, offset: 0 },
      cause: "input",
    }));
  }
  function addTag() {
    const parsed = customerText(40).safeParse(tag);
    if (!parsed.success || q.tags.length >= 5) {
      setTagError(
        "Enter a tag of up to 40 characters. Use at most five filters.",
      );
      return;
    }
    if (
      q.tags.some(
        (t) =>
          normalizeCustomerSearch(t) === normalizeCustomerSearch(parsed.data),
      )
    ) {
      setTagError("This tag is already a filter.");
      return;
    }
    update({ tags: [...q.tags, parsed.data] });
    setTag("");
    setTagError("");
  }
  function open(event: MouseEvent<HTMLAnchorElement>, id: string) {
    if (
      event.defaultPrevented ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    )
      return;
    event.preventDefault();
    const token = rememberCustomerReturn(scope, q, view, id);
    if (token)
      history.replaceState(
        history.state,
        "",
        `${base}/customers?return=${token}`,
      );
    guard.navigate(`${base}/customers/${id}${token ? `?return=${token}` : ""}`);
  }
  const invalidQuery = state.kind === "error" && state.code === "validation";
  const loading = state.kind === "loading";
  const rows = state.kind === "ready" ? state.page.items : [];
  const count = state.kind === "ready" ? state.page.total : null;
  const filtered = q.search !== "" || q.tags.length > 0 || q.segment !== null;
  const customerLink = (row: CustomerPage["items"][number]) => (
    <a
      href={`${base}/customers/${row.id}`}
      data-customer-id={row.id}
      onClick={(event) => open(event, row.id)}
      className="break-words font-medium text-primary underline-offset-4 hover:underline"
    >
      {row.name}
    </a>
  );
  const wearerLabel = (row: CustomerPage["items"][number]) => {
    const count = row.archivedAt ? row.savedWearerCount : row.activeWearerCount;
    return `${count} ${row.archivedAt ? "saved" : "active"} ${count === 1 ? "wearer" : "wearers"}`;
  };
  return (
    <section
      aria-label="Customer register"
      className="flex min-w-0 flex-col gap-5"
    >
      {canManage && (
        <Button
          className="self-start"
          onClick={() => {
            const token = rememberCustomerReturn(scope, q, view, null);
            guard.navigate(
              `${base}/customers/new${token ? `?return=${token}` : ""}`,
            );
          }}
        >
          Add customer
        </Button>
      )}
      <Card>
        <CardHeader>
          <CardTitle>Find a customer</CardTitle>
          <CardDescription>
            Search this location by name or phone. Tags match all selected
            filters.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FieldGroup className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Field className="md:col-span-2" data-invalid={invalidQuery}>
              <FieldLabel htmlFor="customer-search">
                Search name or phone
              </FieldLabel>
              <Input
                id="customer-search"
                aria-invalid={invalidQuery}
                aria-describedby={
                  invalidQuery ? "customer-query-error" : undefined
                }
                ref={searchRef}
                value={q.search}
                autoComplete="off"
                onChange={(event) => update({ search: event.target.value })}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="customer-status">Status</FieldLabel>
              <select
                id="customer-status"
                className="customer-filter"
                value={q.status}
                onChange={(event) =>
                  update({
                    status: customerSearchQuery.shape.status.parse(
                      event.target.value,
                    ),
                  })
                }
              >
                <option value="active">Active</option>
                <option value="archived">Archived</option>
                <option value="all">All customers</option>
              </select>
            </Field>
            <Field>
              <FieldLabel htmlFor="customer-segment">
                Staff-assigned segment
              </FieldLabel>
              <select
                id="customer-segment"
                className="customer-filter"
                value={q.segment ?? ""}
                onChange={(event) =>
                  update({
                    segment: event.target.value
                      ? customerSegment.parse(event.target.value)
                      : null,
                  })
                }
              >
                <option value="">All segments</option>
                {customerSegment.options.map((segment) => (
                  <option key={segment} value={segment}>
                    {segment[0]?.toUpperCase()}
                    {segment.slice(1)}
                  </option>
                ))}
              </select>
            </Field>
            <Field data-invalid={!!tagError} className="md:col-span-2">
              <FieldLabel htmlFor="customer-tag">Filter by tag</FieldLabel>
              <div className="flex gap-2">
                <Input
                  id="customer-tag"
                  value={tag}
                  aria-invalid={!!tagError}
                  aria-describedby={tagError ? "customer-tag-error" : undefined}
                  onChange={(event) => {
                    setTag(event.target.value);
                    setTagError("");
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      addTag();
                    }
                  }}
                />
                <Button variant="outline" onClick={addTag}>
                  Add tag
                </Button>
              </div>
              {tagError && (
                <p id="customer-tag-error" className="text-sm text-destructive">
                  {tagError}
                </p>
              )}
            </Field>
          </FieldGroup>
          {q.tags.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {q.tags.map((t) => (
                <Button
                  key={t}
                  variant="secondary"
                  size="sm"
                  aria-label={`Remove tag filter ${t}`}
                  onClick={() =>
                    update({ tags: q.tags.filter((v) => v !== t) })
                  }
                >
                  {t} ×
                </Button>
              ))}
            </div>
          )}
        </CardContent>
        <CardFooter className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={() =>
              setRequest((previous) => ({ ...previous, cause: "refresh" }))
            }
          >
            Refresh customers
          </Button>
          <Button
            variant="ghost"
            onClick={() => {
              setTag("");
              setTagError("");
              setRequest({
                query: customerSearchQuery.parse({}),
                cause: "refresh",
              });
            }}
          >
            Clear filters
          </Button>
        </CardFooter>
      </Card>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p
          role="status"
          aria-live="polite"
          className="text-sm text-muted-foreground"
        >
          {loading
            ? "Loading customers…"
            : count === null
              ? "Customer count unavailable"
              : `${count} ${count === 1 ? "customer" : "customers"}${q.status === "archived" ? " archived" : ""}`}
        </p>
        <ToggleGroup
          className="hidden md:flex"
          value={[view]}
          variant="outline"
          size="sm"
          aria-label="Customer view"
          onValueChange={(values) => {
            if (values[0] === "table" || values[0] === "cards")
              setView(values[0]);
          }}
        >
          <ToggleGroupItem value="table" aria-label="Table view">
            Table
          </ToggleGroupItem>
          <ToggleGroupItem value="cards" aria-label="Card view">
            Cards
          </ToggleGroupItem>
        </ToggleGroup>
      </div>
      {state.kind === "error" ? (
        <Alert variant="destructive">
          <AlertTitle>Customers could not be loaded</AlertTitle>
          <AlertDescription>
            <p id="customer-query-error">{state.message}</p>
            {state.code === "session-expired" ? (
              <a href="/account">Sign in to continue</a>
            ) : state.code === "denied" ? (
              <a href={base}>Return Home</a>
            ) : (
              <Button
                variant="outline"
                onClick={() =>
                  setRequest((previous) => ({ ...previous, cause: "refresh" }))
                }
              >
                Retry customer search
              </Button>
            )}
          </AlertDescription>
        </Alert>
      ) : null}
      {loading ? (
        <p
          className="py-12 text-center text-sm text-muted-foreground"
          aria-busy="true"
        >
          Searching this location…
        </p>
      ) : null}
      {state.kind === "ready" && rows.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyTitle>
              {q.status === "archived"
                ? "No archived customers"
                : filtered
                  ? "No matching customers"
                  : count === 0
                    ? "No customers yet"
                    : "No customers on this page"}
            </EmptyTitle>
            <EmptyDescription>
              {filtered
                ? "Try another name, phone or set of filters."
                : q.offset
                  ? "Return to the first page or refresh the register."
                  : "Saved customers for this location appear here."}
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : null}
      {rows.length > 0 ? (
        <>
          <div
            className={cn(
              "rounded-xl border bg-card",
              view === "cards" ? "hidden" : "hidden md:block",
            )}
          >
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Segment</TableHead>
                  <TableHead>Wearers</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="max-w-64 whitespace-normal">
                      {customerLink(row)}
                    </TableCell>
                    <TableCell>{formatCustomerPhone(row.phone)}</TableCell>
                    <TableCell>{row.segment ?? "Unassigned"}</TableCell>
                    <TableCell>{wearerLabel(row)}</TableCell>
                    <TableCell>
                      <Badge variant={row.archivedAt ? "secondary" : "outline"}>
                        {row.archivedAt ? "Archived" : "Active"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div
            className={cn(
              "grid min-w-0 gap-3",
              view === "cards" ? "md:grid-cols-2 xl:grid-cols-3" : "md:hidden",
            )}
          >
            {rows.map((row) => (
              <Card key={row.id}>
                <CardHeader className="flex flex-row gap-3">
                  <span
                    aria-hidden="true"
                    className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-sm"
                  >
                    {Array.from(row.name).slice(0, 2).join("")}
                  </span>
                  <div className="min-w-0">
                    <CardTitle>{customerLink(row)}</CardTitle>
                    <CardDescription>
                      {formatCustomerPhone(row.phone)}
                    </CardDescription>
                  </div>
                </CardHeader>
                <CardContent className="flex flex-wrap gap-2">
                  <Badge variant="outline">
                    {row.archivedAt ? "Archived" : "Active"}
                  </Badge>
                  <Badge variant="secondary">
                    {row.segment ?? "Unassigned"}
                  </Badge>
                  <p className="w-full text-sm text-muted-foreground">
                    {wearerLabel(row)}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      ) : null}
      <div className="flex flex-wrap items-center gap-2 pb-6">
        <Button
          variant="outline"
          disabled={loading || q.offset === 0}
          onClick={() =>
            setRequest({
              query: { ...q, offset: Math.max(0, q.offset - q.limit) },
              cause: "page",
            })
          }
        >
          Previous customers
        </Button>
        <Button
          variant="outline"
          disabled={state.kind !== "ready" || state.page.nextOffset === null}
          onClick={() => {
            if (state.kind === "ready" && state.page.nextOffset !== null)
              setRequest({
                query: { ...q, offset: state.page.nextOffset },
                cause: "page",
              });
          }}
        >
          Next customers
        </Button>
        {q.offset > 0 && (
          <Button
            variant="ghost"
            onClick={() =>
              setRequest({ query: { ...q, offset: 0 }, cause: "page" })
            }
          >
            First customer page
          </Button>
        )}
        <span className="text-xs text-muted-foreground">
          {count !== null && rows.length
            ? `${q.offset + 1}–${q.offset + rows.length} of ${count}`
            : ""}
        </span>
      </div>
    </section>
  );
}
