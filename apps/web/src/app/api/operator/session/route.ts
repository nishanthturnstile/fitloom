import { CommandError } from "@fitloom/application";
import { identityService } from "../../../../server/identity";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  try {
    const current = await identityService().requireOperator(
      request.headers,
      "operator.access",
    );
    return Response.json(
      { principalId: current.principalId, admitted: true },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return Response.json(
      { message: "Recent operator MFA and grant required" },
      {
        status: error instanceof CommandError ? 403 : 503,
        headers: { "Cache-Control": "no-store" },
      },
    );
  }
}
