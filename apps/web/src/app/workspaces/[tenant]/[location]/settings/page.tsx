import { WorkspaceSettingsPage } from "../workspace-settings-page";
export default function Settings({
  params,
}: {
  params: Promise<{ tenant: string; location: string }>;
}) {
  return <WorkspaceSettingsPage params={params} section="preferences" />;
}
