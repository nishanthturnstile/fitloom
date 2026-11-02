// Runs against the existing five-field, two-construction-group dirty fixture.
export async function exerciseGarmentEditorFrameUI(page, fixture) {
  const check = (condition, message) => {
    if (!condition) throw new Error(message);
  };
  const nodeIds = () =>
    page
      .locator(".garment-editor [data-schema-node-id]")
      .evaluateAll((nodes) =>
        nodes.map((node) => node.getAttribute("data-schema-node-id")),
      );
  const original = await nodeIds();
  check(
    original.length >= 9,
    "Editor fixture does not expose its semantic identities",
  );
  let writes = 0;
  const observe = (request) => {
    if (
      request.method() === "POST" &&
      request.url().includes("/masters/commands/")
    )
      writes++;
  };
  page.on("request", observe);
  for (const label of [
    "Identity",
    "Measurements",
    "Construction",
    "Services & rates",
    "Add-ons",
    "Preview & history",
  ]) {
    await page
      .getByRole("button", { name: `${label} step`, exact: true })
      .click();
    check(
      JSON.stringify(await nodeIds()) === JSON.stringify(original),
      "Step change allocated or removed an identity",
    );
    check(
      (await page
        .getByRole("button", { name: `${label} step`, exact: true })
        .getAttribute("aria-current")) === "step",
      "Selected step is not announced",
    );
    await page.screenshot({
      path: `${fixture.artifacts}/editor-${label.toLowerCase().replaceAll(/[^a-z]+/g, "-")}.png`,
    });
  }
  await page.getByRole("tab", { name: "History", exact: true }).click();
  await page
    .getByText("Save this garment to start its revision history.", {
      exact: true,
    })
    .waitFor();
  await page
    .getByRole("button", { name: "Measurements step", exact: true })
    .click();
  check(
    (await page
      .getByRole("tab", { name: "History", exact: true })
      .getAttribute("aria-selected")) === "true",
    "Step change reset the rail tab",
  );
  await page.getByRole("tab", { name: "Preview", exact: true }).click();
  const preview = page.getByRole("region", {
    name: "Garment form preview",
    exact: true,
  });
  check(
    await preview
      .locator("input,select,textarea")
      .evaluateAll((nodes) => nodes.every((node) => node.matches(":disabled"))),
    "Preview accepts wearer values",
  );
  check(writes === 0, "Step or rail navigation saved a draft");
  page.off("request", observe);
  for (const width of [320, 390, 1024, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    for (const label of ["Measurements", "Construction"]) {
      await page
        .getByRole("button", { name: `${label} step`, exact: true })
        .click();
      check(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth + 1,
        ),
        `${label} overflows at ${width}px`,
      );
    }
    await page
      .getByRole("button", { name: "Identity step", exact: true })
      .click();
    check(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
      `Editor overflows at ${width}px`,
    );
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({ path: `${fixture.artifacts}/editor-${width}.png` });
  }
  await page
    .getByRole("button", { name: "Measurements step", exact: true })
    .click();
  await page
    .getByRole("button", { name: "← Back to garments", exact: true })
    .click();
  await page.waitForFunction(
    () => document.activeElement?.id === "catalog-prefix",
  );
  await page.getByRole("button", { name: /^Resume editing / }).click();
  check(
    JSON.stringify(await nodeIds()) === JSON.stringify(original),
    "Back/Resume replaced identities",
  );
  return { garmentEditorFramePassed: true };
}
