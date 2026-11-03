"use client";
import { customerErrorResponse } from "@fitloom/application/customer-contracts";
import {
  type PhotoOwner,
  photoCommandResponse,
  photoSlot,
  photoUploadResult,
} from "@fitloom/application/customer-photo-contracts";
import Image from "next/image";
import {
  type Dispatch,
  type SetStateAction,
  useEffect,
  useRef,
  useState,
} from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { useNavigationGuard } from "@/components/workspace/navigation-guard";
export type PhotoProtection = {
  active: boolean;
  uncertain: boolean;
  saving: boolean;
};
type Upload = { file: File; note: string; expectedVersion: number };
type Work =
  | ({ step: "begin"; bytes: string } & Upload)
  | ({ step: "upload"; fileId: string } & Upload)
  | { step: "bind" | "remove"; bytes: string };
type State =
  | { kind: "idle" }
  | { kind: "working" | "uncertain" | "blocked"; work: Work };
class PhotoFailure extends Error {
  readonly code: string;
  constructor(message: string, code: string) {
    super(message);
    this.code = code;
  }
}
async function json(response: Response) {
  if (!response.headers.get("content-type")?.includes("application/json"))
    throw new PhotoFailure("Photo service is unavailable.", "temporary");
  const raw: unknown = await response.json();
  if (!response.ok) {
    const e = customerErrorResponse.safeParse(raw);
    throw new PhotoFailure(
      e.success
        ? `${e.data.message} Reference: ${e.data.correlationId}`
        : "Photo service is unavailable.",
      e.success ? e.data.code : "temporary",
    );
  }
  return raw;
}
const envelope = (payload: unknown) =>
  JSON.stringify({
    operationKey: crypto.randomUUID(),
    correlationId: crypto.randomUUID(),
    payload,
  });
export function CustomerPhotoEditor({
  base,
  owner,
  canManage,
  onProtection,
}: {
  base: string;
  owner: PhotoOwner;
  canManage: boolean;
  onProtection: Dispatch<SetStateAction<PhotoProtection>>;
}) {
  const fileInput = useRef<HTMLInputElement>(null);
  const api = `${base.replace("/workspaces/", "/api/workspaces/")}/customers/photos`,
    guard = useNavigationGuard();
  const [slot, setSlot] = useState<ReturnType<typeof photoSlot.parse> | null>(
      null,
    ),
    [readError, setReadError] = useState(""),
    [file, setFile] = useState<File | null>(null),
    [preview, setPreview] = useState<string | null>(null),
    [note, setNote] = useState(""),
    [message, setMessage] = useState(""),
    [state, setState] = useState<State>({ kind: "idle" }),
    [denied, setDenied] = useState(false),
    [failedImage, setFailedImage] = useState(false);
  const saving = state.kind === "working",
    uncertain = state.kind === "uncertain" || state.kind === "blocked",
    dirty = file !== null || note !== "";
  useEffect(() => {
    onProtection({ active: dirty || state.kind !== "idle", uncertain, saving });
  }, [dirty, state.kind, uncertain, saving, onProtection]);
  useEffect(
    () => () =>
      onProtection({ active: false, uncertain: false, saving: false }),
    [onProtection],
  );
  useEffect(() => {
    const controller = new AbortController();
    void (async () => {
      try {
        const response = await fetch(`${api}/slot`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(owner),
          signal: AbortSignal.any([
            controller.signal,
            AbortSignal.timeout(15000),
          ]),
          cache: "no-store",
        });
        const parsed = photoSlot.parse(await json(response));
        if (!controller.signal.aborted) setSlot(parsed);
      } catch (error) {
        if (!controller.signal.aborted) {
          setReadError(
            error instanceof PhotoFailure
              ? error.message
              : "Photo is unavailable. Close and reopen to retry.",
          );
          if (
            error instanceof PhotoFailure &&
            (error.code === "denied" || error.code === "session-expired")
          )
            setDenied(true);
        }
      }
    })();
    return () => controller.abort();
  }, [api, owner]);
  useEffect(() => {
    if (!file) {
      setPreview(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);
  async function execute(start: Work) {
    let work = start;
    setState({ kind: "working", work });
    setMessage("");
    try {
      if (work.step === "begin") {
        const response = await fetch(`${api}/commands/begin`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: work.bytes,
          signal: AbortSignal.timeout(15000),
        });
        const body = photoCommandResponse.parse(await json(response));
        if (body.result.kind !== "staged") throw Error();
        work = {
          step: "upload",
          fileId: body.result.fileId,
          file: work.file,
          note: work.note,
          expectedVersion: work.expectedVersion,
        };
        setState({ kind: "working", work });
      }
      if (work.step === "upload") {
        const uploaded = photoUploadResult.parse(
          await json(
            await fetch(`${api}/uploads/${work.fileId}`, {
              method: "PUT",
              headers: { "Content-Type": work.file.type },
              body: work.file,
              signal: AbortSignal.timeout(20000),
            }),
          ),
        );
        work = {
          step: "bind",
          bytes: envelope({
            owner,
            fileId: work.fileId,
            fileVersion: uploaded.version,
            expectedVersion: work.expectedVersion,
            note: work.note,
          }),
        };
        setState({ kind: "working", work });
      }
      if (work.step === "bind" || work.step === "remove") {
        const body = photoCommandResponse.parse(
          await json(
            await fetch(`${api}/commands/${work.step}`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: work.bytes,
              signal: AbortSignal.timeout(15000),
            }),
          ),
        );
        if (body.result.kind !== "photo-saved") throw Error();
        const url = new URL(location.href);
        url.searchParams.set("saved", body.result.changed ? "1" : "unchanged");
        history.replaceState(
          history.state,
          "",
          `${url.pathname}${url.search}${url.hash}`,
        );
        guard.commitReload();
      }
    } catch (error) {
      if (error instanceof PhotoFailure) {
        if (error.code === "denied" || error.code === "session-expired") {
          setDenied(true);
          setState({ kind: "blocked", work });
        } else if (
          !["temporary", "busy", "rate-limit", "invalid-response"].includes(
            error.code,
          )
        ) {
          setState({ kind: "idle" });
          setMessage(
            `${error.message} The saved photo is unchanged. Close and reopen if its version changed.`,
          );
          return;
        } else setState({ kind: "uncertain", work });
        setMessage(error.message);
      } else {
        setState({ kind: "uncertain", work });
        setMessage(
          "The outcome is unknown. Retry the same photo action to recover it.",
        );
      }
    }
  }
  const label =
    owner.kind === "customer-avatar"
      ? "Customer avatar"
      : `${owner.role} photo`;
  return (
    <div className="flex min-w-0 flex-col gap-5">
      {readError && (
        <Alert>
          <AlertDescription>{readError}</AlertDescription>
        </Alert>
      )}
      {message && (
        <Alert>
          <AlertDescription>{message}</AlertDescription>
        </Alert>
      )}
      {slot === null && !readError && <p role="status">Loading photo…</p>}
      {slot && (
        <section aria-label="Saved photo" className="flex flex-col gap-3">
          <h3 className="font-medium">Saved {label.toLowerCase()}</h3>
          {slot.photo && !failedImage ? (
            <Image
              unoptimized
              width={512}
              height={512}
              className="max-h-64 w-full object-contain"
              src={`${api}/files/${slot.photo.fileId}`}
              alt={label}
              onError={() => setFailedImage(true)}
            />
          ) : (
            <p>
              {slot.photo
                ? "Photo unavailable. Your access may have changed."
                : "No photo saved."}
            </p>
          )}
          {slot.photo && (
            <p className="whitespace-pre-wrap break-words text-sm text-muted-foreground">
              Permission/provenance: {slot.photo.note}
            </p>
          )}
        </section>
      )}
      {canManage && !denied && slot && (
        <fieldset disabled={saving || uncertain}>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="customer-photo-file">
                Choose JPEG or PNG
              </FieldLabel>
              <input
                ref={fileInput}
                id="customer-photo-file"
                type="file"
                accept="image/jpeg,image/png"
                onChange={(event) => {
                  const selected = event.target.files?.[0];
                  if (!selected) {
                    setFile(null);
                    return;
                  }
                  if (
                    !["image/jpeg", "image/png"].includes(selected.type) ||
                    selected.size > 5242880
                  ) {
                    setMessage("Choose JPEG or PNG up to 5 MiB.");
                    event.target.value = "";
                    setFile(null);
                    return;
                  }
                  setFile(selected);
                  setMessage("");
                }}
              />
            </Field>
            {preview && (
              <figure>
                <Image
                  unoptimized
                  width={512}
                  height={512}
                  className="max-h-64 w-full object-contain"
                  src={preview}
                  alt={`Selected ${label.toLowerCase()} preview`}
                />
                <figcaption className="text-sm text-muted-foreground">
                  Preview only. The saved photo stays until this replacement
                  succeeds.
                </figcaption>
              </figure>
            )}
            <Field>
              <FieldLabel htmlFor="customer-photo-note">
                Permission or provenance note
              </FieldLabel>
              <textarea
                id="customer-photo-note"
                className="customer-filter min-h-24"
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
              <p className="text-sm text-muted-foreground">
                Record who provided permission or where the photo came from.
                This note does not verify legal consent.
              </p>
            </Field>
            <Button
              disabled={!file || !note.trim()}
              onClick={() => {
                if (!file || !slot) return;
                if (Array.from(note.trim()).length > 1000) {
                  setMessage(
                    "Use a provenance note of at most 1000 characters.",
                  );
                  return;
                }
                void execute({
                  step: "begin",
                  bytes: envelope({ owner }),
                  file,
                  note,
                  expectedVersion: slot.version,
                });
              }}
            >
              Save photo
            </Button>
            {slot.photo && (
              <Button
                variant="outline"
                disabled={dirty}
                onClick={() => {
                  if (
                    window.confirm(
                      `Remove this ${label.toLowerCase()}? New reads will be denied; history remains.`,
                    )
                  )
                    void execute({
                      step: "remove",
                      bytes: envelope({ owner, expectedVersion: slot.version }),
                    });
                }}
              >
                Remove photo
              </Button>
            )}
            {dirty && (
              <Button
                variant="ghost"
                onClick={() => {
                  setFile(null);
                  if (fileInput.current) fileInput.current.value = "";
                  setNote("");
                }}
              >
                Discard selected photo
              </Button>
            )}
          </FieldGroup>
        </fieldset>
      )}
      {saving && <p role="status">Saving photo…</p>}
      {(state.kind === "uncertain" || state.kind === "blocked") && (
        <Button
          onClick={() => {
            if (state.kind === "uncertain" || state.kind === "blocked")
              void execute(state.work);
          }}
        >
          Retry photo action
        </Button>
      )}
    </div>
  );
}
