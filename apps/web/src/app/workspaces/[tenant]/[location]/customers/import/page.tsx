import { importPage } from "@/server/import-page";
export const metadata = { title: "Import customers | Fitloom" };
export default async function Page({
  params,
}: {
  params: Promise<{ tenant: string; location: string }>;
}) {
  return importPage(params, "customers");
}
