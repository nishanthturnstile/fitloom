import {
  type CustomerSearchQuery,
  customerReturnDescriptor as descriptor,
  customerReturnToken as tokenSchema,
} from "@fitloom/application/customer-contracts";
import {
  CUSTOMER_RETURN_PREFIX,
  type CustomerReturnScope,
  ensureCustomerReturnScope,
} from "./customer-return-session";
export type CustomerRegisterQuery = CustomerSearchQuery;
export function readCustomerReturn(scope: CustomerReturnScope, token: unknown) {
  if (!tokenSchema.safeParse(token).success) return null;
  try {
    const raw = sessionStorage.getItem(
      `${CUSTOMER_RETURN_PREFIX}entry:${String(token)}`,
    );
    if (!raw || raw.length > 16384) return null;
    const parsed = descriptor.safeParse(JSON.parse(raw));
    if (!parsed.success) return null;
    const value = parsed.data;
    if (
      value.expiresAt <= Date.now() ||
      value.expiresAt > Date.now() + 15 * 60000 ||
      value.scope.principalId !== scope.principalId ||
      value.scope.tenantId !== scope.tenantId ||
      value.scope.locationId !== scope.locationId
    )
      return null;
    return value;
  } catch {
    return null;
  }
}
export function rememberCustomerReturn(
  scope: CustomerReturnScope,
  query: CustomerRegisterQuery,
  view: "table" | "cards",
  focusedId: string | null,
): string | null {
  try {
    ensureCustomerReturnScope(scope);
    const entries = Object.keys(sessionStorage).filter((key) =>
      key.startsWith(`${CUSTOMER_RETURN_PREFIX}entry:`),
    );
    for (const key of entries)
      if (
        !readCustomerReturn(
          scope,
          key.slice(`${CUSTOMER_RETURN_PREFIX}entry:`.length),
        )
      )
        sessionStorage.removeItem(key);
    const remaining = Object.keys(sessionStorage).filter((key) =>
      key.startsWith(`${CUSTOMER_RETURN_PREFIX}entry:`),
    );
    while (remaining.length >= 10) {
      const oldest = remaining.shift();
      if (oldest) sessionStorage.removeItem(oldest);
    }
    const token = crypto.randomUUID(),
      value = descriptor.parse({
        scope,
        query,
        view,
        focusedId,
        expiresAt: Date.now() + 15 * 60000,
      });
    sessionStorage.setItem(
      `${CUSTOMER_RETURN_PREFIX}entry:${token}`,
      JSON.stringify(value),
    );
    return token;
  } catch {
    return null;
  }
}
