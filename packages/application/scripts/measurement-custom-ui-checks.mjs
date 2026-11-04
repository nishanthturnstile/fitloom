export async function exerciseMeasurementCustomUI(page, fixture) {
  page.setDefaultTimeout(15000);
  page.setDefaultNavigationTimeout(20000);
  const uuid = () => page.evaluate(() => crypto.randomUUID());
  const check = (condition, message) => {
    if (!condition) throw Error(message);
  };
  const m = fixture.measurements,
    base = `${fixture.base}/workspaces/${fixture.tenant}/${fixture.location}`,
    book = `${base}/customers/${m.customerId}/wearers/${m.wearerId}/measurements`,
    ownerApi = `${fixture.base}/api/workspaces/${fixture.tenant}/${fixture.location}/measurements/${m.customerId}/${m.wearerId}`,
    masters = `${fixture.base}/api/workspaces/${fixture.tenant}/${fixture.location}/masters`;
  const get = async (url) => {
    const response = await page.request.get(url);
    check(response.ok(), await response.text());
    return response.json();
  };
  const post = async (url, data) => {
    const response = await page.request.post(url, {
      headers: { origin: fixture.base },
      data,
    });
    check(response.ok(), await response.text());
    return response.json();
  };
  const invoke = async (payload) => ({
    payload,
    operationKey: await uuid(),
    correlationId: await uuid(),
  });
  const profile = (
    await post(`${ownerApi}/book`, { search: "UI empty garment custom" })
  ).items.find((row) => row.label === "UI empty garment custom");
  check(profile, "Missing custom fixture");
  const original = await get(`${ownerApi}/${profile.profileId}`);
  // Resolve by the controlled label value without relying on layout or generated IDs.
  const row = (name) =>
    page.locator('[data-slot="field"]').filter({
      has: page.locator(
        `input[aria-label="Custom dimension label"][value="${name}"]`,
      ),
    });
  const select = async (scope, name, option) => {
    await scope.getByRole("combobox", { name, exact: true }).click();
    await page.getByRole("option", { name: option, exact: true }).click();
  };
  const save = () =>
    page
      .getByRole("button", { name: "Save measurement version", exact: true })
      .click();
  const openDefinitions = async (scope) => {
    if (!(await scope.locator("details").evaluate((node) => node.open)))
      await scope.locator("summary").click();
  };
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(`${book}/${profile.profileId}/edit`);
  for (const [kind, name] of [
    ["number", "Count sample"],
    ["text", "Text sample"],
    ["boolean", "Required sample"],
    ["select", "Choice sample"],
  ]) {
    await page
      .getByRole("button", { name: "Add custom dimension", exact: true })
      .click();
    const input = page
      .getByLabel("Custom dimension label", { exact: true })
      .last();
    await input.fill(name);
    await openDefinitions(row(name));
    await select(row(name), "Field kind", kind);
    await openDefinitions(row(name));
    if (kind === "boolean")
      await select(row(name), "Required value", "Required");
    if (kind === "number")
      await page.getByLabel(name, { exact: true }).fill("0");
    if (kind === "text")
      await page.getByLabel(name, { exact: true }).fill("தமிழ்");
    if (kind === "select") await select(page, name, "Option 1");
  }
  await page
    .getByRole("button", { name: "Add custom dimension", exact: true })
    .click();
  await page
    .getByLabel("Custom dimension label", { exact: true })
    .last()
    .fill("Body sample");
  await openDefinitions(row("Body sample"));
  await select(row("Body sample"), "Measurement basis", "body");
  await page.getByLabel("Body sample", { exact: true }).fill("39.000000");
  await save();
  await page.waitForFunction(
    () => document.activeElement?.getAttribute("aria-invalid") === "true",
  );
  check(
    (await page
      .getByRole("combobox", { name: "Required sample", exact: true })
      .getAttribute("aria-invalid")) === "true",
    "Untouched required boolean was accepted",
  );
  check(
    await page
      .getByRole("combobox", { name: "Required sample", exact: true })
      .getAttribute("aria-describedby"),
    "Boolean error was not linked",
  );
  await select(page, "Required sample", "No");
  await page
    .getByLabel("Custom dimension label", { exact: true })
    .nth(2)
    .fill("Count sample");
  await save();
  await page.waitForFunction(
    () =>
      document.activeElement?.id.endsWith("-label") &&
      document.activeElement.getAttribute("aria-invalid") === "true",
  );
  await page
    .getByLabel("Custom dimension label", { exact: true })
    .nth(2)
    .fill("Text sample");

  await row("Count sample").getByLabel("Minimum", { exact: true }).fill("2");
  await save();
  check(
    (await page
      .getByLabel("Count sample", { exact: true })
      .getAttribute("aria-invalid")) === "true",
    "Custom bound did not validate value",
  );
  await row("Count sample").getByLabel("Maximum", { exact: true }).fill("1");
  await save();
  await page.waitForFunction(
    () =>
      document.activeElement?.id.endsWith("-definition") &&
      document.activeElement.getAttribute("aria-invalid") === "true",
  );
  await row("Count sample").getByLabel("Maximum", { exact: true }).fill("");
  await row("Count sample").getByLabel("Minimum", { exact: true }).fill("0");
  for (const width of [1440, 1024, 390, 320]) {
    await page.setViewportSize({ width, height: 844 });
    check(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      `Custom editor overflow at ${width}`,
    );
    await row("Required sample").scrollIntoViewIfNeeded();
    await page.screenshot({
      path: `${fixture.artifacts}/measurement-custom-${width}.png`,
      fullPage: false,
      animations: "disabled",
    });
  }
  await save();
  await page
    .getByRole("heading", { name: "UI empty garment custom", exact: true })
    .waitFor();
  let current = await get(`${ownerApi}/${profile.profileId}`);
  check(
    current.sequence === 2 && current.document.customFields.length === 6,
    "All five custom kinds did not save",
  );
  check(
    current.document.values.some(
      (value) => value.kind === "boolean" && value.value === false,
    ),
    "Required false was lost",
  );
  check(
    current.document.values.some(
      (value) => value.kind === "number" && value.decimal === "0",
    ),
    "Count zero was lost",
  );
  const master = await get(
    `${masters}/garments/${current.schemaRef.garmentId}`,
  );
  const section = await uuid(),
    required = await uuid();
  await page
    .getByRole("link", { name: "Revise current measurements", exact: true })
    .click();
  await page
    .getByLabel("Notes (optional)", { exact: true })
    .fill("Keep my custom data during schema review");
  const updated = await post(
    `${masters}/commands/garment.save`,
    await invoke({
      mode: "update",
      garmentId: master.garmentId,
      expectedVersion: master.version,
      definition: {
        ...master.definition,
        label: "Reviewed garment schema",
        sections: [{ id: section, label: "Review section" }],
        fields: [
          {
            id: required,
            sectionId: section,
            label: "New required confirmation",
            kind: "boolean",
            required: true,
            semanticId: null,
            help: "Explicit confirmation",
            illustrationId: null,
          },
        ],
      },
      baseRate: master.baseRate,
      currency: master.currency,
      serviceOverrides: master.serviceOverrides,
    }),
  );
  await save();
  await page
    .getByRole("button", { name: "Review new schema", exact: true })
    .waitFor();
  check(
    (await page.getByLabel("Count sample", { exact: true }).inputValue()) ===
      "0",
    "Stale schema erased values",
  );
  await page
    .getByRole("button", { name: "Review new schema", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Apply reviewed schema", exact: true })
    .waitFor();
  await page
    .getByRole("button", { name: "Keep original draft", exact: true })
    .click();
  check(
    (await page.getByLabel("Count sample", { exact: true }).inputValue()) ===
      "0",
    "Canceled review changed draft",
  );
  await page
    .getByRole("button", { name: "Review new schema", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Apply reviewed schema", exact: true })
    .click();
  check(
    (await get(`${ownerApi}/${profile.profileId}`)).sequence === 2,
    "Schema review saved without ordinary Save",
  );
  check(
    (await page
      .getByLabel("Notes (optional)", { exact: true })
      .inputValue()) === "Keep my custom data during schema review",
    "Rebase lost notes",
  );
  await save();
  await page.waitForFunction(
    () =>
      document.activeElement?.id?.startsWith("measurement-") &&
      document.activeElement.getAttribute("aria-invalid") === "true",
  );
  await select(page, "New required confirmation", "No");
  await page.screenshot({
    path: `${fixture.artifacts}/measurement-rebase-320.png`,
    fullPage: false,
    animations: "disabled",
  });
  await save();
  await page
    .getByRole("heading", { name: "UI empty garment custom", exact: true })
    .waitFor();
  current = await get(`${ownerApi}/${profile.profileId}`);
  check(
    current.sequence === 3 &&
      current.schemaRef.versionId === updated.result.garmentVersionId,
    "Reviewed rebase not saved",
  );
  check(
    current.document.customFields.every((field) => field.sectionId === section),
    "Rebase did not attach custom fields to current sections",
  );
  check(
    JSON.stringify(
      (
        await get(
          `${ownerApi}/${profile.profileId}/versions/${original.versionId}`,
        )
      ).document,
    ) === JSON.stringify(original.document),
    "Rebase rewrote historical schema",
  );
  await page
    .getByRole("link", { name: "Revise current measurements", exact: true })
    .click();
  await openDefinitions(row("Choice sample"));
  await select(row("Choice sample"), "Choice 1 status", "Inactive");
  await save();
  await page
    .getByRole("heading", { name: "UI empty garment custom", exact: true })
    .waitFor();
  current = await get(`${ownerApi}/${profile.profileId}`);
  check(
    current.sequence === 4,
    "Unchanged inactive choice was rejected during revision",
  );
  const oldId = current.document.customFields.find(
    (field) => field.label === "Count sample",
  ).id;
  await page
    .getByRole("link", { name: "Revise current measurements", exact: true })
    .click();
  await openDefinitions(row("Count sample"));
  await select(row("Count sample"), "Number unit", "Unitless");
  check(
    (await page.getByLabel("Count sample", { exact: true }).inputValue()) ===
      "",
    "Meaning change carried old value",
  );
  await page.getByLabel("Count sample", { exact: true }).fill("1");
  await save();
  await page
    .getByRole("heading", { name: "UI empty garment custom", exact: true })
    .waitFor();
  current = await get(`${ownerApi}/${profile.profileId}`);
  check(
    current.document.customFields.find(
      (field) => field.label === "Count sample",
    ).id !== oldId,
    "Meaning change reused a custom identity",
  );
  await page
    .getByRole("link", { name: "Revise current measurements", exact: true })
    .click();
  await page
    .getByLabel("Notes (optional)", { exact: true })
    .fill("Parent archive race draft");
  const customers = `${fixture.base}/api/workspaces/${fixture.tenant}/${fixture.location}/customers`;
  const customer = await get(`${customers}/${m.customerId}`);
  const wearer = customer.wearers.items.find((w) => w.id === m.wearerId);
  await post(
    `${customers}/commands/wearer.archive`,
    await invoke({
      customerId: m.customerId,
      wearerId: m.wearerId,
      expectedVersion: wearer.version,
    }),
  );
  await save();
  await page.getByText(/This measurement or its owner changed/).waitFor();
  check(
    (await page
      .getByLabel("Notes (optional)", { exact: true })
      .inputValue()) === "Parent archive race draft",
    "Archive race lost draft",
  );
  check(
    (await get(`${ownerApi}/${profile.profileId}`)).sequence === 5,
    "Archived-parent save committed",
  );
  await post(
    `${customers}/commands/wearer.restore`,
    await invoke({
      customerId: m.customerId,
      wearerId: m.wearerId,
      expectedVersion: wearer.version + 1,
    }),
  );
  await page.evaluate(() => {
    window.confirm = () => true;
  });
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await page
    .getByRole("heading", { name: "Measurement book", exact: true })
    .waitFor();
  return { measurementCustomUiPassed: true };
}
