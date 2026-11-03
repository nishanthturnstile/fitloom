import { CommandError, savePreferences } from "@fitloom/application";
import {
  resolveWorkspaceDestination,
  workspaceSwitchRequest,
  workspaceSwitchResponse,
} from "@fitloom/application/workspace-contracts";
import { mutation, privateJson, workspaceService } from "@/server/workspaces";
export const POST = (request: Request) =>
  mutation(request, async (input) => {
    const parsed = workspaceSwitchRequest.safeParse(input);
    if (!parsed.success)
      throw new CommandError("validation", "Invalid workspace switch");
    const p = parsed.data,
      service = workspaceService(request.headers);
    const workspace = await service.view(p.target);
    const destination = resolveWorkspaceDestination(workspace, p.destination);
    await service.execute(savePreferences, {
      scope: { kind: "principal" },
      operationKey: p.operationKey,
      correlationId: p.correlationId,
      payload: { locale: p.locale, ...p.target },
    });
    return privateJson(workspaceSwitchResponse.parse({ destination }));
  });
