"use client";
import {
  measurementBook,
  measurementBookFilters,
  type measurementContext,
  measurementGarments,
} from "@fitloom/application/measurement-contracts";
import { useEffect, useRef, useState } from "react";
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
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import type { CustomerReturnScope } from "@/components/workspace/customer-return-session";
import { useNavigationGuard } from "@/components/workspace/navigation-guard";
import { PageHeader } from "@/components/workspace/page-header";
import { MeasurementCards } from "./measurement-cards";
import {
  measurementDenied,
  measurementMessage,
  measurementRequest,
} from "./measurement-client";
import { MeasurementOptions } from "./measurement-options";
import {
  readMeasurementReturn,
  rememberMeasurementReturn,
} from "./measurement-return";

type Owner = ReturnType<typeof measurementContext.parse>;
type Filters = ReturnType<typeof measurementBookFilters.parse>;
type State =
  | { kind: "loading" }
  | { kind: "ready"; page: ReturnType<typeof measurementBook.parse> }
  | { kind: "error"; message: string; denied: boolean };
export function MeasurementBook({
  owner,
  scope,
  bookPath,
  returnToken,
}: {
  owner: Owner;
  scope: CustomerReturnScope;
  bookPath: string;
  returnToken: string | null;
}) {
  const [query, setQuery] = useState<Filters | null>(null),
    [search, setSearch] = useState(""),
    [state, setState] = useState<State>({ kind: "loading" });
  const [garmentPage, setGarmentPage] = useState<ReturnType<
    typeof measurementGarments.parse
  > | null>(null);
  const [garmentSearch, setGarmentSearch] = useState("");
  const [garmentError, setGarmentError] = useState("");
  const [garmentQuery, setGarmentQuery] = useState({ search: "", offset: 0 });
  const input = useRef<HTMLInputElement>(null),
    focused = useRef<string | null>(null),
    guard = useNavigationGuard();
  const api = `/api/workspaces/${scope.tenantId}/${scope.locationId}/measurements/${owner.customerId}/${owner.wearerId}`;
  useEffect(() => {
    const controller = new AbortController();
    let live = true;
    setGarmentError("");
    void measurementRequest(`${api}/book-garments`, measurementGarments, {
      body: { ...garmentQuery, limit: 50 },
      signal: controller.signal,
    })
      .then((page) => {
        if (live) setGarmentPage(page);
      })
      .catch((error) => {
        if (live) {
          setGarmentPage(null);
          setGarmentError(measurementMessage(error));
          if (measurementDenied(error))
            setState({
              kind: "error",
              message: measurementMessage(error),
              denied: true,
            });
        }
      });
    return () => {
      live = false;
      controller.abort();
    };
  }, [api, garmentQuery]);
  useEffect(() => {
    const descriptor = readMeasurementReturn(
      scope,
      owner.customerId,
      owner.wearerId,
      returnToken,
    );
    setQuery(descriptor?.query ?? measurementBookFilters.parse({}));
    setSearch(descriptor?.query.search ?? "");
    focused.current = descriptor?.focusedId ?? null;
  }, [scope, owner.customerId, owner.wearerId, returnToken]);
  useEffect(() => {
    const focus = () => input.current?.focus();
    window.addEventListener("fitloom:measurement-search", focus);
    if (new URLSearchParams(location.search).get("focus") === "search") focus();
    return () =>
      window.removeEventListener("fitloom:measurement-search", focus);
  }, []);
  useEffect(() => {
    if (!query) return;
    let active = true;
    const controller = new AbortController();
    setState({ kind: "loading" });
    void measurementRequest(`${api}/book`, measurementBook, {
      body: query,
      signal: controller.signal,
    })
      .then((page) => {
        if (active) setState({ kind: "ready", page });
      })
      .catch((error) => {
        if (active)
          setState({
            kind: "error",
            message: measurementMessage(error),
            denied: measurementDenied(error),
          });
      });
    return () => {
      active = false;
      controller.abort();
    };
  }, [api, query]);
  useEffect(() => {
    if (state.kind === "ready" && focused.current) {
      document.getElementById(`measurement-${focused.current}`)?.focus();
      focused.current = null;
    }
  }, [state]);
  const navigate = (path: string, id: string | null) => {
    if (!query) return;
    const token = rememberMeasurementReturn(
      scope,
      owner.customerId,
      owner.wearerId,
      query,
      id,
    );
    guard.navigate(path + (token ? `?return=${token}` : ""));
  };
  const denied = state.kind === "error" && state.denied;
  if (denied)
    return (
      <Alert>
        <AlertDescription>
          {state.kind === "error"
            ? state.message
            : "Measurement access unavailable"}
        </AlertDescription>
      </Alert>
    );
  return (
    <div className="flex min-w-0 flex-col gap-5">
      <a
        className="text-sm text-primary underline"
        href={bookPath.split("/wearers/")[0]}
      >
        Back to customer
      </a>
      <a
        className="self-start text-sm text-primary underline"
        href={`${bookPath}/compare`}
      >
        Compare measurements
      </a>
      <PageHeader
        eyebrow={owner.customerName}
        title="Measurement book"
        description={`Wearer: ${owner.wearerName}`}
      />
      {!owner.active ? (
        <Alert>
          <AlertDescription>
            This wearer or customer is archived. Saved measurements remain
            readable.
          </AlertDescription>
        </Alert>
      ) : null}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <ToggleGroup
          value={[query?.kind ?? "all"]}
          onValueChange={(values) => {
            const kind = values[0];
            if (
              query &&
              (kind === "all" || kind === "body" || kind === "garment")
            )
              setQuery({
                ...query,
                kind,
                garmentId: kind === "body" ? null : query.garmentId,
                offset: 0,
              });
          }}
          variant="outline"
          aria-label="Measurement type"
          disabled={!query || denied}
        >
          {["all", "body", "garment"].map((kind) => (
            <ToggleGroupItem key={kind} value={kind}>
              {kind === "all"
                ? "All profiles"
                : kind === "body"
                  ? "Body"
                  : "Garment"}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
        {owner.capabilities.manage && !denied ? (
          <Button
            disabled={!query}
            onClick={() => navigate(`${bookPath}/new`, null)}
          >
            Add measurements
          </Button>
        ) : null}
      </div>
      <MeasurementCards
        owner={owner}
        api={api.slice(
          0,
          api.lastIndexOf(`/${owner.customerId}/${owner.wearerId}`),
        )}
        onDenied={() =>
          setState({
            kind: "error",
            message: "Measurement access is unavailable.",
            denied: true,
          })
        }
      />
      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (query) setQuery({ ...query, search, offset: 0 });
        }}
      >
        <FieldGroup className="flex-row flex-wrap items-end">
          <Field className="min-w-40 flex-1">
            <FieldLabel htmlFor="measurement-search">
              Search measurement profiles
            </FieldLabel>
            <Input
              id="measurement-search"
              ref={input}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              maxLength={120}
              disabled={!query || denied}
            />
          </Field>
          <Field className="w-auto">
            <FieldLabel htmlFor="measurement-status">Profile status</FieldLabel>
            <Select
              value={query?.status ?? "active"}
              onValueChange={(status) => {
                if (
                  query &&
                  (status === "all" ||
                    status === "active" ||
                    status === "archived")
                )
                  setQuery({ ...query, status, offset: 0 });
              }}
              disabled={!query || denied}
            >
              <SelectTrigger id="measurement-status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                  <SelectItem value="all">All statuses</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          </Field>
          <Button type="submit" variant="outline" disabled={!query || denied}>
            Search profiles
          </Button>
        </FieldGroup>
      </form>
      {garmentError ? (
        <Alert>
          <AlertDescription>
            {garmentError} Use Find garments to retry.
          </AlertDescription>
        </Alert>
      ) : null}
      {query?.kind !== "body" ? (
        <FieldGroup className="flex-row flex-wrap items-end">
          <Field className="w-full min-w-0 sm:flex-1">
            <FieldLabel htmlFor="book-garment-filter">
              Filter by garment
            </FieldLabel>
            <MeasurementOptions
              id="book-garment-filter"
              label="Filter by garment"
              value={query?.garmentId ?? "all"}
              disabled={!query || denied}
              onChange={(id) => {
                if (query)
                  setQuery(
                    measurementBookFilters.parse({
                      ...query,
                      garmentId: id === "all" ? null : id,
                      kind: id === "all" ? query.kind : "garment",
                      offset: 0,
                    }),
                  );
              }}
              items={[
                { value: "all", label: "All garments" },
                ...(query?.garmentId &&
                !garmentPage?.items.some(
                  (item) => item.garmentId === query.garmentId,
                )
                  ? [{ value: query.garmentId, label: "Selected garment" }]
                  : []),
                ...(garmentPage?.items ?? []).map((item) => ({
                  value: item.garmentId,
                  label: item.label,
                })),
              ]}
            />
          </Field>
          <Field className="w-full min-w-0 sm:flex-1">
            <FieldLabel htmlFor="book-garment-search">
              Find garment filters
            </FieldLabel>
            <Input
              id="book-garment-search"
              maxLength={120}
              value={garmentSearch}
              onChange={(event) => setGarmentSearch(event.target.value)}
              disabled={denied}
            />
          </Field>
          <Button
            variant="outline"
            disabled={denied}
            onClick={() =>
              setGarmentQuery({ search: garmentSearch, offset: 0 })
            }
          >
            Find garments
          </Button>
          <Button
            variant="outline"
            disabled={denied || garmentQuery.offset === 0}
            onClick={() =>
              setGarmentQuery((q) => ({
                ...q,
                offset: Math.max(0, q.offset - 50),
              }))
            }
          >
            Previous garments
          </Button>
          <Button
            variant="outline"
            disabled={denied || garmentPage?.nextOffset == null}
            onClick={() =>
              setGarmentQuery((q) => ({
                ...q,
                offset: garmentPage?.nextOffset ?? q.offset,
              }))
            }
          >
            More garments
          </Button>
        </FieldGroup>
      ) : null}
      {state.kind === "loading" ? (
        <div
          role="status"
          aria-label="Loading measurements"
          className="flex flex-col gap-3"
        >
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
        </div>
      ) : state.kind === "error" ? (
        <Alert>
          <AlertDescription>
            {state.message}
            {!state.denied ? (
              <Button
                variant="outline"
                onClick={() =>
                  setQuery((previous) =>
                    previous ? { ...previous } : previous,
                  )
                }
              >
                Retry measurements
              </Button>
            ) : null}
          </AlertDescription>
        </Alert>
      ) : (
        <>
          <p role="status" className="text-sm text-muted-foreground">
            {state.page.total} measurement profiles
            {query
              ? ` · ${Math.min(query.offset + 1, state.page.total)}–${Math.min(query.offset + state.page.items.length, state.page.total)}`
              : ""}
          </p>
          {state.page.items.length ? (
            <div className="grid gap-4 md:grid-cols-2">
              {state.page.items.map((item) => (
                <Card key={item.profileId}>
                  <CardHeader>
                    <CardDescription>
                      {item.kind === "body"
                        ? "Body measurements"
                        : "Garment measurements"}
                    </CardDescription>
                    <CardTitle>
                      <button
                        id={`measurement-${item.profileId}`}
                        type="button"
                        className="break-words text-left underline-offset-4 hover:underline focus-visible:outline-2"
                        onClick={() =>
                          navigate(
                            `${bookPath}/${item.profileId}`,
                            item.profileId,
                          )
                        }
                      >
                        {item.label}
                      </button>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="flex flex-wrap items-center justify-between gap-3">
                    <p className="text-sm text-muted-foreground">
                      {item.measuredOn} · Version {item.sequence}
                    </p>
                    <Badge variant={item.archivedAt ? "secondary" : "outline"}>
                      {item.archivedAt ? "Archived" : "Active"}
                    </Badge>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Empty>
              <EmptyHeader>
                <EmptyTitle>
                  {query?.search
                    ? "No matching measurement profiles"
                    : "No saved measurements"}
                </EmptyTitle>
                <EmptyDescription>
                  {query?.search
                    ? "Try a different search or profile filter."
                    : "Choose this wearer's body or garment schema to begin a measurement profile."}
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          )}
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              disabled={!query || query.offset === 0}
              onClick={() =>
                query &&
                setQuery({
                  ...query,
                  offset: Math.max(0, query.offset - query.limit),
                })
              }
            >
              Previous profiles
            </Button>
            <Button
              variant="outline"
              disabled={state.page.nextOffset === null}
              onClick={() =>
                query &&
                state.page.nextOffset !== null &&
                setQuery({ ...query, offset: state.page.nextOffset })
              }
            >
              Next profiles
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
