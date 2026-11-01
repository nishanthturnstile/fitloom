"use client";
import {
  type PrivateFileSummary,
  privateFileCommandResponse,
  privateFileList,
  privateFilePage,
  privateFileResult,
  type WorkspaceView,
} from "@fitloom/application/workspace-contracts";
import { type FormEvent, useId, useRef, useState } from "react";
export function PrivateFiles({
  workspace,
  files: initialFiles,
  total: initialTotal,
  next: initialNext,
}: {
  workspace: WorkspaceView;
  files: PrivateFileSummary[];
  total: number;
  next: number | null;
}) {
  const [files, setFiles] = useState(initialFiles),
    [busy, setBusy] = useState(false),
    [notice, setNotice] = useState("");
  const [total, setTotal] = useState(initialTotal),
    [next, setNext] = useState(initialNext);
  const inputId = useId();
  const pending = useRef<{
    beginKey: string;
    attachKey: string;
    id: string | null;
    version: number | null;
  } | null>(null);
  const retireKeys = useRef(new Map<string, string>());
  const base = `/api/workspaces/${workspace.tenantId}/${workspace.locationId}`;
  const canManage = workspace.permissions.includes("files.manage");
  async function request(path: string, init: RequestInit = {}) {
    const response = await fetch(path, {
      ...init,
      signal: AbortSignal.timeout(30000),
    });
    const data: unknown = await response.json();
    if (!response.ok)
      throw new Error(
        typeof data === "object" &&
          data !== null &&
          "message" in data &&
          typeof data.message === "string"
          ? data.message
          : "File action unavailable",
      );
    return data;
  }
  const command = (path: string, payload: unknown, operationKey: string) =>
    request(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        operationKey,
        correlationId: crypto.randomUUID(),
        payload,
      }),
    });
  async function load(offset = 0) {
    const response = await fetch(`${base}/files?offset=${offset}`, {
      signal: AbortSignal.timeout(15000),
    });
    if (!response.ok)
      throw new Error("Files unavailable; your access may have changed");
    return privateFilePage.parse({
      items: privateFileList.parse(await response.json()),
      total: Number(response.headers.get("X-Total-Count")),
      nextOffset: response.headers.has("X-Next-Offset")
        ? Number(response.headers.get("X-Next-Offset"))
        : null,
    });
  }
  async function reload() {
    const page = await load();
    setFiles(page.items);
    setTotal(page.total);
    setNext(page.nextOffset);
  }
  async function more() {
    if (next === null) return;
    setBusy(true);
    setNotice("");
    try {
      const page = await load(next);
      setFiles((previous) => [
        ...new Map(
          [...previous, ...page.items].map((row) => [row.id, row]),
        ).values(),
      ]);
      setTotal(page.total);
      setNext(page.nextOffset);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Files unavailable");
    } finally {
      setBusy(false);
    }
  }
  async function upload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const file = new FormData(form).get("image");
    if (!(file instanceof File) || !file.size) {
      setNotice("Choose a JPEG or PNG image.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setNotice("Choose an image smaller than 5 MiB.");
      return;
    }
    setBusy(true);
    setNotice("Validating and uploading your image…");
    try {
      pending.current ??= {
        beginKey: crypto.randomUUID(),
        attachKey: crypto.randomUUID(),
        id: null,
        version: null,
      };
      const attempt = pending.current;
      if (!attempt.id)
        attempt.id = privateFileCommandResponse.parse(
          await command(`${base}/files`, {}, attempt.beginKey),
        ).result.id;
      if (attempt.version === null) {
        const uploaded = privateFileResult.parse(
          await request(`${base}/files/${attempt.id}`, {
            method: "PUT",
            headers: { "Content-Type": file.type },
            body: file,
          }),
        );
        attempt.version = uploaded.version;
      }
      await command(
        `${base}/actions/attach-file`,
        { fileId: attempt.id, expectedVersion: attempt.version },
        attempt.attachKey,
      );
      pending.current = null;
      form.reset();
      setNotice("Your private image is ready.");
      await reload().catch(() =>
        setNotice("Your image is ready. Refresh the page to update the list."),
      );
    } catch (error) {
      setNotice(
        `${error instanceof Error ? error.message : "Upload interrupted"}. You can retry the upload.`,
      );
    } finally {
      setBusy(false);
    }
  }
  async function retire(file: PrivateFileSummary) {
    setBusy(true);
    setNotice("");
    try {
      const key = retireKeys.current.get(file.id) ?? crypto.randomUUID();
      retireKeys.current.set(file.id, key);
      await command(
        `${base}/actions/retire-file`,
        { fileId: file.id, expectedVersion: file.version },
        key,
      );
      await reload();
      setNotice("Image retired. It is no longer available for download.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Try again");
    } finally {
      setBusy(false);
    }
  }
  return (
    <section
      className="account-card private-files"
      aria-labelledby={`${inputId}-title`}
    >
      <div className="private-files-heading">
        <div>
          <p className="account-eyebrow">SHOP REFERENCE IMAGES</p>
          <h2 id={`${inputId}-title`}>Private files</h2>
        </div>
        <span>
          {files.length} of {total} {total === 1 ? "image" : "images"}
        </span>
      </div>
      <p>
        Only people with file access in this shop can download these images.
      </p>
      {canManage ? (
        <form onSubmit={upload}>
          <label htmlFor={inputId}>
            Add a private image <span>JPEG or PNG · up to 5 MiB</span>
          </label>
          <div className="private-files-upload">
            <input
              id={inputId}
              name="image"
              type="file"
              accept="image/jpeg,image/png"
              required
              disabled={busy}
              onChange={() => {
                pending.current = null;
                setNotice("");
              }}
            />
            <button type="submit" disabled={busy}>
              {busy ? "Working…" : "Upload private image"}
            </button>
          </div>
        </form>
      ) : null}
      {notice ? (
        <p className="account-notice" role="status">
          {notice}
        </p>
      ) : null}
      {next !== null ? (
        <button
          className="account-secondary"
          type="button"
          disabled={busy}
          onClick={() => void more()}
        >
          Load older images
        </button>
      ) : null}
      {files.length ? (
        <ul className="private-file-list">
          {files.map((file, index) => (
            <li key={file.id}>
              <div>
                <strong>Reference image {index + 1}</strong>
                <span>
                  {file.mediaType === "image/png" ? "PNG" : "JPEG"} ·{" "}
                  {Math.ceil(file.size / 1024)} KiB ·{" "}
                  <time dateTime={file.createdAt}>
                    {file.createdAt.slice(0, 10)}
                  </time>
                </span>
              </div>
              <div className="private-file-actions">
                <a href={`${base}/files/${file.id}`} download>
                  Download
                </a>
                {canManage ? (
                  <button
                    className="account-secondary"
                    type="button"
                    disabled={busy}
                    onClick={() => void retire(file)}
                  >
                    Retire
                  </button>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="private-files-empty">
          Keep your shop’s reference images together. Uploaded images appear
          here once ready.
        </p>
      )}
    </section>
  );
}
