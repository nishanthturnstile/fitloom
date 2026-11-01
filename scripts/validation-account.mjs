import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import { chmodSync, existsSync, readFileSync, writeFileSync } from "node:fs";

const access = JSON.parse(
  readFileSync(new URL("../.local/access.json", import.meta.url), "utf8"),
);
const target = new URL(access.origin);
if (
  !["localhost", "127.0.0.1"].includes(target.hostname) &&
  !target.hostname.endsWith(".ts.net")
)
  throw new Error(
    "Validation account is restricted to local/tailnet development",
  );
const file = new URL("../.local/validation-account.json", import.meta.url);
const account = existsSync(file)
  ? JSON.parse(readFileSync(file, "utf8"))
  : {
      email: "demo@fitloom.test",
      password: `Fitloom-${randomBytes(12).toString("hex")}!`,
      name: "Demo Owner",
    };
if (typeof account.email !== "string" || typeof account.password !== "string")
  throw new Error("Invalid saved validation account");
writeFileSync(file, JSON.stringify(account, null, 2), { mode: 0o600 });
chmodSync(file, 0o600);
const post = (path, body, cookie = "") =>
  fetch(`${access.origin}${path}`, {
    method: "POST",
    headers: {
      origin: access.origin,
      "content-type": "application/json",
      cookie,
    },
    body: JSON.stringify(body),
  });
let signed = await post("/api/auth/sign-in/email", account);
if (signed.status !== 200) {
  const registration = await post("/api/auth/sign-up/email", {
    ...account,
    callbackURL: "/account?verified=1",
  });
  assert.ok(
    [200, 422, 400].includes(registration.status),
    "Validation registration is available",
  );
  let link;
  for (let i = 0; i < 40; i++) {
    const list = await (
      await fetch("http://127.0.0.1:24420/api/v1/messages")
    ).json();
    const message = list.messages.find(
      (m) =>
        m.Subject.includes("Verify") &&
        m.To.some((to) => to.Address === account.email),
    );
    if (message) {
      const full = await (
        await fetch(`http://127.0.0.1:24420/api/v1/message/${message.ID}`)
      ).json();
      link = full.Text.match(/https?:\/\/[^\s]+/)[0];
      break;
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  assert.ok(link, "Actual worker delivers validation email to Mailpit");
  assert.equal(
    new URL(link).origin,
    access.origin,
    "Verification links use the Windows-accessible origin",
  );
  assert.equal((await fetch(link, { redirect: "manual" })).status, 302);
  signed = await post("/api/auth/sign-in/email", account);
}
assert.equal(signed.status, 200, "Validation user can sign in");
const cookie = signed.headers
  .getSetCookie()
  .map((value) => value.split(";")[0])
  .join("; ");
if (target.protocol === "https:")
  assert.ok(
    signed.headers.getSetCookie().some((value) => /secure/i.test(value)),
    "HTTPS session uses a secure cookie",
  );
const session = await (
  await fetch(`${access.origin}/api/session`, { headers: { cookie } })
).json();
assert.equal(session.email, account.email);
assert.equal(session.verified, true);
const command = (path, payload) =>
  post(
    path,
    { operationKey: randomUUID(), correlationId: randomUUID(), payload },
    cookie,
  );
const progress = await (
  await fetch(`${access.origin}/api/setup`, { headers: { cookie } })
).json();
if (!progress.tenantId) {
  const profile = {
    shopName: "Fitloom Demo",
    businessMode: "mixed",
    ownerName: account.name,
    ownerPhone: "+919876543210",
    locationName: "Main",
    address: "Development test workspace",
    timezone: "Asia/Kolkata",
    consentAccepted: true,
    consentVersion: "workspace-authority-v1",
  };
  const saved = await command("/api/setup", {
    ...profile,
    expectedVersion: progress.version,
  });
  assert.equal(saved.status, 200);
  const version = (await saved.json()).result.version;
  assert.equal(
    (
      await command("/api/setup/provision", {
        ...profile,
        expectedVersion: version,
      })
    ).status,
    200,
  );
}
const choices = await (
  await fetch(`${access.origin}/api/workspaces`, { headers: { cookie } })
).json();
assert.ok(choices.length > 0);
assert.equal(
  (
    await fetch(`${access.origin}/api/operator/session`, {
      headers: { cookie },
    })
  ).status,
  403,
);
assert.equal((await post("/api/auth/sign-out", {}, cookie)).status, 200);
console.log(
  `Verified development owner: ${account.email}. Workspace ready. Credentials: .local/validation-account.json`,
);
