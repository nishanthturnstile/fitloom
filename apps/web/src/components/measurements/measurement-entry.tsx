"use client";
import { normalizeCustomerSearch } from "@fitloom/application/customer-contracts";
import {
  MASTER_ILLUSTRATIONS,
  type MeasurementField,
  measurementField,
  schemaNodeId,
} from "@fitloom/application/master-contracts";
import * as c from "@fitloom/application/measurement-contracts";
import {
  type MeasurementCell,
  measurementCells,
  reviewMeasurementSchema,
} from "@fitloom/application/measurement-draft";
import { measurementPhotoPayloads } from "@fitloom/application/measurement-photo-contracts";
import {
  displayLength,
  validateMeasurementValues,
} from "@fitloom/application/measurement-values";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  useLeaveProtection,
  useNavigationGuard,
} from "@/components/workspace/navigation-guard";
import { PageHeader } from "@/components/workspace/page-header";
import {
  MeasurementRequestError,
  measurementDenied,
  measurementMessage,
  measurementRequest,
} from "./measurement-client";
import {
  MeasurementCustomField,
  newCustomField,
} from "./measurement-custom-field";
import { MeasurementOptions } from "./measurement-options";
import {
  MeasurementPhotoDraft,
  type PhotoDraftState,
} from "./measurement-photos";
import { MeasurementReuse } from "./measurement-reuse";

type Owner = ReturnType<typeof c.measurementContext.parse>;
type Schema = ReturnType<typeof c.measurementSchema.parse>;
type Ref = ReturnType<typeof c.measurementSchemaRef.parse>;

type Save =
  | { kind: "idle" }
  | { kind: "saving" | "uncertain"; bytes: string }
  | { kind: "saved"; result: ReturnType<typeof c.measurementResult.parse> };
function focusMeasurementControl(key: string) {
  const element = document.getElementById(`measurement-${key}`);
  const details = element?.closest("details");
  if (details) details.open = true;
  element?.focus();
  element?.scrollIntoView({ block: "center" });
}

export function MeasurementEntry({
  owner,
  initialSchema,
  bookPath,
  api,
  returnToken,
  revision,
  copySource,
  initialRef,
}: {
  owner: Owner;
  initialSchema: Schema;
  bookPath: string;
  api: string;
  returnToken: string | null;
  revision?: ReturnType<typeof c.measurementDetail.parse>;
  copySource?: ReturnType<typeof c.measurementDetail.parse>;
  initialRef?: Ref;
}) {
  const [photoChange, setPhotoChange] = useState<
    ReturnType<typeof c.measurementPhotoChange.parse>
  >({ kind: "retain" });
  const [photoState, setPhotoState] = useState<PhotoDraftState>("idle");
  const [photoEpoch, setPhotoEpoch] = useState(0);
  const photoIntent = useRef<ReturnType<
    (typeof measurementPhotoPayloads)["measurement-photo.begin"]["parse"]
  > | null>(null);
  const resetPhotos = () => {
    photoIntent.current = null;
    setPhotoChange({ kind: "retain" });
    setPhotoState("idle");
    setPhotoEpoch((epoch) => epoch + 1);
  };
  const [mappingDirty, setMappingDirty] = useState(false);
  const [origin, setOrigin] = useState<
    c.MeasurementOriginInput | { kind: "retain" }
  >(revision ? { kind: "retain" } : { kind: "manual" });
  const [hydrated, setHydrated] = useState(false),
    [schema, setSchema] = useState(initialSchema),
    [ref, setRef] = useState<Ref>(
      revision?.schemaRef ?? initialRef ?? owner.bodySchemaRef,
    ),
    [kind, setKind] = useState(
      revision?.schemaRef.kind ?? initialRef?.kind ?? "body",
    ),
    [label, setLabel] = useState(
      revision?.document.label ??
        (copySource
          ? `${copySource.document.label.slice(0, 110)} copy`
          : initialSchema.label),
    ),
    [date, setDate] = useState(
      revision?.measuredOn ?? copySource?.measuredOn ?? owner.today ?? "",
    ),
    [notes, setNotes] = useState(
      revision?.document.notes ?? copySource?.document.notes ?? "",
    ),
    [source, setSource] = useState(
      revision?.document.sourceNote ?? copySource?.document.sourceNote ?? "",
    ),
    [cells, setCells] = useState<Record<string, MeasurementCell>>(
      measurementCells(revision?.document.values ?? []),
    ),
    [units, setUnits] = useState<Record<string, "in" | "cm">>({}),
    [custom, setCustom] = useState<MeasurementField[]>(
      revision?.document.customFields ?? [],
    ),
    [errors, setErrors] = useState<Record<string, string>>({}),
    [focusTarget, setFocusTarget] = useState<string | null>(null),
    [notice, setNotice] = useState(""),
    [denied, setDenied] = useState(false),
    [save, setSave] = useState<Save>({ kind: "idle" }),
    [loading, setLoading] = useState(false),
    [garments, setGarments] = useState<ReturnType<
      typeof c.measurementGarments.parse
    > | null>(null),
    [offset, setOffset] = useState(0),
    [garmentSearch, setGarmentSearch] = useState(""),
    [searchInput, setSearchInput] = useState(""),
    [problem, setProblem] = useState<
      "schema-stale" | "version-conflict" | null
    >(null),
    [review, setReview] = useState<
      | (ReturnType<typeof reviewMeasurementSchema> &
          ReturnType<typeof c.measurementCurrentIntake.parse>)
      | null
    >(null);
  const baseline = useRef(
    JSON.stringify({
      schemaRef: revision?.schemaRef ?? initialRef ?? owner.bodySchemaRef,
      label:
        revision?.document.label ??
        (copySource
          ? `${copySource.document.label.slice(0, 110)} copy`
          : initialSchema.label),
      date: revision?.measuredOn ?? copySource?.measuredOn ?? owner.today ?? "",
      notes: revision?.document.notes ?? copySource?.document.notes ?? "",
      source:
        revision?.document.sourceNote ?? copySource?.document.sourceNote ?? "",
      cells: measurementCells(revision?.document.values ?? []),
      custom: revision?.document.customFields ?? [],
    }),
  );
  const guard = useNavigationGuard(),
    switchRequest = useRef(0),
    ready = useRef(false),
    form = useRef<HTMLFormElement>(null);
  const ownerApi = `${api}/${owner.customerId}/${owner.wearerId}`,
    suffix = returnToken ? `?return=${returnToken}` : "";
  const dirty =
    photoChange.kind !== "retain" ||
    photoState !== "idle" ||
    mappingDirty ||
    (origin.kind !== "manual" && origin.kind !== "retain") ||
    baseline.current !==
      JSON.stringify({
        schemaRef: ref,
        label,
        date,
        notes,
        source,
        cells,
        custom,
      });
  const locked =
    save.kind !== "idle" ||
    photoState === "working" ||
    photoState === "uncertain";
  useEffect(() => {
    if (
      !focusTarget ||
      !hydrated ||
      locked ||
      loading ||
      review ||
      denied ||
      kind !== ref.kind
    )
      return;
    focusMeasurementControl(focusTarget);
    setFocusTarget(null);
  }, [focusTarget, hydrated, locked, loading, review, denied, kind, ref.kind]);

  useLeaveProtection({
    active:
      !denied &&
      (save.kind === "saving" ||
        save.kind === "uncertain" ||
        (dirty && save.kind !== "saved")),
    uncertain: save.kind === "uncertain" || photoState === "uncertain",
    noun: "measurement",
    locked: save.kind === "saving" || photoState === "working",
  });
  useEffect(() => {
    ready.current = true;
    setHydrated(true);
    return () => {
      ready.current = false;
      switchRequest.current++;
    };
  }, []);
  useEffect(() => {
    if (kind !== "garment" || revision) return;
    let active = true;
    const controller = new AbortController();
    setGarments(null);
    void measurementRequest(`${ownerApi}/garments`, c.measurementGarments, {
      body: { search: garmentSearch, offset, limit: 25 },
      signal: controller.signal,
    })
      .then((page) => {
        if (active) setGarments(page);
      })
      .catch((error) => {
        if (active) {
          setNotice(measurementMessage(error));
          setDenied(measurementDenied(error));
        }
      });
    return () => {
      active = false;
      controller.abort();
    };
  }, [kind, ownerApi, offset, garmentSearch, revision]);
  const changeSchema = async (next: Ref, confirmed = false) => {
    if (locked || (!confirmed && !guard.confirmLeave())) return;
    const sequence = ++switchRequest.current;
    setLoading(true);
    setNotice("");
    try {
      const schema = await measurementRequest(
        `${ownerApi}/intake`,
        c.measurementSchema,
        { body: next },
      );
      if (sequence !== switchRequest.current || !ready.current) return;
      resetPhotos();
      setKind(next.kind);
      setSchema(schema);
      setRef(next);
      setLabel(schema.label);
      setCells({});
      setUnits({});
      setCustom([]);
      setOrigin({ kind: "manual" });
      setErrors({});
    } catch (error) {
      if (sequence === switchRequest.current) {
        setNotice(measurementMessage(error));
        setDenied(measurementDenied(error));
      }
    } finally {
      if (sequence === switchRequest.current) setLoading(false);
    }
  };
  const fields = [...schema.fields, ...custom];
  const update = (field: MeasurementField, raw: string, unit?: "in" | "cm") => {
    setCells((previous) => ({
      ...previous,
      [field.id]: {
        raw,
        unit:
          unit ??
          previous[field.id]?.unit ??
          (field.kind === "length" ? field.displayUnit : "in"),
      },
    }));
    setErrors((previous) => {
      const next = { ...previous };
      delete next[field.id];
      return next;
    });
  };
  const linkIssue = (path: (string | number)[]): string => {
    const clean = path[0] === "payload" ? path.slice(1) : path;
    const head = clean[0];
    if (head === "values") {
      const key = clean[1];
      return typeof key === "string" && fields.some((field) => field.id === key)
        ? key
        : "values";
    }
    if (head === "customFields" && typeof clean[1] === "number") {
      const field = custom[clean[1]];
      if (field)
        return `${field.id}-${clean[2] === "label" ? "label" : "definition"}`;
    }
    if (head === "photos") return "photos";
    return head === "measuredOn"
      ? "date"
      : ["label", "notes", "sourceNote"].includes(String(head))
        ? head === "sourceNote"
          ? "source"
          : String(head)
        : "values";
  };
  const focusErrors = (issues: Record<string, string>) => {
    const bounded = Object.fromEntries(Object.entries(issues).slice(0, 30));
    setErrors(bounded);
    setNotice("Check the highlighted measurement fields.");
    const key = Object.keys(bounded)[0];
    if (key) setFocusTarget(key);
  };
  const openSaved = async (
    result: ReturnType<typeof c.measurementResult.parse>,
  ) => {
    try {
      await measurementRequest(
        `${ownerApi}/${result.profileId}/versions/${result.versionId}`,
        c.measurementDetail,
      );
      if (!ready.current) return;
      guard.commitNavigation(
        `${bookPath}/${result.profileId}/versions/${result.versionId}${suffix}`,
      );
    } catch (error) {
      if (measurementDenied(error)) setDenied(true);
      setNotice(
        "Saved; details unavailable. Retry opening this exact version. No second save is needed.",
      );
    }
  };
  const reviewSchema = async () => {
    setLoading(true);
    try {
      const next = await measurementRequest(
        `${ownerApi}/current-intake`,
        c.measurementCurrentIntake,
        { body: ref },
      );
      if (!ready.current) return;
      setReview({
        ...next,
        ...reviewMeasurementSchema({
          source: schema,
          target: next.schema,
          cells,
        }),
      });
      setNotice(
        "Review the schema changes. Your original draft is retained until you apply them.",
      );
    } catch (error) {
      setNotice(measurementMessage(error));
      setDenied(measurementDenied(error));
    } finally {
      setLoading(false);
    }
  };
  const perform = async (bytes: string) => {
    setSave({ kind: "saving", bytes });
    setNotice("Saving measurement version…");
    try {
      const response = await measurementRequest(
        `${api}/commands/${revision ? "measurement.revise" : "measurement.create"}`,
        c.measurementSaveResponse,
        { bytes },
      );
      setSave({ kind: "saved", result: response.result });
      if (response.result.changed) {
        setNotice("Saved. Opening the exact version…");
        await openSaved(response.result);
      } else setNotice("No changes. No new version was created.");
    } catch (error) {
      if (measurementDenied(error)) {
        setCells({});
        setCustom([]);
        setNotes("");
        setSource("");
        setLabel(schema.label);
        setDate(owner.today ?? "");
        setErrors({});
        setDenied(true);
        setSave({ kind: "idle" });
      } else if (
        !(error instanceof MeasurementRequestError) ||
        error.code === "temporary"
      ) {
        setSave({ kind: "uncertain", bytes });
        setNotice(
          "The save may have completed. Retry this exact save to recover its result.",
        );
      } else {
        setSave({ kind: "idle" });
        if (error.code === "schema-stale" || error.code === "version-conflict")
          setProblem(error.code);
        if (error.issues.length)
          focusErrors(
            Object.fromEntries(
              error.issues.map((issue) => [
                linkIssue(issue.path),
                issue.message,
              ]),
            ),
          );
        else setNotice(measurementMessage(error));
      }
    }
  };
  const submit = () => {
    if (locked || loading || review) return;
    setProblem(null);
    const issues: Record<string, string> = {},
      values: c.MeasurementValue[] = [];
    for (const field of fields) {
      const cell = cells[field.id];
      if (!cell || cell.raw === "") continue;
      let raw: unknown;
      switch (field.kind) {
        case "length":
          raw = {
            kind: "length",
            fieldId: field.id,
            decimal: cell.raw,
            unit: cell.unit,
          };
          break;
        case "number":
          raw = { kind: "number", fieldId: field.id, decimal: cell.raw };
          break;
        case "boolean":
          raw = {
            kind: "boolean",
            fieldId: field.id,
            value: cell.raw === "true",
          };
          break;
        case "text":
          raw = { kind: "text", fieldId: field.id, text: cell.raw };
          break;
        case "select":
          raw = { kind: "select", fieldId: field.id, choiceId: cell.raw };
          break;
        default: {
          const exhaustive: never = field;
          throw Error(`Unknown field ${exhaustive}`);
        }
      }
      const parsed = c.measurementValue.safeParse(raw);
      if (parsed.success) values.push(parsed.data);
      else
        issues[field.id] =
          parsed.error.issues[0]?.message ?? "Check this value";
    }
    if (Object.keys(issues).length) {
      focusErrors(issues);
      return;
    }
    for (const field of fields)
      if (field.required && !values.some((value) => value.fieldId === field.id))
        issues[field.id] = "Enter a value for this required field";
    if (values.length === 0 && Object.keys(issues).length === 0)
      issues.values = "Enter at least one measurement.";
    for (const field of custom) {
      const parsed = measurementField.safeParse(field);
      if (!parsed.success)
        issues[
          `${field.id}-${parsed.error.issues[0]?.path[0] === "label" ? "label" : "definition"}`
        ] = parsed.error.issues
          .map((issue) => issue.message)
          .join(". ")
          .slice(0, 160);
      if (
        ref.kind === "body" &&
        (field.kind !== "length" || field.basis !== "body")
      )
        issues[`${field.id}-definition`] =
          "Body custom fields must be body-basis lengths.";
    }
    if (Object.keys(issues).length) {
      focusErrors(issues);
      return;
    }
    const candidate = (
      revision ? c.measurementRevise : c.measurementCreate
    ).safeParse({
      customerId: owner.customerId,
      wearerId: owner.wearerId,
      profileId:
        photoIntent.current?.profileId ??
        revision?.profileId ??
        crypto.randomUUID(),
      ...(revision ? { expectedRevision: revision.revision } : {}),
      versionId: photoIntent.current?.versionId ?? crypto.randomUUID(),
      photos: photoChange,
      schemaRef: ref,
      label,
      measuredOn: date,
      values,
      customFields: custom,
      notes: notes || null,
      sourceNote: source || null,
      origin:
        origin.kind === "manual" || origin.kind === "retain"
          ? origin
          : {
              ...origin,
              decisions: origin.decisions.filter((decision) =>
                fields.some((field) => field.id === decision.targetFieldId),
              ),
            },
    });
    if (!candidate.success) {
      for (const issue of candidate.error.issues.slice(0, 30)) {
        const key = linkIssue(
          issue.path.filter(
            (part): part is string | number =>
              typeof part === "string" || typeof part === "number",
          ),
        );
        issues[key] = issue.message;
      }
      focusErrors(issues);
      return;
    }
    if (!owner.today || !c.measuredOnAllowed(date, owner.today)) {
      focusErrors({
        date: "Choose a date on or before today in the shop timezone.",
      });
      return;
    }
    try {
      for (const issue of validateMeasurementValues({
        fields,
        values,
        currentValues: revision?.document.values,
        canonicalLengthFieldIds:
          ref.kind === "garment" ? schema.fields.map((field) => field.id) : [],
      }))
        issues[issue.fieldId] = issue.message;
    } catch {
      focusErrors({
        values: "Check the field definitions and identities before saving.",
      });
      return;
    }
    const normalizedLabels = fields.map((f) =>
      normalizeCustomerSearch(f.label),
    );
    for (const field of custom)
      if (
        !field.label.trim() ||
        normalizedLabels.filter(
          (label) => label === normalizeCustomerSearch(field.label),
        ).length > 1
      )
        issues[`${field.id}-label`] = "Enter a unique custom dimension label.";
    if (Object.keys(issues).length) {
      focusErrors(issues);
      return;
    }
    setErrors({});
    void perform(
      JSON.stringify({
        payload: candidate.data,
        operationKey: crypto.randomUUID(),
        correlationId: crypto.randomUUID(),
      }),
    );
  };
  if (denied)
    return (
      <Alert>
        <AlertDescription>
          Measurement access is unavailable. Sign in again or return to
          Customers.
        </AlertDescription>
      </Alert>
    );
  if (save.kind === "saved")
    return (
      <Alert>
        <AlertDescription>
          <p role="status">{notice}</p>
          <Button variant="outline" onClick={() => void openSaved(save.result)}>
            Open saved version
          </Button>
        </AlertDescription>
      </Alert>
    );
  return (
    <div className="flex min-w-0 flex-col gap-5">
      <a href={bookPath + suffix} className="text-sm text-primary underline">
        Back to measurement book
      </a>
      <PageHeader
        eyebrow={`${owner.customerName} · ${owner.wearerName}`}
        title={
          revision
            ? "Revise measurements"
            : copySource
              ? "Copy measurements"
              : "Add measurements"
        }
        description="Confirm the wearer, choose the schema and record a complete measurement version."
      />
      {problem ? (
        <Alert>
          <AlertDescription>
            <p role="status">
              {problem === "schema-stale"
                ? "The schema changed. Your draft is preserved."
                : "This measurement or its owner changed. Your draft is preserved. Reload before another revision."}
            </p>
            {problem === "schema-stale" ? (
              <Button
                type="button"
                variant="outline"
                disabled={loading || locked}
                onClick={() => void reviewSchema()}
              >
                Review new schema
              </Button>
            ) : (
              <>
                <a
                  className="underline"
                  target="_blank"
                  rel="noreferrer"
                  href={`${bookPath}/${revision?.profileId ?? ""}${suffix}`}
                >
                  Open current saved version
                </a>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    if (guard.confirmLeave()) guard.commitReload();
                  }}
                >
                  Discard draft and reload
                </Button>
              </>
            )}
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setProblem(null);
                setReview(null);
                setNotice(
                  "Original draft retained. Continue editing when ready.",
                );
              }}
            >
              Keep draft and return
            </Button>
          </AlertDescription>
        </Alert>
      ) : null}
      {review ? (
        <Card>
          <CardHeader>
            <CardTitle>Review new schema</CardTitle>
            <CardDescription>
              Retained quantities keep their original decimals and units. New
              bounds and required values are checked on Save. Incompatible and
              source-only values stay in your original draft until you apply
              this review.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <ul className="flex flex-col gap-2">
              {review.rows.map((row) => (
                <li key={row.id} className="break-words">
                  {row.label}: {row.status}
                </li>
              ))}
            </ul>
            <p>
              {custom.length} custom fields retain their identities and entered
              values.
            </p>
            <Button
              type="button"
              onClick={() => {
                const customCells: Record<string, MeasurementCell> = {};
                for (const field of custom) {
                  const cell = cells[field.id];
                  if (cell) customCells[field.id] = cell;
                }
                setCells({ ...review.cells, ...customCells });
                setUnits({});
                resetPhotos();
                setRef(review.schemaRef);
                setSchema(review.schema);
                setCustom((previous) =>
                  previous.map((field) => ({
                    ...field,
                    sectionId: review.schema.sections.some(
                      (section) => section.id === field.sectionId,
                    )
                      ? field.sectionId
                      : (review.schema.sections[0]?.id ??
                        schemaNodeId.parse(c.MEASUREMENT_CUSTOM_SECTION_ID)),
                  })),
                );
                setReview(null);
                setProblem(null);
                setErrors({});
                setNotice(
                  "Schema review applied to an unsaved draft. Check the fields, then save.",
                );
              }}
            >
              {photoIntent.current
                ? "Apply reviewed schema and discard staged photos"
                : "Apply reviewed schema"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setReview(null);
                setNotice("Original draft retained.");
              }}
            >
              Keep original draft
            </Button>
          </CardContent>
        </Card>
      ) : null}
      <Card>
        <CardHeader>
          <CardTitle>Measurement schema</CardTitle>
          <CardDescription>
            Body and garment dimensions stay separate. Each saved version keeps
            its original definition.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {revision ? (
            <p>
              Revision of saved version {revision.sequence}. The profile and
              schema family stay fixed.
            </p>
          ) : (
            <ToggleGroup
              variant="outline"
              aria-label="Schema kind"
              value={[kind]}
              disabled={!hydrated || locked || loading}
              onValueChange={(values) => {
                const next = values[0];
                if ((next !== "body" && next !== "garment") || next === kind)
                  return;
                if (!guard.confirmLeave()) return;
                setKind(next);
                if (next === "body")
                  void changeSchema(owner.bodySchemaRef, true);
              }}
            >
              <ToggleGroupItem value="body">Body</ToggleGroupItem>
              <ToggleGroupItem value="garment">Garment</ToggleGroupItem>
            </ToggleGroup>
          )}
          {!revision && kind === "garment" ? (
            <>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  setGarmentSearch(searchInput);
                  setOffset(0);
                }}
              >
                <FieldGroup className="flex-row flex-wrap items-end">
                  <Field className="min-w-32 flex-1">
                    <FieldLabel htmlFor="garment-search">
                      Find garment schema
                    </FieldLabel>
                    <Input
                      id="garment-search"
                      value={searchInput}
                      onChange={(e) => setSearchInput(e.target.value)}
                      disabled={!hydrated || locked || loading}
                    />
                  </Field>
                  <Button
                    variant="outline"
                    type="submit"
                    disabled={!hydrated || locked || loading}
                  >
                    Find garments
                  </Button>
                </FieldGroup>
              </form>
              {garments ? (
                <>
                  <MeasurementOptions
                    id="measurement-garment"
                    label="Garment schema"
                    value={ref.kind === "garment" ? ref.garmentId : ""}
                    disabled={!hydrated || locked || loading}
                    items={[
                      { value: "", label: "Choose a garment" },
                      ...garments.items.map((g) => ({
                        value: g.garmentId,
                        label: g.label,
                      })),
                    ]}
                    onChange={(id) => {
                      const selected = garments.items.find(
                        (g) => g.garmentId === id,
                      );
                      if (selected)
                        void changeSchema(
                          c.measurementSchemaRef.parse({
                            kind: "garment",
                            garmentId: selected.garmentId,
                            versionId: selected.versionId,
                          }),
                        );
                    }}
                  />
                  {garments.total === 0 ? (
                    <p>
                      No active garment schemas found. You can still record body
                      measurements.
                    </p>
                  ) : null}
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      disabled={locked || offset === 0}
                      onClick={() => setOffset(Math.max(0, offset - 25))}
                    >
                      Previous garments
                    </Button>
                    <Button
                      variant="outline"
                      disabled={locked || garments.nextOffset === null}
                      onClick={() =>
                        garments.nextOffset !== null &&
                        setOffset(garments.nextOffset)
                      }
                    >
                      Next garments
                    </Button>
                  </div>
                </>
              ) : (
                <p role="status">Loading garment schemas…</p>
              )}
            </>
          ) : null}
          <p className="text-sm">
            Selected schema: <strong>{schema.label}</strong>
          </p>
          {loading ? <p role="status">Loading measurement fields…</p> : null}
        </CardContent>
      </Card>
      {copySource ? (
        <MeasurementReuse
          key={JSON.stringify(ref)}
          source={copySource}
          schema={schema}
          schemaRef={ref}
          disabled={
            !hydrated || locked || loading || !!review || kind !== ref.kind
          }
          onDirty={setMappingDirty}
          onApply={(draft) => {
            if (
              (Object.values(cells).some((cell) => cell.raw !== "") ||
                custom.length > 0) &&
              !guard.confirmLeave()
            )
              return;
            setMappingDirty(false);
            setCells(measurementCells(draft.values));
            setCustom(draft.custom);
            setOrigin(draft.origin);
            setUnits({});
            setErrors({});
            setNotice(
              "Reviewed mapping applied to an unsaved independent draft. Check values, date and notes, then Save.",
            );
          }}
        />
      ) : null}
      <MeasurementPhotoDraft
        key={photoEpoch}
        initial={
          revision?.photos ??
          (owner.capabilities.photoRead
            ? { kind: "available", items: [] }
            : { kind: "restricted" })
        }
        api={api}
        ownerApi={ownerApi}
        profileId={revision?.profileId ?? null}
        versionId={revision?.versionId ?? null}
        canManage={owner.capabilities.photoManage}
        disabled={
          !hydrated || locked || loading || !!review || kind !== ref.kind
        }
        getIntent={() => {
          if (!photoIntent.current)
            photoIntent.current = measurementPhotoPayloads[
              "measurement-photo.begin"
            ].parse({
              customerId: owner.customerId,
              wearerId: owner.wearerId,
              profileId: revision?.profileId ?? crypto.randomUUID(),
              versionId: crypto.randomUUID(),
              reservationId: crypto.randomUUID(),
              expectedRevision: revision?.revision ?? 0,
              schemaRef: ref,
            });
          return photoIntent.current;
        }}
        onChange={setPhotoChange}
        onState={setPhotoState}
        onDenied={() => setDenied(true)}
        onRestart={resetPhotos}
      />
      <form
        ref={form}
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
        className="flex flex-col gap-5"
        noValidate
      >
        <fieldset
          disabled={
            !hydrated || locked || loading || !!review || kind !== ref.kind
          }
          className="min-w-0"
          aria-label="Measurement details"
        >
          <FieldGroup>
            <FieldGroup className="sm:grid sm:grid-cols-2">
              <Field data-invalid={!!errors.label}>
                <FieldLabel htmlFor="measurement-label">
                  Profile label
                </FieldLabel>
                <Input
                  id="measurement-label"
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  aria-invalid={!!errors.label}
                  aria-describedby={
                    errors.label ? "measurement-label-error" : undefined
                  }
                />
                {errors.label ? (
                  <FieldError id="measurement-label-error">
                    {errors.label}
                  </FieldError>
                ) : null}
              </Field>
              <Field data-invalid={!!errors.date}>
                <FieldLabel htmlFor="measurement-date">Measured on</FieldLabel>
                <Input
                  id="measurement-date"
                  type="date"
                  min="0001-01-01"
                  max={owner.today ?? undefined}
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  aria-invalid={!!errors.date}
                  aria-describedby={
                    errors.date ? "measurement-date-error" : undefined
                  }
                />
                {errors.date ? (
                  <FieldError id="measurement-date-error">
                    {errors.date}
                  </FieldError>
                ) : null}
              </Field>
            </FieldGroup>
            <Card>
              <CardHeader>
                <CardTitle>{schema.label}</CardTitle>
                <CardDescription>{schema.guidance}</CardDescription>
              </CardHeader>
              <CardContent
                className="flex flex-col gap-6"
                id="measurement-values"
                tabIndex={-1}
              >
                {schema.sections.length > 1 ? (
                  <nav
                    aria-label="Measurement sections"
                    className="flex flex-wrap gap-3"
                  >
                    {schema.sections.map((section) => {
                      const first = fields.find(
                        (field) => field.sectionId === section.id,
                      );
                      return first ? (
                        <a
                          key={section.id}
                          className="text-sm text-primary underline"
                          href={`#measurement-${first.id}`}
                        >
                          {section.label}
                        </a>
                      ) : null;
                    })}
                  </nav>
                ) : null}
                {errors.values ? (
                  <FieldError id="measurement-values-error">
                    {errors.values}
                  </FieldError>
                ) : null}
                {fields.length === 0 ? (
                  <p>
                    This schema has no standard dimensions. Add a custom
                    dimension before saving.
                  </p>
                ) : null}
                <FieldGroup className="sm:grid sm:grid-cols-2">
                  {fields.map((field) => {
                    const cell = cells[field.id] ?? {
                      raw: "",
                      unit: field.kind === "length" ? field.displayUnit : "in",
                    };
                    const displayUnit = units[field.id] ?? cell.unit;
                    const decimal = c.measurementLengthDecimal.safeParse(
                      cell.raw,
                    );
                    const display =
                      field.kind === "length" && decimal.success
                        ? displayLength({
                            decimal: decimal.data,
                            unit: cell.unit,
                            displayUnit,
                            precision: field.displayPrecision,
                          })
                        : null;
                    const shown =
                        display && displayUnit !== cell.unit
                          ? display.decimal
                          : cell.raw,
                      invalid = !!errors[field.id],
                      isCustom = custom.some((f) => f.id === field.id);
                    return (
                      <Field
                        key={field.id}
                        data-invalid={
                          invalid || !!errors[`${field.id}-definition`]
                        }
                        className="min-w-0"
                      >
                        <FieldLabel htmlFor={`measurement-${field.id}`}>
                          {field.label}
                          {field.required ? " *" : ""}
                        </FieldLabel>
                        {isCustom ? (
                          <Input
                            id={`measurement-${field.id}-label`}
                            aria-label="Custom dimension label"
                            aria-invalid={!!errors[`${field.id}-label`]}
                            aria-describedby={
                              errors[`${field.id}-label`]
                                ? `measurement-${field.id}-label-error`
                                : undefined
                            }
                            value={field.label}
                            onChange={(e) => {
                              setCustom((previous) =>
                                previous.map((f) =>
                                  f.id === field.id
                                    ? { ...f, label: e.target.value }
                                    : f,
                                ),
                              );
                              setErrors((previous) => {
                                const next = { ...previous };
                                delete next[`${field.id}-label`];
                                return next;
                              });
                            }}
                          />
                        ) : null}
                        {isCustom && errors[`${field.id}-label`] ? (
                          <FieldError
                            id={`measurement-${field.id}-label-error`}
                          >
                            {errors[`${field.id}-label`]}
                          </FieldError>
                        ) : null}
                        {isCustom ? (
                          <MeasurementCustomField
                            field={field}
                            body={ref.kind === "body"}
                            error={errors[`${field.id}-definition`]}
                            onChange={(next) => {
                              setErrors((previous) => {
                                const updated = { ...previous };
                                delete updated[field.id];
                                delete updated[`${field.id}-definition`];
                                return updated;
                              });
                              setCustom((previous) =>
                                previous.map((f) =>
                                  f.id === field.id ? next : f,
                                ),
                              );
                              if (next.id !== field.id) {
                                setCells((previous) => {
                                  const updated = { ...previous };
                                  delete updated[field.id];
                                  return updated;
                                });
                                requestAnimationFrame(() =>
                                  document
                                    .getElementById(`measurement-${next.id}`)
                                    ?.focus(),
                                );
                                setNotice(
                                  "Field meaning changed. Enter a new value for its new identity.",
                                );
                              }
                            }}
                          />
                        ) : null}
                        {isCustom && errors[`${field.id}-definition`] ? (
                          <FieldError
                            id={`measurement-${field.id}-definition-error`}
                          >
                            {errors[`${field.id}-definition`]}
                          </FieldError>
                        ) : null}
                        {field.illustrationId ? (
                          <Image
                            src={MASTER_ILLUSTRATIONS[field.illustrationId].src}
                            alt=""
                            width={48}
                            height={48}
                            className="size-12"
                          />
                        ) : null}
                        {field.kind === "boolean" || field.kind === "select" ? (
                          <MeasurementOptions
                            id={`measurement-${field.id}`}
                            label={field.label}
                            value={cell.raw}
                            invalid={invalid}
                            errorId={
                              invalid
                                ? `measurement-${field.id}-error`
                                : undefined
                            }
                            onChange={(raw) => update(field, raw)}
                            items={
                              field.kind === "boolean"
                                ? [
                                    { value: "", label: "Not recorded" },
                                    { value: "true", label: "Yes" },
                                    { value: "false", label: "No" },
                                  ]
                                : [
                                    { value: "", label: "Not recorded" },
                                    ...field.choices.map((choice) => ({
                                      value: choice.id,
                                      label: choice.label,
                                      disabled:
                                        !choice.active &&
                                        !(
                                          revision?.document.values.some(
                                            (value) =>
                                              value.kind === "select" &&
                                              value.fieldId === field.id &&
                                              value.choiceId === choice.id,
                                          ) && cell.raw === choice.id
                                        ),
                                    })),
                                  ]
                            }
                          />
                        ) : (
                          <div className="flex min-w-0 gap-2">
                            <Input
                              id={`measurement-${field.id}`}
                              className="min-w-0 flex-1"
                              value={shown}
                              inputMode={
                                field.kind === "text" ? "text" : "decimal"
                              }
                              onChange={(e) =>
                                update(field, e.target.value, displayUnit)
                              }
                              aria-invalid={invalid}
                              aria-describedby={
                                invalid
                                  ? `measurement-${field.id}-error`
                                  : undefined
                              }
                            />
                            {field.kind === "length" ? (
                              <MeasurementOptions
                                id={`unit-${field.id}`}
                                label={`${field.label} unit`}
                                value={displayUnit}
                                onChange={(unit) => {
                                  if (unit === "in" || unit === "cm")
                                    setUnits((previous) => ({
                                      ...previous,
                                      [field.id]: unit,
                                    }));
                                }}
                                items={[
                                  { value: "in", label: "in" },
                                  { value: "cm", label: "cm" },
                                ]}
                              />
                            ) : null}
                          </div>
                        )}
                        <FieldDescription>
                          {field.kind === "length"
                            ? `${field.basis} basis. `
                            : ""}
                          {field.help}
                          {display?.approximate && displayUnit !== cell.unit
                            ? ` Approximate display; original ${cell.raw} ${cell.unit} is retained until you edit.`
                            : ""}
                        </FieldDescription>
                        {invalid ? (
                          <FieldError id={`measurement-${field.id}-error`}>
                            {errors[field.id]}
                          </FieldError>
                        ) : null}
                        {isCustom ? (
                          <Button
                            type="button"
                            variant="ghost"
                            className="self-start"
                            onClick={() => {
                              setCustom((previous) =>
                                previous.filter((f) => f.id !== field.id),
                              );
                              setCells((previous) => {
                                const next = { ...previous };
                                delete next[field.id];
                                return next;
                              });
                            }}
                          >
                            Remove custom dimension
                          </Button>
                        ) : null}
                      </Field>
                    );
                  })}
                </FieldGroup>
                <Button
                  type="button"
                  variant="outline"
                  className="self-start"
                  disabled={custom.length >= 20}
                  onClick={() => {
                    setCustom((previous) => [
                      ...previous,
                      {
                        ...newCustomField(
                          "length",
                          ref.kind === "body",
                          schema.sections[0]?.id,
                        ),
                        label: `Custom dimension ${previous.length + 1}`,
                      },
                    ]);
                  }}
                >
                  Add custom dimension
                </Button>
              </CardContent>
            </Card>
            <FieldGroup>
              <Field data-invalid={!!errors.notes}>
                <FieldLabel htmlFor="measurement-notes">
                  Notes (optional)
                </FieldLabel>
                <Textarea
                  id="measurement-notes"
                  aria-invalid={!!errors.notes}
                  aria-describedby={
                    errors.notes ? "measurement-notes-error" : undefined
                  }
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
                {errors.notes ? (
                  <FieldError id="measurement-notes-error">
                    {errors.notes}
                  </FieldError>
                ) : null}
              </Field>
              <Field data-invalid={!!errors.source}>
                <FieldLabel htmlFor="measurement-source">
                  Source attribution (optional)
                </FieldLabel>
                <Input
                  id="measurement-source"
                  aria-invalid={!!errors.source}
                  aria-describedby={
                    errors.source ? "measurement-source-error" : undefined
                  }
                  value={source}
                  onChange={(e) => setSource(e.target.value)}
                />
                {errors.source ? (
                  <FieldError id="measurement-source-error">
                    {errors.source}
                  </FieldError>
                ) : null}
              </Field>
            </FieldGroup>
          </FieldGroup>
        </fieldset>
        {Object.keys(errors).length ? (
          <Alert>
            <AlertDescription>
              <ul aria-label="Measurement errors">
                {Object.entries(errors).map(([id, message]) => (
                  <li key={id}>
                    <a
                      className="underline"
                      href={`#measurement-${id}`}
                      onClick={(event) => {
                        event.preventDefault();
                        focusMeasurementControl(id);
                      }}
                    >
                      {message}
                    </a>
                  </li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        ) : null}
        <div className="flex flex-col gap-3 border-t border-border bg-background py-4 sm:sticky sm:bottom-0 sm:flex-row sm:items-center sm:justify-between">
          <p role="status" className="min-w-0 text-sm sm:flex-1">
            {notice || "Changes stay in memory until you save a version."}
          </p>
          <div className="flex w-full flex-col gap-2 min-[400px]:w-auto min-[400px]:flex-row">
            <Button
              type="button"
              variant="outline"
              onClick={() => guard.navigate(bookPath + suffix)}
              disabled={save.kind === "saving"}
            >
              Cancel
            </Button>
            {save.kind === "uncertain" ? (
              <Button type="button" onClick={() => void perform(save.bytes)}>
                Retry exact save
              </Button>
            ) : (
              <Button
                type="submit"
                disabled={
                  !hydrated ||
                  locked ||
                  loading ||
                  !!review ||
                  kind !== ref.kind
                }
              >
                Save measurement version
              </Button>
            )}
          </div>
        </div>
      </form>
    </div>
  );
}
