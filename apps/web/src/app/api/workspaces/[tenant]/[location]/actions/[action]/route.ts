import {
  attachFile,
  cancelJob,
  createRole,
  identityEnvironment,
  invitationCommand,
  retireFile,
  retryJob,
  revokeInvitation,
  setMemberRole,
} from "@fitloom/application";
import {
  invocation,
  mutation,
  privateJson,
  workspaceService,
} from "@/server/workspaces";
export const POST = (
  request: Request,
  context: {
    params: Promise<{ tenant: string; location: string; action: string }>;
  },
) =>
  mutation(request, async (input) => {
    const p = await context.params;
    const service = workspaceService(request.headers);
    const args = invocation(input, {
      kind: "tenant",
      tenantId: p.tenant,
      locationId: p.location,
    });
    switch (p.action) {
      case "attach-file":
        return privateJson(await service.execute(attachFile, args));
      case "retire-file":
        return privateJson(await service.execute(retireFile, args));
      case "retry-job":
        return privateJson(await service.execute(retryJob, args));
      case "cancel-job":
        return privateJson(await service.execute(cancelJob, args));
      case "invite": {
        const { config } = identityEnvironment(process.env);
        return privateJson(
          await service.execute(invitationCommand(config), args),
        );
      }
      case "role":
        return privateJson(await service.execute(createRole, args));
      case "member":
        return privateJson(await service.execute(setMemberRole, args));
      case "revoke":
        return privateJson(await service.execute(revokeInvitation, args));
      default:
        return privateJson({ message: "Unknown workspace action" }, 404);
    }
  });
