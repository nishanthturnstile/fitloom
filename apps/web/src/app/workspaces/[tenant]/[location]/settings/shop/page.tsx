import { WorkspaceSettingsPage } from "../../workspace-settings-page";
export default function Shop({
  params,
}: {
  params: Promise<{ tenant: string; location: string }>;
}) {
  return <WorkspaceSettingsPage params={params} section="shop" />;
}
