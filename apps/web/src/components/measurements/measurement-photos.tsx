"use client";
import * as c from "@fitloom/application/measurement-contracts";
import type { measurementPhotoPayloads } from "@fitloom/application/measurement-photo-contracts";
import {
  measurementPhotoResponse,
  measurementPhotoUploadResult,
} from "@fitloom/application/measurement-photo-contracts";
import { PRIVATE_IMAGE_MAX_BYTES } from "@fitloom/application/private-image-limits";
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
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useLeaveProtection } from "@/components/workspace/navigation-guard";
import {
  MeasurementRequestError,
  measurementDenied,
  measurementMessage,
  measurementRequest,
} from "./measurement-client";

type Projection = ReturnType<typeof c.measurementPhotoProjection.parse>;
type Begin = ReturnType<
  (typeof measurementPhotoPayloads)["measurement-photo.begin"]["parse"]
>;
type Reference = ReturnType<typeof c.measurementPhotoReference.parse>;
export type PhotoDraftState = "idle" | "draft" | "working" | "uncertain";
type Work =
  | { step: "begin"; bytes: string; file: File; preview: string }
  | {
      step: "upload";
      fileId: string;
      reservationId: string;
      file: File;
      preview: string;
    };
type Draft = Reference & { preview: string | null };
const envelope = (payload: unknown) =>
  JSON.stringify({
    payload,
    operationKey: crypto.randomUUID(),
    correlationId: crypto.randomUUID(),
  });
export function MeasurementPhotoImage({
  src,
  label,
  revoked = false,
  onUnavailable,
  onAvailable,
}: {
  src: string;
  label: string;
  revoked?: boolean;
  onUnavailable?: () => void;
  onAvailable?: () => void;
}) {
  const [failed, setFailed] = useState(false);
  const image = useRef<HTMLImageElement>(null);
  useEffect(() => {
    if (revoked || failed || !image.current?.complete) return;
    if (image.current.naturalWidth > 0) onAvailable?.();
    else {
      setFailed(true);
      onUnavailable?.();
    }
  }, [revoked, failed, onAvailable, onUnavailable]);
  return revoked || failed ? (
    <div className="flex flex-col items-start gap-2">
      <p>{revoked ? "Photo access revoked" : `${label} is unavailable`}</p>
      {!revoked ? (
        <Button
          type="button"
          variant="outline"
          onClick={() => setFailed(false)}
        >
          Retry reference photo
        </Button>
      ) : null}
    </div>
  ) : (
    // biome-ignore lint/performance/noImgElement: Private photo bytes require current authority and bypass image optimization.
    <img
      ref={image}
      src={src}
      alt={label}
      className="max-h-64 max-w-full rounded-md object-contain"
      onLoad={() => onAvailable?.()}
      onError={() => {
        setFailed(true);
        onUnavailable?.();
      }}
    />
  );
}
export function MeasurementPhotoDraft({
  initial,
  api,
  ownerApi,
  profileId,
  versionId,
  canManage,
  disabled,
  getIntent,
  onChange,
  onState,
  onDenied,
  onRestart,
}: {
  initial: Projection;
  api: string;
  ownerApi: string;
  profileId: string | null;
  versionId: string | null;
  canManage: boolean;
  disabled: boolean;
  getIntent: () => Begin;
  onChange: (change: ReturnType<typeof c.measurementPhotoChange.parse>) => void;
  onState: (state: PhotoDraftState) => void;
  onDenied: () => void;
  onRestart: () => void;
}) {
  const [items, setItems] = useState<Draft[]>(() =>
      initial.kind === "available"
        ? initial.items
            .filter((item) => !item.revoked)
            .map(({ fileId, note }) => ({ fileId, note, preview: null }))
        : [],
    ),
    [file, setFile] = useState<File | null>(null),
    [preview, setPreview] = useState<string | null>(null),
    [phase, setPhase] = useState<
      { kind: "idle" } | { kind: "working" | "uncertain"; work: Work }
    >({ kind: "idle" }),
    [message, setMessage] = useState("");
  const urls = useRef(new Set<string>()),
    mounted = useRef(true),
    input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      for (const url of urls.current) URL.revokeObjectURL(url);
      urls.current.clear();
    };
  }, []);
  useEffect(() => {
    onState(
      phase.kind === "working"
        ? "working"
        : phase.kind === "uncertain"
          ? "uncertain"
          : file
            ? "draft"
            : "idle",
    );
  }, [phase.kind, file, onState]);
  const publish = (next: Draft[], reservationId: string | null) => {
    setItems(next);
    onChange({
      kind: "replace",
      reservationId,
      items: next.map(({ fileId, note }) => ({ fileId, note })),
    });
  };
  const reservation = useRef<string | null>(null);
  const perform = async (start: Work) => {
    let work = start;
    setPhase({ kind: "working", work });
    setMessage("");
    try {
      if (work.step === "begin") {
        const result = await measurementRequest(
          `${api}/commands/measurement-photo.begin`,
          measurementPhotoResponse,
          { bytes: work.bytes },
        );
        if (result.result.kind !== "photo-staged")
          throw Error("Unexpected photo result");
        work = {
          step: "upload",
          fileId: result.result.fileId,
          reservationId: result.result.reservationId,
          file: work.file,
          preview: work.preview,
        };
        if (!mounted.current) return;
        setPhase({ kind: "working", work });
      }
      const response = await fetch(`${api}/photos/uploads/${work.fileId}`, {
        method: "PUT",
        headers: { "Content-Type": work.file.type },
        body: work.file,
        cache: "no-store",
        signal: AbortSignal.timeout(20000),
      });
      const raw: unknown = await response.json();
      if (!response.ok) {
        const error = c.measurementErrorResponse.safeParse(raw);
        throw new MeasurementRequestError(
          error.success ? error.data.message : "Photo upload is unavailable",
          error.success ? error.data.code : "temporary",
        );
      }
      measurementPhotoUploadResult.parse(raw);
      if (!mounted.current) return;
      reservation.current = work.reservationId;
      publish(
        [...items, { fileId: work.fileId, note: null, preview: work.preview }],
        work.reservationId,
      );
      setFile(null);
      setPreview(null);
      if (input.current) input.current.value = "";
      setPhase({ kind: "idle" });
      setMessage(
        "Reference uploaded to this unsaved draft. Save the measurement version to attach it.",
      );
    } catch (error) {
      if (!mounted.current) return;
      if (measurementDenied(error)) {
        onDenied();
        return;
      }
      const uncertain =
        !(error instanceof MeasurementRequestError) ||
        ["temporary", "busy"].includes(error.code);
      setPhase(uncertain ? { kind: "uncertain", work } : { kind: "idle" });
      setMessage(
        uncertain
          ? "The photo upload may have completed. Retry the exact upload before saving."
          : measurementMessage(error),
      );
    }
  };
  if (initial.kind === "restricted")
    return (
      <Card id="measurement-photos" tabIndex={-1}>
        <CardHeader>
          <CardTitle>
            <h2>Reference photos</h2>
          </CardTitle>
          <CardDescription>
            Reference photos are restricted. Existing live references are
            retained when you save scalar measurements.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  return (
    <Card id="measurement-photos" tabIndex={-1}>
      <CardHeader>
        <CardTitle>
          <h2>Reference photos</h2>
        </CardTitle>
        <CardDescription>
          Up to five private JPEG or PNG images, each up to 5 MiB and 12 million
          pixels. Uploads stay unsaved until the measurement version is saved.
          Removing a reference preserves saved history.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex min-w-0 flex-col gap-4">
        <div className="grid min-w-0 gap-5 sm:grid-cols-2">
          {items.map((item, index) => (
            <div className="flex min-w-0 flex-col gap-3" key={item.fileId}>
              <MeasurementPhotoImage
                src={
                  item.preview ??
                  `${ownerApi}/${profileId}/versions/${versionId}/photos/${item.fileId}`
                }
                label={`Reference photo ${index + 1}`}
              />
              {canManage ? (
                <FieldGroup>
                  <Field>
                    <FieldLabel htmlFor={`reference-note-${item.fileId}`}>
                      Reference photo {index + 1} note
                    </FieldLabel>
                    <Input
                      id={`reference-note-${item.fileId}`}
                      value={item.note ?? ""}
                      disabled={disabled || phase.kind !== "idle"}
                      onChange={(event) =>
                        publish(
                          items.map((p) =>
                            p.fileId === item.fileId
                              ? { ...p, note: event.target.value || null }
                              : p,
                          ),
                          reservation.current,
                        )
                      }
                    />
                  </Field>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={disabled || phase.kind !== "idle"}
                    onClick={() => {
                      publish(
                        items.filter((p) => p.fileId !== item.fileId),
                        reservation.current,
                      );
                      if (item.preview) {
                        URL.revokeObjectURL(item.preview);
                        urls.current.delete(item.preview);
                      }
                    }}
                  >
                    Remove reference photo {index + 1} from draft
                  </Button>
                </FieldGroup>
              ) : item.note ? (
                <p>{item.note}</p>
              ) : null}
            </div>
          ))}
        </div>
        {items.length === 0 ? <p>No reference photos in this draft.</p> : null}
        {canManage ? (
          <>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="measurement-photo-file">
                  Choose reference photo
                </FieldLabel>
                <Input
                  ref={input}
                  id="measurement-photo-file"
                  type="file"
                  accept="image/jpeg,image/png"
                  disabled={
                    disabled ||
                    phase.kind !== "idle" ||
                    items.length >= c.MEASUREMENT_MAX_PHOTOS
                  }
                  onChange={(event) => {
                    const next = event.target.files?.[0];
                    if (!next) return;
                    if (
                      !["image/jpeg", "image/png"].includes(next.type) ||
                      next.size > PRIVATE_IMAGE_MAX_BYTES ||
                      next.size === 0
                    ) {
                      setMessage("Choose a JPEG or PNG image up to 5 MiB.");
                      event.target.value = "";
                      return;
                    }
                    if (preview) {
                      URL.revokeObjectURL(preview);
                      urls.current.delete(preview);
                    }
                    const url = URL.createObjectURL(next);
                    urls.current.add(url);
                    setFile(next);
                    setPreview(url);
                    setMessage("");
                  }}
                />
              </Field>
            </FieldGroup>
            {preview ? (
              <MeasurementPhotoImage
                src={preview}
                label="Selected unsaved reference photo"
              />
            ) : null}
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={
                  phase.kind === "working" ||
                  (!file && phase.kind !== "uncertain") ||
                  (disabled && phase.kind !== "uncertain")
                }
                onClick={() => {
                  if (phase.kind === "uncertain") {
                    void perform(phase.work);
                    return;
                  }
                  if (file && preview)
                    void perform({
                      step: "begin",
                      bytes: envelope(getIntent()),
                      file,
                      preview,
                    });
                }}
              >
                {phase.kind === "working"
                  ? "Uploading reference photo…"
                  : phase.kind === "uncertain"
                    ? "Retry exact photo upload"
                    : "Upload reference to draft"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                disabled={
                  phase.kind === "working" ||
                  (disabled && phase.kind !== "uncertain")
                }
                onClick={onRestart}
              >
                Discard photo changes and restart
              </Button>
            </div>
          </>
        ) : null}
        {message ? (
          <Alert>
            <AlertDescription role="status">{message}</AlertDescription>
          </Alert>
        ) : null}
      </CardContent>
    </Card>
  );
}
export function MeasurementPhotoGallery({
  photos,
  api,
  owner,
  profileId,
  versionId,
  canManage,
  onDenied,
}: {
  photos: Projection;
  api: string;
  owner: ReturnType<typeof c.measurementContext.parse>;
  profileId: string;
  versionId: string;
  canManage: boolean;
  onDenied: () => void;
}) {
  if (photos.kind === "restricted") return null;
  const ownerApi = `${api}/${owner.customerId}/${owner.wearerId}`;
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h2>Saved reference photos</h2>
        </CardTitle>
        <CardDescription>
          These references belong to this exact version. Revocation removes
          access across every version and keeps a historical record.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid min-w-0 gap-5 sm:grid-cols-2">
        {photos.items.length === 0 ? (
          <p>No reference photos were saved with this version.</p>
        ) : (
          photos.items.map((photo, index) => (
            <SavedPhoto
              key={photo.fileId}
              photo={photo}
              index={index}
              src={`${ownerApi}/${profileId}/versions/${versionId}/photos/${photo.fileId}`}
              api={api}
              owner={owner}
              profileId={profileId}
              canManage={canManage}
              onDenied={onDenied}
            />
          ))
        )}
      </CardContent>
    </Card>
  );
}
function SavedPhoto({
  photo,
  index,
  src,
  api,
  owner,
  profileId,
  canManage,
  onDenied,
}: {
  photo: Reference & { revoked: boolean };
  index: number;
  src: string;
  api: string;
  owner: ReturnType<typeof c.measurementContext.parse>;
  profileId: string;
  canManage: boolean;
  onDenied: () => void;
}) {
  const [unavailable, setUnavailable] = useState(false);
  const [revoked, setRevoked] = useState(photo.revoked),
    [reason, setReason] = useState(""),
    [state, setState] = useState<
      { kind: "idle" } | { kind: "working" | "uncertain"; bytes: string }
    >({ kind: "idle" }),
    [message, setMessage] = useState("");
  useLeaveProtection({
    active: state.kind !== "idle",
    uncertain: state.kind === "uncertain",
    locked: state.kind === "working",
    noun: "photo revocation",
  });
  const revoke = async (bytes: string) => {
    setState({ kind: "working", bytes });
    try {
      await measurementRequest(
        `${api}/commands/measurement-photo.revoke`,
        measurementPhotoResponse,
        { bytes },
      );
      setRevoked(true);
      setState({ kind: "idle" });
      setMessage("Photo access revoked across all measurement versions.");
    } catch (error) {
      if (measurementDenied(error)) {
        onDenied();
        return;
      }
      setState(
        !(error instanceof MeasurementRequestError) ||
          ["temporary", "busy"].includes(error.code)
          ? { kind: "uncertain", bytes }
          : { kind: "idle" },
      );
      setMessage(measurementMessage(error));
    }
  };
  return (
    <div className="flex min-w-0 flex-col gap-3">
      <MeasurementPhotoImage
        src={src}
        label={`Saved reference photo ${index + 1}`}
        revoked={revoked}
        onUnavailable={() => setUnavailable(true)}
        onAvailable={() => setUnavailable(false)}
      />
      {photo.note && !unavailable ? (
        <p className="break-words">{photo.note}</p>
      ) : null}
      {canManage && !revoked && !unavailable ? (
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor={`revoke-reason-${photo.fileId}`}>
              Reason to revoke reference photo {index + 1}
            </FieldLabel>
            <Input
              id={`revoke-reason-${photo.fileId}`}
              value={reason}
              disabled={state.kind !== "idle"}
              onChange={(event) => setReason(event.target.value)}
            />
          </Field>
          <Button
            type="button"
            variant="outline"
            disabled={
              state.kind === "working" ||
              (!reason.trim() && state.kind !== "uncertain")
            }
            onClick={() =>
              void revoke(
                state.kind === "uncertain"
                  ? state.bytes
                  : envelope({
                      customerId: owner.customerId,
                      wearerId: owner.wearerId,
                      profileId,
                      fileId: photo.fileId,
                      reason,
                    }),
              )
            }
          >
            {state.kind === "uncertain"
              ? "Retry exact photo revocation"
              : "Revoke photo access"}
          </Button>
        </FieldGroup>
      ) : null}
      {message ? (
        <Alert>
          <AlertDescription role="status">{message}</AlertDescription>
        </Alert>
      ) : null}
    </div>
  );
}
