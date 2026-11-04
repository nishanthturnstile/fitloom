"use client";
import * as c from "@fitloom/application/customer-contracts";
import { useEffect, useState } from "react";
import { MeasurementOptions } from "@/components/measurements/measurement-options";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { ImportButton as Button } from "./import-button";
import { importRead, importRequest } from "./import-client";
export function ImportOwnerPicker({
  api,
  id,
  customer,
  wearer,
  onCustomer,
  onWearer,
  disabled,
  onError,
}: {
  api: string;
  id: string;
  customer: string;
  wearer?: string;
  onCustomer: (id: string) => void;
  onWearer?: (id: string) => void;
  disabled: boolean;
  onError: (error: unknown) => void;
}) {
  const [selected, setSelected] = useState<ReturnType<
    typeof c.customerDetail.parse
  > | null>(null);
  const [search, setSearch] = useState(""),
    [query, setQuery] = useState({ search: "", offset: 0 }),
    [page, setPage] = useState<ReturnType<typeof c.customerPage.parse> | null>(
      null,
    ),
    [wearers, setWearers] = useState<ReturnType<
      typeof c.wearerPage.parse
    > | null>(null),
    [wearerOffset, setWearerOffset] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    let live = true;
    void importRequest(
      `${api}/customers/search`,
      c.customerPage,
      { ...query, status: "active", limit: 25 },
      controller.signal,
    )
      .then((result) => {
        if (live) setPage(result);
      })
      .catch((error) => {
        if (live) onError(error);
      });
    return () => {
      live = false;
      controller.abort();
    };
  }, [api, query, onError]);
  useEffect(() => {
    setSelected(null);
    if (!customer) return;
    const controller = new AbortController();
    let live = true;
    void importRead(
      `${api}/customers/${customer}`,
      c.customerDetail,
      controller.signal,
    )
      .then((result) => {
        if (live) setSelected(result);
      })
      .catch((error) => {
        if (live) onError(error);
      });
    return () => {
      live = false;
      controller.abort();
    };
  }, [api, customer, onError]);
  useEffect(() => {
    if (!customer) {
      setWearers(null);
      return;
    }
    const controller = new AbortController();
    let live = true;
    void importRead(
      `${api}/customers/${customer}/wearers?offset=${wearerOffset}&limit=50`,
      c.wearerPage,
      controller.signal,
    )
      .then((result) => {
        if (live) setWearers(result);
      })
      .catch((error) => {
        if (live) onError(error);
      });
    return () => {
      live = false;
      controller.abort();
    };
  }, [api, customer, wearerOffset, onError]);
  return (
    <FieldGroup>
      <Field>
        <FieldLabel htmlFor={`${id}-search`}>
          Find an existing customer
        </FieldLabel>
        <Input
          id={`${id}-search`}
          value={search}
          disabled={disabled}
          onChange={(e) => setSearch(e.target.value)}
        />
      </Field>
      <Button
        type="button"
        variant="outline"
        disabled={disabled}
        onClick={() => setQuery({ search, offset: 0 })}
      >
        Find import owner
      </Button>
      {page ? (
        <>
          <MeasurementOptions
            id={`${id}-customer`}
            label="Existing customer"
            value={customer}
            disabled={disabled}
            items={[
              { value: "", label: "Choose a customer" },
              ...(customer && !page.items.some((c) => c.id === customer)
                ? [
                    {
                      value: customer,
                      label:
                        selected?.profile.name ?? "Loading selected customer…",
                    },
                  ]
                : []),
              ...page.items.map((c) => ({ value: c.id, label: c.name })),
            ]}
            onChange={(value) => {
              setWearerOffset(0);
              onCustomer(value);
              onWearer?.("");
            }}
          />
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={disabled || query.offset === 0}
              onClick={() =>
                setQuery((q) => ({ ...q, offset: Math.max(0, q.offset - 25) }))
              }
            >
              Previous owner matches
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={disabled || page.nextOffset === null}
              onClick={() =>
                setQuery((q) => ({ ...q, offset: page.nextOffset ?? 0 }))
              }
            >
              More owner matches
            </Button>
          </div>
        </>
      ) : null}
      {onWearer && customer && wearers ? (
        <>
          <MeasurementOptions
            id={`${id}-wearer`}
            label="Existing wearer"
            value={wearer ?? ""}
            disabled={disabled}
            items={[
              { value: "", label: "Choose an active wearer" },
              ...wearers.items
                .filter((w) => w.effectiveActive)
                .map((w) => ({ value: w.id, label: w.profile.name })),
            ]}
            onChange={onWearer}
          />
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={disabled || wearerOffset === 0}
              onClick={() => setWearerOffset(Math.max(0, wearerOffset - 50))}
            >
              Previous wearers
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={disabled || wearers.nextOffset === null}
              onClick={() => setWearerOffset(wearers.nextOffset ?? 0)}
            >
              More wearers
            </Button>
          </div>
        </>
      ) : null}
    </FieldGroup>
  );
}
export function ImportWearerMap({
  api,
  id,
  customer,
  sourceName,
  selection,
  onChange,
  disabled,
  onError,
}: {
  api: string;
  id: string;
  customer: string;
  sourceName: string;
  selection:
    | { kind: "create" }
    | { kind: "reuse"; wearerId: string }
    | undefined;
  onChange: (
    action: { kind: "create" } | { kind: "reuse"; wearerId: string },
  ) => void;
  disabled: boolean;
  onError: (error: unknown) => void;
}) {
  const [page, setPage] = useState<ReturnType<
      typeof c.wearerPage.parse
    > | null>(null),
    [offset, setOffset] = useState(0);
  const value =
    selection?.kind === "create"
      ? "create"
      : selection?.kind === "reuse"
        ? selection.wearerId
        : "";
  useEffect(() => {
    if (!customer) return;
    const controller = new AbortController();
    let live = true;
    void importRead(
      `${api}/customers/${customer}/wearers?offset=${offset}&limit=50`,
      c.wearerPage,
      controller.signal,
    )
      .then((result) => {
        if (live) setPage(result);
      })
      .catch((error) => {
        if (live) onError(error);
      });
    return () => {
      live = false;
      controller.abort();
    };
  }, [api, customer, offset, onError]);
  return (
    <FieldGroup>
      <p>
        Source wearer: {sourceName}. Choose an existing wearer or explicitly
        create a new one.
      </p>
      <MeasurementOptions
        id={id}
        label={`Map wearer ${sourceName}`}
        value={value}
        disabled={disabled || !customer}
        items={[
          { value: "", label: "Choose a wearer decision" },
          { value: "create", label: "Create a new named wearer" },
          ...(page?.items
            .filter((w) => w.effectiveActive)
            .map((w) => ({ value: w.id, label: w.profile.name })) ?? []),
        ]}
        onChange={(next) => {
          if (next)
            onChange(
              next === "create"
                ? { kind: "create" }
                : { kind: "reuse", wearerId: next },
            );
        }}
      />
      {page?.nextOffset !== null && page ? (
        <Button
          type="button"
          variant="outline"
          disabled={disabled}
          onClick={() => setOffset(page.nextOffset ?? 0)}
        >
          More existing wearers
        </Button>
      ) : null}
    </FieldGroup>
  );
}
