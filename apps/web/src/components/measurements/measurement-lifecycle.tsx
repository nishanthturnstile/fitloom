"use client";
import * as c from "@fitloom/application/measurement-contracts";
import { useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  useLeaveProtection,
  useNavigationGuard,
} from "@/components/workspace/navigation-guard";
import {
  MeasurementRequestError,
  measurementDenied,
  measurementMessage,
  measurementRequest,
} from "./measurement-client";
export function MeasurementLifecycle({
  data,
  api,
  onDenied,
}: {
  data: ReturnType<typeof c.measurementDetail.parse>;
  api: string;
  onDenied: () => void;
}) {
  const [state, setState] = useState<
      { kind: "idle" } | { kind: "saving" | "uncertain"; bytes: string }
    >({ kind: "idle" }),
    [message, setMessage] = useState("");
  const guard = useNavigationGuard();
  useLeaveProtection({
    active: state.kind !== "idle",
    uncertain: state.kind === "uncertain",
    locked: state.kind === "saving",
    noun: "measurement lifecycle",
  });
  const archived = data.archivedAt !== null;
  const perform = async (bytes: string) => {
    setState({ kind: "saving", bytes });
    try {
      await measurementRequest(
        `${api.slice(0, api.lastIndexOf(`/${data.customerId}/${data.wearerId}`))}/commands/${archived ? "measurement.restore" : "measurement.archive"}`,
        c.measurementSaveResponse,
        { bytes },
      );
      guard.commitReload();
    } catch (error) {
      if (measurementDenied(error)) {
        onDenied();
        return;
      }
      if (
        !(error instanceof MeasurementRequestError) ||
        error.code === "temporary"
      ) {
        setState({ kind: "uncertain", bytes });
        setMessage(
          "The lifecycle change may have completed. Retry the exact operation.",
        );
      } else {
        setState({ kind: "idle" });
        setMessage(measurementMessage(error));
      }
    }
  };
  return (
    <div className="flex flex-col items-start gap-3">
      <Button
        variant="outline"
        disabled={state.kind === "saving"}
        onClick={() => {
          if (state.kind === "uncertain") {
            void perform(state.bytes);
            return;
          }
          void perform(
            JSON.stringify({
              payload: {
                customerId: data.customerId,
                wearerId: data.wearerId,
                profileId: data.profileId,
                expectedRevision: data.revision,
              },
              operationKey: crypto.randomUUID(),
              correlationId: crypto.randomUUID(),
            }),
          );
        }}
      >
        {state.kind === "uncertain"
          ? "Retry exact lifecycle change"
          : archived
            ? "Restore profile"
            : "Archive profile"}
      </Button>
      {message ? (
        <Alert>
          <AlertDescription role="status">{message}</AlertDescription>
        </Alert>
      ) : null}
    </div>
  );
}
