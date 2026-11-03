"use client";
import type { WorkspaceChoice } from "@fitloom/application/workspace-contracts";
import { useState } from "react";
export function WorkspaceSelection({
  choices,
  locale,
  selected,
}: {
  choices: WorkspaceChoice[];
  locale: string;
  selected: { tenantId: string | null; locationId: string | null } | null;
}) {
  const [notice, setNotice] = useState("");
  return (
    <>
      <div className="workspace-list">
        {choices.map((choice) => (
          <button
            className="workspace-choice"
            key={`${choice.tenantId}:${choice.locationId}`}
            type="button"
            onClick={async () => {
              setNotice("");
              const response = await fetch("/api/preferences", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  operationKey: crypto.randomUUID(),
                  correlationId: crypto.randomUUID(),
                  payload: {
                    locale,
                    tenantId: choice.tenantId,
                    locationId: choice.locationId,
                  },
                }),
              });
              if (response.ok)
                window.location.assign(
                  `/workspaces/${choice.tenantId}/${choice.locationId}`,
                );
              else
                setNotice(
                  "That workspace is unavailable. Reload to see your current access.",
                );
            }}
          >
            <span>{choice.shopName}</span>
            <small>
              {choice.locationName}
              {choice.tenantId === selected?.tenantId &&
              choice.locationId === selected.locationId
                ? " · Last used"
                : ""}
            </small>
            <span aria-hidden>↗</span>
          </button>
        ))}
      </div>
      <p role="status">{notice}</p>
    </>
  );
}
