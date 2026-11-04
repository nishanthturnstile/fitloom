import { importPage } from "@/server/import-page";
export const metadata = { title: "Import measurements | Fitloom" };
export default async function Page({
  params,
}: {
  params: Promise<{ tenant: string; location: string }>;
}) {
  return importPage(params, "measurements");
}
