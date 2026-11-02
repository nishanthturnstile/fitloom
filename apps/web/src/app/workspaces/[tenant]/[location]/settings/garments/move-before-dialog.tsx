"use client";
import { useEffect, useRef, useState } from "react";
import {
  type Page,
  pageSchema,
  type Row,
  resource,
  response,
} from "./master-client";
export function MoveBeforeDialog({
  base,
  kind,
  row,
  onClose,
  onChoose,
}: {
  base: string;
  kind: "garment" | "service" | "addon";
  row: Row;
  onClose: () => void;
  onChoose: (id: string) => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const restore = useRef<HTMLElement | null>(null);
  const [search, setSearch] = useState(""),
    [page, setPage] = useState<Page | null>(null),
    [error, setError] = useState("");
  async function find(offset = 0) {
    try {
      setPage(
        await response(
          fetch(
            `${base}/${resource(kind)}?${new URLSearchParams({ search, offset: String(offset), active: "all", visibility: "all" })}`,
          ),
          pageSchema(kind),
        ),
      );
      setError("");
    } catch {
      setError("The destination list could not be reached. Try again.");
    }
  }
  useEffect(() => {
    restore.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    ref.current?.showModal();
    let active = true;
    response(
      fetch(`${base}/${resource(kind)}?active=all&visibility=all`),
      pageSchema(kind),
    )
      .then((page) => {
        if (active) setPage(page);
      })
      .catch(() => {
        if (active)
          setError("The destination list could not be reached. Try again.");
      });
    return () => {
      active = false;
      restore.current?.focus();
    };
  }, [base, kind]);
  return (
    <dialog
      ref={ref}
      className="master-dialog"
      aria-labelledby="move-before-title"
      aria-describedby="move-before-help"
      onCancel={onClose}
    >
      <h2 id="move-before-title">Move {row.label} before…</h2>
      <p id="move-before-help">
        Choose the record that should follow the moved item. Search refreshes
        the destination list.
      </p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void find();
        }}
      >
        <label className="master-control">
          <span>Find destination by name prefix</span>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            maxLength={100}
          />
        </label>
        <button type="submit">Find destination</button>
      </form>
      {error && <p role="alert">{error}</p>}
      <ul>
        {page?.items.map((item) => (
          <li key={item.id}>
            <button
              type="button"
              disabled={item.id === row.id}
              onClick={() => onChoose(item.id)}
            >
              {item.label}
            </button>
          </li>
        ))}
      </ul>
      <div className="master-actions">
        <button
          type="button"
          disabled={!page?.nextOffset}
          onClick={() => void find(page?.nextOffset ?? 0)}
        >
          Next destinations
        </button>
        <button type="button" onClick={onClose}>
          Close
        </button>
      </div>
    </dialog>
  );
}
