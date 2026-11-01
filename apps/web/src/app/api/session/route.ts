import { CommandError } from "@fitloom/application";
import { identityService } from "../../../server/identity";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  try {
    const current = await identityService().identity(request.headers);
    return Response.json(
      {
        principalId: current.principalId,
        email: current.user.email,
        name: current.user.name,
        verified: current.user.emailVerified,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return Response.json(
      { message: "Identity unavailable" },
      {
        status: error instanceof CommandError ? 401 : 503,
        headers: { "Cache-Control": "no-store" },
      },
    );
  }
}
