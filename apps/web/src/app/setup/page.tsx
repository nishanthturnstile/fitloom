import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { identityService } from "@/server/identity";
import { workspaceService } from "@/server/workspaces";
import { SetupForm } from "./setup-form";
export const dynamic = "force-dynamic";
export default async function Setup() {
  const h = await headers();
  try {
    await identityService().identity(h);
  } catch {
    redirect("/account");
  }
  const progress = await workspaceService(h).setup();
  return (
    <main className="workspace-shell">
      <header className="workspace-top">
        <a href="/workspaces">fitloom / workspaces</a>
        <a href="/account">Your account</a>
      </header>
      <SetupForm
        initial={progress.draft}
        version={progress.version}
        tenantId={progress.tenantId}
      />
    </main>
  );
}
