"use client";
import * as c from "@fitloom/application/import-contracts";
import { measurementSchemaRef } from "@fitloom/application/measurement-contracts";
import { useEffect, useState } from "react";
import { z } from "zod";
import { MeasurementOptions } from "@/components/measurements/measurement-options";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { ImportButton as Button } from "./import-button";
import {
  downloadImport,
  ImportRequestError,
  importRequest,
} from "./import-client";

const choices = z.strictObject({
  body: measurementSchemaRef,
  garments: z
    .array(
      z.strictObject({ id: z.uuid(), versionId: z.uuid(), label: z.string() }),
    )
    .max(25),
});
type Manifest = ReturnType<typeof c.importManifest.parse>;
type Binding = ReturnType<typeof c.importSchemaBinding.parse>;
export function ImportSchemaEditor({
  api,
  bindings,
  onChange,
  disabled,
  onError,
}: {
  api: string;
  bindings: Binding[];
  onChange: (bindings: Binding[]) => void;
  disabled: boolean;
  onError: (error: unknown) => void;
}) {
  const [sources, setSources] = useState<Manifest[]>([]),
    [page, setPage] = useState<ReturnType<typeof choices.parse> | null>(null),
    [query, setQuery] = useState({ search: "", offset: 0 }),
    [search, setSearch] = useState(""),
    [key, setKey] = useState("body_v1"),
    [ref, setRef] = useState("body");
  useEffect(() => {
    const controller = new AbortController();
    let live = true;
    void importRequest(
      `${api}/measurements/schemas`,
      choices,
      query,
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
  const add = async () => {
    if (!page) return;
    const schemaRef =
      ref === "body"
        ? page.body
        : (() => {
            const g = page.garments.find((g) => g.id === ref);
            return g
              ? { kind: "garment", garmentId: g.id, versionId: g.versionId }
              : null;
          })();
    if (!schemaRef) return;
    try {
      const manifest = await importRequest(
        `${api}/measurements/manifest`,
        c.importManifest,
        { schemaKey: key, schemaRef },
      );
      setSources((items) => [
        ...items.filter((x) => x.schemaKey !== manifest.schemaKey),
        manifest,
      ]);
      onChange([
        ...bindings.filter((x) => x.schemaKey !== manifest.schemaKey),
        c.importSchemaBinding.parse({
          schemaKey: manifest.schemaKey,
          sourceRef: manifest.schemaRef,
          targetRef: manifest.schemaRef,
          mappings: [],
        }),
      ]);
    } catch (error) {
      onError(error);
    }
  };
  return (
    <Card>
      <CardHeader>
        <CardTitle>Measurement templates and schema bindings</CardTitle>
        <CardDescription>
          Changing these bindings affects groups approved afterward. Already
          approved groups retain their reviewed schemas. Every schema key in the
          CSV needs an exact manifest. Earlier schemas require an explicit
          mapping or a visible drop for each supplied value.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex min-w-0 flex-col gap-5">
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="import-schema-key">
              Schema key used in CSV
            </FieldLabel>
            <Input
              id="import-schema-key"
              value={key}
              disabled={disabled}
              onChange={(e) => setKey(e.target.value)}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="import-schema-search">
              Find garment schemas
            </FieldLabel>
            <Input
              id="import-schema-search"
              value={search}
              disabled={disabled}
              onChange={(e) => setSearch(e.target.value)}
            />
          </Field>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={disabled}
              onClick={() => setQuery({ search, offset: 0 })}
            >
              Find import schemas
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={disabled || !page || page.garments.length < 25}
              onClick={() => setQuery((q) => ({ ...q, offset: q.offset + 25 }))}
            >
              More garment schemas
            </Button>
          </div>
          {page ? (
            <MeasurementOptions
              id="import-current-schema"
              label="Current measurement schema"
              value={ref}
              disabled={disabled}
              items={[
                { value: "body", label: "Body measurements" },
                ...page.garments.map((g) => ({ value: g.id, label: g.label })),
              ]}
              onChange={setRef}
            />
          ) : null}
          <Button
            type="button"
            disabled={
              disabled ||
              !key.trim() ||
              !page ||
              (bindings.length >= 20 &&
                !bindings.some((b) => b.schemaKey === key.trim()))
            }
            onClick={() => void add()}
          >
            Bind selected schema
          </Button>
          <Field>
            <FieldLabel htmlFor="import-source-manifest">
              Attach an earlier source manifest
            </FieldLabel>
            <Input
              id="import-source-manifest"
              type="file"
              accept="application/json,.json"
              disabled={disabled}
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                try {
                  if (file.size > 256 * 1024)
                    throw new ImportRequestError(
                      "validation",
                      "Manifest exceeds 256 KiB",
                    );
                  const raw = c.importManifest.parse(
                      JSON.parse(await file.text()),
                    ),
                    verified = await importRequest(
                      `${api}/measurements/manifest`,
                      c.importManifest,
                      { schemaKey: raw.schemaKey, schemaRef: raw.schemaRef },
                    );
                  if (raw.schemaHash !== verified.schemaHash)
                    throw new ImportRequestError(
                      "validation",
                      "Manifest does not match the saved schema",
                    );
                  setSources((items) => [
                    ...items.filter((m) => m.schemaKey !== verified.schemaKey),
                    verified,
                  ]);
                  onChange([
                    ...bindings.filter(
                      (b) => b.schemaKey !== verified.schemaKey,
                    ),
                    c.importSchemaBinding.parse({
                      schemaKey: verified.schemaKey,
                      sourceRef: verified.schemaRef,
                      targetRef: verified.schemaRef,
                      mappings: [],
                    }),
                  ]);
                } catch (error) {
                  onError(error);
                }
              }}
            />
          </Field>
        </FieldGroup>
        {bindings.map((binding) => (
          <BindingEditor
            key={binding.schemaKey}
            api={api}
            binding={binding}
            source={sources.find((s) => s.schemaKey === binding.schemaKey)}
            page={page}
            disabled={disabled}
            onChange={(next) =>
              onChange(
                bindings.map((b) =>
                  b.schemaKey === next.schemaKey ? next : b,
                ),
              )
            }
            onRemove={() =>
              onChange(
                bindings.filter((b) => b.schemaKey !== binding.schemaKey),
              )
            }
            onError={onError}
          />
        ))}
        <div className="flex flex-wrap gap-4">
          <a
            className="text-primary underline"
            href="/imports/values.schema.json"
            download
          >
            Value JSON Schema
          </a>
          <a
            className="text-primary underline"
            href="/imports/customFields.schema.json"
            download
          >
            Custom field JSON Schema
          </a>
        </div>
      </CardContent>
    </Card>
  );
}
function BindingEditor({
  api,
  binding,
  source,
  page,
  disabled,
  onChange,
  onRemove,
  onError,
}: {
  api: string;
  binding: Binding;
  source: Manifest | undefined;
  page: ReturnType<typeof choices.parse> | null;
  disabled: boolean;
  onChange: (next: Binding) => void;
  onRemove: () => void;
  onError: (error: unknown) => void;
}) {
  const [target, setTarget] = useState<Manifest | null>(null),
    [targetKey, setTargetKey] = useState(
      binding.targetRef.kind === "body" ? "body" : binding.targetRef.garmentId,
    ),
    [reason, setReason] = useState("");
  const load = async (value: string) => {
    if (!page) return;
    const g = page.garments.find((g) => g.id === value),
      schemaRef =
        value === "body"
          ? page.body
          : g
            ? { kind: "garment", garmentId: g.id, versionId: g.versionId }
            : null;
    if (!schemaRef) return;
    try {
      const manifest = await importRequest(
        `${api}/measurements/manifest`,
        c.importManifest,
        { schemaKey: binding.schemaKey, schemaRef },
      );
      setTarget(manifest);
      setTargetKey(value);
      onChange({ ...binding, targetRef: manifest.schemaRef, mappings: [] });
    } catch (error) {
      onError(error);
    }
  };
  const setMapping = (sourceKey: string, targetId: string) => {
    const mappings = binding.mappings.filter((m) => m.sourceKey !== sourceKey);
    if (!targetId) {
      onChange({ ...binding, mappings });
      return;
    }
    if (targetId === "drop") {
      if (!reason.trim()) {
        onError(
          new ImportRequestError(
            "validation",
            "Enter a reason before dropping a source value",
          ),
        );
        return;
      }
      mappings.push(
        c.importSchemaBinding.shape.mappings.element.parse({
          kind: "drop",
          sourceKey,
          reason,
        }),
      );
    } else {
      const field = target?.schema.fields.find((f) => f.id === targetId);
      if (!field) return;
      mappings.push(
        c.importSchemaBinding.shape.mappings.element.parse({
          kind: "field",
          sourceKey,
          targetFieldId: field.id,
          rule: field.kind,
          choiceMappings: [],
        }),
      );
    }
    onChange({ ...binding, mappings });
  };
  return (
    <section className="flex min-w-0 flex-col gap-4 rounded-lg border p-4">
      <h3 className="break-words">Schema key: {binding.schemaKey}</h3>
      <p>{source?.schema.label ?? "Previously reviewed schema binding"}</p>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          disabled={disabled}
          onClick={() =>
            void downloadImport(
              `${api}/measurements/manifest`,
              { schemaKey: binding.schemaKey, schemaRef: binding.sourceRef },
              `${binding.schemaKey}.manifest.json`,
            ).catch(onError)
          }
        >
          Download manifest
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={disabled}
          onClick={() =>
            void downloadImport(
              `${api}/measurements/template`,
              { schemaKey: binding.schemaKey, schemaRef: binding.sourceRef },
              "fitloom-measurements-v1.csv",
            ).catch(onError)
          }
        >
          Download measurement CSV template
        </Button>
        <Button
          type="button"
          variant="ghost"
          disabled={disabled}
          onClick={onRemove}
        >
          Remove schema binding
        </Button>
      </div>
      {page ? (
        <MeasurementOptions
          id={`import-target-${binding.schemaKey}`}
          label={`Target schema for ${binding.schemaKey}`}
          value={targetKey}
          disabled={disabled}
          items={[
            { value: "body", label: "Current body schema" },
            ...page.garments.map((g) => ({ value: g.id, label: g.label })),
          ]}
          onChange={(v) => void load(v)}
        />
      ) : null}
      <Button
        type="button"
        variant="outline"
        disabled={disabled || !page}
        onClick={() => void load(targetKey)}
      >
        Review current target fields
      </Button>
      <p>
        Identity mapping uses stable fields only when the exact source and
        target schema match. Select a target to review older schema fields.
      </p>
      {source && target ? (
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor={`drop-${binding.schemaKey}`}>
              Reason for explicitly dropping a source value
            </FieldLabel>
            <Input
              id={`drop-${binding.schemaKey}`}
              value={reason}
              disabled={disabled}
              onChange={(e) => setReason(e.target.value)}
            />
          </Field>
          {source.aliases.map((alias) => {
            const field = source.schema.fields.find(
                (f) => f.id === alias.fieldId,
              ),
              decision = binding.mappings.find(
                (m) => m.sourceKey === alias.key,
              ),
              targetField =
                decision?.kind === "field"
                  ? target.schema.fields.find(
                      (f) => f.id === decision.targetFieldId,
                    )
                  : null;
            if (!field) return null;
            return (
              <FieldGroup key={alias.key}>
                <MeasurementOptions
                  id={`map-${binding.schemaKey}-${alias.key}`}
                  label={`Map ${field.label}`}
                  value={
                    decision?.kind === "drop"
                      ? "drop"
                      : decision?.kind === "field"
                        ? decision.targetFieldId
                        : ""
                  }
                  disabled={disabled}
                  items={[
                    { value: "", label: "No explicit mapping" },
                    {
                      value: "drop",
                      label: "Explicitly drop this source value",
                    },
                    ...target.schema.fields
                      .filter((f) => f.kind === field.kind)
                      .map((f) => ({ value: f.id, label: f.label })),
                  ]}
                  onChange={(v) => setMapping(alias.key, v)}
                />
                {field.kind === "select" &&
                targetField?.kind === "select" &&
                decision?.kind === "field"
                  ? alias.choices.map((choice) => {
                      const label =
                        field.choices.find((c) => c.id === choice.choiceId)
                          ?.label ?? choice.key;
                      return (
                        <MeasurementOptions
                          key={choice.key}
                          id={`choice-${binding.schemaKey}-${alias.key}-${choice.key}`}
                          label={`Map choice ${label}`}
                          value={
                            decision.choiceMappings.find(
                              (c) => c.sourceKey === choice.key,
                            )?.targetChoiceId ?? ""
                          }
                          disabled={disabled}
                          items={[
                            {
                              value: "",
                              label: "Choose an active target option",
                            },
                            ...targetField.choices
                              .filter((c) => c.active)
                              .map((c) => ({ value: c.id, label: c.label })),
                          ]}
                          onChange={(v) =>
                            onChange({
                              ...binding,
                              mappings: binding.mappings.map((m) =>
                                m === decision
                                  ? {
                                      ...m,
                                      choiceMappings: [
                                        ...m.choiceMappings.filter(
                                          (c) => c.sourceKey !== choice.key,
                                        ),
                                        {
                                          sourceKey: choice.key,
                                          targetChoiceId: v,
                                        },
                                      ],
                                    }
                                  : m,
                              ),
                            })
                          }
                        />
                      );
                    })
                  : null}
              </FieldGroup>
            );
          })}
        </FieldGroup>
      ) : null}
    </section>
  );
}
