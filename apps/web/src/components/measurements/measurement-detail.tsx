"use client";
import {
  type measurementContext,
  type measurementDetail,
  measurementHistory,
} from "@fitloom/application/measurement-contracts";
import { useEffect, useState } from "react";
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
import { PageHeader } from "@/components/workspace/page-header";
import { MeasurementCards } from "./measurement-cards";
import {
  measurementDenied,
  measurementMessage,
  measurementRequest,
} from "./measurement-client";
import { MeasurementLifecycle } from "./measurement-lifecycle";
import { MeasurementPhotoGallery } from "./measurement-photos";

type Detail = ReturnType<typeof measurementDetail.parse>;
type Owner = ReturnType<typeof measurementContext.parse>;
export function MeasurementDetail({
  data,
  owner,
  bookPath,
  api,
  returnToken,
}: {
  data: Detail;
  owner: Owner;
  bookPath: string;
  api: string;
  returnToken: string | null;
}) {
  const [history, setHistory] = useState<ReturnType<
      typeof measurementHistory.parse
    > | null>(null),
    [before, setBefore] = useState<{ beforeSequence: number | null }>({
      beforeSequence: null,
    }),
    [error, setError] = useState(""),
    [denied, setDenied] = useState(false);
  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    setHistory(null);
    setError("");
    void measurementRequest(
      `${api}/${data.profileId}/history`,
      measurementHistory,
      {
        body: { beforeSequence: before.beforeSequence, limit: 25 },
        signal: controller.signal,
      },
    )
      .then((page) => {
        if (active) setHistory(page);
      })
      .catch((e) => {
        if (active) {
          setError(measurementMessage(e));
          setDenied(measurementDenied(e));
        }
      });
    return () => {
      active = false;
      controller.abort();
    };
  }, [api, data.profileId, before]);
  const suffix = returnToken ? `?return=${returnToken}` : "";
  if (denied)
    return (
      <Alert>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  const fields = [
    ...data.document.schema.fields,
    ...data.document.customFields,
  ];
  const valueLabel = (field: (typeof fields)[number]) => {
    const value = data.document.values.find((v) => v.fieldId === field.id);
    if (!value) return "Not recorded";
    switch (value.kind) {
      case "length":
        return `${value.decimal} ${value.unit}`;
      case "number":
        return value.decimal;
      case "text":
        return value.text;
      case "boolean":
        return value.value ? "Yes" : "No";
      case "select":
        return field.kind === "select"
          ? (field.choices.find((c) => c.id === value.choiceId)?.label ??
              "Unavailable selection")
          : "Unavailable selection";
      default: {
        const exhaustive: never = value;
        return exhaustive;
      }
    }
  };
  return (
    <div className="flex min-w-0 flex-col gap-5">
      <a href={bookPath + suffix} className="text-sm text-primary underline">
        Back to measurement book
      </a>
      <PageHeader
        eyebrow={`${owner.customerName} · ${owner.wearerName}`}
        title={data.document.label}
        description={`${data.document.schema.label} · Measured ${data.measuredOn}`}
      />
      {owner.capabilities.manage && data.effectiveActive ? (
        <a
          className="self-start text-sm text-primary underline"
          href={`${bookPath}/${data.profileId}/edit${suffix}`}
        >
          Revise current measurements
        </a>
      ) : null}
      <div className="flex flex-wrap gap-4">
        {owner.capabilities.manage && owner.active ? (
          <a
            className="text-sm text-primary underline"
            href={`${bookPath}/${data.profileId}/versions/${data.versionId}/copy${suffix}`}
          >
            Copy this exact version
          </a>
        ) : null}
        <a
          className="text-sm text-primary underline"
          href={`${bookPath}/compare${suffix}`}
        >
          Compare measurements
        </a>
      </div>
      <MeasurementCards
        owner={owner}
        api={api.slice(
          0,
          api.lastIndexOf(`/${owner.customerId}/${owner.wearerId}`),
        )}
        initial={data}
        onDenied={() => setDenied(true)}
      />
      {owner.capabilities.archive && owner.active ? (
        <MeasurementLifecycle
          data={data}
          api={api}
          onDenied={() => setDenied(true)}
        />
      ) : null}
      {data.document.origin.kind === "imported" ? (
        <Alert>
          <AlertDescription>
            Imported measurement history. Original source attribution is
            unverified.
          </AlertDescription>
        </Alert>
      ) : null}
      {data.document.origin.kind === "copy" ||
      data.document.origin.kind === "mapped" ? (
        <Alert>
          <AlertDescription>
            <p>
              Source attribution:{" "}
              {data.document.origin.kind === "copy"
                ? "Independent copy"
                : "Reviewed mapping"}
              . Original source version {data.document.origin.sourceVersionId}.
            </p>
            <a
              className="underline"
              href={`${bookPath}/${data.document.origin.sourceProfileId}/versions/${data.document.origin.sourceVersionId}`}
            >
              Open exact source version
            </a>
            <p>
              {data.document.origin.manualFieldIds.length} fields and{" "}
              {data.document.origin.editedMetadata.length} metadata values
              changed manually after reuse.{" "}
              {
                data.document.origin.decisions.filter((d) => d.rule === "ease")
                  .length
              }{" "}
              explicit ease transformations.
            </p>
          </AlertDescription>
        </Alert>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <Badge variant="outline">Version {data.sequence}</Badge>
        <Badge variant="secondary">
          {data.versionId === data.currentVersionId
            ? "Current version"
            : "Historical version"}
        </Badge>
        {!data.effectiveActive ? (
          <Badge variant="secondary">Archived owner or profile</Badge>
        ) : null}
      </div>
      <MeasurementPhotoGallery
        photos={data.photos}
        api={api.slice(
          0,
          api.lastIndexOf(`/${owner.customerId}/${owner.wearerId}`),
        )}
        owner={owner}
        profileId={data.profileId}
        versionId={data.versionId}
        canManage={owner.capabilities.photoManage}
        onDenied={() => setDenied(true)}
      />
      <Card>
        <CardHeader>
          <CardTitle>Saved dimensions</CardTitle>
          <CardDescription>{data.document.schema.guidance}</CardDescription>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-5 sm:grid-cols-2">
            {fields.map((field) => (
              <div
                key={field.id}
                className="min-w-0 border-b border-border pb-4"
              >
                <dt className="break-words text-sm text-muted-foreground">
                  {field.label}
                  {field.kind === "length" ? ` · ${field.basis} basis` : ""}
                </dt>
                <dd className="mt-1 break-words whitespace-pre-wrap font-mono text-base">
                  {valueLabel(field)}
                </dd>
              </div>
            ))}
          </dl>
        </CardContent>
      </Card>
      {data.document.notes || data.document.sourceNote ? (
        <Card>
          <CardHeader>
            <CardTitle>Notes and source</CardTitle>
            <CardDescription>Saved with this exact version.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <p className="break-words whitespace-pre-wrap">
              {data.document.notes}
            </p>
            {data.document.sourceNote ? (
              <p className="break-words whitespace-pre-wrap">
                Source attribution: {data.document.sourceNote}
              </p>
            ) : null}
          </CardContent>
        </Card>
      ) : null}
      <p className="break-words text-sm text-muted-foreground">
        Recorded {data.recordedAt} · Recorded by {data.recordedByLabel}
      </p>
      <Card>
        <CardHeader>
          <CardTitle>Version history</CardTitle>
          <CardDescription>
            Open a saved version to see its original definition and values.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {error ? (
            <Alert>
              <AlertDescription>
                {error}
                <Button
                  variant="outline"
                  onClick={() => setBefore((previous) => ({ ...previous }))}
                >
                  Retry history
                </Button>
              </AlertDescription>
            </Alert>
          ) : history ? (
            <ul className="flex flex-col gap-3">
              {history.items.map((item) => (
                <li key={item.versionId}>
                  <a
                    aria-current={
                      item.versionId === data.versionId ? "page" : undefined
                    }
                    className="break-words text-primary underline"
                    href={`${bookPath}/${data.profileId}/versions/${item.versionId}${suffix}`}
                  >
                    Version {item.sequence} · {item.label} · {item.measuredOn}
                  </a>
                </li>
              ))}
            </ul>
          ) : (
            <p role="status">Loading history…</p>
          )}
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              disabled={before.beforeSequence === null}
              onClick={() => setBefore({ beforeSequence: null })}
            >
              Latest history
            </Button>
            <Button
              variant="outline"
              disabled={!history || history.nextBeforeSequence === null}
              onClick={() =>
                history &&
                setBefore({ beforeSequence: history.nextBeforeSequence })
              }
            >
              Older versions
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
