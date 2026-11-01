import { beginAnotherSetup } from "@fitloom/application";
import {
  invocation,
  mutation,
  privateJson,
  workspaceService,
} from "@/server/workspaces";
export const POST = (request: Request) =>
  mutation(request, async (input) =>
    privateJson(
      await workspaceService(request.headers).execute(
        beginAnotherSetup,
        invocation(input, { kind: "principal" }),
      ),
    ),
  );
