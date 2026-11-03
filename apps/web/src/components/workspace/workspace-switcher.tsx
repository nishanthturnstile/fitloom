"use client";
import type { WorkspaceChoice } from "@fitloom/application/workspace-contracts";
import { workspaceSwitchResponse } from "@fitloom/application/workspace-contracts";
import { usePathname, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Field, FieldLabel } from "@/components/ui/field";
import { clearCustomerReturns } from "./customer-return-session";
import { useNavigationGuard } from "./navigation-guard";
import { workspaceRoute } from "./workspace-route-policy";

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
  const pathname = usePathname(),
    query = useSearchParams();
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
            const select = event.currentTarget,
              value = select.value;
            if (!guard.confirmLeave("switch")) {
              select.value = selected;
              return;
            }
            setBusy(true);
            setError("");
            const [tenantId, locationId] = value.split("/");
            try {
              const result = await fetch("/api/workspaces/switch", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                signal: AbortSignal.timeout(15000),
                body: JSON.stringify({
                  operationKey: crypto.randomUUID(),
                  correlationId: crypto.randomUUID(),
                  locale,
                  target: { tenantId, locationId },
                  destination: workspaceRoute(
                    `/workspaces/${selected}`,
                    pathname,
                    query,
                  ).destination,
                }),
              });
              if (
                !result.ok ||
                !result.headers
                  .get("content-type")
                  ?.includes("application/json")
              )
                throw new Error(
                  "Workspace switch failed. Your access may have changed. Try again or browse authorized workspaces.",
                );
              const response = workspaceSwitchResponse.parse(
                await result.json(),
              );
              const base = `/workspaces/${value}`;
              if (
                response.destination !== base &&
                !response.destination.startsWith(`${base}/`)
              )
                throw new Error("Invalid workspace destination");
              clearCustomerReturns(true);
              guard.commitNavigation(response.destination);
            } catch {
              select.value = selected;
              setError(
                "Workspace switch failed. Your access may have changed. Try again or browse authorized workspaces.",
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
