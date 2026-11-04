// Runs in the retained authenticated browser and test database.
export async function exerciseMeasurementRevisionUI(page, fixture) {
  page.setDefaultTimeout(15000);
  page.setDefaultNavigationTimeout(20000);
  const uuid = () => page.evaluate(() => crypto.randomUUID());
  const check = (condition, message) => {
    if (!condition) throw Error(message);
  };
  const m = fixture.measurements,
    base = `${fixture.base}/workspaces/${fixture.tenant}/${fixture.location}`,
    book = `${base}/customers/${m.customerId}/wearers/${m.wearerId}/measurements`,
    api = `${fixture.base}/api/workspaces/${fixture.tenant}/${fixture.location}/measurements`,
    ownerApi = `${api}/${m.customerId}/${m.wearerId}`;
  const get = async (url) => {
    const response = await page.request.get(url);
    check(response.ok(), `Read failed ${response.status()}`);
    return response.json();
  };
  const post = async (url, data) => {
    const response = await page.request.post(url, {
      headers: { origin: fixture.base },
      data,
    });
    check(
      response.ok(),
      `Command failed ${response.status()} ${await response.text()}`,
    );
    return response.json();
  };
  const command = async (name, payload) =>
    post(`${api}/commands/${name}`, {
      payload,
      operationKey: await uuid(),
      correlationId: await uuid(),
    });
  const notes = () => page.getByLabel("Notes (optional)", { exact: true });
  const save = () =>
    page
      .getByRole("button", { name: "Save measurement version", exact: true })
      .click();
  const select = async (name, option, scope = page) => {
    await scope.getByRole("combobox", { name, exact: true }).click();
    await page.getByRole("option", { name: option, exact: true }).click();
  };
  const body = (
    await post(`${ownerApi}/book`, { search: "UI body profile" })
  ).items.find((row) => row.label === "UI body profile");
  check(body, "Missing retained body fixture");
  const original = await get(`${ownerApi}/${body.profileId}`);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(`${book}/${body.profileId}`);
  await page
    .getByRole("link", { name: "Revise current measurements", exact: true })
    .click();
  await page
    .getByRole("heading", { name: "Revise measurements", exact: true })
    .waitFor();
  const chest = page.getByLabel("Chest circumference", { exact: true });
  check(
    (await chest.inputValue()) === "38.250000",
    "Revision lost original decimal",
  );
  await select("Chest circumference unit", "cm");
  check((await chest.inputValue()) === "97.16", "Pinned precision not used");
  check(
    !(await page.evaluate(() => {
      const e = new Event("beforeunload", { cancelable: true });
      window.dispatchEvent(e);
      return e.defaultPrevented;
    })),
    "Display-only unit change dirtied the revision",
  );
  await save();
  await page
    .getByText("No changes. No new version was created.", { exact: true })
    .waitFor();
  check(
    (await get(`${ownerApi}/${body.profileId}`)).sequence === 1,
    "No-op emitted a version",
  );
  await page
    .getByRole("button", { name: "Open saved version", exact: true })
    .click();
  await page
    .getByRole("heading", { name: "UI body profile", exact: true })
    .waitFor();
  await page
    .getByRole("link", { name: "Revise current measurements", exact: true })
    .click();
  await notes().fill("Revision survives a committed response loss");
  let lost = false;
  const bytes = [];
  await page.route(
    "**/measurements/commands/measurement.revise",
    async (route) => {
      bytes.push(route.request().postData());
      if (!lost) {
        lost = true;
        const response = await route.fetch();
        check(response.ok(), "Revision did not commit");
        await route.abort("failed");
      } else await route.continue();
    },
  );
  await save();
  await page
    .getByRole("button", { name: "Retry exact save", exact: true })
    .waitFor();
  check(
    await notes().isDisabled(),
    "Uncertain revision permits conflicting edits",
  );
  await page.evaluate(() => {
    window.confirm = () => false;
  });
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  check(
    (await notes().inputValue()) ===
      "Revision survives a committed response loss",
    "Uncertain cancel erased draft",
  );
  await page
    .getByRole("button", { name: "Retry exact save", exact: true })
    .click();
  await page
    .getByRole("heading", { name: "UI body profile", exact: true })
    .waitFor();
  await page.unroute("**/measurements/commands/measurement.revise");
  check(
    bytes.length === 2 && bytes[0] === bytes[1],
    "Revision retry changed exact envelope",
  );
  let current = await get(`${ownerApi}/${body.profileId}`);
  check(current.sequence === 2, "Revision replay emitted extra content");
  check(
    JSON.stringify(
      (
        await get(
          `${ownerApi}/${body.profileId}/versions/${original.versionId}`,
        )
      ).document,
    ) === JSON.stringify(original.document),
    "Revision rewrote history",
  );
  await page
    .getByRole("link", { name: "Revise current measurements", exact: true })
    .click();
  await notes().fill("Saved projection outage");
  await page.route(
    `**/measurements/${m.customerId}/${m.wearerId}/${body.profileId}/versions/*`,
    (route) => route.abort("failed"),
  );
  await save();
  await page.getByText(/Saved; details unavailable/).waitFor();
  current = await get(`${ownerApi}/${body.profileId}`);
  check(
    current.sequence === 3,
    "Saved projection outage did not retain commit",
  );
  await page.unroute(
    `**/measurements/${m.customerId}/${m.wearerId}/${body.profileId}/versions/*`,
  );
  await page
    .getByRole("button", { name: "Open saved version", exact: true })
    .click();
  await page
    .getByRole("heading", { name: "UI body profile", exact: true })
    .waitFor();
  check(
    (await get(`${ownerApi}/${body.profileId}`)).sequence === 3,
    "Projection retry wrote again",
  );
  await page
    .getByRole("link", { name: "Revise current measurements", exact: true })
    .click();
  await notes().fill("Local conflict draft");
  await command("measurement.revise", {
    customerId: m.customerId,
    wearerId: m.wearerId,
    profileId: body.profileId,
    versionId: await uuid(),
    expectedRevision: current.revision,
    schemaRef: current.schemaRef,
    label: current.document.label,
    measuredOn: current.measuredOn,
    values: current.document.values,
    customFields: current.document.customFields,
    notes: "Remote competing change",
    sourceNote: current.document.sourceNote,
    origin: { kind: "manual" },
  });
  await save();
  await page.getByText(/This measurement or its owner changed/).waitFor();
  check(
    (await notes().inputValue()) === "Local conflict draft",
    "Conflict erased revision input",
  );
  await page.screenshot({
    path: `${fixture.artifacts}/measurement-conflict-1440.png`,
    fullPage: false,
    animations: "disabled",
  });
  await page.evaluate(() => {
    window.confirm = () => true;
  });
  await page
    .getByRole("button", { name: "Discard draft and reload", exact: true })
    .click();
  await notes().waitFor();
  await page.waitForFunction(
    () =>
      document.querySelector("#measurement-notes")?.value ===
      "Remote competing change",
  );
  await notes().fill("Server validation retains draft");
  await page.route(
    "**/measurements/commands/measurement.revise",
    async (route) => {
      const envelope = JSON.parse(route.request().postData());
      envelope.payload.measuredOn = "9999-01-01";
      const response = await route.fetch({
        postData: JSON.stringify(envelope),
      });
      check(response.status() === 400, "Expected real server date validation");
      await route.fulfill({ response });
    },
  );
  await save();
  await page.waitForFunction(
    () =>
      document.activeElement?.id === "measurement-date" &&
      document.activeElement.getAttribute("aria-invalid") === "true",
  );
  check(
    (await notes().inputValue()) === "Server validation retains draft",
    "Server validation erased input",
  );
  await page.unroute("**/measurements/commands/measurement.revise");
  page.setDefaultNavigationTimeout(3000);
  return { measurementRevisionPrepared: true };
}

export async function exerciseMeasurementNavigationUI(page, fixture) {
  page.setDefaultTimeout(15000);
  page.setDefaultNavigationTimeout(20000);
  const check = (condition, message) => {
    if (!condition) throw Error(message);
  };
  const notes = () => page.getByLabel("Notes (optional)", { exact: true });
  check(
    (await notes().inputValue()) === "Server validation retains draft",
    "Native canceled reload/back lost the draft",
  );
  await page.evaluate(() => {
    window.confirm = () => false;
  });
  const switcher = page.getByLabel("Switch shop or location", { exact: true });
  await switcher.selectOption(`${fixture.tenant}/${fixture.secondLocation}`);
  check(
    (await switcher.inputValue()) === `${fixture.tenant}/${fixture.location}`,
    "Canceled scope switch changed selection",
  );
  await page.keyboard.press("Control+k");
  check(
    (await notes().inputValue()) === "Server validation retains draft",
    "Search shortcut lost draft",
  );
  await page.evaluate(() => {
    window.confirm = () => true;
  });
  await page.route("**/api/workspaces/switch", (route) =>
    route.abort("failed"),
  );
  await switcher.selectOption(`${fixture.tenant}/${fixture.secondLocation}`);
  await page.getByText(/Workspace switch failed/).waitFor();
  check(
    (await notes().inputValue()) === "Server validation retains draft",
    "Failed scope switch lost draft",
  );
  await page.unroute("**/api/workspaces/switch");
  const stored = await page.evaluate(() =>
    [...Object.values(sessionStorage), ...Object.values(localStorage)].join(
      "\n",
    ),
  );
  check(
    !stored.includes("Server validation retains draft"),
    "Revision draft entered browser storage",
  );
  await switcher.selectOption(`${fixture.tenant}/${fixture.secondLocation}`);
  await page.waitForURL(
    `${fixture.base}/workspaces/${fixture.tenant}/${fixture.secondLocation}/customers`,
  );
  check(
    !page.url().includes(fixture.measurements.customerId),
    "Scope switch retained source owner ID",
  );
  await page
    .getByLabel("Switch shop or location", { exact: true })
    .selectOption(`${fixture.tenant}/${fixture.location}`);
  await page.waitForURL(
    `${fixture.base}/workspaces/${fixture.tenant}/${fixture.location}/customers`,
  );
  return { measurementRevisionUiPassed: true };
}

export async function exerciseMeasurementRevocationUI(page, fixture) {
  page.setDefaultTimeout(15000);
  const m = fixture.measurements;
  if (fixture.phase === "prepare-revocation") {
    await page.goto(
      `${fixture.base}/workspaces/${fixture.tenant}/${fixture.location}/customers/${m.customerId}/wearers/${m.wearerId}/measurements/${m.profileId}/edit`,
    );
    await page
      .getByLabel("Notes (optional)", { exact: true })
      .fill("Private denied revision draft");
    return { measurementRevocationPrepared: true };
  }
  await page
    .getByRole("button", { name: "Save measurement version", exact: true })
    .click();
  await page
    .getByText(
      "Measurement access is unavailable. Sign in again or return to Customers.",
      { exact: true },
    )
    .waitFor();
  if ((await page.content()).includes("Private denied revision draft"))
    throw Error("Denied revision retained private input");
  await page.waitForFunction(() => {
    const event = new Event("beforeunload", { cancelable: true });
    window.dispatchEvent(event);
    return !event.defaultPrevented;
  });
  return { measurementRevocationUiPassed: true };
}
