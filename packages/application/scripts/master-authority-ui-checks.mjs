// Exercises cached views while real permission grants change in the isolated test shop.
export async function exerciseMasterAuthorityUI(page, fixture) {
  const check = (condition, message) => {
    if (!condition) throw Error(message);
  };
  const api = `${fixture.base}/api/workspaces/${fixture.tenant}/${fixture.location}`;
  const settings = `${fixture.base}/workspaces/${fixture.tenant}/${fixture.location}/settings/garments`;
  const click = async (name) =>
    page.getByRole("button", { name, exact: true }).click();
  if (fixture.phase === "prepare-addon") {
    await page.goto(`${settings}?kind=addon`);
    const response = await page.request.get(`${api}/masters/addons`);
    const addon = (await response.json()).items[0];
    check(
      addon && "amount" in addon,
      "Authority fixture needs a priced add-on",
    );
    await page
      .getByLabel("Search by name prefix", { exact: true })
      .fill(addon.label);
    await click("Refresh register");
    await page.getByText("Register refreshed.", { exact: true }).waitFor();
    await click(addon.label);
    await click(`Revision ${addon.revision}`);
    await page
      .getByRole("region", { name: "Historical catalog record" })
      .waitFor();
    await page
      .getByLabel("Add-on name", { exact: true })
      .fill(`${addon.label} authority draft`);
    await page.evaluate((label) => {
      window.fitloomAuthorityLabel = label;
    }, addon.label);
    for (const width of [320, 390, 1024, 1440]) {
      await page.setViewportSize({ width, height: 1000 });
      check(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth + 1,
        ),
        `Add-on editor overflows at ${width}`,
      );
      if (width === 390 || width === 1440)
        await page.screenshot({
          path: `${fixture.artifacts}/addon-editor-${width}.png`,
        });
    }
    // A failed exact-version read keeps the draft and is not an uncertain write.
    await page.route("**/masters/addons/*/versions/*", (route) =>
      route.fulfill({
        status: 503,
        contentType: "application/json",
        body: JSON.stringify({
          message: "History temporarily unavailable",
          category: "temporary",
          correlationId: "11111111-1111-4111-8111-111111111111",
        }),
      }),
    );
    await click(`Revision ${addon.revision}`);
    await page
      .getByText("History temporarily unavailable", { exact: true })
      .waitFor();
    check(
      (await page
        .getByRole("button", { name: "Retry same operation", exact: true })
        .count()) === 0,
      "Read outage became an uncertain write",
    );
    await page.unroute("**/masters/addons/*/versions/*");
    await page.screenshot({
      path: `${fixture.artifacts}/addon-editor-desktop.png`,
    });
    return { authorityUiPassed: true };
  }
  if (fixture.phase === "restore-addon") {
    await click("Refresh access");
    await page
      .getByText("Access refreshed. Your local draft is preserved.", {
        exact: true,
      })
      .waitFor();
    await page
      .getByLabel("Add-on name", { exact: true })
      .fill(await page.evaluate(() => window.fitloomAuthorityLabel));
    return { authorityUiPassed: true };
  }
  if (fixture.phase === "prepare-garment") {
    const response = await page.request.get(
      `${api}/masters/garments/${fixture.pricedId}`,
    );
    const detail = await response.json();
    await page
      .getByLabel("Search by name prefix", { exact: true })
      .fill(detail.definition.label);
    await click("Refresh register");
    await page.getByText("Register refreshed.", { exact: true }).waitFor();
    await click(detail.definition.label);
    await page.getByRole("tab", { name: "History", exact: true }).click();
    await click(`Revision ${detail.revision}`);
    await page
      .getByRole("region", { name: "Historical eligibility" })
      .waitFor();
    await page
      .getByLabel("Garment name", { exact: true })
      .fill(`${detail.definition.label} authority draft`);
    await click("Services & rates step");
    check(
      (await page
        .getByLabel("Base default rate (INR)", { exact: true })
        .count()) === 1,
      "Priced garment control missing before revocation",
    );
    return { authorityUiPassed: true };
  }
  let writes = 0;
  const recordWrite = (request) => {
    if (
      request.method() === "POST" &&
      request.url().includes("/masters/commands/")
    )
      writes++;
  };
  page.on("request", recordWrite);
  try {
    await click("Refresh access");
    await page
      .getByText(
        "Access refreshed. Your local draft is preserved in a read-only view.",
        { exact: true },
      )
      .waitFor();
    const addon = fixture.phase === "revoked-addon";
    const name = page.getByLabel(addon ? "Add-on name" : "Garment name", {
      exact: true,
    });
    check(await name.isDisabled(), "Revoked editor still permits writes");
    check(
      (await name.inputValue()).endsWith(" authority draft"),
      "Authority refresh discarded the local draft",
    );
    check(
      (await page
        .getByRole("button", { name: "Save new version", exact: true })
        .count()) === 0,
      "Revoked editor retains Save",
    );
    check(
      (await page
        .getByLabel(addon ? "Add-on price (INR)" : "Base default rate (INR)", {
          exact: true,
        })
        .count()) === 0,
      "Revoked price control remains in DOM",
    );
    check(
      (await page
        .getByRole("region", {
          name: addon ? "Historical catalog record" : "Historical eligibility",
        })
        .count()) === 0,
      "Cached exact version survived authority refresh",
    );
    if (addon) {
      check(
        (await page
          .getByRole("columnheader", { name: "Price · INR", exact: true })
          .count()) === 0,
        "Cached register price remains",
      );
    } else {
      await click("Add-ons step");
      check(
        !(
          await page
            .getByRole("region", { name: "Rates and eligibility", exact: true })
            .textContent()
        ).includes("Current add-on price:"),
        "Cached eligibility price remains",
      );
    }
    for (const width of [320, 390, 1024, 1440]) {
      await page.setViewportSize({ width, height: 1000 });
      check(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth + 1,
        ),
        `Editor overflow at ${width}`,
      );
      if (width === 390 || width === 1440)
        await page.screenshot({
          path: `${fixture.artifacts}/${addon ? "addon" : "garment"}-revoked-${width}.png`,
        });
    }
    check(writes === 0, "Authority refresh issued a catalog mutation");
    return { authorityUiPassed: true };
  } finally {
    page.off("request", recordWrite);
  }
}
