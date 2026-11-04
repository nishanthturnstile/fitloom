"use client";
import type { MeasurementField } from "@fitloom/application/master-contracts";
import * as c from "@fitloom/application/measurement-contracts";
import {
  cloneMeasurementCustomFields,
  mappedMeasurementValue,
  mappingCompatible,
  measurementValueLabel,
  sameMeasurementLineage,
  suggestMeasurementSource,
} from "@fitloom/application/measurement-reuse";
import { useEffect, useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { MeasurementOptions } from "./measurement-options";

type Detail = ReturnType<typeof c.measurementDetail.parse>;
type Ref = ReturnType<typeof c.measurementSchemaRef.parse>;
type Row = {
  sourceId: string;
  rule: "identity" | "ease";
  amount: string;
  unit: "in" | "cm";
  resultUnit: "in" | "cm";
  round: boolean;
  choices: Record<string, string>;
};
type Draft = { custom: MeasurementField[]; rows: Record<string, Row> };
export type ReusedMeasurement = {
  values: c.MeasurementValue[];
  custom: MeasurementField[];
  origin: c.MeasurementOriginInput;
};
export function MeasurementReuse({
  source,
  schema,
  schemaRef,
  disabled,
  onApply,
  onDirty,
}: {
  source: Detail;
  schema: c.MeasurementSchema;
  schemaRef: Ref;
  disabled: boolean;
  onApply: (draft: ReusedMeasurement) => void;
  onDirty: (dirty: boolean) => void;
}) {
  const [draft, setDraft] = useState<Draft | null>(null),
    [preview, setPreview] = useState<ReusedMeasurement | null>(null),
    [error, setError] = useState("");
  useEffect(() => {
    const cloned = cloneMeasurementCustomFields(source, schema, () =>
      crypto.randomUUID(),
    );
    const custom = cloned.fields.filter(
      (field) =>
        schemaRef.kind !== "body" ||
        (field.kind === "length" && field.basis === "body"),
    );
    const rows: Record<string, Row> = {};
    for (const target of [...schema.fields, ...custom]) {
      const clonedDecision = cloned.decisions.find(
        (d) => d.targetFieldId === target.id,
      );
      const original = clonedDecision
        ? source.document.customFields.find(
            (f) => f.id === clonedDecision.sourceFieldId,
          )
        : suggestMeasurementSource(source, target, schemaRef);
      rows[target.id] = {
        sourceId: original?.id ?? "",
        rule: "identity",
        amount: "",
        unit: "in",
        resultUnit: target.kind === "length" ? target.displayUnit : "in",
        round: false,
        choices:
          clonedDecision?.rule === "identity"
            ? Object.fromEntries(
                clonedDecision.choices.map((choice) => [
                  choice.sourceChoiceId,
                  choice.targetChoiceId ?? "",
                ]),
              )
            : {},
      };
    }
    onDirty(false);
    setDraft({ custom, rows });
    setPreview(null);
    setError("");
  }, [source, schema, schemaRef, onDirty]);
  const fields = [...schema.fields, ...(draft?.custom ?? [])],
    sourceFields = [
      ...source.document.schema.fields,
      ...source.document.customFields,
    ];
  const update = (id: string, change: Partial<Row>) => {
    onDirty(true);
    setPreview(null);
    setError("");
    setDraft((previous) => {
      const row = previous?.rows[id];
      return previous && row
        ? {
            ...previous,
            rows: { ...previous.rows, [id]: { ...row, ...change } },
          }
        : previous;
    });
  };
  const prepare = () => {
    if (!draft) return;
    try {
      const decisions: c.MeasurementMappingDecision[] = [],
        values: c.MeasurementValue[] = [];
      for (const target of fields) {
        const row = draft.rows[target.id];
        if (!row?.sourceId) continue;
        const decision = c.measurementMappingDecision.parse(
          row.rule === "identity"
            ? {
                rule: row.rule,
                sourceFieldId: row.sourceId,
                targetFieldId: target.id,
                choices: Object.entries(row.choices).map(
                  ([sourceChoiceId, targetChoiceId]) => ({
                    sourceChoiceId,
                    targetChoiceId: targetChoiceId || null,
                  }),
                ),
              }
            : {
                rule: row.rule,
                sourceFieldId: row.sourceId,
                targetFieldId: target.id,
                decimal: row.amount,
                unit: row.unit,
                resultUnit: row.resultUnit,
                acceptRounding: row.round,
              },
        );
        decisions.push(decision);
        const value = mappedMeasurementValue(
          sourceFields,
          target,
          source.document.values,
          decision,
        );
        if (value) values.push(value);
      }
      setPreview({
        values,
        custom: draft.custom,
        origin: c.measurementOriginInput.parse({
          kind: sameMeasurementLineage(source.schemaRef, schemaRef)
            ? "copy"
            : "mapped",
          sourceProfileId: source.profileId,
          sourceVersionId: source.versionId,
          decisions,
        }),
      });
    } catch (problem) {
      setError(
        problem instanceof Error && !problem.message.startsWith("[")
          ? problem.message
          : "Check the mapping, ease decimals and rounding choices.",
      );
    }
  };
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h2>Reuse exact version {source.sequence}</h2>
        </CardTitle>
        <CardDescription>
          Source: {source.document.label}, measured {source.measuredOn}. Review
          an independent draft. No profile is created until Save. Source-only
          fields stay in the source history.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex min-w-0 flex-col gap-4">
        {!draft ? (
          <p role="status">Preparing mapping choices…</p>
        ) : (
          <fieldset disabled={disabled} className="min-w-0">
            <FieldGroup>
              {fields.map((target) => {
                const row = draft.rows[target.id];
                if (!row) return null;
                const from = sourceFields.find((f) => f.id === row.sourceId);
                return (
                  <FieldGroup
                    key={target.id}
                    className="rounded-md border border-border p-3"
                    aria-label={`Map ${target.label}`}
                  >
                    <Field>
                      <FieldLabel htmlFor={`map-${target.id}`}>
                        {target.label}
                        {target.kind === "length"
                          ? ` · ${target.basis} basis`
                          : ""}
                      </FieldLabel>
                      <MeasurementOptions
                        id={`map-${target.id}`}
                        label={`Source for ${target.label}`}
                        value={row.sourceId}
                        items={[
                          { value: "", label: "Leave missing" },
                          ...sourceFields.map((f) => ({
                            value: f.id,
                            label: `${f.label}${f.kind === "length" ? ` · ${f.basis}` : ""}`,
                          })),
                        ]}
                        onChange={(sourceId) => {
                          const f = sourceFields.find((f) => f.id === sourceId);
                          update(target.id, {
                            sourceId,
                            choices: {},
                            rule:
                              f &&
                              !mappingCompatible(f, target, "identity") &&
                              mappingCompatible(f, target, "ease")
                                ? "ease"
                                : "identity",
                          });
                        }}
                      />
                      <FieldDescription>
                        {from
                          ? `Original: ${measurementValueLabel(
                              source.document.values.find(
                                (value) => value.fieldId === from.id,
                              ),
                              from,
                            )}`
                          : "No source selected. Labels are never matched automatically."}
                      </FieldDescription>
                    </Field>
                    {from?.kind === "length" && target.kind === "length" ? (
                      <>
                        <MeasurementOptions
                          id={`rule-${target.id}`}
                          label={`Rule for ${target.label}`}
                          value={row.rule}
                          items={[
                            {
                              value: "identity",
                              label: "Identity, same basis",
                            },
                            { value: "ease", label: "Explicit additive ease" },
                          ]}
                          onChange={(rule) => {
                            if (rule === "identity" || rule === "ease")
                              update(target.id, { rule });
                          }}
                        />
                        {row.rule === "ease" ? (
                          <FieldGroup>
                            <Field>
                              <FieldLabel htmlFor={`ease-${target.id}`}>
                                Ease for {target.label}
                              </FieldLabel>
                              <Input
                                id={`ease-${target.id}`}
                                inputMode="decimal"
                                value={row.amount}
                                onChange={(event) =>
                                  update(target.id, {
                                    amount: event.target.value,
                                  })
                                }
                              />
                              <FieldDescription>
                                Enter the tailor-approved amount. Negative ease
                                is allowed only when the resulting length stays
                                nonnegative. No formula is supplied.
                              </FieldDescription>
                            </Field>
                            <Field>
                              <FieldLabel htmlFor={`ease-unit-${target.id}`}>
                                {"Ease unit"}
                              </FieldLabel>
                              <MeasurementOptions
                                id={`ease-unit-${target.id}`}
                                label={`Ease unit for ${target.label}`}
                                value={row.unit}
                                items={[
                                  { value: "in", label: "in" },
                                  { value: "cm", label: "cm" },
                                ]}
                                onChange={(unit) => {
                                  if (unit === "in" || unit === "cm")
                                    update(target.id, { unit });
                                }}
                              />
                            </Field>
                            <Field>
                              <FieldLabel htmlFor={`result-unit-${target.id}`}>
                                {"Result unit"}
                              </FieldLabel>
                              <MeasurementOptions
                                id={`result-unit-${target.id}`}
                                label={`Result unit for ${target.label}`}
                                value={row.resultUnit}
                                items={[
                                  { value: "in", label: "in" },
                                  { value: "cm", label: "cm" },
                                ]}
                                onChange={(resultUnit) => {
                                  if (
                                    resultUnit === "in" ||
                                    resultUnit === "cm"
                                  )
                                    update(target.id, { resultUnit });
                                }}
                              />
                            </Field>
                            <Field orientation="horizontal">
                              <Checkbox
                                id={`round-${target.id}`}
                                checked={row.round}
                                onCheckedChange={(round) =>
                                  update(target.id, { round: round === true })
                                }
                              />
                              <FieldLabel htmlFor={`round-${target.id}`}>
                                Accept rounding to six decimal places when
                                required
                              </FieldLabel>
                            </Field>
                          </FieldGroup>
                        ) : null}
                      </>
                    ) : null}
                    {from?.kind === "select" && target.kind === "select"
                      ? from.choices.map((choice) => (
                          <Field key={choice.id}>
                            <FieldLabel
                              htmlFor={`choice-map-${target.id}-${choice.id}`}
                            >
                              Map option {choice.label}
                            </FieldLabel>
                            <MeasurementOptions
                              id={`choice-map-${target.id}-${choice.id}`}
                              label={`Map option ${choice.label}`}
                              value={
                                row.choices[choice.id] ??
                                (target.choices.some((t) => t.id === choice.id)
                                  ? choice.id
                                  : "")
                              }
                              items={[
                                { value: "", label: "Leave missing" },
                                ...target.choices
                                  .filter((c) => c.active)
                                  .map((c) => ({
                                    value: c.id,
                                    label: c.label,
                                  })),
                              ]}
                              onChange={(targetId) =>
                                update(target.id, {
                                  choices: {
                                    ...row.choices,
                                    [choice.id]: targetId,
                                  },
                                })
                              }
                            />
                          </Field>
                        ))
                      : null}
                  </FieldGroup>
                );
              })}
              <p className="break-words text-sm">
                Source-only fields:{" "}
                {sourceFields
                  .filter(
                    (field) =>
                      !Object.values(draft.rows).some(
                        (row) => row.sourceId === field.id,
                      ),
                  )
                  .map((field) => field.label)
                  .join(", ") || "None"}
                .
              </p>
              <Button type="button" variant="outline" onClick={prepare}>
                Preview mapping
              </Button>
            </FieldGroup>
          </fieldset>
        )}
        {error ? (
          <Alert>
            <AlertDescription role="status">{error}</AlertDescription>
          </Alert>
        ) : null}
        {preview ? (
          <div className="flex min-w-0 flex-col gap-3">
            <p role="status">
              Unsaved mapping preview. Original quantities stay unchanged for
              identity mappings. Ease results are transformed values.
            </p>
            <dl className="grid min-w-0 gap-3 sm:grid-cols-2">
              {fields.map((field) => (
                <div key={field.id} className="min-w-0">
                  <dt className="break-words">{field.label}</dt>
                  <dd className="break-words font-mono">
                    {measurementValueLabel(
                      preview.values.find(
                        (value) => value.fieldId === field.id,
                      ),
                      field,
                    )}
                    {preview.origin.kind !== "manual" &&
                    preview.origin.decisions.some(
                      (d) => d.targetFieldId === field.id && d.rule === "ease",
                    )
                      ? " · transformed"
                      : ""}
                  </dd>
                </div>
              ))}
            </dl>
            <Button
              type="button"
              disabled={disabled}
              onClick={() => onApply(preview)}
            >
              Apply reviewed mapping
            </Button>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
