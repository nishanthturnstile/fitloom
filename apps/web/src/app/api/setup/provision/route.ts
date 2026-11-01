import { provisionTenant } from "@fitloom/application";
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
        provisionTenant,
        invocation(input, { kind: "principal" }),
      ),
    ),
  );
