// Runs against the optimized app with synthetic shop data and the real authenticated browser.
export async function exerciseCatalogUI(page, fixture) {
  const check = (value, message) => {
    if (!value) throw Error(message);
  };
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const settings = `${fixture.base}/workspaces/${fixture.tenant}/${fixture.location}/settings/garments`;
  const api = `${fixture.base}/api/workspaces/${fixture.tenant}/${fixture.location}/masters`;
  const get = async (path) => {
    const r = await page.request.get(`${api}${path}`);
    check(r.ok(), `GET ${path}: ${r.status()}`);
    return r.json();
  };
  const step = async (label) =>
    page.getByRole("button", { name: `${label} step`, exact: true }).click();
  const click = async (name) => {
    const back = page.getByRole("button", {
      name: "← Back to garments",
      exact: true,
    });
    if (
      ["Services", "Garments", "Add-ons"].includes(name) &&
      (await back.isVisible())
    )
      await back.click();
    if (name.startsWith("Revision ") && (await back.isVisible()))
      await page.getByRole("tab", { name: "History", exact: true }).click();
    await page.getByRole("button", { name, exact: true }).click();
  };
  const saved = async (revision) =>
    page.getByText(`Saved revision ${revision}.`, { exact: true }).waitFor();
  const serviceLabel = `UI service ${Date.now()}`,
    addonLabel = `UI addon ${Date.now()}`,
    garmentLabel = `UI eligible ${Date.now()}`;
  const search = async (label) => {
    await page.getByLabel("Search by name prefix", { exact: true }).fill(label);
    await click("Refresh register");
    await page.getByText("Register refreshed.", { exact: true }).waitFor();
  };
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(settings);
  await click("Services");
  await click("Create custom service");
  await page.getByLabel("Service name", { exact: true }).fill(serviceLabel);
  // A response is lost after the real transaction commits. Replay must keep the exact operation key.
  let originalBody;
  await page.route("**/masters/commands/service.save", async (route) => {
    originalBody = route.request().postData();
    const r = await route.fetch();
    check(r.ok(), "Service transaction failed");
    await route.abort("failed");
  });
  await click("Save new version");
  await page.getByText(/operation may have completed/).waitFor();
  check(
    await page.getByLabel("Service name", { exact: true }).isDisabled(),
    "Uncertain service save allowed edits",
  );
  await page.unroute("**/masters/commands/service.save");
  await click("Refresh access");
  await page
    .getByText(
      "Access refreshed. Retry the same operation to reconcile the pending result.",
      { exact: true },
    )
    .waitFor();
  check(
    await page.getByLabel("Service name", { exact: true }).isDisabled(),
    "Access refresh unlocked an unresolved command",
  );
  let replay;
  await page.route("**/masters/commands/service.save", async (route) => {
    check(
      route.request().postData() === originalBody,
      "Service retry changed the serialized command envelope",
    );
    const r = await route.fetch();
    replay = await r.json();
    await route.fulfill({ response: r });
  });
  await click("Retry same operation");
  await saved(1);
  check(replay.replayed, "Service retry did not replay");
  await page.unroute("**/masters/commands/service.save");
  const service = (
    await get(`/services?search=${encodeURIComponent(serviceLabel)}`)
  ).items[0];
  await click("Add-ons");
  await click("Create custom add-on");
  await page.getByLabel("Add-on name", { exact: true }).fill(addonLabel);
  await page.getByLabel("Add-on price (INR)", { exact: true }).fill("-1");
  await click("Save new version");
  check(
    (await page
      .getByLabel("Add-on price (INR)", { exact: true })
      .getAttribute("aria-invalid")) === "true",
    "Invalid add-on price had no inline error",
  );
  await page.getByLabel("Add-on price (INR)", { exact: true }).fill("0");
  await click("Save new version");
  await saved(1);
  const addon = (await get(`/addons?search=${encodeURIComponent(addonLabel)}`))
    .items[0];
  check(addon.amount === "0.000000", "Explicit zero add-on price changed");
  await click("Garments");
  await click("Create custom garment");
  await page.getByLabel("Garment name", { exact: true }).fill(garmentLabel);
  await step("Services & rates");
  const eligibility = page.getByRole("region", {
    name: "Rates and eligibility",
    exact: true,
  });
  const baseRate = page.getByLabel("Base default rate (INR)", { exact: true });
  check(await baseRate.isDisabled(), "Unset base rate input is enabled");
  await eligibility
    .locator(".master-rate-control")
    .first()
    .getByLabel("Unset", { exact: true })
    .uncheck();
  await baseRate.fill("88.123456");
  await page
    .getByLabel("Find eligible services by name prefix", { exact: true })
    .fill(serviceLabel);
  await click("Find services");
  await click(`Add ${serviceLabel}`);
  await step("Add-ons");
  await page
    .getByLabel("Find eligible add-ons by name prefix", { exact: true })
    .fill(addonLabel);
  await click("Find add-ons");
  await click(`Add ${addonLabel}`);
  await step("Services & rates");
  await eligibility
    .locator(".master-binding")
    .first()
    .getByLabel("Unset", { exact: true })
    .uncheck();
  await page.getByLabel("Service override 1 (INR)", { exact: true }).fill("0");
  await page
    .getByText("Configured service rate: 0 INR", { exact: true })
    .waitFor();
  await click("Save new version");
  await saved(1);
  const garment = (
    await get(`/garments?search=${encodeURIComponent(garmentLabel)}`)
  ).items[0];
  const original = await get(`/garments/${garment.id}`);
  check(
    original.baseRate === "88.123456" &&
      original.serviceOverrides[0].rateOverride === "0.000000",
    "Base/override decimals did not persist",
  );
  await click("Services");
  await search(serviceLabel);
  await click(serviceLabel);
  await page
    .getByLabel("Service name", { exact: true })
    .fill(`${serviceLabel} renamed`);
  await click("Save new version");
  await saved(2);
  await click("Revision 1");
  await page
    .getByRole("region", { name: "Historical catalog record" })
    .getByText(serviceLabel, { exact: true })
    .waitFor();
  await page.screenshot({
    path: `${fixture.artifacts}/service-editor-desktop.png`,
  });
  await page.setViewportSize({ width: 390, height: 1000 });
  check(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
    "Service editor overflows narrow viewport",
  );
  await page.screenshot({
    path: `${fixture.artifacts}/service-editor-narrow.png`,
  });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page
    .getByLabel("Service name", { exact: true })
    .fill(`${serviceLabel} local`);
  const concurrentHeader = (
    await get(
      `/services?search=${encodeURIComponent(`${serviceLabel} renamed`)}`,
    )
  ).items[0];
  const concurrent = await page.request.post(`${api}/commands/service.save`, {
    headers: { origin: fixture.base },
    data: {
      operationKey: `service-conflict-${Date.now()}`,
      correlationId: "11111111-1111-4111-8111-111111111111",
      payload: {
        mode: "update",
        serviceId: service.id,
        expectedVersion: concurrentHeader.version,
        label: `${serviceLabel} renamed`,
      },
    },
  });
  check(concurrent.ok(), "Concurrent service save failed");
  await click("Save new version");
  await page.getByText(/Another change won/).waitFor();
  check(
    (await page.getByLabel("Service name", { exact: true }).inputValue()) ===
      `${serviceLabel} local`,
    "Service conflict erased local input",
  );
  await page
    .getByLabel("Service name", { exact: true })
    .fill(`${serviceLabel} renamed`);
  await click("Reload saved version");
  await page.getByRole("button", { name: "Revision 3", exact: true }).waitFor();
  await click("Move to end");
  await page.getByText("Catalog order updated.", { exact: true }).waitFor();
  await click("Add-ons");
  await search(addonLabel);
  await click(addonLabel);
  await page
    .getByLabel("Add-on price (INR)", { exact: true })
    .fill("12.345678");
  await click("Save new version");
  await saved(2);
  await click("Revision 1");
  await page.getByText("Saved add-on price: 0 INR", { exact: true }).waitFor();
  await click("Move before…");
  await page.getByRole("dialog").waitFor();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Close", exact: true })
    .click();
  await click("Garments");
  await search(garmentLabel);
  await click(garmentLabel);
  await step("Services & rates");
  await eligibility
    .getByText(`${serviceLabel} renamed`, { exact: true })
    .waitFor();
  await step("Add-ons");
  await page
    .getByText("Current add-on price: 12.345678 INR", { exact: true })
    .waitFor();
  const unchanged = await get(
    `/garments/${garment.id}/versions/${original.garmentVersionId}`,
  );
  check(
    JSON.stringify(unchanged) === JSON.stringify(original),
    "Service/add-on edits rewrote garment history",
  );
  await click("Revision 1");
  const historical = page.getByRole("region", {
    name: "Historical eligibility",
    exact: true,
  });
  await historical.getByText(serviceLabel, { exact: false }).waitFor();
  check(
    !(await historical.textContent()).includes("12.345678"),
    "Historical garment leaked current add-on price",
  );
  await click("Preview draft");
  await step("Services & rates");
  // Unset override falls back to base. Explicit zero base remains different from unset.
  await eligibility
    .locator(".master-binding")
    .first()
    .getByLabel("Unset", { exact: true })
    .check();
  await page
    .getByText("Configured service rate: 88.123456 INR", { exact: true })
    .waitFor();
  await baseRate.fill("0");
  await click("Save new version");
  await saved(2);
  const zero = await get(`/garments/${garment.id}`);
  check(
    zero.baseRate === "0.000000" &&
      zero.serviceOverrides[0].rateOverride === null,
    "Unset override/zero base conflated",
  );
  await eligibility
    .locator(".master-rate-control")
    .first()
    .getByLabel("Unset", { exact: true })
    .check();
  await click("Save new version");
  await saved(3);
  check(
    (await get(`/garments/${garment.id}`)).baseRate === null,
    "Unset base did not persist",
  );
  // Retire both references through the real editors, then carry them through an unrelated garment edit.
  await click("Services");
  await search(`${serviceLabel} renamed`);
  await click(`${serviceLabel} renamed`);
  await click("Deactivate");
  await page.getByText("Catalog settings updated.", { exact: true }).waitFor();
  await click("Add-ons");
  await search(addonLabel);
  await click(addonLabel);
  await click("Deactivate");
  await page.getByText("Catalog settings updated.", { exact: true }).waitFor();
  await click("Garments");
  await search(garmentLabel);
  await click(garmentLabel);
  await step("Services & rates");
  await page.getByText(/Inactive service retained/).waitFor();
  await step("Add-ons");
  await page.getByText(/Inactive add-on retained/).waitFor();
  check(
    await page
      .getByLabel("Service override 1 (INR)", { exact: true })
      .isDisabled(),
    "Retired override editable",
  );
  await step("Identity");
  await page
    .getByLabel("Category", { exact: true })
    .fill("Retained inactive references");
  await click("Save new version");
  await saved(4);
  const retained = await get(`/garments/${garment.id}`);
  check(
    retained.definition.services[0].savedLabel === `${serviceLabel} renamed` &&
      retained.definition.addons[0].addonId === addon.id,
    "Retired binding lost",
  );
  await step("Services & rates");
  await click("Remove service 1");
  await step("Add-ons");
  await click("Remove add-on 1");
  await click("Save new version");
  await saved(5);
  check(
    (await get(`/garments/${garment.id}`)).definition.services.length === 0,
    "Retired service removal failed",
  );
  await click("← Back to garments");
  // Catalog token changes, visibility, no-op install, and committed-install replay.
  await page.locator(".catalog-library summary").click();
  const hide = page.getByLabel("Hide standard garments", { exact: true });
  const wasHidden = await hide.isChecked();
  await hide.setChecked(!wasHidden);
  await page.getByText("Catalog settings updated.", { exact: true }).waitFor();
  check(
    (await get("/catalog")).hideStandardGarments === !wasHidden,
    "Visibility did not persist",
  );
  await click("Install starter library");
  await page
    .getByText(
      "Starter library is already installed. Existing edits are preserved.",
      { exact: true },
    )
    .waitFor();
  let installKey;
  await page.route(
    "**/masters/commands/masters.starters.install",
    async (route) => {
      installKey = route.request().postDataJSON().operationKey;
      const r = await route.fetch();
      check(r.ok(), "Starter install failed");
      await route.abort("failed");
    },
  );
  await click("Install starter library");
  await page.getByText(/operation may have completed/).waitFor();
  await page.unroute("**/masters/commands/masters.starters.install");
  await page.route(
    "**/masters/commands/masters.starters.install",
    async (route) => {
      check(
        route.request().postDataJSON().operationKey === installKey,
        "Install retry changed key",
      );
      const r = await route.fetch();
      await route.fulfill({ response: r });
    },
  );
  await click("Retry same operation");
  await page
    .getByText(
      "Starter installation replayed. The original result was recovered.",
      { exact: true },
    )
    .waitFor();
  await page.unroute("**/masters/commands/masters.starters.install");
  // Restore the prior visibility for the retained increment-4 role scenarios.
  await hide.setChecked(wasHidden);
  await page.getByText("Catalog settings updated.", { exact: true }).waitFor();
  // Reactivate via inactive registers.
  for (const [tab, label] of [
    ["Services", `${serviceLabel} renamed`],
    ["Add-ons", addonLabel],
  ]) {
    await click(tab);
    await page.getByLabel("Status", { exact: true }).selectOption("inactive");
    await search(label);
    await click(label);
    await click("Restore");
    await page
      .getByText("Catalog settings updated.", { exact: true })
      .waitFor();
    await page.getByLabel("Status", { exact: true }).selectOption("active");
  }
  await click("Refresh register");
  await page.getByText("Register refreshed.", { exact: true }).waitFor();
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    path: `${fixture.artifacts}/catalog-desktop.png`,
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  check(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
    "Catalog mobile overflow",
  );
  await page
    .getByRole("region", { name: "Add-on editor", exact: true })
    .scrollIntoViewIfNeeded();
  await page.screenshot({ path: `${fixture.artifacts}/catalog-narrow.png` });
  check(errors.length === 0, `Catalog browser errors: ${errors.join("; ")}`);
  return {
    catalogUiPassed: true,
    serviceId: service.id,
    addonId: addon.id,
    garmentId: garment.id,
  };
}

export async function exerciseStarterUI(page, fixture) {
  const check = (value, message) => {
    if (!value) throw Error(message);
  };
  const api = `${fixture.base}/api/workspaces/${fixture.tenant}/${fixture.location}/masters`;
  const get = async (path) => (await page.request.get(`${api}${path}`)).json();
  const click = async (name) => {
    const back = page.getByRole("button", {
      name: "← Back to garments",
      exact: true,
    });
    if (name === "Install starter library" && (await back.isVisible()))
      await back.click();
    await page.getByRole("button", { name, exact: true }).click();
  };
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(
    `${fixture.base}/workspaces/${fixture.tenant}/${fixture.location}`,
  );
  await page.getByRole("heading", { name: "Home", exact: true }).waitFor();
  await page
    .getByText(
      "No available garments yet. Open the catalog to create one or install starter templates.",
      { exact: true },
    )
    .waitFor();
  await page.getByText("Not installed", { exact: true }).waitFor();
  await page.screenshot({
    path: `${fixture.artifacts}/home-empty.png`,
    fullPage: true,
  });

  await page.goto(
    `${fixture.base}/workspaces/${fixture.tenant}/${fixture.location}/settings/garments`,
  );
  check(
    (await get("/catalog")).catalogVersion === 0,
    "Starter fixture is not empty",
  );
  await page.locator(".catalog-library summary").click();
  await page
    .getByText("No starter library installed yet.", { exact: true })
    .waitFor();
  // An existing custom name collides. The whole install must leave the catalog untouched.
  await click("Create custom garment");
  await page.getByLabel("Garment name", { exact: true }).fill("Shirt");
  await click("Save new version");
  await page.getByText("Saved revision 1.", { exact: true }).waitFor();
  const before = await get("/catalog");
  await click("Install starter library");
  await page.getByText(/Another change won/).waitFor();
  await page
    .getByRole("list", { name: "Starter installation errors" })
    .getByText("Starter name is already reserved", { exact: true })
    .waitFor();
  check(
    JSON.stringify(await get("/catalog")) === JSON.stringify(before),
    "Colliding starter install partially changed catalog",
  );
  check(
    (await get("/services?visibility=all")).total === 0,
    "Colliding starter install added services",
  );
  await page.getByRole("button", { name: /^Resume editing / }).click();
  await page
    .getByLabel("Garment name", { exact: true })
    .fill("My custom shirt");
  await click("Save new version");
  await page.getByText("Saved revision 2.", { exact: true }).waitFor();
  await click("Install starter library");
  await page
    .getByText(
      "Starter library installed. Missing records were added with unset rates; existing edits are preserved.",
      {
        exact: true,
      },
    )
    .waitFor();
  const garments = await get("/garments?visibility=all"),
    services = await get("/services?visibility=all");
  check(
    garments.total === 4 && services.total === 2,
    "First-use starter counts incorrect",
  );
  check(
    garments.items.every((g) => g.baseRate === null),
    "Starter rate was set",
  );
  check(
    garments.items.some(
      (g) => g.label === "My custom shirt" && g.revision === 2,
    ),
    "Starter install overwrote custom edits",
  );
  await click("Install starter library");
  await page
    .getByText(
      "Starter library is already installed. Existing edits are preserved.",
      { exact: true },
    )
    .waitFor();
  await page.screenshot({ path: `${fixture.artifacts}/starter-setup.png` });
  return { starterUiPassed: true };
}

export async function exerciseCatalogReadonlyUI(page, fixture) {
  const check = (value, message) => {
    if (!value) throw Error(message);
  };
  await page.goto(
    `${fixture.base}/workspaces/${fixture.tenant}/${fixture.location}/settings/garments`,
  );
  for (const [tab, label] of [
    ["Services", "Service name"],
    ["Add-ons", "Add-on name"],
  ]) {
    await page.getByRole("button", { name: tab, exact: true }).click();
    await page.locator(".master-row-name").first().click();
    check(
      await page.getByLabel(label, { exact: true }).isDisabled(),
      `${tab} readonly name enabled`,
    );
    check(
      (await page
        .getByRole("button", { name: "Save new version", exact: true })
        .count()) === 0,
      `${tab} readonly save visible`,
    );
    check(
      (await page.getByLabel("Add-on price (INR)", { exact: true }).count()) ===
        0,
      "Readonly addon price input visible",
    );
    check(
      !(await page.content()).includes("12.345678"),
      "Schema-only page contains private price",
    );
    await page.getByRole("button", { name: "Revision 1", exact: true }).click();
    await page
      .getByRole("region", { name: "Historical catalog record" })
      .waitFor();
    check(
      !(
        await page
          .getByRole("region", { name: "Historical catalog record" })
          .textContent()
      ).includes("Saved add-on price"),
      "Schema-only history contains price",
    );
  }
  await page.locator(".catalog-library summary").click();
  check(
    (await page
      .getByRole("button", { name: "Install starter library", exact: true })
      .count()) === 0,
    "Readonly install control visible",
  );
  check(
    await page
      .getByLabel("Hide standard services", { exact: true })
      .isDisabled(),
    "Readonly visibility enabled",
  );
  return { catalogReadonlyUiPassed: true };
}
