import { customerReturnToken } from "@fitloom/application/customer-contracts";
import {
  type measurementBookFilters,
  measurementReturnDescriptor,
} from "@fitloom/application/measurement-contracts";
import {
  CUSTOMER_RETURN_PREFIX,
  type CustomerReturnScope,
  ensureCustomerReturnScope,
} from "@/components/workspace/customer-return-session";
export function readMeasurementReturn(
  scope: CustomerReturnScope,
  customerId: string,
  wearerId: string,
  token: unknown,
) {
  if (
    typeof window === "undefined" ||
    !customerReturnToken.safeParse(token).success
  )
    return null;
  try {
    ensureCustomerReturnScope(scope);
    const raw = sessionStorage.getItem(
      `${CUSTOMER_RETURN_PREFIX}measurement:${String(token)}`,
    );
    if (!raw || raw.length > 4096) return null;
    const p = measurementReturnDescriptor.safeParse(JSON.parse(raw));
    if (!p.success) return null;
    const d = p.data;
    return d.scope.principalId === scope.principalId &&
      d.scope.tenantId === scope.tenantId &&
      d.scope.locationId === scope.locationId &&
      d.customerId === customerId &&
      d.wearerId === wearerId &&
      d.expiresAt > Date.now() &&
      d.expiresAt <= Date.now() + 15 * 60000
      ? d
      : null;
  } catch {
    return null;
  }
}
export function rememberMeasurementReturn(
  scope: CustomerReturnScope,
  customerId: string,
  wearerId: string,
  query: ReturnType<typeof measurementBookFilters.parse>,
  focusedId: string | null,
) {
  try {
    ensureCustomerReturnScope(scope);
    const prefix = `${CUSTOMER_RETURN_PREFIX}measurement:`;
    const entries = Object.keys(sessionStorage).filter((k) =>
      k.startsWith(prefix),
    );
    while (entries.length >= 10) {
      const key = entries.shift();
      if (key) sessionStorage.removeItem(key);
    }
    const token = crypto.randomUUID();
    sessionStorage.setItem(
      prefix + token,
      JSON.stringify(
        measurementReturnDescriptor.parse({
          scope,
          customerId,
          wearerId,
          query,
          focusedId,
          expiresAt: Date.now() + 15 * 60000,
        }),
      ),
    );
    return token;
  } catch {
    return null;
  }
}
