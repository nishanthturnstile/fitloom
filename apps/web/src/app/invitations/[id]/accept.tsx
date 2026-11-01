"use client";
import { useState } from "react";
export function AcceptInvitation({ id }: { id: string }) {
  const [notice, setNotice] = useState("");
  return (
    <>
      <button
        type="button"
        onClick={async () => {
          const response = await fetch(`/api/invitations/${id}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              operationKey: `accept:${id}`,
              correlationId: crypto.randomUUID(),
              payload: {},
            }),
          });
          if (response.ok) window.location.assign("/workspaces");
          else
            setNotice(
              "This invitation is unavailable for your verified email. It may have expired, been revoked, or your access may have changed.",
            );
        }}
      >
        Accept workspace invitation →
      </button>
      <p role="status">{notice}</p>
    </>
  );
}
