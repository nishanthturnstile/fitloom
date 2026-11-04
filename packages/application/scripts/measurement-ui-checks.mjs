// Uses the retained authenticated Chrome fixture, test scope and server.
export async function exerciseMeasurementsUI(page, fixture) {
  const check = (condition, message) => {
    if (!condition) throw Error(message);
  };
  const m = fixture.measurements,
    base = `${fixture.base}/workspaces/${fixture.tenant}/${fixture.location}`,
    customer = `${base}/customers/${m.customerId}`,
    book = `${customer}/wearers/${m.wearerId}/measurements`,
    api = `${fixture.base}/api/workspaces/${fixture.tenant}/${fixture.location}/measurements`;
  if (fixture.phase === "denied") {
    await page.goto(book);
    await page
      .getByText("Measurement access is unavailable.", { exact: true })
      .waitFor();
    check(
      !(await page.content()).includes("Measurement HTTP customer"),
      "Denied book exposed owner labels",
    );
    return { measurementDeniedPassed: true };
  }
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(customer);
  await page.getByRole("tab", { name: "Measurements", exact: true }).click();
  await page.reload();
  await page.waitForFunction(
    () =>
      document.querySelector('[role="tab"][aria-selected="true"]')
        ?.textContent === "Measurements",
  );

  await page
    .getByRole("link", { name: "Open measurements", exact: true })
    .filter({ hasText: "Open measurements" })
    .first()
    .click();
  await page
    .getByRole("heading", { name: "Measurement book", exact: true })
    .waitFor();
  check(
    (await page
      .getByRole("navigation", { name: "Workspace navigation", exact: true })
      .getByRole("link", { name: "Customers", exact: true })
      .getAttribute("aria-current")) === "page",
    "Measurement book lost Customers navigation",
  );
  const search = page.getByRole("textbox", {
    name: "Search measurement profiles",
    exact: true,
  });
  await page
    .getByRole("button", { name: "Search measurement profiles", exact: true })
    .click();
  check(
    await search.evaluate((node) => node === document.activeElement),
    "Topbar search did not focus measurement search",
  );
  await search.fill("HTTP version 52");
  await page
    .getByRole("button", { name: "Search profiles", exact: true })
    .click();
  await page
    .getByRole("button", { name: "HTTP version 52", exact: true })
    .click();
  await page
    .getByRole("heading", { name: "HTTP version 52", exact: true })
    .waitFor();
  await page
    .getByRole("link", { name: "Back to measurement book", exact: true })
    .click();
  await search.waitFor();
  await page.waitForFunction(
    () =>
      document.querySelector("#measurement-search")?.value ===
      "HTTP version 52",
  );
  check(
    (await search.inputValue()) === "HTTP version 52",
    "Book return discarded the private search filter",
  );
  check(
    !decodeURIComponent(page.url()).includes("HTTP version"),
    "Search label leaked into the URL",
  );
  await page.goto(`${book}/${m.profileId}/versions/${m.versionId}`);
  await page
    .getByRole("heading", { name: "HTTP body profile", exact: true })
    .waitFor();
  await page.getByText("38.250000 in", { exact: true }).waitFor();
  await page.screenshot({
    path: `${fixture.artifacts}/measurement-history-1440.png`,
    fullPage: true,
    animations: "disabled",
  });
  await page.goto(`${book}/new`);
  await page
    .getByRole("heading", { name: "Add measurements", exact: true })
    .waitFor();
  await page
    .getByLabel("Profile label", { exact: true })
    .fill("UI body profile");
  const chest = page.getByLabel("Chest circumference", { exact: true });
  await chest.fill("38.250000");
  await page
    .getByRole("combobox", { name: "Chest circumference unit", exact: true })
    .click();
  await page.getByRole("option", { name: "cm", exact: true }).click();
  check(
    (await chest.inputValue()) === "97.16",
    "Unit display conversion is incorrect",
  );
  await page
    .getByLabel("Notes (optional)", { exact: true })
    .fill("UI private measurement notes");
  await page.evaluate(() => {
    window.confirm = () => false;
  });
  await page
    .getByRole("link", { name: "Back to measurement book", exact: true })
    .click();
  check(
    (await chest.inputValue()) === "97.16",
    "Canceled exit lost measurement draft",
  );
  await page.evaluate(() => {
    window.confirm = () => true;
  });
  await page.screenshot({
    path: `${fixture.artifacts}/measurement-entry-1440.png`,
    fullPage: true,
    animations: "disabled",
  });
  let dropped = false;
  const bytes = [];
  await page.route(
    "**/measurements/commands/measurement.create",
    async (route) => {
      bytes.push(route.request().postData());
      if (!dropped) {
        dropped = true;
        const response = await route.fetch();
        check(response.ok(), "Intercepted save did not commit");
        await route.abort("failed");
      } else await route.continue();
    },
  );
  await page
    .getByRole("button", { name: "Save measurement version", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Retry exact save", exact: true })
    .waitFor();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: `${fixture.artifacts}/measurement-uncertain-390.png`,
    fullPage: true,
    animations: "disabled",
  });
  await page
    .getByRole("button", { name: "Retry exact save", exact: true })
    .click();
  await page
    .getByRole("heading", { name: "UI body profile", exact: true })
    .waitFor();
  check(
    bytes.length === 2 && bytes[0] === bytes[1],
    "Uncertain retry changed the command bytes",
  );
  const envelope = JSON.parse(bytes[0]);
  check(
    envelope.payload.values[0].decimal === "38.250000" &&
      envelope.payload.values[0].unit === "in",
    "Display toggle rewrote original saved quantity",
  );
  const detail = await (
    await page.request.get(
      `${api}/${m.customerId}/${m.wearerId}/${envelope.payload.profileId}`,
    )
  ).json();
  check(detail.sequence === 1, "Exact retry created another content version");
  const stored = await page.evaluate(() =>
    Object.keys(sessionStorage)
      .map((key) => sessionStorage.getItem(key))
      .join("\n"),
  );
  check(
    !stored.includes("UI private measurement notes") &&
      !stored.includes("38.250000"),
    "Measurement values or notes entered browser storage",
  );
  await page.unroute("**/measurements/commands/measurement.create");
  await page.goto(`${book}/new`);
  await page
    .getByRole("heading", { name: "Add measurements", exact: true })
    .waitFor();
  await page.getByRole("button", { name: "Garment", exact: true }).click();
  await page
    .getByLabel("Find garment schema", { exact: true })
    .fill(fixture.measurements.emptyGarmentLabel);
  await page
    .getByRole("button", { name: "Find garments", exact: true })
    .click();
  await page
    .getByRole("combobox", { name: "Garment schema", exact: true })
    .click();
  await page
    .getByRole("option", {
      name: fixture.measurements.emptyGarmentLabel,
      exact: true,
    })
    .click();
  await page
    .getByText(
      "This schema has no standard dimensions. Add a custom dimension before saving.",
      { exact: true },
    )
    .waitFor();
  await page
    .getByRole("button", { name: "Add custom dimension", exact: true })
    .click();
  await page.getByLabel("Custom dimension 1", { exact: true }).fill("4.5");
  await page
    .getByLabel("Custom dimension label", { exact: true })
    .fill("அளவு ".repeat(15).trim());
  await page
    .getByLabel("Profile label", { exact: true })
    .fill("UI empty garment custom");
  for (const width of [1024, 390, 320]) {
    await page.setViewportSize({ width, height: 844 });
    await page
      .getByLabel("Custom dimension label", { exact: true })
      .scrollIntoViewIfNeeded();
    check(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      `Measurement entry overflows at ${width}px`,
    );
    await page.screenshot({
      path: `${fixture.artifacts}/measurement-entry-${width}.png`,
      fullPage: false,
      animations: "disabled",
    });
  }
  await page
    .getByRole("button", { name: "Save measurement version", exact: true })
    .click();
  await page
    .getByRole("heading", { name: "UI empty garment custom", exact: true })
    .waitFor();
  await page.getByText("4.5 in", { exact: true }).waitFor();
  await page.goto(book);
  await page
    .getByRole("heading", { name: "Measurement book", exact: true })
    .waitFor();
  await page.screenshot({
    path: `${fixture.artifacts}/measurement-book-320.png`,
    fullPage: false,
    animations: "disabled",
  });
  return { measurementsUiPassed: true };
}
