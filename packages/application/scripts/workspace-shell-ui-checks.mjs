// Runs inside the existing isolated Chrome fixture while the garment draft is dirty.
export async function exerciseWorkspaceShellUI(page, fixture) {
  const check = (condition, message) => {
    if (!condition) throw new Error(message);
  };
  const original = page.url();
  const draft = await page
    .getByLabel("Garment name", { exact: true })
    .inputValue();
  const selected = `${fixture.tenant}/${fixture.location}`;
  if (fixture.phase === "mobile") {
    check(page.url() === original, "Failed switch navigated away");
    check(
      (await page
        .getByLabel("Switch shop or location", { exact: true })
        .inputValue()) === selected,
      "Failed switch changed the selected workspace",
    );
    check(
      (await page.getByLabel("Garment name", { exact: true }).inputValue()) ===
        draft,
      "Failed switch lost the draft",
    );
    check(
      await page.evaluate(() => {
        const event = new Event("beforeunload", { cancelable: true });
        window.dispatchEvent(event);
        return event.defaultPrevented;
      }),
      "Failed switch disabled unload protection",
    );
    await page.unroute("**/api/preferences");
    await page.setViewportSize({ width: 390, height: 844 });
    const trigger = page.getByRole("button", {
      name: "Open workspace menu",
      exact: true,
    });
    await trigger.click();
    const menu = page.getByRole("dialog", { name: "Workspace menu" });
    await menu.waitFor();
    for (let index = 0; index < 16; index++) {
      await page.keyboard.press("Tab");
      await page.waitForFunction(
        () =>
          document
            .querySelector('[role="dialog"]')
            ?.contains(document.activeElement),
        undefined,
        { timeout: 2000 },
      );
    }
    await page.screenshot({ path: `${fixture.artifacts}/mobile-menu.png` });
    return { workspaceShellPassed: true };
  }
  const trigger = page.getByRole("button", {
    name: "Open workspace menu",
    exact: true,
  });
  const menu = page.getByRole("dialog", { name: "Workspace menu" });
  check(page.url() === original, "Canceled mobile navigation left the editor");
  await page.keyboard.press("Escape");
  await menu.waitFor({ state: "hidden" });
  check(
    await trigger.evaluate((node) => node === document.activeElement),
    "Menu dismissal did not restore focus",
  );
  await page.keyboard.press("Control+k");
  await page.waitForFunction(
    () => document.activeElement?.id === "catalog-prefix",
  );
  check(
    await page
      .getByLabel("Search by name prefix", { exact: true })
      .evaluate((node) => node === document.activeElement),
    "Catalog shortcut did not focus real search",
  );
  check(
    (await page.getByLabel("Garment name", { exact: true }).inputValue()) ===
      draft,
    "Shortcut lost local draft",
  );
  for (const width of [320, 390, 1024, 1025, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.evaluate(() => window.scrollTo(0, 0));
    check(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
      `Workspace shell overflows at ${width}px`,
    );
    if ([320, 390, 1024, 1440].includes(width))
      await page.screenshot({
        path: `${fixture.artifacts}/shell-${width}.png`,
      });
  }
  return { workspaceShellPassed: true };
}

export async function exerciseWorkspaceRoutesUI(page, fixture) {
  const base = `${fixture.base}/workspaces/${fixture.tenant}/${fixture.location}`;
  const check = (condition, message) => {
    if (!condition) throw new Error(message);
  };
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(`${base}/settings`);
  await page.getByRole("heading", { name: "Settings", exact: true }).waitFor();
  await page.getByText("Personal preferences", { exact: true }).click();
  await page
    .getByLabel("Preferred language", { exact: true })
    .selectOption("ta");
  await Promise.all([
    page.waitForEvent("load"),
    page.getByRole("button", { name: "Save preference", exact: true }).click(),
  ]);
  await page.waitForFunction(
    () => document.querySelector('select[name="locale"]')?.value === "ta",
  );
  await page.getByText("Personal preferences", { exact: true }).click();
  await page
    .getByLabel("Preferred language", { exact: true })
    .selectOption("en");
  await Promise.all([
    page.waitForEvent("load"),
    page.getByRole("button", { name: "Save preference", exact: true }).click(),
  ]);
  await page.waitForFunction(
    () => document.querySelector('select[name="locale"]')?.value === "en",
  );
  await page.screenshot({
    path: `${fixture.artifacts}/settings-desktop.png`,
    fullPage: true,
  });
  await page
    .getByRole("link", { name: "Open shop profile", exact: true })
    .click();
  const name = page.getByLabel("Shop name", { exact: true });
  await name.waitFor();
  const original = await name.inputValue();
  await name.fill(`${original} UI`);
  await Promise.all([
    page.waitForEvent("load"),
    page
      .getByRole("button", { name: "Update shop profile", exact: true })
      .click(),
  ]);
  await page.waitForFunction(
    (expected) =>
      document.querySelector('input[name="shopName"]')?.value === expected,
    `${original} UI`,
  );
  await name.fill(original);
  await Promise.all([
    page.waitForEvent("load"),
    page
      .getByRole("button", { name: "Update shop profile", exact: true })
      .click(),
  ]);
  await page.waitForFunction(
    (expected) =>
      document.querySelector('input[name="shopName"]')?.value === expected,
    original,
  );
  await page.screenshot({
    path: `${fixture.artifacts}/shop-desktop.png`,
    fullPage: true,
  });
  await page.goto(`${base}/settings/access`);
  await page
    .getByRole("button", { name: "Send invitation", exact: true })
    .waitFor();
  await page.screenshot({
    path: `${fixture.artifacts}/access-desktop.png`,
    fullPage: true,
  });
  await page.goto(`${base}/files`);
  await page
    .getByRole("button", { name: "Upload private image", exact: true })
    .waitFor();
  await page.screenshot({
    path: `${fixture.artifacts}/files-desktop.png`,
    fullPage: true,
  });
  await page.goto(base);
  await page.getByRole("heading", { name: original, exact: true }).waitFor();
  await page.screenshot({
    path: `${fixture.artifacts}/overview-desktop.png`,
    fullPage: true,
  });
  // A document history traversal reloads authorized server projections.
  await page.goto(`${base}/settings`);
  await page.goBack();
  await page.getByRole("heading", { name: original, exact: true }).waitFor();
  await page.goForward();
  await page.getByRole("heading", { name: "Settings", exact: true }).waitFor();
  await page.keyboard.press("Control+k");
  await page.getByLabel("Search by name prefix", { exact: true }).waitFor();
  await page.waitForFunction(
    () =>
      document.activeElement ===
      document.querySelector(".master-register input"),
  );
  check(
    page.url().includes("focus=search"),
    "Cross-page search shortcut lost its focus parameter",
  );
  for (const kind of ["service", "addon"]) {
    await page.goto(`${base}/settings/garments?kind=${kind}`);
    await page
      .getByRole("button", {
        name: kind === "service" ? "Services" : "Add-ons",
        exact: true,
      })
      .waitFor();
    check(
      (await page
        .getByRole("button", {
          name: kind === "service" ? "Services" : "Add-ons",
          exact: true,
        })
        .getAttribute("aria-pressed")) === "true",
      "Direct catalog route selected the wrong kind",
    );
  }
  await page.getByText("Library setup", { exact: true }).click();
  check(
    !(await page.evaluate(() => {
      const event = new Event("beforeunload", { cancelable: true });
      window.dispatchEvent(event);
      return event.defaultPrevented;
    })),
    "Clean catalog has an unload blocker",
  );
  let pendingOperation;
  await page.route("**/masters/commands/masters.visibility", async (route) => {
    pendingOperation = route.request().postDataJSON();
    const response = await route.fetch();
    check(response.ok(), "Visibility command did not commit");
    await route.abort();
  });
  const visibility = page.getByLabel("Hide standard garments", { exact: true });
  await visibility.setChecked(!(await visibility.isChecked()));
  await page
    .getByRole("button", { name: "Retry same operation", exact: true })
    .waitFor();
  check(
    await page.evaluate(() => {
      const event = new Event("beforeunload", { cancelable: true });
      window.dispatchEvent(event);
      return event.defaultPrevented;
    }),
    "Uncertain clean catalog has no unload protection",
  );
  const message = await page.evaluate(() => {
    const original = window.confirm;
    let prompt = "";
    window.confirm = (value) => {
      prompt = value;
      return false;
    };
    try {
      document.querySelector('.workspace-sidebar a[href="/account"]')?.click();
    } finally {
      window.confirm = original;
    }
    return prompt;
  });
  check(
    message.includes("save may already have completed"),
    "Uncertain navigation lacks its recovery warning",
  );
  await page.unroute("**/masters/commands/masters.visibility");
  const response = page.waitForResponse((response) =>
    response.url().endsWith("/commands/masters.visibility"),
  );
  await page
    .getByRole("button", { name: "Retry same operation", exact: true })
    .click();
  const replayed = await response;
  check(
    replayed.request().postDataJSON().operationKey ===
      pendingOperation.operationKey && (await replayed.json()).replayed,
    "Uncertain catalog replay changed its operation",
  );
  await page.getByText("Catalog settings updated.", { exact: true }).waitFor();
  await page.screenshot({ path: `${fixture.artifacts}/catalog-recovery.png` });
  await Promise.all([
    page.waitForEvent("load"),
    page
      .getByLabel("Switch shop or location", { exact: true })
      .selectOption(`${fixture.tenant}/${fixture.secondLocation}`),
  ]);
  check(
    page.url().includes(fixture.secondLocation) &&
      page.url().includes("kind=addon"),
    "Successful switch lost the destination",
  );
  await Promise.all([
    page.waitForEvent("load"),
    page
      .getByLabel("Switch shop or location", { exact: true })
      .selectOption(`${fixture.tenant}/${fixture.location}`),
  ]);
  check(page.url().includes(fixture.location), "Return switch failed");
  return { workspaceRoutesPassed: true };
}
