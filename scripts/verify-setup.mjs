import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const { chromium } = await import(process.argv[2] ?? "playwright");
const root = fileURLToPath(new URL("../", import.meta.url));
const account = JSON.parse(
  readFileSync(`${root}/.local/validation-account.json`, "utf8"),
);
const { origin } = JSON.parse(
  readFileSync(`${root}/.local/access.json`, "utf8"),
);
const browser = await chromium.launch({ channel: "chrome", headless: true });
const page = await browser.newPage();
try {
  await page.goto(`${origin}/account`);
  await page
    .getByRole("textbox", { name: "Email address", exact: true })
    .fill(account.email);
  await page
    .getByRole("textbox", { name: "Password", exact: true })
    .fill(account.password);
  await page.getByRole("button", { name: "Sign in →", exact: true }).click();
  await page.waitForURL("**/workspaces");
  await page.goto(`${origin}/setup`);
  if (
    await page
      .getByRole("button", { name: "Create another shop", exact: true })
      .count()
  )
    await page
      .getByRole("button", { name: "Create another shop", exact: true })
      .click();
  const create = () =>
    page.getByRole("button", { name: "Create shop →", exact: true });
  await create().waitFor();
  const style = await create().evaluate((el) => ({
    background: getComputedStyle(el).backgroundColor,
    cursor: getComputedStyle(el).cursor,
  }));
  assert.equal(style.background, "rgb(35, 60, 51)");
  assert.equal(style.cursor, "pointer");
  assert.equal(await create().isEnabled(), true);
  await create().click();
  await page.getByRole("status").filter({ hasText: "Required" }).waitFor();
  console.log(
    "PASS: visible, enabled create button; missing fields show validation",
  );
  const shopName = `Setup browser regression ${Date.now()}`;
  await page
    .getByRole("textbox", { name: "Shop name", exact: true })
    .fill(shopName);
  await page
    .getByRole("button", { name: "Save progress", exact: true })
    .click();
  await page
    .getByRole("status")
    .filter({ hasText: "Progress saved" })
    .waitFor();
  await page.reload();
  assert.equal(
    await page
      .getByRole("textbox", { name: "Shop name", exact: true })
      .inputValue(),
    shopName,
  );
  console.log("PASS: partial progress saves and resumes after reload");
  for (const [name, value] of [
    ["Owner contact name", "Demo owner"],
    ["Owner contact phone", "+919876543210"],
    ["First location name", "Coimbatore"],
    ["Location timezone, e.g. Asia/Kolkata", "Asia/Kolkata"],
    ["Location address", "Development regression address"],
  ])
    await page.getByRole("textbox", { name, exact: true }).fill(value);
  await page
    .getByRole("combobox", { name: "Business mode" })
    .selectOption("mixed");
  await page.getByRole("checkbox").check();
  // A real save followed by simulated service failure must leave the form retryable.
  await page.route("**/api/setup/provision", (route) =>
    route.fulfill({
      status: 503,
      contentType: "application/json",
      body: JSON.stringify({ message: "Temporary setup verification failure" }),
    }),
  );
  await create().click();
  await page
    .getByRole("status")
    .filter({ hasText: "Temporary setup verification failure" })
    .waitFor();
  assert.equal(await create().isEnabled(), true);
  await page.unroute("**/api/setup/provision");
  console.log(
    "PASS: provisioning failure preserves details and restores the action",
  );
  // Change saved details: Create must persist the new value itself, in order.
  await page
    .getByRole("textbox", { name: "Shop name", exact: true })
    .fill(`${shopName} updated`);
  const requests = [];
  page.on("request", (r) => {
    if (r.method() === "POST" && r.url().includes("/api/setup"))
      requests.push(new URL(r.url()).pathname);
  });
  await page.route("**/api/setup", async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 600));
    await route.continue();
  });
  await create().click();
  await page
    .getByRole("button", { name: "Creating shop…", exact: true })
    .waitFor();
  assert.equal(
    await page
      .getByRole("textbox", { name: "Shop name", exact: true })
      .isDisabled(),
    true,
  );
  await page.waitForURL("**/workspaces");
  assert.deepEqual(requests, ["/api/setup", "/api/setup/provision"]);
  await page.getByRole("button", { name: new RegExp(shopName) }).waitFor();
  console.log(
    "PASS: one Create click saves dirty details, creates the shop, and opens Workspaces",
  );
} finally {
  await browser.close();
}
