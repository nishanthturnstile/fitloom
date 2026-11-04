"use client";
import * as c from "@fitloom/application/import-contracts";
import { useEffect, useState } from "react";
import { z } from "zod";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { ImportButton as Button } from "./import-button";
import { importRequest } from "./import-client";
import { ImportOwnerPicker, ImportWearerMap } from "./import-owner-picker";

type Record = ReturnType<typeof c.importRecord.parse>;
type Decision = ReturnType<typeof c.importDecision.parse>;
const action = z.enum(["create", "separate", "reuse", "owner", "skip", ""]);
export function ImportRecordEditor({
  record,
  index,
  family,
  api,
  namespace,
  disabled,
  onReview,
  onDirty,
  onError,
}: {
  record: Record;
  index: number;
  family: ReturnType<typeof c.importFamily.parse>;
  api: string;
  namespace: string | null;
  disabled: boolean;
  onReview: (record: Record, decision: Decision) => void;
  onDirty: (id: string, dirty: boolean) => void;
  onError: (error: unknown) => void;
}) {
  const [kind, setKind] = useState<Decision["kind"] | "">(
      record.decision?.kind ??
        (family === "customers" && record.candidateCount === 0
          ? "create"
          : family === "measurements"
            ? "owner"
            : ""),
    ),
    [reason, setReason] = useState(
      record.decision?.kind === "skip" || record.decision?.kind === "separate"
        ? record.decision.reason
        : "",
    ),
    [customer, setCustomer] = useState(
      record.decision?.kind === "reuse" || record.decision?.kind === "owner"
        ? record.decision.customerId
        : "",
    ),
    [wearer, setWearer] = useState(
      record.decision?.kind === "owner" ? record.decision.wearerId : "",
    ),
    [wearerChoices, setWearerChoices] = useState(
      new Map<string, { kind: "create" } | { kind: "reuse"; wearerId: string }>(
        record.decision?.kind === "reuse"
          ? record.decision.wearers.map((w) => [w.sourceId, w.action])
          : [],
      ),
    ),
    [dirty, setDirty] = useState(false),
    [message, setMessage] = useState("");
  useEffect(() => {
    onDirty(record.id, dirty);
    return () => onDirty(record.id, false);
  }, [record.id, dirty, onDirty]);
  const editable = ["pending", "failed", "needs-review"].includes(record.state),
    payload = record.payload;
  const approve = () => {
    const decision = c.importDecision.safeParse(
      kind === "create"
        ? { kind }
        : kind === "separate" || kind === "skip"
          ? { kind, reason }
          : kind === "owner"
            ? { kind, customerId: customer, wearerId: wearer }
            : {
                kind,
                customerId: customer,
                wearers:
                  payload?.family === "customers"
                    ? payload.wearers.map((w) => ({
                        sourceId: w.sourceId,
                        action: wearerChoices.get(w.sourceId),
                      }))
                    : [],
              },
    );
    if (!decision.success) {
      setMessage(
        "Choose a decision, every named wearer mapping, and a reason where requested.",
      );
      return;
    }
    setMessage("");
    onReview(record, decision.data);
  };
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle className="min-w-0 break-words [overflow-wrap:anywhere]">
            Group {index}: {record.sourceId ?? "Private preview cleared"}
          </CardTitle>
          <Badge variant="outline">{record.state.replaceAll("-", " ")}</Badge>
        </div>
        <CardDescription>
          CSV data rows {record.rows.join(", ")}
          {record.redundantRows.length
            ? ` · ${record.redundantRows.length} redundant rows`
            : ""}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex min-w-0 flex-col gap-5 [overflow-wrap:anywhere]">
        {payload?.family === "customers" ? (
          <>
            <p>
              {payload.profile.name} ·{" "}
              {payload.profile.phone?.display ?? "No phone"}
            </p>
            <p>
              {payload.wearers.length} explicit wearers:{" "}
              {payload.wearers.map((w) => w.name).join(", ") || "Contact only"}
            </p>
            {payload.profile.notes ? (
              <p className="whitespace-pre-wrap break-words">
                {payload.profile.notes}
              </p>
            ) : null}
          </>
        ) : payload?.family === "measurements" ? (
          payload.versions.map((v) => (
            <details key={v.sourceId} className="min-w-0">
              <summary className="cursor-pointer break-words">
                Source version {v.sequence}: {v.label} · {v.measuredOn} ·{" "}
                {v.values.length} supplied values · schema {v.schemaKey}
              </summary>
              <dl className="mt-3 grid min-w-0 gap-3 sm:grid-cols-2">
                {v.values.map((value) => (
                  <div key={value.fieldKey} className="min-w-0">
                    <dt>
                      {v.customFields.find((f) => f.key === value.fieldKey)
                        ?.label ?? value.fieldKey}
                    </dt>
                    <dd className="whitespace-pre-wrap break-words">
                      {value.kind === "length"
                        ? `${value.decimal} ${value.unit}`
                        : value.kind === "number"
                          ? value.decimal
                          : value.kind === "boolean"
                            ? value.value
                              ? "Yes"
                              : "No"
                            : value.kind === "text"
                              ? value.text
                              : value.choiceKey}
                    </dd>
                  </div>
                ))}
              </dl>
              {v.notes ? (
                <p className="mt-3 whitespace-pre-wrap break-words">
                  Notes: {v.notes}
                </p>
              ) : null}
              {v.sourceAuthor ? (
                <p className="mt-3 break-words">
                  Unverified source author: {v.sourceAuthor}
                </p>
              ) : null}
            </details>
          ))
        ) : (
          <p>
            Private normalized content has been cleared or this CSV group is
            invalid. Terminal outcomes remain available.
          </p>
        )}
        {record.issues.length ? (
          <Alert>
            <AlertDescription>
              <ul>
                {record.issues.map((issue) => (
                  <li
                    key={`${issue.row}:${issue.path.join(".")}:${issue.message}`}
                  >
                    Row {issue.row}
                    {issue.path.length ? ` · ${issue.path.join(".")}` : ""}:{" "}
                    {issue.message}
                  </li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        ) : null}
        {record.candidateCount > 0 ? (
          <section className="flex flex-col gap-3">
            <h3>{record.candidateCount} customers with the same phone</h3>
            <p>
              Matching a phone does not merge a customer or wearer. Archived
              customers need a separate restore before reuse.
            </p>
            {record.candidates.map((candidate) => (
              <div
                key={candidate.customerId}
                className="flex flex-wrap items-center justify-between gap-2"
              >
                <span>
                  {candidate.name} ·{" "}
                  {candidate.archivedAt ? "Archived" : "Active"}
                </span>
                <Button
                  type="button"
                  variant="outline"
                  disabled={disabled || !editable || !!candidate.archivedAt}
                  onClick={() => {
                    setCustomer(candidate.customerId);
                    setWearerChoices(new Map());
                    setKind("reuse");
                    setDirty(true);
                  }}
                >
                  Use {candidate.name}
                </Button>
              </div>
            ))}
          </section>
        ) : null}
        {editable ? (
          <FieldGroup>
            <ToggleGroup
              variant="outline"
              multiple={false}
              value={kind ? [kind] : []}
              disabled={disabled}
              className="flex-wrap"
              aria-label={`Decision for group ${index}`}
              onValueChange={(values) => {
                const next = action.safeParse(values[0] ?? "");
                if (next.success) {
                  setKind(next.data);
                  setDirty(true);
                }
              }}
            >
              {family === "customers" ? (
                <>
                  <ToggleGroupItem
                    value="create"
                    disabled={record.candidateCount > 0 || !payload}
                  >
                    Create new
                  </ToggleGroupItem>
                  <ToggleGroupItem value="separate" disabled={!payload}>
                    Keep separate
                  </ToggleGroupItem>
                  <ToggleGroupItem value="reuse" disabled={!payload}>
                    Reuse customer
                  </ToggleGroupItem>
                </>
              ) : (
                <ToggleGroupItem value="owner" disabled={!payload}>
                  Choose owner
                </ToggleGroupItem>
              )}
              <ToggleGroupItem value="skip">Skip group</ToggleGroupItem>
            </ToggleGroup>
            {kind === "separate" || kind === "skip" ? (
              <Field>
                <FieldLabel htmlFor={`reason-${record.id}`}>
                  Reason for {kind === "skip" ? "skipping" : "keeping separate"}
                </FieldLabel>
                <Input
                  id={`reason-${record.id}`}
                  value={reason}
                  disabled={disabled}
                  onChange={(e) => {
                    setReason(e.target.value);
                    setDirty(true);
                  }}
                />
              </Field>
            ) : null}
            {(kind === "reuse" || kind === "owner") && payload ? (
              <>
                <ImportOwnerPicker
                  key={record.id}
                  api={api.replace(/\/imports$/, "")}
                  id={`owner-${record.id}`}
                  customer={customer}
                  wearer={wearer}
                  disabled={disabled}
                  onCustomer={(id) => {
                    setCustomer(id);
                    setWearer("");
                    setWearerChoices(new Map());
                    setDirty(true);
                  }}
                  {...(kind === "owner"
                    ? {
                        onWearer: (id: string) => {
                          setWearer(id);
                          setDirty(true);
                        },
                      }
                    : {})}
                  onError={onError}
                />
                {kind === "reuse" && payload.family === "customers"
                  ? payload.wearers.map((w) => (
                      <ImportWearerMap
                        key={`${customer}:${w.sourceId}`}
                        api={api.replace(/\/imports$/, "")}
                        id={`wearer-${record.id}-${w.sourceId}`}
                        customer={customer}
                        sourceName={w.name}
                        selection={wearerChoices.get(w.sourceId)}
                        disabled={disabled}
                        onChange={(choice) => {
                          setWearerChoices((old) =>
                            new Map(old).set(w.sourceId, choice),
                          );
                          setDirty(true);
                        }}
                        onError={onError}
                      />
                    ))
                  : null}
                {kind === "owner" &&
                payload.family === "measurements" &&
                namespace ? (
                  <Button
                    type="button"
                    variant="outline"
                    disabled={disabled}
                    onClick={async () => {
                      try {
                        const first = payload.versions[0];
                        if (!first) return;
                        const mapping = await importRequest(
                          `${api}/measurements/owner-mapping`,
                          z
                            .strictObject({
                              customerId: z.uuid(),
                              wearerId: z.uuid(),
                            })
                            .nullable(),
                          {
                            namespace,
                            sourceCustomerId: first.sourceCustomerId,
                            sourceWearerId: first.sourceWearerId,
                          },
                        );
                        if (!mapping) {
                          setMessage(
                            "No accepted customer/wearer source mapping exists. Choose both owners explicitly.",
                          );
                          return;
                        }
                        setCustomer(mapping.customerId);
                        setWearer(mapping.wearerId);
                        setDirty(true);
                        setMessage(
                          "Accepted source owner mapping selected. Review it before approval.",
                        );
                      } catch (error) {
                        onError(error);
                      }
                    }}
                  >
                    Use accepted source wearer mapping
                  </Button>
                ) : null}
                {customer && kind === "owner" && wearer ? (
                  <p>
                    Customer and wearer selected. No customer fields will be
                    changed.
                  </p>
                ) : null}
              </>
            ) : null}
            <Button
              type="button"
              disabled={
                disabled ||
                !kind ||
                (kind !== "skip" && (!payload || record.issues.length > 0))
              }
              onClick={approve}
            >
              Approve group {index}
            </Button>
          </FieldGroup>
        ) : (
          <p>
            Created {record.counts.customers} customers, {record.counts.wearers}{" "}
            wearers, {record.counts.profiles} profiles and{" "}
            {record.counts.versions} versions.
          </p>
        )}
        {message ? (
          <Alert>
            <AlertDescription role="status">{message}</AlertDescription>
          </Alert>
        ) : null}
      </CardContent>
    </Card>
  );
}
