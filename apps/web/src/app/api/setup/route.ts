import { saveSetupDraft } from "@fitloom/application";
import {
  invocation,
  mutation,
  privateJson,
  safeRoute,
  workspaceService,
} from "@/server/workspaces";
export const dynamic = "force-dynamic";
export const GET = (request: Request) =>
  safeRoute(async () =>
    privateJson(await workspaceService(request.headers).setup()),
  );
export const POST = (request: Request) =>
  mutation(request, async (input) =>
    privateJson(
      await workspaceService(request.headers).execute(
        saveSetupDraft,
        invocation(input, { kind: "principal" }),
      ),
    ),
  );
