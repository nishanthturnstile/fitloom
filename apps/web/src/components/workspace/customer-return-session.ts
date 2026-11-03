import type { WorkspaceView } from "@fitloom/application/workspace-contracts";
export const CUSTOMER_RETURN_PREFIX = "fitloom.customer-return.v1:";
export type CustomerReturnScope = Pick<
  WorkspaceView,
  "tenantId" | "locationId"
> & { principalId: string };
export function clearCustomerReturns(broadcast = false) {
  if (typeof window === "undefined") return;
  try {
    for (const key of Object.keys(sessionStorage))
      if (key.startsWith(CUSTOMER_RETURN_PREFIX))
        sessionStorage.removeItem(key);
  } catch {
    /* Storage is optional. */
  }
  if (broadcast && typeof BroadcastChannel !== "undefined") {
    try {
      const channel = new BroadcastChannel("fitloom:account");
      channel.postMessage({ type: "context-cleared" });
      channel.close();
    } catch {
      /* Optional cross-tab signalling cannot block sign-in or navigation. */
    }
  }
}
export function ensureCustomerReturnScope(scope: CustomerReturnScope) {
  try {
    const value = JSON.stringify([
        scope.principalId,
        scope.tenantId,
        scope.locationId,
      ]),
      key = `${CUSTOMER_RETURN_PREFIX}scope`;
    if (sessionStorage.getItem(key) !== value) {
      clearCustomerReturns();
      sessionStorage.setItem(key, value);
    }
  } catch {
    /* Storage is optional. */
  }
}
export function listenForCustomerContextClear() {
  if (typeof BroadcastChannel === "undefined") return () => {};
  try {
    const channel = new BroadcastChannel("fitloom:account");
    channel.onmessage = (event) => {
      const data: unknown = event.data;
      if (
        typeof data === "object" &&
        data !== null &&
        "type" in data &&
        data.type === "context-cleared"
      )
        clearCustomerReturns();
    };
    return () => channel.close();
  } catch {
    return () => {};
  }
}
