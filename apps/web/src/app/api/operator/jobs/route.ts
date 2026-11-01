import { operatorJobInput as input } from "@fitloom/application/workspace-contracts";
import { identityService } from "@/server/identity";
import {
  mutation,
  pageJson,
  privateJson,
  safeRoute,
} from "@/server/workspaces";

export const GET = (request: Request) =>
  safeRoute(async () =>
    pageJson(
      await identityService().operatorJobsPage(
        request.headers,
        new URL(request.url).searchParams.get("offset") ?? 0,
      ),
    ),
  );
export const POST = (request: Request) =>
  mutation(request, async (raw) => {
    const parsed = input.safeParse(raw);
    if (!parsed.success)
      return privateJson({ message: "Invalid job action" }, 400);
    const data = parsed.data;
    return privateJson(
      await identityService().operatorCommand(request.headers, {
        ...data,
        action: data.action === "retry" ? "job.retry" : "job.cancel",
      }),
    );
  });
