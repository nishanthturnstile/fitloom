import { identityEnvironment, MeasurementError } from "@fitloom/application";
import { measurementCardId } from "@fitloom/application/measurement-card-contracts";
import { identityService } from "@/server/identity";
import { cardHtml, cardUnavailable } from "@/server/measurement-card-page";
import { measurementCardService } from "@/server/measurement-cards";
export const dynamic = "force-dynamic";
export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    if (!(await identityService().admitMeasurementCardRequest(request.headers)))
      return cardUnavailable(429);
    const p = await context.params,
      id = measurementCardId.safeParse(p.id);
    if (!id.success || new URL(request.url).searchParams.size)
      return cardUnavailable();
    try {
      return cardHtml(
        await measurementCardService(request.headers).resolve(id.data),
      );
    } catch (error) {
      if (
        error instanceof MeasurementError &&
        error.code === "session-expired"
      ) {
        const { config } = identityEnvironment(process.env),
          location = new URL(`/account?card=${id.data}`, config.baseURL).href;
        return new Response(null, {
          status: 303,
          headers: {
            Location: location,
            "Cache-Control": "private, no-store",
            "Referrer-Policy": "no-referrer",
          },
        });
      }
      return cardUnavailable(
        error instanceof MeasurementError && error.code === "rate-limit"
          ? 429
          : error instanceof MeasurementError && error.code === "temporary"
            ? 503
            : 404,
      );
    }
  } catch {
    return cardUnavailable(503);
  }
}
