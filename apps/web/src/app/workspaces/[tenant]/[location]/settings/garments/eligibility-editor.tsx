"use client";
import * as c from "@fitloom/application/master-contracts";
import { useEffect, useMemo, useState } from "react";
import { Control, type Issues } from "./editor-controls";
import {
  type Detail,
  type Page,
  pageSchema,
  rate,
  resource,
  response,
} from "./master-client";

export type RateDraft = {
  baseRate: string | null;
  serviceOverrides: { serviceId: c.ServiceId; rateOverride: string | null }[];
};
export const emptyRates = (): RateDraft => ({
  baseRate: null,
  serviceOverrides: [],
});
export function ratesFrom(detail: Detail): RateDraft {
  return "baseRate" in detail
    ? { baseRate: detail.baseRate, serviceOverrides: detail.serviceOverrides }
    : emptyRates();
}
export function RateControl({
  label,
  value,
  onChange,
  optional = true,
  disabled = false,
  path,
  issues = [],
}: {
  label: string;
  value: string | null;
  onChange: (value: string | null) => void;
  optional?: boolean;
  disabled?: boolean;
  path: (string | number)[];
  issues?: Issues;
}) {
  return (
    <div className="master-rate-control">
      <Control label={label} path={path} issues={issues}>
        {(props) => (
          <input
            {...props}
            type="text"
            inputMode="decimal"
            value={value ?? ""}
            disabled={disabled || value === null}
            placeholder="0.000000"
            onChange={(e) => onChange(e.target.value)}
          />
        )}
      </Control>
      {optional && (
        <label className="master-check">
          <input
            type="checkbox"
            disabled={disabled}
            checked={value === null}
            onChange={(e) => onChange(e.target.checked ? null : "")}
          />
          Unset
        </label>
      )}
    </div>
  );
}
type CurrentChoice = { id: string; label: string; amount?: string };
export function EligibilityEditor({
  base,
  definition,
  current,
  rates,
  showRates,
  disabled,
  issues,
  onChange,
}: {
  base: string;
  definition: c.GarmentDefinition;
  current: Detail | null;
  rates: RateDraft;
  showRates: boolean;
  disabled: boolean;
  issues: Issues;
  onChange: (definition: c.GarmentDefinition, rates: RateDraft) => void;
}) {
  const [choices, setChoices] = useState<CurrentChoice[]>([]),
    [error, setError] = useState("");
  // Resolve saved stable IDs to current names and permitted prices. Never put these in historical views.
  const identities = useMemo(
    () => ({
      services: definition.services.map((s) => s.serviceId),
      addons: definition.addons.map((a) => a.addonId),
    }),
    [definition.services, definition.addons],
  );
  useEffect(() => {
    let alive = true;
    const ids = identities;
    Promise.all([
      ...ids.services.map(async (id) => {
        if (
          current?.services.find((s) => s.serviceId === id)?.bindingState ===
          "retired"
        )
          return {
            id,
            label:
              current.definition.services.find((s) => s.serviceId === id)
                ?.savedLabel ?? "Inactive service",
          };
        const v = await response(
          fetch(`${base}/services/${id}`, { cache: "no-store" }),
          c.serviceVersion,
        );
        return { id, label: v.label };
      }),
      ...ids.addons.map(async (id) => {
        if (
          current?.addons.find((a) => a.addonId === id)?.bindingState ===
          "retired"
        )
          return {
            id,
            label:
              current.definition.addons.find((a) => a.addonId === id)
                ?.savedLabel ?? "Inactive add-on",
          };
        const v = await response(
          fetch(`${base}/addons/${id}`, { cache: "no-store" }),
          {
            parse(input: unknown) {
              const p = c.pricedAddonVersion.safeParse(input);
              return p.success ? p.data : c.addonVersion.parse(input);
            },
          },
        );
        return {
          id,
          label: v.label,
          ...("amount" in v && typeof v.amount === "string"
            ? { amount: v.amount }
            : {}),
        };
      }),
    ])
      .then((items) => {
        if (alive) {
          setChoices(items);
          setError("");
        }
      })
      .catch(() => {
        if (alive)
          setError(
            "Current choices could not be refreshed. Saved references remain visible. Reload the garment to try again.",
          );
      });
    return () => {
      alive = false;
    };
  }, [base, identities, current]);
  return (
    <section className="master-section" aria-label="Rates and eligibility">
      <h3>04 · Rates and eligibility</h3>
      <p className="master-muted">
        Configuration defaults in INR. Unset and zero are distinct. A service
        override replaces the base rate. Add-ons have separate current prices.
      </p>
      {error && <p role="alert">{error}</p>}
      <fieldset disabled={disabled}>
        {showRates && (
          <RateControl
            label="Base default rate (INR)"
            value={rates.baseRate}
            path={["baseRate"]}
            issues={issues}
            onChange={(baseRate) =>
              onChange(definition, { ...rates, baseRate })
            }
          />
        )}
        <h4>Eligible services</h4>
        {definition.services.length === 0 && <p>No eligible services.</p>}
        {definition.services.map((binding, index) => {
          const retired =
            current?.services.find((s) => s.serviceId === binding.serviceId)
              ?.bindingState === "retired";
          const selected = choices.find((s) => s.id === binding.serviceId);
          const override =
            rates.serviceOverrides.find(
              (s) => s.serviceId === binding.serviceId,
            )?.rateOverride ?? null;
          return (
            <div className="master-binding" key={binding.serviceId}>
              <strong>
                {retired
                  ? binding.savedLabel
                  : (selected?.label ?? binding.savedLabel)}
              </strong>
              {retired && (
                <p className="master-muted">
                  Inactive service retained. Its saved label and override are
                  locked. Remove it or restore the service to change this
                  binding.
                </p>
              )}
              {showRates && (
                <>
                  <RateControl
                    label={`Service override ${index + 1} (INR)`}
                    path={["serviceOverrides", index, "rateOverride"]}
                    issues={issues}
                    disabled={retired}
                    value={override}
                    onChange={(rateOverride) =>
                      onChange(definition, {
                        ...rates,
                        serviceOverrides: rates.serviceOverrides.map((s) =>
                          s.serviceId === binding.serviceId
                            ? { ...s, rateOverride }
                            : s,
                        ),
                      })
                    }
                  />
                  <p className="master-muted">
                    Configured service rate: {rate(override ?? rates.baseRate)}
                  </p>
                </>
              )}
              <button
                type="button"
                onClick={() =>
                  onChange(
                    {
                      ...definition,
                      services: definition.services.filter(
                        (s) => s.serviceId !== binding.serviceId,
                      ),
                    },
                    {
                      ...rates,
                      serviceOverrides: rates.serviceOverrides.filter(
                        (s) => s.serviceId !== binding.serviceId,
                      ),
                    },
                  )
                }
              >
                Remove service {index + 1}
              </button>
            </div>
          );
        })}
        {!disabled && definition.services.length < 20 && (
          <ChoicePicker
            base={base}
            kind="service"
            selected={definition.services.map((s) => s.serviceId)}
            disabled={disabled}
            onChoose={(item) =>
              onChange(
                {
                  ...definition,
                  services: [
                    ...definition.services,
                    {
                      serviceId: c.serviceId.parse(item.id),
                      savedLabel: item.label,
                    },
                  ],
                },
                {
                  ...rates,
                  serviceOverrides: [
                    ...rates.serviceOverrides,
                    {
                      serviceId: c.serviceId.parse(item.id),
                      rateOverride: null,
                    },
                  ],
                },
              )
            }
          />
        )}
        <h4>Eligible add-ons</h4>
        {definition.addons.length === 0 && <p>No eligible add-ons.</p>}
        {definition.addons.map((binding, index) => {
          const retired =
            current?.addons.find((a) => a.addonId === binding.addonId)
              ?.bindingState === "retired";
          const selected = choices.find((a) => a.id === binding.addonId);
          return (
            <div className="master-binding" key={binding.addonId}>
              <strong>
                {retired
                  ? binding.savedLabel
                  : (selected?.label ?? binding.savedLabel)}
              </strong>
              {retired ? (
                <p className="master-muted">
                  Inactive add-on retained. Remove it or restore the add-on to
                  use it in new bindings.
                </p>
              ) : showRates && selected?.amount !== undefined ? (
                <p>Current add-on price: {rate(selected.amount)}</p>
              ) : null}
              <button
                type="button"
                onClick={() =>
                  onChange(
                    {
                      ...definition,
                      addons: definition.addons.filter(
                        (a) => a.addonId !== binding.addonId,
                      ),
                    },
                    rates,
                  )
                }
              >
                Remove add-on {index + 1}
              </button>
            </div>
          );
        })}
        {!disabled && definition.addons.length < 30 && (
          <ChoicePicker
            base={base}
            kind="addon"
            selected={definition.addons.map((a) => a.addonId)}
            disabled={disabled}
            onChoose={(item) =>
              onChange(
                {
                  ...definition,
                  addons: [
                    ...definition.addons,
                    {
                      addonId: c.addonId.parse(item.id),
                      savedLabel: item.label,
                    },
                  ],
                },
                rates,
              )
            }
          />
        )}
      </fieldset>
    </section>
  );
}
function ChoicePicker({
  base,
  kind,
  selected,
  disabled,
  onChoose,
}: {
  base: string;
  kind: "service" | "addon";
  selected: string[];
  disabled: boolean;
  onChoose: (item: { id: string; label: string }) => void;
}) {
  const [search, setSearch] = useState(""),
    [page, setPage] = useState<Page | null>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const noun = kind === "service" ? "services" : "add-ons";
  async function find(offset = 0) {
    setBusy(true);
    try {
      setPage(
        await response(
          fetch(
            `${base}/${resource(kind)}?${new URLSearchParams({ search, offset: String(offset), active: "active", visibility: "available" })}`,
            { cache: "no-store" },
          ),
          pageSchema(kind),
        ),
      );
      setError("");
    } catch {
      setError(`Available ${noun} could not be reached. Try again.`);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="master-picker">
      <label className="master-control">
        <span>Find eligible {noun} by name prefix</span>
        <input
          value={search}
          maxLength={100}
          disabled={disabled || busy}
          onChange={(e) => setSearch(e.target.value)}
        />
      </label>
      <button
        type="button"
        disabled={disabled || busy}
        onClick={() => void find()}
      >
        Find {noun}
      </button>
      {error && <p role="alert">{error}</p>}
      {page && (
        <>
          <p className="master-muted">
            {page.total} active available {noun}. Hidden standards can be shown
            in Library setup.
          </p>
          <ul>
            {page.items.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  disabled={disabled || busy || selected.includes(item.id)}
                  onClick={() => onChoose(item)}
                >
                  Add {item.label}
                </button>
                {"amount" in item && <small> · {rate(item.amount)}</small>}
              </li>
            ))}
          </ul>
          <button
            type="button"
            disabled={disabled || busy || page.nextOffset === null}
            onClick={() => void find(page.nextOffset ?? 0)}
          >
            More {noun}
          </button>
        </>
      )}
    </div>
  );
}
