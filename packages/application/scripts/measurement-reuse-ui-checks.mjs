export async function exerciseMeasurementReuseUI(page, fixture) {
  page.setDefaultTimeout(15000);
  page.setDefaultNavigationTimeout(20000);
  const check = (ok, message) => {
      if (!ok) throw Error(message);
    },
    uuid = () => page.evaluate(() => crypto.randomUUID());
  const m = fixture.measurements,
    root = `${fixture.base}/api/workspaces/${fixture.tenant}/${fixture.location}`,
    api = `${root}/measurements`,
    ownerApi = `${api}/${m.customerId}/${m.wearerId}`,
    book = `${fixture.base}/workspaces/${fixture.tenant}/${fixture.location}/customers/${m.customerId}/wearers/${m.wearerId}/measurements`;
  const get = async (url) => {
    const r = await page.request.get(url);
    check(r.ok(), await r.text());
    return r.json();
  };
  const post = async (url, data) => {
    const r = await page.request.post(url, {
      headers: { origin: fixture.base },
      data,
    });
    check(r.ok(), await r.text());
    return r.json();
  };
  const command = async (name, payload) =>
    post(`${api}/commands/${name}`, {
      payload,
      operationKey: await uuid(),
      correlationId: await uuid(),
    });
  const select = async (name, option) => {
    await page.getByRole("combobox", { name, exact: true }).click();
    await page.getByRole("option", { name: option, exact: true }).click();
  };
  const save = () =>
    page
      .getByRole("button", { name: "Save measurement version", exact: true })
      .click();
  const row = (
    await post(`${ownerApi}/book`, { search: "UI body profile" })
  ).items.find((item) => item.label === "UI body profile");
  check(row, "Body UI fixture absent");
  let source = await get(`${ownerApi}/${row.profileId}`);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(
    `${book}/${source.profileId}/versions/${source.versionId}/copy`,
  );
  await page
    .getByRole("heading", { name: "Copy measurements", exact: true })
    .waitFor();
  await page
    .getByRole("button", { name: "Preview mapping", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Apply reviewed mapping", exact: true })
    .click();
  await page
    .getByLabel("Profile label", { exact: true })
    .fill("UI independent body");
  check(
    (await post(`${ownerApi}/book`, { search: "UI independent body" }))
      .total === 0,
    "Preview created a profile before Save",
  );
  let lost = false;
  const bytes = [];
  await page.route(
    "**/measurements/commands/measurement.create",
    async (route) => {
      bytes.push(route.request().postData());
      if (!lost) {
        lost = true;
        const response = await route.fetch();
        check(response.ok(), "Copy did not commit");
        await route.abort("failed");
      } else await route.continue();
    },
  );
  await save();
  await page
    .getByRole("button", { name: "Retry exact save", exact: true })
    .click();
  await page
    .getByRole("heading", { name: "UI independent body", exact: true })
    .waitFor();
  await page.unroute("**/measurements/commands/measurement.create");
  check(
    bytes.length === 2 && bytes[0] === bytes[1],
    "Copy retry changed the exact envelope",
  );
  const copyId = JSON.parse(bytes[0]).payload.profileId,
    copy = await get(`${ownerApi}/${copyId}`);
  check(
    copy.sequence === 1 &&
      copy.profileId !== source.profileId &&
      copy.document.origin.kind === "copy",
    "Copy is not an independent header",
  );
  check(
    copy.document.origin.sourceVersionId === source.versionId,
    "Copy lost exact provenance",
  );
  await command("measurement.revise", {
    customerId: m.customerId,
    wearerId: m.wearerId,
    profileId: source.profileId,
    versionId: await uuid(),
    expectedRevision: source.revision,
    schemaRef: source.schemaRef,
    label: source.document.label,
    measuredOn: source.measuredOn,
    values: source.document.values.map((value) =>
      value.kind === "length" ? { ...value, decimal: "39.250000" } : value,
    ),
    customFields: source.document.customFields,
    notes: "Source changed after copy",
    sourceNote: source.document.sourceNote,
    origin: { kind: "manual" },
  });
  check(
    JSON.stringify((await get(`${ownerApi}/${copyId}`)).document) ===
      JSON.stringify(copy.document),
    "Source revision changed independent copy",
  );
  // Saving an untouched copied profile must retain server-owned provenance.
  await page
    .getByRole("link", { name: "Revise current measurements", exact: true })
    .click();
  await save();
  await page
    .getByText("No changes. No new version was created.", { exact: true })
    .waitFor();
  const unchangedCopy = await get(`${ownerApi}/${copyId}`);
  check(
    unchangedCopy.sequence === 1 &&
      JSON.stringify(unchangedCopy.document.origin) ===
        JSON.stringify(copy.document.origin),
    "Untouched copy revision discarded provenance",
  );
  await page
    .getByRole("button", { name: "Open saved version", exact: true })
    .click();
  let archiveLost = false;
  const lifecycleBytes = [];
  await page.route(
    "**/measurements/commands/measurement.archive",
    async (route) => {
      lifecycleBytes.push(route.request().postData());
      if (!archiveLost) {
        archiveLost = true;
        const r = await route.fetch();
        check(r.ok(), "Archive did not commit");
        await route.abort("failed");
      } else await route.continue();
    },
  );
  await page
    .getByRole("button", { name: "Archive profile", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Retry exact lifecycle change", exact: true })
    .waitFor();
  await page.evaluate(() => {
    window.confirm = () => false;
  });
  const uncertainUrl = page.url();
  await page
    .getByRole("link", { name: "Back to measurement book", exact: true })
    .click();
  check(
    page.url() === uncertainUrl,
    "Cancelled lifecycle exit discarded exact retry",
  );
  check(
    await page.evaluate(() => {
      const e = new Event("beforeunload", { cancelable: true });
      window.dispatchEvent(e);
      return e.defaultPrevented;
    }),
    "Uncertain lifecycle has no reload protection",
  );
  const scopeSwitcher = page.getByLabel("Switch shop or location", {
    exact: true,
  });
  await scopeSwitcher.selectOption(
    `${fixture.tenant}/${fixture.secondLocation}`,
  );
  check(
    (await scopeSwitcher.inputValue()) ===
      `${fixture.tenant}/${fixture.location}`,
    "Uncertain lifecycle lost its scope on cancelled switch",
  );
  await page.evaluate(() => {
    window.confirm = () => true;
  });
  await page
    .getByRole("button", { name: "Retry exact lifecycle change", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Restore profile", exact: true })
    .waitFor();
  await page.unroute("**/measurements/commands/measurement.archive");
  check(
    lifecycleBytes.length === 2 && lifecycleBytes[0] === lifecycleBytes[1],
    "Lifecycle retry changed intent",
  );
  let lifecycle = await get(`${ownerApi}/${copyId}`);
  check(
    lifecycle.sequence === 1 && !lifecycle.effectiveActive,
    "Archive changed content sequence",
  );
  await page
    .getByRole("button", { name: "Restore profile", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Archive profile", exact: true })
    .waitFor();
  lifecycle = await get(`${ownerApi}/${copyId}`);
  check(
    lifecycle.sequence === 1 &&
      lifecycle.revision === 3 &&
      lifecycle.effectiveActive,
    "Restore did not preserve exact content",
  );
  source = await get(`${ownerApi}/${row.profileId}`);
  await page.goto(
    `${book}/${source.profileId}/versions/${source.versionId}/copy`,
  );
  await page.getByRole("button", { name: "Garment", exact: true }).click();
  await page
    .getByLabel("Find garment schema", { exact: true })
    .fill(m.mappedGarmentLabel);
  await page
    .getByRole("button", { name: "Find garments", exact: true })
    .click();
  await select("Garment schema", m.mappedGarmentLabel);
  await select("Source for Finished chest", "Chest circumference · body");
  await page
    .getByRole("button", { name: "Preview mapping", exact: true })
    .click();
  await page
    .getByText("Check the mapping, ease decimals and rounding choices.", {
      exact: true,
    })
    .waitFor();
  await page.getByLabel("Ease for Finished chest", { exact: true }).fill("2");
  await page.evaluate(() => {
    window.confirm = () => false;
  });
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  check(
    (await page
      .getByLabel("Ease for Finished chest", { exact: true })
      .inputValue()) === "2",
    "Mapping edit was not protected by the page guard",
  );
  await page.evaluate(() => {
    window.confirm = () => true;
  });
  await page
    .getByRole("button", { name: "Preview mapping", exact: true })
    .click();
  await page.getByText("41.250000 in · transformed", { exact: true }).waitFor();
  await page
    .getByRole("button", { name: "Apply reviewed mapping", exact: true })
    .click();
  check(
    (await page.locator(`#measurement-${m.mappedFieldId}`).inputValue()) ===
      "41.250000",
    "Explicit ease preview was not applied",
  );
  await page
    .getByLabel("Profile label", { exact: true })
    .fill("UI mapped garment");
  check(
    (await post(`${ownerApi}/book`, { search: "UI mapped garment" })).total ===
      0,
    "Mapping created content before ordinary Save",
  );
  for (const width of [1440, 1024, 390, 320]) {
    await page.setViewportSize({ width, height: 844 });
    check(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      `Mapping overflows at ${width}`,
    );
    await page
      .getByRole("button", { name: "Preview mapping", exact: true })
      .scrollIntoViewIfNeeded();
    await page.screenshot({
      path: `${fixture.artifacts}/measurement-mapping-${width}.png`,
      fullPage: false,
      animations: "disabled",
    });
  }
  await page.locator(`#measurement-${m.mappedFieldId}`).fill("42.250000");
  await save();
  await page
    .getByRole("heading", { name: "UI mapped garment", exact: true })
    .waitFor();
  const mapped = (
      await post(`${ownerApi}/book`, { search: "UI mapped garment" })
    ).items[0],
    mappedDetail = await get(`${ownerApi}/${mapped.profileId}`);
  check(
    mappedDetail.document.origin.kind === "mapped" &&
      mappedDetail.document.origin.decisions[0].rule === "ease",
    "Mapped provenance was not retained",
  );
  check(
    mappedDetail.document.origin.manualFieldIds.includes(m.mappedFieldId),
    "Manual edits after mapping were not separated from source values",
  );
  await page
    .getByRole("link", { name: "Revise current measurements", exact: true })
    .click();
  await save();
  await page
    .getByText("No changes. No new version was created.", { exact: true })
    .waitFor();
  const unchangedMapping = await get(`${ownerApi}/${mapped.profileId}`);
  check(
    unchangedMapping.sequence === 1 &&
      JSON.stringify(unchangedMapping.document.origin) ===
        JSON.stringify(mappedDetail.document.origin),
    "Untouched mapped revision discarded attribution",
  );
  await page
    .getByRole("button", { name: "Open saved version", exact: true })
    .click();
  await page
    .getByRole("heading", { name: "UI mapped garment", exact: true, level: 1 })
    .waitFor();
  await page.goto(book);
  await select("Filter by garment", m.mappedGarmentLabel);
  await page
    .getByRole("button", { name: "UI mapped garment", exact: true })
    .waitFor();
  check(
    (await page
      .getByRole("button", { name: "UI body profile", exact: true })
      .count()) === 0,
    "Garment filter retained body profiles",
  );
  for (const width of [320, 390, 1024, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    check(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      `Garment book filter overflows at ${width}`,
    );
    await page.screenshot({
      path: `${fixture.artifacts}/measurement-book-filter-${width}.png`,
      fullPage: true,
      animations: "disabled",
    });
  }

  const comparison = await post(`${ownerApi}/compare`, {
    versions: [
      { profileId: source.profileId, versionId: source.versionId },
      { profileId: mapped.profileId, versionId: mapped.versionId },
    ],
    unit: "cm",
  });
  check(
    comparison.rows.some(
      (row) =>
        row.cells[1].status === "incompatible" && row.cells[1].delta === null,
    ),
    "Body and garment bases were compared as directly equivalent",
  );
  const capture = await get(
    `${ownerApi}/${mapped.profileId}/versions/${mapped.versionId}/capture`,
  );
  check(
    capture.immutable.document.origin.kind === "mapped",
    "Capture lost source provenance",
  );
  // Historical source definitions remain readable and can start a new independent draft.
  await page.goto(`${book}/${m.profileId}/versions/${m.versionId}/copy`);
  await page
    .getByRole("button", { name: "Preview mapping", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Apply reviewed mapping", exact: true })
    .click();
  await page
    .getByLabel("Profile label", { exact: true })
    .fill("UI historical copy");
  await save();
  await page
    .getByRole("heading", { name: "UI historical copy", exact: true })
    .waitFor();
  const historical = (
    await post(`${ownerApi}/book`, { search: "UI historical copy" })
  ).items[0];
  check(
    (await get(`${ownerApi}/${historical.profileId}`)).document.origin
      .sourceVersionId === m.versionId,
    "Historical reuse changed its source reference",
  );
  return { measurementReuseUiPassed: true };
}
