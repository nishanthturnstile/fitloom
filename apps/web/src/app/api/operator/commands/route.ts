import { identityService } from "@/server/identity";
import { mutation, privateJson } from "@/server/workspaces";
export const POST = (request: Request) =>
  mutation(request, async (input) =>
    privateJson(
      await identityService().operatorCommand(request.headers, input),
    ),
  );
