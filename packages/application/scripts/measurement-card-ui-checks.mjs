export async function exerciseMeasurementCardsUI(page, fixture) {
  page.setDefaultTimeout(15000);
  page.setDefaultNavigationTimeout(20000);
  const check = (ok, message) => {
      if (!ok) throw Error(message);
    },
    m = fixture.measurements,
    root = `${fixture.base}/api/workspaces/${fixture.tenant}/${fixture.location}`,
    api = `${root}/measurements`,
    ownerApi = `${api}/${m.customerId}/${m.wearerId}`,
    book = `${fixture.base}/workspaces/${fixture.tenant}/${fixture.location}/customers/${m.customerId}/wearers/${m.wearerId}/measurements`;
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(`${book}/${m.profileId}/versions/${m.versionId}`);
  await page
    .getByRole("button", { name: "Measurement cards", exact: true })
    .click();
  const sheet = page.getByRole("dialog", {
    name: "Measurement cards",
    exact: true,
  });
  await sheet.waitFor();
  await sheet
    .getByRole("checkbox", {
      name: "Chest circumference · body basis",
      exact: true,
    })
    .check();
  await page.evaluate(() => {
    window.confirm = () => false;
  });
  await sheet.press("Escape");
  check(
    await sheet.isVisible(),
    "Canceled card selection close discarded the sheet",
  );
  await page.evaluate(() => {
    window.confirm = () => true;
  });
  await sheet
    .getByRole("button", { name: "Add exact version to card", exact: true })
    .click();
  await sheet
    .getByRole("button", { name: "Preview selected card", exact: true })
    .click();
  await sheet
    .getByRole("heading", { name: "Card preview", exact: true })
    .waitFor();
  check(
    (await sheet
      .getByText("38.250000 in · body basis", { exact: true })
      .count()) === 1,
    "Card preview did not use exact original quantity",
  );
  check(
    !(
      await sheet
        .getByRole("heading", { name: "Card preview", exact: true })
        .locator("..")
        .locator("..")
        .locator("..")
        .textContent()
    ).includes("Private fitting notes"),
    "Card preview leaked notes",
  );
  for (const width of [1440, 1024, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    await sheet
      .getByRole("heading", { name: "Card preview", exact: true })
      .scrollIntoViewIfNeeded();
    check(
      await sheet.evaluate((node) => node.scrollWidth <= node.clientWidth),
      `Card sheet overflow at ${width}`,
    );
    await page.screenshot({
      path: `${fixture.artifacts}/measurement-card-preview-${width}.png`,
      fullPage: false,
      animations: "disabled",
    });
  }
  let lost = false;
  const creates = [];
  await page.route("**/commands/measurement-card.create", async (route) => {
    creates.push(route.request().postData());
    if (!lost) {
      lost = true;
      await route.fetch();
      await route.abort("failed");
    } else await route.continue();
  });
  await sheet
    .getByRole("button", { name: "Issue measurement card", exact: true })
    .click();
  await sheet
    .getByRole("button", { name: "Retry exact card operation", exact: true })
    .click();
  await sheet
    .getByRole("link", {
      name: "Open issued card for print and QR",
      exact: true,
    })
    .waitFor();
  await page.unroute("**/commands/measurement-card.create");
  check(
    creates.length === 2 && creates[0] === creates[1],
    "Card issue retry changed the envelope",
  );
  const path = await sheet
    .getByRole("link", {
      name: "Open issued card for print and QR",
      exact: true,
    })
    .getAttribute("href");
  check(
    /^\/measurement-cards\/[0-9a-f-]{36}$/.test(path),
    "Issued locator is not the constant card route",
  );
  const rows = await page.request.post(`${ownerApi}/cards`, {
    headers: { origin: fixture.base },
    data: {},
  });
  const listed = await rows.json();
  const card = listed.items.find((item) => path.endsWith(item.cardId));
  check(
    card && card.revision === 1,
    "Issue replay created no usable single grant",
  );
  const next = await page.context().newPage();
  const requests = [];
  next.on("request", (request) => requests.push(request.url()));
  await next.goto(fixture.base + path);
  await next.locator("h1").waitFor();
  await next.waitForFunction(() =>
    Array.from(document.images).some(
      (img) =>
        img.alt === "Authenticated measurement card QR code" &&
        img.complete &&
        img.naturalWidth > 0,
    ),
  );
  check(
    (await next.locator("main").textContent()).includes("38.250000 in"),
    "Resolved card changed selected original value",
  );
  check(
    !(await next.locator("main").textContent()).includes("Waist circumference"),
    "Resolved card broadened its selection",
  );
  await next.evaluate(() => {
    window.print = () => {
      window.__cardPrinted = true;
    };
  });
  await next.getByRole("button", { name: "Print card", exact: true }).click();
  check(
    await next.evaluate(() => window.__cardPrinted === true),
    "Nonce-protected print action did not run",
  );
  for (const width of [1440, 1024, 390, 320]) {
    await next.setViewportSize({ width, height: 900 });
    await next.evaluate(async () => {
      window.scrollTo(0, 0);
      await new Promise(requestAnimationFrame);
      await new Promise(requestAnimationFrame);
    });
    check(
      (await next.locator("main").count()) === 1,
      "Resolved card duplicated its document",
    );
    check(
      await next.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      `Resolved card overflow at ${width}`,
    );
    await next.screenshot({
      path: `${fixture.artifacts}/measurement-card-${width}.png`,
      fullPage: true,
      animations: "disabled",
    });
  }
  await next.emulateMedia({ media: "print" });
  await next.setViewportSize({ width: 794, height: 1123 });
  check(
    await next
      .getByRole("button", { name: "Print card", exact: true })
      .isHidden(),
    "Print layout retained interactive actions",
  );
  await next.screenshot({
    path: `${fixture.artifacts}/measurement-card-print-a4.png`,
    fullPage: true,
    animations: "disabled",
  });
  await next.emulateMedia({ media: "screen" });
  check(
    requests.every(
      (url) => url === fixture.base || url.startsWith(`${fixture.base}/`),
    ),
    "Card loaded an external resource",
  );
  const context = await page.context().browser().newContext();
  const signedOut = await context.newPage();
  try {
    await signedOut.goto(fixture.base + path);
    await signedOut.waitForURL(`**/account?card=${card.cardId}`);
    await signedOut
      .getByRole("textbox", { name: "Email address", exact: true })
      .fill(fixture.account.email);
    await signedOut
      .locator('input[name="password"]')
      .fill(fixture.account.password);
    await signedOut
      .getByRole("button", { name: "Sign in →", exact: true })
      .click();
    await signedOut.waitForURL(`**${path}`);
    await signedOut.locator("h1").waitFor();
    check(
      (await signedOut.locator("main").textContent()).includes("38.250000 in"),
      "Sign-in did not return to the protected selected card",
    );
  } finally {
    await context.close();
  }
  await sheet
    .getByLabel("Card revocation reason", { exact: true })
    .fill("Synthetic replacement under current identity");
  const replacementCreates = [],
    replacementRevokes = [];
  let replacementLost = false;
  await page.route("**/commands/measurement-card.revoke", async (route) => {
    replacementRevokes.push(route.request().postData());
    await route.continue();
  });
  await page.route("**/commands/measurement-card.create", async (route) => {
    replacementCreates.push(route.request().postData());
    if (!replacementLost) {
      replacementLost = true;
      await route.fetch();
      await route.abort("failed");
    } else await route.continue();
  });
  await sheet
    .getByRole("button", { name: "Revoke and reissue card 1", exact: true })
    .click();
  await sheet
    .getByRole("button", { name: "Retry exact card operation", exact: true })
    .click();
  await page.waitForFunction(
    (oldPath) =>
      Array.from(document.querySelectorAll("a")).some(
        (link) =>
          link.textContent === "Open issued card for print and QR" &&
          link.getAttribute("href") !== oldPath,
      ),
    path,
  );
  const replacementPath = await sheet
    .getByRole("link", {
      name: "Open issued card for print and QR",
      exact: true,
    })
    .getAttribute("href");
  check(
    replacementRevokes.length === 1 &&
      replacementCreates.length === 2 &&
      replacementCreates[0] === replacementCreates[1],
    "Uncertain reissue repeated revocation or changed its exact create envelope",
  );
  check(
    (await page.request.get(fixture.base + path)).status() === 404,
    "Reissue left its old card available",
  );
  await page.unroute("**/commands/measurement-card.revoke");
  await page.unroute("**/commands/measurement-card.create");
  await next.goto(fixture.base + replacementPath);
  await next.locator("h1").waitFor();
  await sheet
    .getByLabel("Card revocation reason", { exact: true })
    .fill("Synthetic lost card request");
  let revokedLost = false;
  const revokes = [];
  await page.route("**/commands/measurement-card.revoke", async (route) => {
    revokes.push(route.request().postData());
    if (!revokedLost) {
      revokedLost = true;
      await route.fetch();
      await route.abort("failed");
    } else await route.continue();
  });
  const revoke = sheet.getByRole("button", {
    name: "Revoke card 1",
    exact: true,
  });
  await revoke.click();
  await sheet
    .getByRole("button", { name: "Retry exact card operation", exact: true })
    .click();
  await sheet
    .getByText("Measurement card revoked. Subsequent reads are unavailable.", {
      exact: true,
    })
    .waitFor();
  await page.unroute("**/commands/measurement-card.revoke");
  check(
    revokes.length === 2 && revokes[0] === revokes[1],
    "Card revoke retry changed envelope",
  );
  await next.reload();
  await next
    .getByRole("heading", { name: "Measurement card unavailable", exact: true })
    .waitFor();
  check(
    (await next.locator("body").textContent()).indexOf("38.250000") === -1,
    "Revoked card retained its protected projection",
  );
  await next.screenshot({
    path: `${fixture.artifacts}/measurement-card-revoked-794.png`,
    fullPage: false,
  });
  await next.close();
  const storage = await page.evaluate(() =>
    [...Object.values(localStorage), ...Object.values(sessionStorage)].join(
      "\n",
    ),
  );
  check(
    !storage.includes(card.cardId) && !storage.includes("38.250000"),
    "Card locator or values entered browser storage",
  );
  await sheet.press("Escape");
  await sheet.waitFor({ state: "hidden" });
  check(
    await page
      .getByRole("button", { name: "Measurement cards", exact: true })
      .evaluate((node) => node === document.activeElement),
    "Card sheet did not restore trigger focus",
  );
  return { measurementCardsUiPassed: true };
}
