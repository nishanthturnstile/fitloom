import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { identityService } from "@/server/identity";
import { AcceptInvitation } from "./accept";
export const dynamic = "force-dynamic";
export const metadata = { referrer: "no-referrer" };
export default async function Invitation({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return <p>Invalid invitation.</p>;
  let email: string;
  try {
    email = (await identityService().identity(await headers())).user.email;
  } catch {
    redirect(`/account?invite=${id}`);
  }
  return (
    <main className="workspace-shell">
      <section className="account-card setup-paper">
        <p className="account-eyebrow">FITLOOM / WORKSPACE INVITATION</p>
        <h1>Join the work.</h1>
        <p>
          Signed in as {email}. Only the verified address invited by the shop
          can accept.
        </p>
        <AcceptInvitation id={id} />
        <a href="/account">Manage your account</a>
      </section>
    </main>
  );
}
