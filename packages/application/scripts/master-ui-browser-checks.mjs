// Serialized into playwright-cli's isolated browser session. No credentials occur in this function.
export async function exerciseGarmentUI(page, fixture) {
  const check = (condition, message) => {
    if (!condition) throw new Error(message);
  };
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const settings = `${fixture.base}/workspaces/${fixture.tenant}/${fixture.location}/settings/garments`;
  const api = `${fixture.base}/api/workspaces/${fixture.tenant}/${fixture.location}/masters`;
  const get = async (suffix) => {
    const response = await page.request.get(`${api}${suffix}`);
    check(response.ok(), `GET ${suffix} failed`);
    return response.json();
  };
  const post = async (action, payload) => {
    const response = await page.request.post(`${api}/commands/${action}`, {
      headers: { origin: fixture.base },
      data: {
        operationKey: `ui-${Date.now()}-${Math.random()}`,
        correlationId: "11111111-1111-4111-8111-111111111111",
        payload,
      },
    });
    check(response.ok(), `Command ${action} failed`);
    return response.json();
  };
  await page.setViewportSize({ width: 1440, height: 1000 });
  if (fixture.phase === "build" || fixture.phase === "readonly")
    await page.goto(settings);
  if (fixture.phase === "build" || fixture.phase === "readonly")
    await page
      .getByRole("heading", { name: "Garments and services", exact: true })
      .waitFor();
  else {
    const resumeButton = page.getByRole("button", { name: /^Resume editing / });
    if (await resumeButton.isVisible()) await resumeButton.click();
  }
  const step = async (label) =>
    page.getByRole("button", { name: `${label} step`, exact: true }).click();
  const resume = async () => {
    const button = page.getByRole("button", { name: /^Resume editing / });
    if (await button.isVisible()) await button.click();
  };
  const back = async () => {
    const button = page.getByRole("button", {
      name: "← Back to garments",
      exact: true,
    });
    if (await button.isVisible()) await button.click();
  };
  const name = () => page.getByLabel("Garment name", { exact: true });
  const dimension = (index) =>
    page.getByRole("group", { name: `Dimension ${index}`, exact: true });
  const saved = (revision) =>
    page.getByText(`Saved revision ${revision}.`, { exact: true }).waitFor();
  if (fixture.phase === "capture") {
    const foundation = await page.evaluate(async () => {
      await document.fonts.ready;
      const heading = document.querySelector(".garment-editor h1");
      const shell = document.querySelector(".workspace-foundation");
      const compatibility = document.querySelector(".garment-shell");
      const switcher = document.getElementById("shell-workspace");
      if (!heading || !shell || !compatibility || !switcher) return null;
      return {
        headingFont: getComputedStyle(heading).fontFamily,
        headingSize: getComputedStyle(heading).fontSize,
        controlFont: getComputedStyle(switcher).fontFamily,
        outsideLegacy: !heading.closest(".workspace-shell"),
        semanticMuted: getComputedStyle(compatibility)
          .getPropertyValue("--muted")
          .trim(),
        rootMuted: getComputedStyle(document.documentElement)
          .getPropertyValue("--muted")
          .trim(),
        mutedText: getComputedStyle(compatibility)
          .getPropertyValue("--muted-foreground")
          .trim(),
        legacyMuted: getComputedStyle(compatibility)
          .getPropertyValue("--legacy-muted")
          .trim(),
        monoLoaded:
          getComputedStyle(document.documentElement)
            .getPropertyValue("--font-ibm-plex-mono")
            .trim().length > 0,
      };
    });
    check(
      foundation?.outsideLegacy,
      "Preset header inherited legacy workspace styles",
    );
    check(
      foundation?.headingSize === "24px" &&
        foundation.headingFont.includes("Noto"),
      "Heading typography differs from the foundation",
    );
    check(
      foundation?.controlFont.includes("IBM"),
      "Workspace control lost its Sans font",
    );
    check(
      foundation?.semanticMuted === foundation?.rootMuted &&
        foundation?.semanticMuted !== foundation?.mutedText &&
        !foundation?.legacyMuted,
      "Legacy text token shadows preset muted background",
    );
    check(foundation?.monoLoaded, "IBM Plex Mono variable is missing");
    await page.waitForFunction(
      (expected) =>
        document.querySelector('input[id="master-definition-label"]')?.value ===
        expected,
      `${fixture.pricedLabel} remote`,
    );
    await page
      .getByRole("heading", {
        name: `${fixture.pricedLabel} remote`,
        level: 1,
        exact: true,
      })
      .waitFor();
    await page.screenshot({ path: `${fixture.artifacts}/desktop.png` });
    await page.setViewportSize({ width: 390, height: 844 });
    await step("Identity");
    await name().scrollIntoViewIfNeeded();
    check(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth + 1,
      ),
      "Narrow screen overflows horizontally",
    );
    await page.screenshot({ path: `${fixture.artifacts}/narrow.png` });
    return { garmentUiPassed: true, phase: "capture" };
  }
  if (fixture.phase === "readonly") {
    await page
      .getByLabel("Search by name prefix", { exact: true })
      .fill(fixture.newLabel);
    await page
      .getByRole("button", { name: "Refresh register", exact: true })
      .click();
    check(
      (await page
        .getByRole("button", { name: "Create custom garment", exact: true })
        .count()) === 0,
      "Read-only create control is present",
    );
    await page
      .getByRole("button", { name: fixture.newLabel, exact: true })
      .click();
    await name().waitFor();
    check(await name().isDisabled(), "Read-only input is editable");
    check(
      (await page
        .getByRole("button", { name: "Save new version", exact: true })
        .count()) === 0,
      "Read-only save control is present",
    );
    const source = await page.content();
    check(!source.includes("88.123456"), "A price reached the read-only page");
    const register = page.getByRole("region", {
      name: "Master register",
      exact: true,
    });
    check(
      (await register.getByRole("columnheader", { name: /INR/ }).count()) === 0,
      "Schema-only table exposes a price column",
    );
    await back();
    await page.getByRole("button", { name: "Card view", exact: true }).click();
    check(
      !(await page.content()).includes("88.123456"),
      "A price reached schema-only cards",
    );
    await page.screenshot({
      path: `${fixture.artifacts}/register-schema-only-cards.png`,
    });
    await page.getByRole("button", { name: "Table view", exact: true }).click();
    return { garmentUiPassed: true, phase: "readonly" };
  }
  if (fixture.phase === "denied")
    throw new Error("Denied phase must be tested before the normal heading");
  if (fixture.phase === "build") {
    await page.getByRole("button", { name: "Next page", exact: true }).click();
    await page.waitForFunction(
      () => document.querySelectorAll("[data-master-row]").length === 2,
    );
    await page
      .getByRole("button", { name: "Previous page", exact: true })
      .click();
    await page.waitForFunction(
      () => document.querySelectorAll("[data-master-row]").length === 50,
    );

    await page
      .getByRole("button", { name: "Create custom garment", exact: true })
      .click();
    await name().fill(fixture.newLabel);
    await step("Measurements");
    await page
      .getByText("No dimensions are required.", { exact: true })
      .waitFor();
    await page
      .getByRole("button", { name: "Add section", exact: true })
      .click();
    await page
      .getByRole("group", { name: "Section 1", exact: true })
      .getByLabel("Section label", { exact: true })
      .fill("Body");
    for (let n = 1; n <= 5; n++) {
      await page
        .getByRole("button", { name: "Add dimension", exact: true })
        .click();
      const field = dimension(n);
      if (n > 1)
        await field
          .getByLabel("Field type", { exact: true })
          .selectOption(
            ["length", "number", "text", "boolean", "select"][n - 1],
          );
      await field
        .getByLabel("Dimension label", { exact: true })
        .fill(["Chest", "Buttons", "Notes", "Has lining", "Fit"][n - 1]);
    }
    await dimension(1)
      .getByLabel("Required dimension", { exact: true })
      .check();
    await dimension(2).getByLabel("Minimum", { exact: true }).fill("0");
    await dimension(2).getByLabel("Maximum", { exact: true }).fill("10");
    await dimension(3)
      .getByLabel("Maximum characters", { exact: true })
      .fill("200");
    const keyboardMove = page.getByRole("button", {
      name: "Move Buttons up",
      exact: true,
    });
    await keyboardMove.focus();
    await keyboardMove.press("Enter");
    check(
      (await dimension(1)
        .getByLabel("Dimension label", { exact: true })
        .inputValue()) === "Buttons",
      "Field reorder failed",
    );
    check(
      (await page.evaluate(
        () =>
          document.activeElement
            .closest("fieldset")
            .querySelector('input[type="text"], input:not([type])')?.value,
      )) === "Buttons",
      "Reorder did not preserve focus in the moved field",
    );
    await page
      .getByRole("button", { name: "Add section", exact: true })
      .click();
    await page
      .getByRole("group", { name: "Section 2", exact: true })
      .getByLabel("Section label", { exact: true })
      .fill("Garment");
    await page
      .getByRole("button", { name: "Move Garment up", exact: true })
      .click();
    await step("Construction");
    for (let n = 1; n <= 2; n++) {
      await page
        .getByRole("button", { name: "Add construction group", exact: true })
        .click();
      const group = page.getByRole("group", {
        name: `Construction group ${n}`,
        exact: true,
      });
      await group
        .getByLabel("Group label", { exact: true })
        .fill(n === 1 ? "Collar" : "Finish");
      if (n === 2)
        await group
          .getByLabel("Selection", { exact: true })
          .selectOption("multiple");
    }
    const collar = page.getByRole("group", {
      name: "Construction group 1",
      exact: true,
    });
    await collar
      .getByRole("button", { name: "Add choice", exact: true })
      .click();
    await collar
      .getByRole("group", { name: "Choice 2", exact: true })
      .getByLabel("Choice label", { exact: true })
      .fill("Mandarin");
    await collar
      .getByRole("button", { name: "Move Mandarin up", exact: true })
      .click();
    return { garmentUiPassed: true, phase: "build" };
  }
  check(
    await page.evaluate(() => {
      const e = new Event("beforeunload", { cancelable: true });
      window.dispatchEvent(e);
      return e.defaultPrevented;
    }),
    "Dirty form has no unload guard",
  );
  await resume();
  await step("Measurements");
  await dimension(1).getByLabel("Minimum", { exact: true }).fill("11");
  await page
    .getByRole("button", { name: "Save new version", exact: true })
    .click();
  await dimension(1)
    .getByText("Maximum must be at least minimum", { exact: true })
    .waitFor();
  check(
    (await dimension(1)
      .getByLabel("Maximum", { exact: true })
      .getAttribute("aria-invalid")) === "true",
    "Incompatible bounds had no inline error",
  );
  check(
    (await dimension(1).getByLabel("Minimum", { exact: true }).inputValue()) ===
      "11",
    "Invalid bounds erased local input",
  );
  check(
    (await page
      .getByRole("button", { name: "Measurements step", exact: true })
      .getAttribute("aria-current")) === "step",
    "Validation did not open the Measurements step",
  );
  await page.waitForFunction(
    () => document.activeElement?.getAttribute("aria-invalid") === "true",
  );
  check(
    await page.evaluate(() => {
      const field = document.activeElement?.getBoundingClientRect();
      const header = document
        .querySelector(".editor-heading")
        ?.getBoundingClientRect();
      const footer = document
        .querySelector(".editor-save-bar")
        ?.getBoundingClientRect();
      return (
        field &&
        header &&
        footer &&
        field.top >= header.bottom &&
        field.bottom <= footer.top
      );
    }),
    "Sticky chrome covers the focused invalid field",
  );
  await dimension(1).getByLabel("Minimum", { exact: true }).fill("0");
  await page
    .getByRole("button", { name: "Save new version", exact: true })
    .click();
  await saved(1);
  check(
    !(await page.evaluate(() => {
      const event = new Event("beforeunload", { cancelable: true });
      window.dispatchEvent(event);
      return event.defaultPrevented;
    })),
    "Clean form retained its unload guard",
  );
  const rows = await get(
    `/garments?search=${encodeURIComponent(fixture.newLabel)}`,
  );
  const id = rows.items.find((row) => row.label === fixture.newLabel).id;
  const first = await get(`/garments/${id}`);
  check(first.definition.fields.length === 5, "Not all five fields persisted");
  check(
    first.definition.sections[0].label === "Garment",
    "Section order did not persist",
  );
  check(
    first.definition.constructionGroups[0].choices[0].label === "Mandarin",
    "Choice order did not persist",
  );
  const chestId = first.definition.fields.find((f) => f.label === "Chest").id;
  await step("Identity");
  await name().fill("");
  await page
    .getByRole("button", { name: "Save new version", exact: true })
    .click();
  check(
    (await name().getAttribute("aria-invalid")) === "true",
    "Validation did not identify the empty name",
  );
  check((await name().inputValue()) === "", "Validation erased input");
  await name().fill(`${fixture.newLabel} v2`);
  // Commit through the real API, then lose the response before the UI receives it.
  let lostBody;
  await page.route("**/masters/commands/garment.save", async (route) => {
    lostBody = route.request().postData();
    const response = await route.fetch();
    check(response.status() === 200, "Lost-response save did not commit");
    await route.abort();
  });
  await page
    .getByRole("button", { name: "Save new version", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Retry same operation", exact: true })
    .waitFor();
  await page.unroute("**/masters/commands/garment.save");
  const retryResponse = page.waitForResponse(
    (response) =>
      response.url().endsWith("/commands/garment.save") &&
      response.request().method() === "POST",
  );
  await page
    .getByRole("button", { name: "Retry same operation", exact: true })
    .click();
  const retried = await retryResponse;
  check(
    retried.request().postData() === lostBody,
    "Retry changed the serialized command envelope",
  );
  check(
    (await retried.json()).replayed,
    "Retry did not replay the committed operation",
  );
  await saved(2);
  await step("Measurements");
  await page.getByRole("button", { name: "Remove Chest", exact: true }).click();
  await page
    .getByRole("button", { name: "Save new version", exact: true })
    .click();
  await saved(3);
  await page.getByRole("tab", { name: "History", exact: true }).click();
  await page.getByRole("button", { name: "Revision 1", exact: true }).click();
  await page
    .getByRole("heading", { name: "Saved revision 1", exact: true })
    .waitFor();
  await page
    .getByRole("button", { name: "Copy from previous version", exact: true })
    .click();
  await page.getByText(/Copied revision 1 into an unsaved draft/).waitFor();
  check(
    (await get(`/garments/${id}`)).revision === 3,
    "Copy moved the saved pointer before Save",
  );
  await page
    .getByRole("button", { name: "Save new version", exact: true })
    .click();
  await saved(4);
  const fourth = await get(`/garments/${id}`);
  check(
    fourth.definition.fields.find((f) => f.label === "Chest").id !== chestId,
    "Copy reused a retired field identity",
  );
  check(
    (
      await get(`/garments/${id}/versions/${first.garmentVersionId}`)
    ).definition.fields.find((f) => f.label === "Chest").id === chestId,
    "Original history changed",
  );
  await back();
  await page
    .getByLabel("Search by name prefix", { exact: true })
    .fill(fixture.newLabel);
  await page
    .getByRole("button", { name: "Refresh register", exact: true })
    .click();
  const row = () =>
    page.locator("[data-master-row]").filter({
      has: page.getByRole("button", { name: fixture.newLabel, exact: true }),
    });
  await row()
    .getByRole("button", { name: "Move before…", exact: true })
    .click();
  const dialog = page.getByRole("dialog");
  await dialog
    .getByLabel("Find destination by name prefix", { exact: true })
    .fill(fixture.pricedLabel);
  await dialog
    .getByRole("button", { name: "Find destination", exact: true })
    .click();
  await dialog
    .getByRole("button", { name: fixture.pricedLabel, exact: true })
    .click();
  await page.getByText("Catalog order updated.", { exact: true }).waitFor();
  check(
    (await get("/garments")).items[0].id === id,
    "Catalog move-before did not cross pages",
  );
  // The open editor exposes the same lifecycle action as the register.
  const storedActive = async () =>
    (
      await get(
        `/garments?active=all&visibility=all&search=${encodeURIComponent(fixture.newLabel)}`,
      )
    ).items.find((item) => item.id === id)?.active;
  await resume();
  const editorActive = page.getByRole("checkbox", { name: /Active garment/ });
  check(await editorActive.isChecked(), "Editor active state is missing");
  await editorActive.uncheck();
  await page.getByText("Garment marked inactive.", { exact: true }).waitFor();
  check(!(await storedActive()), "Editor deactivate failed");
  await editorActive.check();
  await page.getByText("Garment marked active.", { exact: true }).waitFor();
  check(await storedActive(), "Editor restore failed");
  await back();
  await row().getByRole("button", { name: "Deactivate", exact: true }).click();
  await page.getByText("Garment marked inactive.", { exact: true }).waitFor();
  await page.getByLabel("Status", { exact: true }).selectOption("inactive");
  await page
    .getByRole("button", { name: "Refresh register", exact: true })
    .click();
  await row().getByRole("button", { name: "Restore", exact: true }).click();
  await page.getByText("Garment marked active.", { exact: true }).waitFor();
  await page.getByLabel("Status", { exact: true }).selectOption("active");
  await page
    .getByRole("button", { name: "Refresh register", exact: true })
    .click();
  await row().getByRole("button", { name: "Move to end", exact: true }).click();
  await page.getByText("Catalog order updated.", { exact: true }).waitFor();
  check(
    (await get(`/garments/${id}`)).revision === 4,
    "Lifecycle changed the content revision",
  );
  await page.getByLabel("Search by name prefix", { exact: true }).fill("");
  await page
    .getByRole("button", { name: "Refresh register", exact: true })
    .click();
  await resume();
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await page
    .getByRole("button", { name: fixture.pricedLabel, exact: true })
    .click();
  await name().waitFor();
  const prior = await get(`/garments/${fixture.pricedId}`);
  await page.getByLabel("Category", { exact: true }).fill("UI tailored");
  await page
    .getByRole("button", { name: "Save new version", exact: true })
    .click();
  await saved(2);
  const after = await get(`/garments/${fixture.pricedId}`);
  check(
    after.baseRate === prior.baseRate &&
      JSON.stringify(after.serviceOverrides) ===
        JSON.stringify(prior.serviceOverrides),
    "Schema edit changed a saved rate",
  );
  check(
    JSON.stringify(after.definition.services) ===
      JSON.stringify(prior.definition.services) &&
      JSON.stringify(after.definition.addons) ===
        JSON.stringify(prior.definition.addons),
    "Schema edit changed eligibility",
  );
  await name().fill(`${fixture.pricedLabel} local`);
  await post("garment.save", {
    mode: "update",
    garmentId: fixture.pricedId,
    expectedVersion: after.version,
    definition: { ...after.definition, label: `${fixture.pricedLabel} remote` },
    baseRate: after.baseRate,
    currency: after.currency,
    serviceOverrides: after.serviceOverrides,
  });
  await page
    .getByRole("button", { name: "Save new version", exact: true })
    .click();
  await page.getByText(/Another change won/).waitFor();
  check(
    (await name().inputValue()) === `${fixture.pricedLabel} local`,
    "Conflict erased input",
  );
  await page.getByRole("button", { name: "Keep editing", exact: true }).click();
  check(
    (await name().inputValue()) === `${fixture.pricedLabel} local`,
    "Keep editing lost input",
  );
  check(errors.length === 0, `Browser runtime errors: ${errors.join("; ")}`);
  return {
    garmentUiPassed: true,
    phase: "editor",
    checks:
      "all field kinds, ordered sections/fields/choices, focus, dirty navigation, exact history/copy, retired IDs, preserved rates, conflicts, lost-response replay, narrow layout",
  };
}
