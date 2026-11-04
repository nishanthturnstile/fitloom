export async function exerciseDomainImportsUI(page, fixture) {
  page.setDefaultTimeout(15000);
  const check = (ok, message) => {
      if (!ok) throw Error(message);
    },
    root = `${fixture.base}/workspaces/${fixture.tenant}/${fixture.location}`,
    api = `${fixture.base}/api/workspaces/${fixture.tenant}/${fixture.location}/imports`;
  const post = async (path, data) => {
    const response = await page.request.post(api + path, {
      headers: { origin: fixture.base },
      data,
    });
    check(
      response.ok(),
      `Import read ${path}: ${response.status()} ${await response.text()}`,
    );
    return response.json();
  };
  if (fixture.phase === "denied") {
    await page
      .getByRole("button", { name: "Approve group 1", exact: true })
      .click();
    await page
      .getByText(
        "Import access is unavailable. Private preview content has been removed.",
        { exact: true },
      )
      .waitFor();
    check(
      !(await page.getByText("UI imported customer", { exact: true }).count()),
      "Revoked preview stayed visible",
    );
    await page.goto(root + "/customers");
    return { importDeniedPassed: true };
  }
  const settle = () =>
    page.evaluate(
      () =>
        new Promise((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(resolve)),
        ),
    );
  const namespace = `ui-${await page.evaluate(() => crypto.randomUUID())}`;
  const preview = async (family, lost = false) => {
    await page.goto(
      `${root}/${family === "customers" ? "customers" : "measurements"}/import`,
    );
    await page.getByLabel("Source namespace", { exact: true }).fill(namespace);
    await page
      .getByLabel("CSV file", { exact: true })
      .setInputFiles(
        family === "customers"
          ? fixture.importCustomerFile
          : fixture.importMeasurementFile,
      );
    await page.getByText(/Selected: .*\.csv/).waitFor();
    if (family === "customers") {
      await page
        .getByLabel("CSV file", { exact: true })
        .setInputFiles(fixture.invalidImportFile);
      await page
        .getByText("CSV must be valid UTF-8.", { exact: true })
        .waitFor();
      check(
        await page
          .getByRole("button", { name: "Preview complete CSV", exact: true })
          .isDisabled(),
        "Invalid UTF-8 left the previous CSV ready to preview",
      );
      await page
        .getByLabel("CSV file", { exact: true })
        .setInputFiles(fixture.oversizedImportFile);
      await page.getByText("CSV exceeds 1 MiB.", { exact: true }).waitFor();
      check(
        await page
          .getByRole("button", { name: "Preview complete CSV", exact: true })
          .isDisabled(),
        "Oversized selection left the previous CSV ready to preview",
      );
      await page
        .getByLabel("CSV file", { exact: true })
        .setInputFiles(fixture.importCustomerFile);
      await page.getByText(/Selected: .*\.csv/).waitFor();
    }
    if (family === "measurements") {
      await page
        .getByRole("button", { name: "Bind selected schema", exact: true })
        .click();
      await page
        .getByRole("heading", { name: "Schema key: body_v1", exact: true })
        .waitFor();
    }
    const envelopes = [];
    let missed = false;
    if (lost)
      await page.route(
        `**/imports/${family}/commands/preview`,
        async (route) => {
          envelopes.push(route.request().postData());
          if (!missed) {
            missed = true;
            await route.fetch();
            await route.abort("failed");
          } else await route.continue();
        },
      );
    await page
      .getByRole("button", { name: "Preview complete CSV", exact: true })
      .click();
    if (lost) {
      await page
        .getByRole("button", {
          name: "Retry exact import operation",
          exact: true,
        })
        .click();
      await page.unroute(`**/imports/${family}/commands/preview`);
      check(
        envelopes.length === 2 && envelopes[0] === envelopes[1],
        "Preview retry changed exact envelope",
      );
    }
    await page.getByText(/Dry-run saved\. Review every group/).waitFor();
    const request = envelopes[0] ? JSON.parse(envelopes[0]) : null;
    const batches = await post(`/${family}/batches`, {});
    const selected =
      batches.items.find((b) => b.namespace === namespace) ?? batches.items[0];
    check(selected, "New import missing from resumable list");
    const batch = await post(`/${family}/status`, { batchId: selected.id });
    check(
      !request || batch.namespace === request.payload.namespace,
      "Lost preview resumed a different source",
    );
    return batch;
  };
  const approve = async (index) => {
    const status = page.waitForResponse(
      (r) =>
        r.url().endsWith("/status") &&
        r.request().method() === "POST" &&
        r.status() === 200,
    );
    await page
      .getByRole("button", { name: `Approve group ${index}`, exact: true })
      .click();
    await status;
    await page.getByText("Review saved.", { exact: true }).waitFor();
  };
  const capture = async (name) => {
    for (const width of [1440, 1024, 390, 320]) {
      await page.setViewportSize({ width, height: 1000 });
      await page.evaluate(() => {
        window.scrollTo(0, 0);
        if (document.activeElement instanceof HTMLElement)
          document.activeElement.blur();
      });
      await page.evaluate(
        () =>
          new Promise((resolve) =>
            requestAnimationFrame(() => requestAnimationFrame(resolve)),
          ),
      );
      check(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        `${name} overflow at ${width}`,
      );
      check(
        await page
          .locator("main button")
          .evaluateAll((nodes) =>
            nodes.every((node) => node.scrollWidth <= node.clientWidth + 1),
          ),
        `${name} has clipped button text at ${width}`,
      );
      await page.evaluate(() => {
        if (document.activeElement instanceof HTMLElement)
          document.activeElement.blur();
      });
      await page.screenshot({
        path: `${fixture.artifacts}/${name}-${width}.png`,
        fullPage: true,
        animations: "disabled",
      });
    }
    await page.setViewportSize({ width: 1440, height: 1000 });
  };
  // The shared leave guard must preserve a selected private file when exit is cancelled.
  await page.goto(root + "/customers/import");
  await page
    .getByLabel("Source namespace", { exact: true })
    .fill("unsaved-import");
  await settle();
  await page.evaluate(() => {
    window.confirm = () => false;
  });
  await page
    .getByRole("link", { name: "Back to customers", exact: true })
    .click();
  check(
    (await page
      .getByLabel("Source namespace", { exact: true })
      .inputValue()) === "unsaved-import",
    "Cancelled navigation lost import draft",
  );
  await page.evaluate(() => {
    window.confirm = () => true;
  });
  await page.getByRole("button", { name: "New dry-run", exact: true }).click();
  await settle();
  const customers = await preview("customers", true);
  check(
    customers.total === 2 &&
      customers.csvRows.total === 3 &&
      customers.csvRows.redundant === 1,
    "Customer preview membership/redundancy changed",
  );
  // A delayed Resume response must not overwrite a newly cleared dry-run.
  let releaseStatus;
  const statusHeld = new Promise((resolve) => {
    releaseStatus = resolve;
  });
  let statusFinished;
  const statusReleased = new Promise((resolve) => {
    statusFinished = resolve;
  });
  let statusSeen;
  const statusStarted = new Promise((resolve) => {
    statusSeen = resolve;
  });
  await page.route("**/imports/customers/status", async (route) => {
    const response = await route.fetch();
    statusSeen();
    await statusHeld;
    // The client is allowed to abort before delivery of this delayed response.
    await route.fulfill({ response }).catch(() => {});
    statusFinished();
  });
  await page
    .getByRole("button", { name: /^Resume import from / })
    .first()
    .click();
  await statusStarted;
  await page.getByRole("button", { name: "New dry-run", exact: true }).click();
  releaseStatus();
  await statusReleased;
  await page.unroute("**/imports/customers/status");
  await settle();
  check(
    (await page
      .getByLabel("Source namespace", { exact: true })
      .inputValue()) === "",
    "Stale Resume replaced a new dry-run",
  );
  check(
    (await page
      .getByRole("button", { name: "Approve group 1", exact: true })
      .count()) === 0,
    "Stale Resume restored private group data",
  );
  await page
    .getByRole("button", { name: /^Resume import from / })
    .first()
    .click();
  await page
    .getByRole("button", { name: "Approve group 1", exact: true })
    .waitFor();
  await capture("customer-import-review");
  await approve(1);
  await approve(2);
  const reviewed = await post("/customers/status", { batchId: customers.id });
  let lostChunk = false;
  const recoveries = [];
  const onRequest = (request) => {
    if (request.url().endsWith("/imports/recover"))
      recoveries.push(JSON.parse(request.postData()));
  };
  page.on("request", onRequest);
  await page.route("**/imports/customers/chunk", async (route) => {
    if (!lostChunk) {
      lostChunk = true;
      await route.fetch();
      await route.abort("failed");
    } else await route.continue();
  });
  await page
    .getByRole("button", { name: "Commit next approved chunk", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Recover import before retry", exact: true })
    .click();
  await page.getByText(/^Import complete\. All groups/).waitFor();
  await page.unroute("**/imports/customers/chunk");
  page.off("request", onRequest);
  const committed = await post("/customers/status", { batchId: customers.id });
  check(
    committed.counts.created === 2 && recoveries.length === 2,
    "Lost chunk did not recover every persisted outcome",
  );
  for (const recovered of recoveries) {
    const row = reviewed.items.find((r) => r.id === recovered.logicalRecordId);
    check(
      row &&
        row.operationKey === recovered.operationKey &&
        row.requestHash === recovered.requestHash,
      "Recovery changed reviewed key/hash",
    );
  }
  check(
    committed.items.reduce((n, r) => n + r.counts.wearers, 0) === 1,
    "Customer replay duplicated named wearer",
  );
  await capture("customer-import-complete");
  const history = await preview("measurements");
  check(
    history.total === 1,
    "Complete history split into independent profiles",
  );
  await page
    .getByRole("button", {
      name: "Use accepted source wearer mapping",
      exact: true,
    })
    .click();
  await page
    .getByText(
      "Customer and wearer selected. No customer fields will be changed.",
      { exact: true },
    )
    .waitFor();
  await page
    .getByRole("combobox", { name: "Existing customer", exact: true })
    .getByText("UI imported customer", { exact: true })
    .waitFor();
  await page
    .getByRole("combobox", { name: "Existing wearer", exact: true })
    .getByText("UI imported wearer", { exact: true })
    .waitFor();
  await page.locator("main details").first().locator("summary").click();
  await capture("measurement-import-review");
  await approve(1);
  await page
    .getByRole("button", { name: "Commit next approved chunk", exact: true })
    .click();
  await page.getByText(/^Import complete\. All groups/).waitFor();
  const saved = await post("/measurements/status", { batchId: history.id });
  check(
    saved.counts.created === 1 &&
      saved.items[0].counts.versions === 2 &&
      saved.items[0].counts.profiles === 1,
    "Complete imported history counts changed",
  );
  await capture("measurement-import-complete");
  check(
    await page.evaluate(
      () =>
        !JSON.stringify({
          local: { ...localStorage },
          session: { ...sessionStorage },
        }).includes("ui_profile"),
    ),
    "Private source data persisted in browser storage",
  );
  // A separate cancelled batch preserves its one committed success.
  await page.goto(root + "/customers/import");
  await page
    .getByLabel("Source namespace", { exact: true })
    .fill(namespace + "-cancel");
  await page
    .getByLabel("CSV file", { exact: true })
    .setInputFiles(fixture.importCustomerFile);
  await page
    .getByRole("button", { name: "Preview complete CSV", exact: true })
    .click();
  await page.getByText(/Dry-run saved\. Review every group/).waitFor();
  await approve(1);
  await page
    .getByRole("button", { name: "Commit next approved chunk", exact: true })
    .click();
  await page.getByText(/^Chunk settled/).waitFor();
  await page.evaluate(() => {
    window.confirm = () => false;
  });
  await page
    .getByRole("button", { name: "Cancel remaining groups", exact: true })
    .click();
  check(
    await page
      .getByRole("button", { name: "Approve group 2", exact: true })
      .isVisible(),
    "Cancelled cancellation discarded pending group",
  );
  await page.evaluate(() => {
    window.confirm = () => true;
  });
  await page
    .getByRole("button", { name: "Cancel remaining groups", exact: true })
    .click();
  await page.getByText("Import cancelled", { exact: true }).first().waitFor();
  const cancelledList = await post("/customers/batches", {});
  const cancelled = await post("/customers/status", {
    batchId: cancelledList.items[0].id,
  });
  check(
    cancelled.state === "cancelled" &&
      cancelled.counts.created === 1 &&
      cancelled.counts.cancelled === 1,
    "Cancellation did not preserve one saved group and cancel only the pending group",
  );
  await capture("customer-import-cancelled");
  // Leave another reviewed preview open for a real permission revocation check.
  await page.goto(root + "/customers/import");
  await page
    .getByLabel("Source namespace", { exact: true })
    .fill(namespace + "-revoke");
  await page
    .getByLabel("CSV file", { exact: true })
    .setInputFiles(fixture.importCustomerFile);
  await page
    .getByRole("button", { name: "Preview complete CSV", exact: true })
    .click();
  await page.getByText(/Dry-run saved\. Review every group/).waitFor();
  return { importsUiPassed: true };
}
