"use client";
import * as c from "@fitloom/application/master-contracts";
import { GridViewIcon, Table01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { type Page, type Row, rate } from "./master-client";

export type RegisterFilters = Pick<
  ReturnType<typeof c.masterPageQuery.parse>,
  "search" | "active" | "origin" | "visibility"
> & { applicability: "" | ReturnType<typeof c.applicability.parse> };
export type RegisterRead =
  | { kind: "ready" }
  | { kind: "loading" }
  | { kind: "error"; access: boolean };
type Props = {
  kind: keyof typeof c.masterResources;
  page: Page;
  offset: number;
  filters: RegisterFilters;
  read: RegisterRead;
  recentMove: Row | null;
  selectedId: string | null;
  locked: boolean;
  writable: boolean;
  canReadRates: boolean;
  onFilters: (filters: RegisterFilters) => void;
  onRefresh: (offset?: number) => void;
  onCreate: () => void;
  onOpen: (row: Row) => void;
  onLifecycle: (row: Row) => void;
  onMoveBefore: (row: Row) => void;
  onMoveEnd: (row: Row) => void;
};

export function MasterRegister(props: Props) {
  const { kind, page, filters, read, locked, writable, offset } = props;
  const [view, setView] = useState<"table" | "cards">("table");
  const title =
    kind === "garment"
      ? "Garments"
      : kind === "service"
        ? "Services"
        : "Add-ons";
  const singular =
    kind === "garment" ? "garment" : kind === "service" ? "service" : "add-on";
  const hasFilters =
    filters.search.trim() !== "" ||
    filters.active !== "active" ||
    (kind !== "addon" &&
      (filters.origin !== "all" || filters.visibility !== "available")) ||
    (kind === "garment" && filters.applicability !== "");
  const showRate = props.canReadRates && kind !== "service";
  const name = (row: Row) => (
    <Button
      id={`master-row-${row.id}`}
      variant="link"
      className="master-row-name h-auto justify-start whitespace-normal text-left"
      disabled={locked}
      onClick={() => props.onOpen(row)}
    >
      {row.label}
    </Button>
  );
  const money = (row: Row) =>
    "baseRate" in row
      ? rate(row.baseRate)
      : "amount" in row
        ? rate(row.amount)
        : "";
  const actions = (row: Row) =>
    writable && (
      <fieldset
        aria-label={`Actions for ${row.label}`}
        disabled={locked}
        className="flex flex-wrap gap-1"
      >
        <Button
          variant="ghost"
          size="xs"
          onClick={() => props.onLifecycle(row)}
        >
          {row.active ? "Deactivate" : "Restore"}
        </Button>
        <Button
          variant="ghost"
          size="xs"
          onClick={() => props.onMoveBefore(row)}
        >
          Move before…
        </Button>
        <Button variant="ghost" size="xs" onClick={() => props.onMoveEnd(row)}>
          Move to end
        </Button>
      </fieldset>
    );
  const status = (row: Row) => (
    <Badge variant={row.active ? "secondary" : "outline"}>
      {row.active ? "Active" : "Inactive"}
    </Badge>
  );
  return (
    <section
      id="catalog-register"
      className="master-register catalog-register"
      aria-label="Master register"
      data-view={view}
      data-read-state={read.kind}
      aria-busy={read.kind === "loading"}
    >
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <h2 className="font-heading text-lg font-medium">{title}</h2>
          <Badge variant="outline">
            {read.kind === "ready"
              ? `${page.total} total`
              : read.kind === "loading"
                ? "Updating…"
                : "Unavailable"}
          </Badge>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <ToggleGroup
            aria-label="Register view"
            value={[view]}
            variant="outline"
            size="sm"
            spacing={0}
            onValueChange={(values) => {
              const value = values[0];
              if (value === "table" || value === "cards") setView(value);
            }}
          >
            <ToggleGroupItem value="table" aria-label="Table view">
              <HugeiconsIcon icon={Table01Icon} data-icon="inline-start" />
              Table
            </ToggleGroupItem>
            <ToggleGroupItem value="cards" aria-label="Card view">
              <HugeiconsIcon icon={GridViewIcon} data-icon="inline-start" />
              Cards
            </ToggleGroupItem>
          </ToggleGroup>
          {writable && (
            <Button disabled={locked} onClick={props.onCreate}>
              Create custom {singular}
            </Button>
          )}
        </div>
      </div>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          props.onRefresh(0);
        }}
      >
        <fieldset disabled={locked}>
          <FieldGroup className="catalog-filter-fields">
            <Field className="catalog-search">
              <FieldLabel htmlFor="catalog-prefix">
                Search by name prefix
              </FieldLabel>
              <Input
                id="catalog-prefix"
                type="search"
                value={filters.search}
                maxLength={100}
                aria-describedby="catalog-search-help"
                onChange={(event) =>
                  props.onFilters({ ...filters, search: event.target.value })
                }
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="catalog-status">Status</FieldLabel>
              <select
                id="catalog-status"
                aria-label="Status"
                value={filters.active}
                onChange={(event) =>
                  props.onFilters({
                    ...filters,
                    active: c.masterPageQuery.shape.active.parse(
                      event.target.value,
                    ),
                  })
                }
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="all">All statuses</option>
              </select>
            </Field>
            {kind !== "addon" && (
              <Field>
                <FieldLabel htmlFor="catalog-origin">Origin</FieldLabel>
                <select
                  id="catalog-origin"
                  aria-label="Origin"
                  value={filters.origin}
                  onChange={(event) =>
                    props.onFilters({
                      ...filters,
                      origin: c.masterPageQuery.shape.origin.parse(
                        event.target.value,
                      ),
                    })
                  }
                >
                  <option value="all">All origins</option>
                  <option value="standard">Standard</option>
                  <option value="custom">Custom</option>
                </select>
              </Field>
            )}
            {kind !== "addon" && (
              <Field>
                <FieldLabel htmlFor="catalog-visibility">Visibility</FieldLabel>
                <select
                  id="catalog-visibility"
                  aria-label="Visibility"
                  value={filters.visibility}
                  onChange={(event) =>
                    props.onFilters({
                      ...filters,
                      visibility: c.masterPageQuery.shape.visibility.parse(
                        event.target.value,
                      ),
                    })
                  }
                >
                  <option value="available">Available</option>
                  <option value="all">Include hidden standards</option>
                </select>
              </Field>
            )}
            {kind === "garment" && (
              <Field>
                <FieldLabel htmlFor="catalog-applicability">
                  Applicability
                </FieldLabel>
                <select
                  id="catalog-applicability"
                  aria-label="Applicability filter"
                  value={filters.applicability}
                  onChange={(event) =>
                    props.onFilters({
                      ...filters,
                      applicability:
                        event.target.value === ""
                          ? ""
                          : c.applicability.parse(event.target.value),
                    })
                  }
                >
                  <option value="">All applicability</option>
                  {c.applicability.options.map((value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
                </select>
              </Field>
            )}
            <Button type="submit" variant="outline" size="sm">
              Refresh register
            </Button>
          </FieldGroup>
        </fieldset>
        <p
          id="catalog-search-help"
          className="mt-2 text-xs text-muted-foreground"
        >
          Matches names starting with your text. Results follow catalog order.
        </p>
      </form>
      {read.kind === "ready" &&
        props.recentMove &&
        !page.items.some((row) => row.id === props.recentMove?.id) && (
          <Alert role="status">
            <AlertTitle>Moved outside this page</AlertTitle>
            <AlertDescription>
              <p>
                Catalog order was updated. Your filters and page are unchanged.
              </p>
              <Button
                id={`master-row-${props.recentMove.id}`}
                variant="link"
                disabled={locked}
                onClick={() => {
                  if (props.recentMove) props.onOpen(props.recentMove);
                }}
              >
                {props.recentMove.label}
              </Button>
            </AlertDescription>
          </Alert>
        )}
      {read.kind === "loading" ? (
        <div
          role="status"
          aria-label="Loading catalog"
          className="flex flex-col gap-3 py-6"
        >
          <span className="text-sm text-muted-foreground">
            Loading catalog…
          </span>
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      ) : read.kind === "error" ? (
        <Alert variant="destructive">
          <AlertTitle>
            {read.access
              ? "Catalog access is unavailable"
              : "Register could not be loaded"}
          </AlertTitle>
          <AlertDescription>
            <p>
              {read.access
                ? "Your permissions may have changed. Refresh to check your current access."
                : "Try refreshing the register. This failure does not mean the catalog is empty."}
            </p>
            <Button
              variant="outline"
              size="sm"
              disabled={locked}
              onClick={() => props.onRefresh(offset)}
            >
              Retry register
            </Button>
          </AlertDescription>
        </Alert>
      ) : page.items.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyTitle>
              {hasFilters
                ? `No matching ${title.toLowerCase()}`
                : `No active ${title.toLowerCase()} available`}
            </EmptyTitle>
            <EmptyDescription>
              {hasFilters
                ? "Change the prefix or filters to see other records."
                : "Create a custom record, review inactive records, or check Library setup for available starters."}
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : view === "table" ? (
        <Table aria-label={`${title} register`}>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              {kind !== "addon" && <TableHead>Origin</TableHead>}
              {kind === "garment" && <TableHead>Applicability</TableHead>}
              {showRate && (
                <TableHead>
                  {kind === "garment" ? "Base rate · INR" : "Price · INR"}
                </TableHead>
              )}
              <TableHead>Revision</TableHead>
              <TableHead>Status</TableHead>
              {writable && <TableHead>Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {page.items.map((row) => (
              <TableRow
                key={row.id}
                data-master-row={row.id}
                data-state={
                  props.selectedId === row.id ? "selected" : undefined
                }
              >
                <TableCell>{name(row)}</TableCell>
                {kind !== "addon" && (
                  <TableCell>
                    <Badge variant="outline">
                      {"origin" in row ? row.origin : "custom"}
                    </Badge>
                  </TableCell>
                )}
                {kind === "garment" && (
                  <TableCell>
                    {"applicability" in row ? row.applicability : ""}
                  </TableCell>
                )}
                {showRate && (
                  <TableCell>
                    <span className="font-mono text-xs">{money(row)}</span>
                  </TableCell>
                )}
                <TableCell>
                  <span className="font-mono text-xs">{row.revision}</span>
                </TableCell>
                <TableCell>{status(row)}</TableCell>
                {writable && <TableCell>{actions(row)}</TableCell>}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {page.items.map((row) => (
            <Card
              key={row.id}
              size="sm"
              data-master-row={row.id}
              data-selected={props.selectedId === row.id}
            >
              <CardHeader>
                <CardTitle>{name(row)}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap items-center gap-2">
                  {status(row)}
                  {kind !== "addon" && (
                    <Badge variant="outline">
                      {"origin" in row ? row.origin : "custom"}
                    </Badge>
                  )}
                  <span className="font-mono text-xs text-muted-foreground">
                    revision {row.revision}
                  </span>
                </div>
                {"applicability" in row && (
                  <p className="text-sm text-muted-foreground">
                    {row.applicability}
                  </p>
                )}
                {showRate && (
                  <p className="font-mono text-xs">
                    {kind === "garment" ? "Default " : ""}
                    {money(row)}
                  </p>
                )}
                {actions(row)}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
        <p className="text-xs text-muted-foreground" role="status">
          {read.kind === "ready"
            ? page.items.length
              ? `${offset + 1} to ${offset + page.items.length} of ${page.total}`
              : "0 records in this view"
            : read.kind === "loading"
              ? "Updating register"
              : "Catalog unavailable"}
        </p>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={locked || read.kind !== "ready" || offset === 0}
            onClick={() => props.onRefresh(Math.max(0, offset - 50))}
          >
            Previous page
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={
              locked || read.kind !== "ready" || page.nextOffset === null
            }
            onClick={() => props.onRefresh(page.nextOffset ?? 0)}
          >
            Next page
          </Button>
          <Button
            variant="ghost"
            size="sm"
            disabled={locked || read.kind === "loading"}
            onClick={() => props.onRefresh(0)}
          >
            First page
          </Button>
        </div>
      </div>
    </section>
  );
}
