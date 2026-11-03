import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { mkdir, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const { chromium } = await import(process.argv[2] ?? "playwright");
const root = new URL("../", import.meta.url);
const account = JSON.parse(
  await readFile(new URL(".local/validation-account.json", root), "utf8"),
);
const { origin } = JSON.parse(
  await readFile(new URL(".local/access.json", root), "utf8"),
);
const artifacts = new URL(
  "docs/implementation/evidence/screenshots/customers-foundation/",
  root,
);
await mkdir(artifacts, { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
page.setDefaultNavigationTimeout(120000);
const authRequests = [];
page.on("response", (response) => {
  const path = new URL(response.url()).pathname;
  if (path.startsWith("/api/auth/"))
    authRequests.push({ path, status: response.status() });
});
page.on("requestfailed", (request) => {
  const path = new URL(request.url()).pathname;
  if (path.startsWith("/api/auth/"))
    authRequests.push({ path, failed: request.failure()?.errorText });
});
try {
  await page.goto(`${origin}/account`);
  await page
    .getByRole("textbox", { name: "Email address", exact: true })
    .fill(account.email);
  await page.getByLabel("Password", { exact: true }).fill(account.password);
  await page.getByRole("button", { name: "Sign in →", exact: true }).click();
  await page.waitForURL("**/workspaces");
  const response = await page.request.get(`${origin}/api/workspaces`);
  assert.ok(response.ok());
  const choices = await response.json();
  assert.ok(choices.length);
  const choice = choices[0];
  const base = `${origin}/workspaces/${choice.tenantId}/${choice.locationId}`;
  await page.goto(`${base}/settings/access`);
  await page.getByText("Create a custom role", { exact: true }).click();
  const checkbox = (name) => page.getByRole("checkbox", { name, exact: true });
  await checkbox("Manage customer and wearer photos").check();
  for (const name of [
    "View customers and wearers",
    "Create and edit customers and wearers",
    "View customer and wearer photos",
  ])
    assert.ok(
      await checkbox(name).isChecked(),
      `CRM dependency missing: ${name}`,
    );
  assert.equal(await checkbox("View garments and services").isChecked(), false);
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    assert.ok(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
      "Access form overflows",
    );
    await page.screenshot({
      path: fileURLToPath(new URL(`role-permissions-${width}.png`, artifacts)),
      fullPage: true,
    });
  }
  await checkbox("View customers and wearers").uncheck();
  for (const name of [
    "Manage customer and wearer photos",
    "Create and edit customers and wearers",
    "View customer and wearer photos",
  ])
    assert.equal(
      await checkbox(name).isChecked(),
      false,
      "Dependent permission remained checked",
    );
  await page.goto(base);
  await page.getByRole("heading", { name: "Home", exact: true }).waitFor();
  const customers = await page.request.get(
    `${origin}/api/workspaces/${choice.tenantId}/${choice.locationId}/customers`,
  );
  assert.ok(
    customers.ok(),
    "Customer backend unavailable after forward migration",
  );
  const missing = randomUUID();
  const photoSlot = await page.request.post(
    `${origin}/api/workspaces/${choice.tenantId}/${choice.locationId}/customers/photos/slot`,
    {
      headers: { origin },
      data: { kind: "customer-avatar", customerId: missing },
    },
  );
  assert.equal(
    photoSlot.status(),
    404,
    "CRM photo schema/runtime unavailable after upgrade",
  );
  assert.equal(
    (
      await page.request.get(
        `${origin}/api/workspaces/${choice.tenantId}/${choice.locationId}/customers/photos/files/${missing}`,
      )
    ).status(),
    404,
    "Photo stream route unavailable after upgrade",
  );
  const directory = await customers.json();
  assert.ok(
    Array.isArray(directory.items) && Number.isInteger(directory.total),
  );
  await page
    .getByRole("link", { name: "Find a customer", exact: true })
    .click();
  await page.getByRole("heading", { name: "Customers", exact: true }).waitFor();
  await page.waitForFunction(
    () => document.activeElement?.id === "customer-search",
  );
  assert.equal(await page.title(), "Customers | Fitloom");
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    assert.ok(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
      "Customer register overflows",
    );
    await page.screenshot({
      path: fileURLToPath(new URL(`register-${width}.png`, artifacts)),
      fullPage: true,
      timeout: 30000,
    });
  }
  await page.request.post(`${origin}/api/auth/sign-out`, {
    headers: { origin },
    data: {},
  });
  console.log(
    "Customer foundation Chrome checks passed: canonical sign-in, CRM permission dependencies, no implied catalog access, 1440/390px, Home, authorized customer directory read, and register entry/search focus. No role or customer was saved.",
  );
} catch (error) {
  console.error("Foundation UI diagnostic", {
    path: new URL(page.url()).pathname,
    authRequests,
    alerts: (await page.getByRole("alert").allTextContents()).map((value) =>
      value.slice(0, 200),
    ),
  });
  throw error;
} finally {
  await browser.close();
}
