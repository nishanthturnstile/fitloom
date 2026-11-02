"use client";
import * as c from "@fitloom/application/master-contracts";
import type { ReactNode } from "react";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";

type Definition = c.GarmentDefinition;
type Choice = Definition["constructionGroups"][number]["choices"][number];
type Group = Definition["constructionGroups"][number];
export type Issues = c.MasterValidationIssue[];
export const nodeId = () => c.schemaNodeId.parse(crypto.randomUUID());
export function move<T>(
  items: readonly T[],
  index: number,
  direction: number,
): T[] {
  const next = [...items];
  const from = next[index],
    to = next[index + direction];
  if (from === undefined || to === undefined) return next;
  next[index] = to;
  next[index + direction] = from;
  return next;
}
export const controlId = (path: readonly (string | number)[]) =>
  `master-${path.join("-")}`;
export function Control({
  label,
  path,
  issues = [],
  children,
}: {
  label: string;
  path: (string | number)[];
  issues?: Issues;
  children: (props: {
    id: string;
    "aria-label": string;
    "aria-invalid": boolean;
    "aria-describedby": string | undefined;
  }) => ReactNode;
}) {
  const errors = issues.filter((i) => i.path.join(".") === path.join("."));
  const id = controlId(path);
  return (
    <Field className="master-control" data-invalid={errors.length > 0}>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      {children({
        id,
        "aria-label": label,
        "aria-invalid": errors.length > 0,
        "aria-describedby": errors.length ? `${id}-error` : undefined,
      })}
      {errors.length > 0 && (
        <FieldError id={`${id}-error`} className="master-error">
          {errors.map((i) => i.message).join(". ")}
        </FieldError>
      )}
    </Field>
  );
}
export function Ordered({
  label,
  index,
  total,
  onMove,
  onRemove,
  removeDisabled = false,
}: {
  label: string;
  index: number;
  total: number;
  onMove: (direction: number) => void;
  onRemove: () => void;
  removeDisabled?: boolean;
}) {
  return (
    <div className="master-order">
      <span className="master-position">
        {String(index + 1).padStart(2, "0")}
      </span>
      {[-1, 1].map((direction) => (
        <button
          key={direction}
          type="button"
          aria-label={`Move ${label} ${direction === -1 ? "up" : "down"}`}
          disabled={index + direction < 0 || index + direction >= total}
          onClick={(event) => {
            const button = event.currentTarget;
            onMove(direction);
            requestAnimationFrame(() => {
              if (!button.disabled) button.focus();
              else
                button.parentElement
                  ?.querySelector<HTMLButtonElement>("button:not(:disabled)")
                  ?.focus();
            });
          }}
        >
          {direction === -1 ? "↑" : "↓"}
        </button>
      ))}
      <button
        type="button"
        className="master-text-button"
        disabled={removeDisabled}
        onClick={onRemove}
      >
        Remove {label}
      </button>
    </div>
  );
}
export function Illustration({
  value,
  onChange,
  label = "Illustration",
}: {
  value: Definition["iconId"];
  onChange: (value: Definition["iconId"]) => void;
  label?: string;
}) {
  return (
    <label className="master-control">
      <span>{label}</span>
      <select
        aria-label={label}
        value={value ?? ""}
        onChange={(e) =>
          onChange(
            e.target.value ? c.illustrationId.parse(e.target.value) : null,
          )
        }
      >
        <option value="">No illustration</option>
        {c.illustrationId.options.map((id) => (
          <option key={id} value={id}>
            {id}
          </option>
        ))}
      </select>
    </label>
  );
}
export function Choices({
  items,
  onChange,
  announce,
  path,
  issues,
}: {
  items: Choice[];
  onChange: (items: Choice[]) => void;
  announce: (message: string) => void;
  path: (string | number)[];
  issues: Issues;
}) {
  return (
    <div className="master-choices">
      {issues
        .filter((issue) => issue.path.join(".") === path.join("."))
        .map((issue) => (
          <p key={issue.message} className="master-error">
            {issue.message}
          </p>
        ))}
      {items.map((choice, index) => (
        <fieldset
          className="master-choice"
          key={choice.id}
          aria-label={`Choice ${index + 1}`}
        >
          <Ordered
            label={choice.label || "choice"}
            index={index}
            total={items.length}
            onMove={(d) => {
              onChange(move(items, index, d));
              announce(
                `${choice.label || "Choice"} moved to position ${index + d + 1}`,
              );
            }}
            onRemove={() => onChange(items.filter((c) => c.id !== choice.id))}
          />
          <Control
            label="Choice label"
            path={[...path, index, "label"]}
            issues={issues}
          >
            {(props) => (
              <input
                {...props}
                maxLength={100}
                value={choice.label}
                onChange={(e) =>
                  onChange(
                    items.map((c) =>
                      c.id === choice.id ? { ...c, label: e.target.value } : c,
                    ),
                  )
                }
              />
            )}
          </Control>
          <Illustration
            value={choice.illustrationId}
            onChange={(value) =>
              onChange(
                items.map((c) =>
                  c.id === choice.id ? { ...c, illustrationId: value } : c,
                ),
              )
            }
          />
          <label className="master-check">
            <input
              type="checkbox"
              checked={choice.active}
              onChange={(e) =>
                onChange(
                  items.map((c) =>
                    c.id === choice.id ? { ...c, active: e.target.checked } : c,
                  ),
                )
              }
            />
            Available choice
          </label>
        </fieldset>
      ))}
      <button
        type="button"
        disabled={items.length >= 30}
        onClick={() =>
          onChange([
            ...items,
            {
              id: nodeId(),
              label: "New choice",
              illustrationId: null,
              active: true,
            },
          ])
        }
      >
        Add choice
      </button>
    </div>
  );
}
export function newField(
  kind: c.MeasurementField["kind"],
  sectionId: c.SchemaNodeId,
  previous?: c.MeasurementField,
): c.MeasurementField {
  const common = {
    id: nodeId(),
    label: previous?.label ?? "New dimension",
    sectionId,
    required: previous?.required ?? false,
    semanticId: null,
    help: previous?.help ?? "",
    illustrationId: previous?.illustrationId ?? null,
  };
  switch (kind) {
    case "length":
      return {
        ...common,
        kind,
        basis: "body",
        displayUnit: "in",
        displayPrecision: 2,
        min: null,
        max: null,
      };
    case "number":
      return {
        ...common,
        kind,
        unit: "count",
        decimalPlaces: 0,
        min: null,
        max: null,
      };
    case "text":
      return { ...common, kind, maxLength: 500 };
    case "boolean":
      return { ...common, kind };
    case "select":
      return {
        ...common,
        kind,
        choices: [
          {
            id: nodeId(),
            label: "Regular",
            illustrationId: null,
            active: true,
          },
        ],
      };
  }
}
export function FieldEditor({
  field,
  index,
  definition,
  onChange,
  onRemove,
  onMove,
  announce,
  issues,
}: {
  field: c.MeasurementField;
  index: number;
  definition: Definition;
  onChange: (field: c.MeasurementField) => void;
  onRemove: () => void;
  onMove: (direction: number) => void;
  announce: (message: string) => void;
  issues: Issues;
}) {
  const path = ["definition", "fields", index];
  return (
    <fieldset
      className="master-node"
      data-schema-node-id={field.id}
      aria-label={`Dimension ${index + 1}`}
    >
      <legend>Dimension {index + 1}</legend>
      <Ordered
        label={field.label || "dimension"}
        index={index}
        total={definition.fields.length}
        onMove={onMove}
        onRemove={onRemove}
      />
      <div className="master-grid">
        <Control
          label="Dimension label"
          path={[...path, "label"]}
          issues={issues}
        >
          {(props) => (
            <input
              {...props}
              maxLength={100}
              value={field.label}
              onChange={(e) => onChange({ ...field, label: e.target.value })}
            />
          )}
        </Control>
        <label className="master-control">
          <span>Field type</span>
          <select
            aria-label="Field type"
            value={field.kind}
            onChange={(e) => {
              const kind = e.target.value;
              if (
                kind === "length" ||
                kind === "number" ||
                kind === "text" ||
                kind === "boolean" ||
                kind === "select"
              )
                onChange(newField(kind, field.sectionId, field));
            }}
          >
            {["length", "number", "text", "boolean", "select"].map((k) => (
              <option key={k} value={k}>
                {k}
              </option>
            ))}
          </select>
        </label>
        <label className="master-control">
          <span>Section</span>
          <select
            aria-label="Section"
            value={field.sectionId}
            onChange={(e) =>
              onChange({
                ...field,
                sectionId: c.schemaNodeId.parse(e.target.value),
              })
            }
          >
            {definition.sections.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label || "Unnamed section"}
              </option>
            ))}
          </select>
        </label>
        <label className="master-check">
          <input
            type="checkbox"
            checked={field.required}
            onChange={(e) => onChange({ ...field, required: e.target.checked })}
          />
          Required dimension
        </label>
      </div>
      {field.kind === "length" && (
        <div className="master-grid">
          <label className="master-control">
            <span>Measurement basis</span>
            <select
              aria-label="Measurement basis"
              value={field.basis}
              onChange={(e) =>
                onChange({
                  ...field,
                  id: nodeId(),
                  basis: e.target.value === "garment" ? "garment" : "body",
                  semanticId: null,
                })
              }
            >
              <option value="body">Body</option>
              <option value="garment">Garment</option>
            </select>
          </label>
          <label className="master-control">
            <span>Measurement meaning</span>
            <select
              aria-label="Measurement meaning"
              value={field.semanticId ?? ""}
              onChange={(e) => {
                const semantic = e.target.value
                  ? c.semanticId.parse(e.target.value)
                  : null;
                onChange({
                  ...field,
                  id: nodeId(),
                  semanticId: semantic,
                  basis: semantic
                    ? c.SEMANTIC_REGISTRY[semantic].basis
                    : field.basis,
                });
              }}
            >
              <option value="">Custom dimension</option>
              {c.semanticId.options.map((id) => (
                <option key={id} value={id}>
                  {id.replaceAll(".", " / ")}
                </option>
              ))}
            </select>
          </label>
          <label className="master-control">
            <span>Display unit</span>
            <select
              aria-label="Display unit"
              value={field.displayUnit}
              onChange={(e) =>
                onChange({
                  ...field,
                  displayUnit: e.target.value === "cm" ? "cm" : "in",
                })
              }
            >
              <option value="in">Inches</option>
              <option value="cm">Centimetres</option>
            </select>
          </label>
          <Control
            label="Display precision"
            path={[...path, "displayPrecision"]}
            issues={issues}
          >
            {(props) => (
              <input
                {...props}
                type="number"
                min={0}
                max={6}
                value={field.displayPrecision}
                onChange={(e) =>
                  onChange({
                    ...field,
                    displayPrecision: Number(e.target.value),
                  })
                }
              />
            )}
          </Control>
        </div>
      )}
      {field.kind === "number" && (
        <div className="master-grid">
          <label className="master-control">
            <span>Number unit</span>
            <select
              aria-label="Number unit"
              value={field.unit}
              onChange={(e) =>
                onChange({
                  ...field,
                  id: nodeId(),
                  unit: e.target.value === "unitless" ? "unitless" : "count",
                  decimalPlaces: 0,
                })
              }
            >
              <option value="count">Count</option>
              <option value="unitless">Unitless</option>
            </select>
          </label>
          <Control
            label="Decimal places"
            path={[...path, "decimalPlaces"]}
            issues={issues}
          >
            {(props) => (
              <input
                {...props}
                type="number"
                min={0}
                max={field.unit === "count" ? 0 : 6}
                value={field.decimalPlaces}
                onChange={(e) =>
                  onChange({ ...field, decimalPlaces: Number(e.target.value) })
                }
              />
            )}
          </Control>
        </div>
      )}
      {(field.kind === "length" || field.kind === "number") && (
        <div className="master-grid">
          {(["min", "max"] as const).map((key) => (
            <Control
              key={key}
              label={`${key === "min" ? "Minimum" : "Maximum"}${field.kind === "length" ? " (cm)" : ""}`}
              path={[...path, key]}
              issues={issues}
            >
              {(props) => (
                <input
                  {...props}
                  inputMode="decimal"
                  value={field[key] ?? ""}
                  placeholder="No bound"
                  onChange={(e) =>
                    onChange({ ...field, [key]: e.target.value || null })
                  }
                />
              )}
            </Control>
          ))}
        </div>
      )}
      {field.kind === "text" && (
        <Control
          label="Maximum characters"
          path={[...path, "maxLength"]}
          issues={issues}
        >
          {(props) => (
            <input
              {...props}
              type="number"
              min={1}
              max={500}
              value={field.maxLength}
              onChange={(e) =>
                onChange({ ...field, maxLength: Number(e.target.value) })
              }
            />
          )}
        </Control>
      )}
      <Control
        label="Dimension guidance"
        path={[...path, "help"]}
        issues={issues}
      >
        {(props) => (
          <textarea
            {...props}
            maxLength={500}
            value={field.help}
            onChange={(e) => onChange({ ...field, help: e.target.value })}
          />
        )}
      </Control>
      <Illustration
        value={field.illustrationId}
        onChange={(value) => onChange({ ...field, illustrationId: value })}
      />
      {field.kind === "select" && (
        <Choices
          items={field.choices}
          onChange={(choices) => onChange({ ...field, choices })}
          announce={announce}
          path={[...path, "choices"]}
          issues={issues}
        />
      )}
    </fieldset>
  );
}
export function GroupEditor({
  group,
  index,
  total,
  onChange,
  onRemove,
  onMove,
  announce,
  issues,
}: {
  group: Group;
  index: number;
  total: number;
  onChange: (group: Group) => void;
  onRemove: () => void;
  onMove: (direction: number) => void;
  announce: (message: string) => void;
  issues: Issues;
}) {
  const path = ["definition", "constructionGroups", index];
  return (
    <fieldset
      className="master-node"
      data-schema-node-id={group.id}
      aria-label={`Construction group ${index + 1}`}
    >
      <legend>Construction group {index + 1}</legend>
      <Ordered
        label={group.label || "construction group"}
        index={index}
        total={total}
        onMove={onMove}
        onRemove={onRemove}
      />
      <div className="master-grid">
        <Control label="Group label" path={[...path, "label"]} issues={issues}>
          {(props) => (
            <input
              {...props}
              value={group.label}
              maxLength={100}
              onChange={(e) => onChange({ ...group, label: e.target.value })}
            />
          )}
        </Control>
        <label className="master-control">
          <span>Selection</span>
          <select
            aria-label="Selection"
            value={group.kind}
            onChange={(e) =>
              onChange({
                ...group,
                id: nodeId(),
                kind: e.target.value === "multiple" ? "multiple" : "single",
                choices: group.choices.map((c) => ({ ...c, id: nodeId() })),
              })
            }
          >
            <option value="single">Choose one</option>
            <option value="multiple">Choose several</option>
          </select>
        </label>
        <label className="master-check">
          <input
            type="checkbox"
            checked={group.required}
            onChange={(e) => onChange({ ...group, required: e.target.checked })}
          />
          Required construction choice
        </label>
      </div>
      <Control
        label="Construction guidance"
        path={[...path, "help"]}
        issues={issues}
      >
        {(props) => (
          <textarea
            {...props}
            value={group.help}
            maxLength={500}
            onChange={(e) => onChange({ ...group, help: e.target.value })}
          />
        )}
      </Control>
      <Illustration
        value={group.illustrationId}
        onChange={(value) => onChange({ ...group, illustrationId: value })}
      />
      <Choices
        items={group.choices}
        onChange={(choices) => onChange({ ...group, choices })}
        announce={announce}
        path={[...path, "choices"]}
        issues={issues}
      />
    </fieldset>
  );
}
