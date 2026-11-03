import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";

const { chromium } = await import(process.argv[2] ?? "playwright");
const sharp = createRequire(
  new URL("../packages/application/package.json", import.meta.url),
)("sharp");
const { origin } = JSON.parse(
  await readFile(new URL("../.local/access.json", import.meta.url), "utf8"),
);
const account = JSON.parse(
  await readFile(
    new URL("../.local/validation-account.json", import.meta.url),
    "utf8",
  ),
);
if (
  account.email !== "demo@fitloom.test" ||
  (!new URL(origin).hostname.endsWith(".ts.net") &&
    new URL(origin).hostname !== "localhost")
)
  throw new Error("Only the local demo may be validated");
const browser = await chromium.launch({ channel: "chrome", headless: true });
const page = await browser.newPage();
let step = "sign in";
let uploadedId;
let fixtureBase;
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
  const choices = await (
    await page.request.get(`${origin}/api/workspaces`)
  ).json();
  const target = choices.find((row) => row.shopName === "Fitloom Demo");
  assert.ok(target);
  fixtureBase = `/api/workspaces/${target.tenantId}/${target.locationId}`;
  step = "private file controls";
  await page.goto(
    `${origin}/workspaces/${target.tenantId}/${target.locationId}`,
  );
  const region = page.getByRole("region", {
    name: "Private files",
    exact: true,
  });
  await region.waitFor();
  const input = region.getByLabel(/Add a private image/),
    upload = region.getByRole("button", {
      name: "Upload private image",
      exact: true,
    });
  const initial = await region
    .getByRole("link", { name: "Download", exact: true })
    .count();
  const style = await upload.evaluate((el) => ({
    background: getComputedStyle(el).backgroundColor,
    cursor: getComputedStyle(el).cursor,
  }));
  assert.equal(style.background, "rgb(35, 60, 51)");
  assert.equal(style.cursor, "pointer");
  assert.ok((await input.boundingBox()).width > 150);
  let attaches = 0,
    puts = 0,
    replayed = false;
  page.on("request", (request) => {
    if (request.method() === "PUT" && request.url().includes("/files/")) puts++;
  });
  await page.route("**/actions/attach-file", async (route) => {
    attaches++;
    uploadedId = route.request().postDataJSON().payload.fileId;
    const response = await route.fetch();
    if (attaches === 1) await route.abort("connectionreset");
    else {
      replayed = (await response.json()).replayed === true;
      await route.fulfill({ response });
    }
  });
  const image = await sharp({
    create: { width: 48, height: 32, channels: 3, background: "#527d66" },
  })
    .png()
    .toBuffer();
  await input.setInputFiles({
    name: "browser-reference.png",
    mimeType: "image/png",
    buffer: image,
  });
  step = "lost attachment response";
  await upload.click();
  await region
    .getByRole("status")
    .filter({ hasText: /retry the upload/ })
    .waitFor();
  assert.ok(await upload.isEnabled());
  step = "idempotent upload retry";
  await upload.click();
  await region
    .getByRole("status")
    .filter({ hasText: "Your private image is ready." })
    .waitFor();
  assert.equal(puts, 1);
  assert.equal(attaches, 2);
  assert.equal(replayed, true);

  const row = region
    .getByRole("listitem")
    .filter({ has: page.locator(`a[href$="/files/${uploadedId}"]`) });
  await row.waitFor();
  assert.equal(
    await region.getByRole("link", { name: "Download", exact: true }).count(),
    initial + 1,
  );
  step = "browser download";
  const downloadEvent = page.waitForEvent("download");
  await row.getByRole("link", { name: "Download", exact: true }).click();
  const download = await downloadEvent;
  assert.equal(download.suggestedFilename(), `${uploadedId}.png`);
  const downloaded = await readFile(await download.path());
  assert.equal((await sharp(downloaded).metadata()).width, 48);
  step = "retire and mobile layout";
  await row.getByRole("button", { name: "Retire", exact: true }).click();
  await region
    .getByRole("status")
    .filter({ hasText: /Image retired/ })
    .waitFor();
  assert.equal(
    await region.getByRole("link", { name: "Download", exact: true }).count(),
    initial,
  );
  await page.setViewportSize({ width: 390, height: 844 });
  assert.ok(await upload.isVisible());
  assert.ok((await input.boundingBox()).width > 150);
  assert.ok(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  );
  console.log(
    "Browser regression passed: visible controls, one upload after lost attachment response, saved-result replay, one attachment, actual download, retirement, and mobile layout. Existing demo reference image preserved.",
  );
} catch (error) {
  if (step !== "sign in")
    console.error(
      error instanceof Error ? error.message : "Browser assertion failed",
    );
  throw new Error(`Private file browser regression failed during: ${step}`);
} finally {
  if (uploadedId && fixtureBase) {
    await (async () => {
      const files = await (
        await page.request.get(`${origin}${fixtureBase}/files`)
      ).json();
      const own = files.find((row) => row.id === uploadedId);
      if (own)
        await page.request.post(`${origin}${fixtureBase}/actions/retire-file`, {
          headers: { origin, "content-type": "application/json" },
          data: {
            operationKey: randomUUID(),
            correlationId: randomUUID(),
            payload: { fileId: own.id, expectedVersion: own.version },
          },
        });
    })().catch(() => {});
  }
  await page.request
    .post(`${origin}/api/auth/sign-out`, {
      headers: { origin, "content-type": "application/json" },
      data: {},
    })
    .catch(() => {});
  await browser.close();
}
