"use client";
import {
  type MeasurementField,
  schemaNodeId,
} from "@fitloom/application/master-contracts";
import { MEASUREMENT_CUSTOM_SECTION_ID } from "@fitloom/application/measurement-contracts";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { MeasurementOptions } from "./measurement-options";

export function newCustomField(
  kind: MeasurementField["kind"],
  body: boolean,
  sectionId?: MeasurementField["sectionId"],
): MeasurementField {
  const common = {
    id: schemaNodeId.parse(crypto.randomUUID()),
    sectionId: sectionId ?? schemaNodeId.parse(MEASUREMENT_CUSTOM_SECTION_ID),
    label: "Custom dimension",
    required: false,
    semanticId: null,
    help: "Record this custom dimension using the shop's measuring practice.",
    illustrationId: null,
  };
  switch (kind) {
    case "length":
      return {
        ...common,
        kind,
        basis: body ? "body" : "garment",
        displayUnit: "in",
        displayPrecision: 2,
        min: "0",
        max: null,
      };
    case "number":
      return {
        ...common,
        kind,
        unit: "count",
        decimalPlaces: 0,
        min: "0",
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
            id: schemaNodeId.parse(crypto.randomUUID()),
            label: "Option 1",
            active: true,
            illustrationId: null,
          },
        ],
      };
    default: {
      const exhaustive: never = kind;
      return exhaustive;
    }
  }
}
export function MeasurementCustomField({
  field,
  body,
  onChange,
  error,
}: {
  field: MeasurementField;
  body: boolean;
  onChange: (next: MeasurementField) => void;
  error?: string | undefined;
}) {
  const id = `custom-${field.id}`;
  const text = (
    key: string,
    label: string,
    value: string,
    change: (value: string) => void,
  ) => (
    <Field>
      <FieldLabel htmlFor={`${id}-${key}`}>{label}</FieldLabel>
      <Input
        id={`${id}-${key}`}
        value={value}
        onChange={(event) => change(event.target.value)}
      />
    </Field>
  );
  return (
    <details className="min-w-0 rounded-md border border-border p-3">
      <summary className="cursor-pointer text-sm">
        Edit custom field definition
      </summary>
      <FieldGroup className="mt-4">
        <Field>
          <FieldLabel htmlFor={`measurement-${field.id}-definition`}>
            Field kind
          </FieldLabel>
          <MeasurementOptions
            id={`measurement-${field.id}-definition`}
            label="Field kind"
            invalid={!!error}
            errorId={
              error ? `measurement-${field.id}-definition-error` : undefined
            }
            value={field.kind}
            items={(body
              ? ["length"]
              : ["length", "number", "text", "boolean", "select"]
            ).map((value) => ({ value, label: value }))}
            onChange={(kind) => {
              if (
                kind === "length" ||
                kind === "number" ||
                kind === "text" ||
                kind === "boolean" ||
                kind === "select"
              )
                onChange({
                  ...newCustomField(kind, body, field.sectionId),
                  label: field.label,
                  help: field.help,
                  required: field.required,
                });
            }}
          />
          <FieldDescription>
            Changing kind, basis or number unit replaces this field identity and
            clears its value.
          </FieldDescription>
        </Field>
        <Field>
          <FieldLabel htmlFor={`${id}-required`}>Required value</FieldLabel>
          <MeasurementOptions
            id={`${id}-required`}
            label="Required value"
            value={String(field.required)}
            items={[
              { value: "false", label: "Optional" },
              { value: "true", label: "Required" },
            ]}
            onChange={(value) =>
              onChange({ ...field, required: value === "true" })
            }
          />
        </Field>
        {text("help", "Field guidance", field.help, (help) =>
          onChange({ ...field, help }),
        )}
        {field.kind === "length" ? (
          <>
            <Field>
              <FieldLabel htmlFor={`${id}-basis`}>Measurement basis</FieldLabel>
              <MeasurementOptions
                id={`${id}-basis`}
                label="Measurement basis"
                value={field.basis}
                items={(body ? ["body"] : ["body", "garment"]).map((value) => ({
                  value,
                  label: value,
                }))}
                onChange={(basis) => {
                  if (basis === "body" || basis === "garment")
                    onChange({
                      ...field,
                      id: schemaNodeId.parse(crypto.randomUUID()),
                      basis,
                    });
                }}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor={`${id}-unit`}>Bounds unit</FieldLabel>
              <MeasurementOptions
                id={`${id}-unit`}
                label="Bounds unit"
                value={field.displayUnit}
                items={[
                  { value: "in", label: "in" },
                  { value: "cm", label: "cm" },
                ]}
                onChange={(displayUnit) => {
                  if (displayUnit === "in" || displayUnit === "cm")
                    onChange({ ...field, displayUnit });
                }}
              />
              <FieldDescription>
                Minimum and maximum use this unit. Entered values retain their
                own unit.
              </FieldDescription>
            </Field>
            <Field>
              <FieldLabel htmlFor={`${id}-precision`}>
                Display precision
              </FieldLabel>
              <MeasurementOptions
                id={`${id}-precision`}
                label="Display precision"
                value={String(field.displayPrecision)}
                items={[0, 1, 2, 3, 4, 5, 6].map((n) => ({
                  value: String(n),
                  label: String(n),
                }))}
                onChange={(value) =>
                  onChange({ ...field, displayPrecision: Number(value) })
                }
              />
            </Field>
          </>
        ) : null}
        {field.kind === "number" ? (
          <>
            <Field>
              <FieldLabel htmlFor={`${id}-unit`}>Number unit</FieldLabel>
              <MeasurementOptions
                id={`${id}-unit`}
                label="Number unit"
                value={field.unit}
                items={[
                  { value: "count", label: "Count" },
                  { value: "unitless", label: "Unitless" },
                ]}
                onChange={(unit) => {
                  if (unit === "count" || unit === "unitless")
                    onChange({
                      ...field,
                      id: schemaNodeId.parse(crypto.randomUUID()),
                      unit,
                      decimalPlaces: unit === "count" ? 0 : field.decimalPlaces,
                    });
                }}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor={`${id}-precision`}>
                Decimal places
              </FieldLabel>
              <MeasurementOptions
                id={`${id}-precision`}
                label="Decimal places"
                value={String(field.decimalPlaces)}
                disabled={field.unit === "count"}
                items={[0, 1, 2, 3, 4, 5, 6].map((n) => ({
                  value: String(n),
                  label: String(n),
                }))}
                onChange={(value) =>
                  onChange({ ...field, decimalPlaces: Number(value) })
                }
              />
            </Field>
          </>
        ) : null}
        {field.kind === "length" || field.kind === "number" ? (
          <>
            {text("min", "Minimum", field.min ?? "", (value) =>
              onChange({ ...field, min: value || null }),
            )}
            {text("max", "Maximum", field.max ?? "", (value) =>
              onChange({ ...field, max: value || null }),
            )}
          </>
        ) : null}
        {field.kind === "text" ? (
          <Field>
            <FieldLabel htmlFor={`${id}-limit`}>Maximum characters</FieldLabel>
            <Input
              id={`${id}-limit`}
              type="number"
              min={1}
              max={500}
              value={field.maxLength}
              onChange={(event) =>
                onChange({ ...field, maxLength: Number(event.target.value) })
              }
            />
          </Field>
        ) : null}
        {field.kind === "select" ? (
          <>
            {field.choices.map((choice, index) => (
              <FieldGroup
                key={choice.id}
                className="rounded-md border border-border p-3"
                aria-label={`Custom choice ${index + 1}`}
              >
                {text(
                  `choice-${choice.id}`,
                  "Choice label",
                  choice.label,
                  (label) =>
                    onChange({
                      ...field,
                      choices: field.choices.map((c) =>
                        c.id === choice.id ? { ...c, label } : c,
                      ),
                    }),
                )}
                <MeasurementOptions
                  id={`${id}-active-${choice.id}`}
                  label={`Choice ${index + 1} status`}
                  value={String(choice.active)}
                  items={[
                    { value: "true", label: "Active" },
                    { value: "false", label: "Inactive" },
                  ]}
                  onChange={(value) =>
                    onChange({
                      ...field,
                      choices: field.choices.map((c) =>
                        c.id === choice.id
                          ? { ...c, active: value === "true" }
                          : c,
                      ),
                    })
                  }
                />
                <Button
                  type="button"
                  variant="ghost"
                  disabled={field.choices.length <= 1}
                  onClick={() =>
                    onChange({
                      ...field,
                      choices: field.choices.filter((c) => c.id !== choice.id),
                    })
                  }
                >
                  Remove choice {index + 1}
                </Button>
              </FieldGroup>
            ))}
            <Button
              type="button"
              variant="outline"
              disabled={field.choices.length >= 30}
              onClick={() =>
                onChange({
                  ...field,
                  choices: [
                    ...field.choices,
                    {
                      id: schemaNodeId.parse(crypto.randomUUID()),
                      label: `Option ${field.choices.length + 1}`,
                      active: true,
                      illustrationId: null,
                    },
                  ],
                })
              }
            >
              Add custom choice
            </Button>
          </>
        ) : null}
      </FieldGroup>
    </details>
  );
}
