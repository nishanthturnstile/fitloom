import { pageOffset } from "@fitloom/application/workspace-contracts";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { identityService } from "@/server/identity";
import { workspaceService } from "@/server/workspaces";
import { WorkspaceSelection } from "./selection";
export const dynamic = "force-dynamic";
export default async function Workspaces({
  searchParams,
}: {
  searchParams: Promise<{ offset?: string }>;
}) {
  const h = await headers();
  let name: string;
  try {
    name = (await identityService().identity(h)).user.name;
  } catch {
    redirect("/account");
  }
  const parsed = pageOffset.safeParse((await searchParams).offset ?? 0);
  if (!parsed.success)
    return (
      <main className="workspace-shell">
        <h1>Invalid page.</h1>
        <a href="/workspaces">Return to your shops</a>
      </main>
    );
  const service = workspaceService(h);
  const [page, preference] = await Promise.all([
    service.choicePage(parsed.data),
    service.preferences(),
  ]);
  return (
    <main className="workspace-shell">
      <header className="workspace-top">
        <a href="/workspaces">fitloom</a>
        <a href="/account">Your account</a>
      </header>
      <p className="account-eyebrow">YOUR WORKSPACES</p>
      <h1>Welcome, {name}.</h1>
      <p className="account-muted">
        Choose a shop and location. Your current access decides what opens.
      </p>
      <WorkspaceSelection
        choices={page.items}
        locale={preference?.locale ?? "en"}
        selected={preference}
      />
      {page.total === 0 ? (
        <p>Your first shop starts here. Saved setup is ready to resume.</p>
      ) : null}
      <nav aria-label="Workspace pages">
        <p>
          {page.items.length} of {page.total} authorized locations
        </p>
        {parsed.data > 0 ? (
          <a href={`/workspaces?offset=${Math.max(0, parsed.data - 50)}`}>
            Previous shops
          </a>
        ) : null}
        {page.nextOffset !== null ? (
          <a href={`/workspaces?offset=${page.nextOffset}`}>More shops →</a>
        ) : null}
      </nav>
      <a href="/setup" className="workspace-link">
        {page.total
          ? "Resume setup or create another shop"
          : "Set up your shop"}{" "}
        →
      </a>
    </main>
  );
}
