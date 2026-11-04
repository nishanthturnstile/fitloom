import {
  identityEnvironment,
  MeasurementError,
  measurementCardPNG,
} from "@fitloom/application";
import { identityService } from "@/server/identity";
import { measurementCardService } from "@/server/measurement-cards";
import { measurementHttpError } from "@/server/measurements";
import { privateJson } from "@/server/workspaces";
export const dynamic = "force-dynamic";
export async function GET(
  request: Request,
  context: { params: Promise<{ id: string; path?: string[] }> },
) {
  try {
    if (!(await identityService().admitMeasurementCardRequest(request.headers)))
      throw new MeasurementError(
        "rate-limit",
        "Please wait before opening another measurement card",
      );
    const p = await context.params,
      path = p.path ?? [];
    if (
      new URL(request.url).searchParams.size ||
      path.length > 1 ||
      (path.length === 1 && path[0] !== "qr.png")
    )
      throw new MeasurementError("unavailable", "Measurement card unavailable");
    const service = measurementCardService(request.headers),
      card = await service.resolve(p.id);
    if (!path.length) {
      const response = privateJson(card);
      response.headers.set("Referrer-Policy", "no-referrer");
      return response;
    }
    const { config } = identityEnvironment(process.env),
      bytes = await measurementCardPNG(config.baseURL, card.cardId);
    return new Response(new Uint8Array(bytes), {
      headers: {
        "Content-Type": "image/png",
        "Content-Disposition": 'inline; filename="measurement-card.png"',
        "Content-Length": String(bytes.length),
        "Cache-Control": "private, no-store",
        "Referrer-Policy": "no-referrer",
        "X-Content-Type-Options": "nosniff",
        "Content-Security-Policy": "default-src 'none'; sandbox",
      },
    });
  } catch (error) {
    const response = measurementHttpError(error);
    response.headers.set("Referrer-Policy", "no-referrer");
    return response;
  }
}
