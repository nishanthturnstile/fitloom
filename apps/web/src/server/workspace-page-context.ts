import "server-only";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { identityService } from "./identity";
import { workspaceService } from "./workspaces";

// React cache shares these reads only within one server render/request.
export const workspacePageContext = cache(
  async (tenant: string, location: string) => {
    const h = await headers();
    let actor: Awaited<
      ReturnType<ReturnType<typeof identityService>["identity"]>
    >;
    try {
      actor = await identityService().identity(h);
    } catch {
      redirect("/account");
    }
    const target = { tenantId: tenant, locationId: location };
    const service = workspaceService(h);
    try {
      const workspace = await service.view(target);
      const [available, preferences] = await Promise.all([
        service.choices(),
        service.preferences(),
      ]);
      const choices = available.some(
        (c) => c.tenantId === tenant && c.locationId === location,
      )
        ? available
        : [
            {
              ...target,
              shopName: workspace.shopName,
              locationName: workspace.locationName,
            },
            ...available,
          ];
      return {
        kind: "ready" as const,
        h,
        target,
        workspace,
        choices,
        locale: preferences?.locale ?? "en",
        principalId: actor.principalId,
      };
    } catch {
      return { kind: "unavailable" as const };
    }
  },
);
