import { acceptInvitation } from "@fitloom/application";
import {
  invocation,
  mutation,
  privateJson,
  workspaceService,
} from "@/server/workspaces";
export const POST = (
  request: Request,
  context: { params: Promise<{ id: string }> },
) =>
  mutation(request, async (input) => {
    const p = await context.params;
    const args = invocation(input, { kind: "principal" });
    return privateJson(
      await workspaceService(request.headers).execute(acceptInvitation, {
        ...args,
        payload: { invitationId: p.id },
      }),
    );
  });
