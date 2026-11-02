// Uses the existing synthetic master fixture and its real scoped API.
export async function exerciseMasterRegistersUI(page, fixture) {
  const check = (condition, message) => {
    if (!condition) throw new Error(message);
  };
  const settings = `${fixture.base}/workspaces/${fixture.tenant}/${fixture.location}/settings/garments`;
  const api = `${fixture.base}/api/workspaces/${fixture.tenant}/${fixture.location}/masters`;
  const region = () =>
    page.getByRole("region", { name: "Master register", exact: true });
  const ids = () =>
    region()
      .locator("[data-master-row]")
      .evaluateAll((nodes) =>
        nodes.map((node) => node.getAttribute("data-master-row")),
      );
  const ready = () =>
    page.waitForFunction(
      () =>
        document.getElementById("catalog-register")?.dataset.readState ===
        "ready",
    );
  const matches = (expected) =>
    page.waitForFunction((expected) => {
      const register = document.getElementById("catalog-register");
      return (
        register?.dataset.readState === "ready" &&
        JSON.stringify(
          [...register.querySelectorAll("[data-master-row]")].map((node) =>
            node.getAttribute("data-master-row"),
          ),
        ) === JSON.stringify(expected)
      );
    }, expected);
  const get = async (path) => {
    const response = await page.request.get(`${api}${path}`);
    check(response.ok(), `Register API ${path} failed`);
    return response.json();
  };
  const refresh = async () => {
    await page
      .getByRole("button", { name: "Refresh register", exact: true })
      .click();
    await ready();
  };
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(settings);
  await ready();
  if (fixture.phase === "views") {
    const initial = await get("/garments");
    check(
      initial.total > 50 && initial.items.length === 50,
      "Fixture does not cross a page boundary",
    );
    await matches(initial.items.map((row) => row.id));
    check(
      (await region().getByRole("table").count()) === 1,
      "Table is not the default view",
    );
    await page.screenshot({
      path: `${fixture.artifacts}/register-table.png`,
      fullPage: true,
    });
    let details = 0;
    const detailRead = (request) => {
      if (
        request.method() === "GET" &&
        /\/masters\/(garments|services|addons)\/[a-f0-9-]+/.test(request.url())
      )
        details++;
    };
    page.on("request", detailRead);
    await page.getByRole("button", { name: "Card view", exact: true }).click();
    check(
      JSON.stringify(await ids()) ===
        JSON.stringify(initial.items.map((row) => row.id)),
      "Cards and table differ",
    );
    check(details === 0, "Card switch fetched per-record details");
    page.off("request", detailRead);
    await page.screenshot({
      path: `${fixture.artifacts}/register-cards.png`,
      fullPage: true,
    });
    // Both presentations use the same lifecycle command and leave record identity intact.
    await page.getByLabel("Status", { exact: true }).selectOption("all");
    await ready();
    const first = initial.items[0];
    const row = () => region().locator(`[data-master-row="${first.id}"]`);
    await row()
      .getByRole("button", { name: "Deactivate", exact: true })
      .click();
    await page.getByText("Garment marked inactive.", { exact: true }).waitFor();
    check(
      (
        await get(
          `/garments?search=${encodeURIComponent(first.label)}&active=all`,
        )
      ).items.find((item) => item.id === first.id).active === false,
      "Card lifecycle did not persist",
    );
    await row().getByRole("button", { name: "Restore", exact: true }).click();
    await page.getByText("Garment marked active.", { exact: true }).waitFor();
    await page.getByLabel("Status", { exact: true }).selectOption("active");
    await matches(initial.items.map((row) => row.id));
    await row()
      .getByRole("button", { name: "Move to end", exact: true })
      .click();
    await page.getByText("Catalog order updated.", { exact: true }).waitFor();
    await page.waitForFunction(
      (id) => document.activeElement?.id === `master-row-${id}`,
      first.id,
    );
    check(
      (await get(`/garments?offset=50`)).items.at(-1).id === first.id,
      "Move to end failed beyond the first page",
    );
    check(
      (await region()
        .getByText("Moved outside this page", { exact: true })
        .count()) === 1,
      "Off-page move has no focused record control",
    );
    // Restore order through the existing bounded destination dialog.
    const catalog = await get("/catalog");
    const restored = await page.request.post(
      `${api}/commands/masters.reorder`,
      {
        headers: { origin: fixture.base },
        data: {
          operationKey: `register-order-${Date.now()}`,
          correlationId: "11111111-1111-4111-8111-111111111111",
          payload: {
            kind: "garment",
            movedId: first.id,
            beforeId: initial.items[1].id,
            expectedCatalogVersion: catalog.catalogVersion,
          },
        },
      },
    );
    check(restored.ok(), "Restoring fixture order failed");
    await refresh();
    await page.getByRole("button", { name: "Table view", exact: true }).click();
    await page.getByRole("button", { name: "Next page", exact: true }).click();
    await matches(
      (await get("/garments?offset=50")).items.map((row) => row.id),
    );
    const prefix = page.getByLabel("Search by name prefix", { exact: true });
    await prefix.fill(fixture.pricedLabel);
    await matches(
      (
        await get(`/garments?search=${encodeURIComponent(fixture.pricedLabel)}`)
      ).items.map((row) => row.id),
    );
    check(
      await page
        .getByRole("button", { name: "Previous page", exact: true })
        .isDisabled(),
      "Filter change retained the old offset",
    );
    return { masterRegistersPassed: true };
  }
  if (fixture.phase === "reads") {
    const prefix = page.getByLabel("Search by name prefix", { exact: true });
    // Hold one older response until the newer filter has rendered.
    let releaseSlow, signalStarted;
    const slow = new Promise((resolve) => {
      releaseSlow = resolve;
    });
    const started = new Promise((resolve) => {
      signalStarted = resolve;
    });
    await page.route(/\/masters\/garments\?/, async (route) => {
      // The CLI sandbox has JavaScript globals but no Node URL constructor.
      const encoded =
        /[?&]search=([^&]*)/.exec(route.request().url())?.[1] ?? "";
      const search = decodeURIComponent(encoded.replace(/\+/g, " "));
      if (search !== "UI page") {
        await route.continue();
        return;
      }
      const response = await route.fetch();
      signalStarted();
      await slow;
      try {
        await route.fulfill({ response });
      } catch {
        /* Superseded fetches are intentionally aborted. */
      }
    });
    await prefix.fill("UI page");
    await started;
    await prefix.fill("UI page 1");
    const latest = await get("/garments?search=UI%20page%201");
    await matches(latest.items.map((row) => row.id));
    releaseSlow();
    await page.unroute(/\/masters\/garments\?/);
    await matches(latest.items.map((row) => row.id));
    await page.getByLabel("Origin", { exact: true }).selectOption("standard");
    await matches([]);
    await page.getByLabel("Origin", { exact: true }).selectOption("custom");
    await matches(latest.items.map((row) => row.id));
    await page
      .getByLabel("Applicability filter", { exact: true })
      .selectOption("feminine");
    await matches([]);
    await page
      .getByLabel("Applicability filter", { exact: true })
      .selectOption("unisex");
    await matches(latest.items.map((row) => row.id));
    await page.getByLabel("Origin", { exact: true }).selectOption("all");
    await matches(latest.items.map((row) => row.id));
    // A read outage and a denial must not turn into a successful empty register.
    for (const status of [503, 403]) {
      await page.route(/\/masters\/garments\?/, (route) =>
        route.fulfill({
          status,
          contentType: "application/json",
          body: JSON.stringify({
            message: "Synthetic register failure",
            category: status === 403 ? "access" : "temporary",
            correlationId: "11111111-1111-4111-8111-111111111111",
          }),
        }),
      );
      await page
        .getByRole("button", { name: "Refresh register", exact: true })
        .click();
      await region()
        .getByText(
          status === 403
            ? "Catalog access is unavailable"
            : "Register could not be loaded",
          { exact: true },
        )
        .waitFor();
      check(
        (await region().locator("[data-master-row]").count()) === 0,
        "Failed register retained rows as current data",
      );
      check(
        !(await region().textContent())?.includes("0 records in this view"),
        "Failure was rendered as empty success",
      );
      await page.screenshot({
        path: `${fixture.artifacts}/register-${status}.png`,
      });
      await page.unroute(/\/masters\/garments\?/);
      await page
        .getByRole("button", { name: "Retry register", exact: true })
        .click();
      await matches(latest.items.map((row) => row.id));
    }
    await prefix.fill("No matching synthetic garment");
    await page.getByText("No matching garments", { exact: true }).waitFor();
    await page.screenshot({
      path: `${fixture.artifacts}/register-no-matches.png`,
    });
    return { masterRegistersPassed: true };
  }
  for (const kind of ["service", "addon"]) {
    await page.goto(`${settings}?kind=${kind}`);
    await ready();
    const expected = (
      await get(kind === "service" ? "/services" : "/addons")
    ).items.map((row) => row.id);
    check(
      JSON.stringify(await ids()) === JSON.stringify(expected),
      "Direct catalog table differs from its authorized API",
    );
    await page.getByRole("button", { name: "Card view", exact: true }).click();
    check(
      JSON.stringify(await ids()) === JSON.stringify(expected),
      "Service/add-on card parity failed",
    );
    await page.screenshot({
      path: `${fixture.artifacts}/register-${kind}-cards.png`,
      fullPage: true,
    });
  }
  await page.goto(settings);
  await ready();
  for (const width of [320, 390, 1024]) {
    await page.setViewportSize({ width, height: 844 });
    check(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
      `Table overflows the page at ${width}px`,
    );
    await page.getByRole("button", { name: "Card view", exact: true }).click();
    check(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
      `Cards overflow the page at ${width}px`,
    );
    await region()
      .locator("[data-master-row]")
      .first()
      .scrollIntoViewIfNeeded();
    await page.screenshot({
      path: `${fixture.artifacts}/register-cards-${width}.png`,
    });
    await page.getByRole("button", { name: "Table view", exact: true }).click();
  }
  await page.setViewportSize({ width: 1440, height: 1000 });
  return { masterRegistersPassed: true };
}
