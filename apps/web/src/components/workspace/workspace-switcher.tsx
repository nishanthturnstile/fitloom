"use client";
import type { WorkspaceChoice } from "@fitloom/application/workspace-contracts";
import { useState } from "react";
import { Field, FieldLabel } from "@/components/ui/field";
import { useNavigationGuard } from "./navigation-guard";

export function WorkspaceSwitcher({
  choices,
  selected,
  locale,
}: {
  choices: WorkspaceChoice[];
  selected: string;
  locale: string;
}) {
  const guard = useNavigationGuard();
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  return (
    <div className="workspace-switcher">
      <Field data-disabled={busy || guard.locked}>
        <FieldLabel htmlFor="shell-workspace">
          Switch shop or location
        </FieldLabel>
        <select
          id="shell-workspace"
          value={selected}
          disabled={busy || guard.locked}
          aria-describedby={error ? "workspace-switch-error" : undefined}
          onChange={async (event) => {
            const value = event.target.value;
            if (!guard.confirmLeave("switch")) return;
            setBusy(true);
            setError("");
            const [tenantId, locationId] = value.split("/");
            try {
              const result = await fetch("/api/preferences", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                signal: AbortSignal.timeout(15000),
                body: JSON.stringify({
                  operationKey: crypto.randomUUID(),
                  correlationId: crypto.randomUUID(),
                  payload: { locale, tenantId, locationId },
                }),
              });
              if (!result.ok)
                throw new Error(
                  "Workspace switch failed. Your access may have changed. Try again or browse authorized workspaces.",
                );
              const suffix = location.pathname.slice(
                `/workspaces/${selected}`.length,
              );
              guard.commitNavigation(
                `/workspaces/${value}${suffix}${location.search}`,
              );
            } catch (error) {
              setError(
                error instanceof Error
                  ? error.message
                  : "Workspace unavailable. Try again.",
              );
            } finally {
              setBusy(false);
            }
          }}
        >
          {choices.map((choice) => (
            <option
              key={`${choice.tenantId}/${choice.locationId}`}
              value={`${choice.tenantId}/${choice.locationId}`}
            >
              {choice.shopName} · {choice.locationName}
            </option>
          ))}
        </select>
      </Field>
      {error && (
        <p id="workspace-switch-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
