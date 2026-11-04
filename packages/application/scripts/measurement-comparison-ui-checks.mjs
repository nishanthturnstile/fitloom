export async function exerciseMeasurementComparisonUI(page, fixture) {
  page.setDefaultTimeout(15000);
  page.setDefaultNavigationTimeout(20000);
  const check = (ok, message) => {
    if (!ok) throw Error(message);
  };
  if (fixture.phase === "denied-comparison") {
    await page
      .getByRole("button", { name: "Compare selected versions", exact: true })
      .click();
    await page
      .getByText("Measurement access is unavailable.", { exact: true })
      .waitFor();
    check(
      !(await page.content()).includes("UI body profile"),
      "Denied comparison retained private measurement labels",
    );
    return { measurementComparisonDenied: true };
  }
  const uuid = () => page.evaluate(() => crypto.randomUUID()),
    m = fixture.measurements,
    api = `${fixture.base}/api/workspaces/${fixture.tenant}/${fixture.location}/measurements`,
    ownerApi = `${api}/${m.customerId}/${m.wearerId}`,
    book = `${fixture.base}/workspaces/${fixture.tenant}/${fixture.location}/customers/${m.customerId}/wearers/${m.wearerId}/measurements`;
  const post = async (url, data) => {
    const r = await page.request.post(url, {
      headers: { origin: fixture.base },
      data,
    });
    check(r.ok(), await r.text());
    return r.json();
  };
  const get = async (url) => {
    const r = await page.request.get(url);
    check(r.ok(), await r.text());
    return r.json();
  };
  const select = async (name, option) => {
    await page.getByRole("combobox", { name, exact: true }).click();
    await page.getByRole("option", { name: option, exact: true }).click();
  };
  const body = (
    await post(`${ownerApi}/book`, { search: "UI body profile" })
  ).items.find((item) => item.label === "UI body profile");
  let current = await get(`${ownerApi}/${body.profileId}`);
  const original = current.document.values;
  for (let step = 0; step < 3; step++) {
    const r = await post(`${api}/commands/measurement.revise`, {
      operationKey: await uuid(),
      correlationId: await uuid(),
      payload: {
        customerId: m.customerId,
        wearerId: m.wearerId,
        profileId: current.profileId,
        versionId: await uuid(),
        schemaRef: current.schemaRef,
        expectedRevision: current.revision,
        label: current.document.label,
        measuredOn: current.measuredOn,
        values:
          step === 0
            ? [
                {
                  kind: "length",
                  fieldId: "51c4b79e-9be7-4dd9-9c91-000000000003",
                  decimal: "1",
                  unit: "in",
                },
              ]
            : original,
        customFields: current.document.customFields,
        notes: `Trend gap fixture ${step}`,
        sourceNote: current.document.sourceNote,
        origin: { kind: "manual" },
      },
    });
    current = await get(`${ownerApi}/${r.result.profileId}`);
  }
  await page.goto(`${book}/compare`);
  await page
    .getByRole("heading", { name: "Compare measurements", exact: true })
    .waitFor();
  await page
    .getByLabel("Find measurement profiles", { exact: true })
    .fill("HTTP version 52");
  await page
    .getByRole("button", { name: "Find profiles", exact: true })
    .click();
  await select("Profile history", "HTTP version 52");
  await page
    .getByRole("button", { name: "Add version 52", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Add version 51", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Compare selected versions", exact: true })
    .click();
  await page
    .getByRole("heading", { name: "Exact comparison", exact: true })
    .waitFor();
  check(
    (await page.getByText("38.250000 in", { exact: true }).count()) === 2,
    "Comparison lost original decimal/unit quantities",
  );
  check(
    (await page.getByText("same", { exact: true }).count()) >= 2,
    "Equivalent quantities were not equal",
  );
  await page
    .getByRole("button", { name: "Add version 50", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Add version 49", exact: true })
    .click();
  check(
    await page
      .getByRole("button", { name: "Add version 48", exact: true })
      .isDisabled(),
    "Comparison accepted more than four versions",
  );
  await page
    .getByRole("button", { name: "Compare selected versions", exact: true })
    .click();
  await page
    .getByRole("heading", { name: "Exact comparison", exact: true })
    .waitFor();
  check(
    (await page
      .getByRole("table")
      .first()
      .getByRole("columnheader")
      .count()) === 5,
    "Four-version table is incomplete",
  );
  await page
    .getByRole("button", { name: "Remove selected version 4", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Remove selected version 3", exact: true })
    .click();
  await page.getByLabel("From date", { exact: true }).fill("2020-01-01");
  await page.getByLabel("Through date", { exact: true }).fill("2020-12-31");
  await page.getByRole("button", { name: "Load trend", exact: true }).click();
  await page
    .getByText("50 records on this page. More records are available.", {
      exact: true,
    })
    .waitFor();
  const chart = page.getByRole("region", {
    name: "Approximate dimension trend",
    exact: true,
  });
  await chart.locator("svg").first().waitFor();
  await chart.locator("svg").first().focus();
  await page.keyboard.press("ArrowRight");
  for (const width of [1440, 1024, 390, 320]) {
    await page.setViewportSize({ width, height: 844 });
    await chart.scrollIntoViewIfNeeded();
    check(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      `Comparison/trend overflow at ${width}`,
    );
    await page.screenshot({
      path: `${fixture.artifacts}/measurement-trend-${width}.png`,
      fullPage: false,
      animations: "disabled",
    });
  }
  await page
    .getByRole("button", { name: "Next trend page", exact: true })
    .click();
  await page
    .getByText("2 records on this page. End of this date window.", {
      exact: true,
    })
    .waitFor();
  check(
    await page
      .getByRole("button", { name: "Next trend page", exact: true })
      .isDisabled(),
    "Trend silently continued past its last page",
  );
  await page
    .getByRole("button", { name: "First trend page", exact: true })
    .click();
  await page
    .getByText("50 records on this page. More records are available.", {
      exact: true,
    })
    .waitFor();
  // An anchor change cancels pending trend work and must also unlock Load.
  let releaseTrend;
  const pendingTrend = new Promise((resolve) => {
    releaseTrend = resolve;
  });
  let sawTrend;
  const trendStarted = new Promise((resolve) => {
    sawTrend = resolve;
  });
  await page.route("**/trend", async (route) => {
    sawTrend();
    await pendingTrend;
    // Changing anchors may already cancel the intercepted browser request.
    await route.abort("failed").catch(() => {});
  });
  await page
    .getByRole("button", { name: "Load trend", exact: true })
    .evaluate((button) => button.click());
  await trendStarted;
  await select("Trend anchor version", "Version 51");
  releaseTrend();
  await page.unroute("**/trend");
  await page.waitForFunction(() =>
    [...document.querySelectorAll("button")].some(
      (button) =>
        button.textContent.trim() === "Load trend" && !button.disabled,
    ),
  );

  await page
    .getByLabel("Find measurement profiles", { exact: true })
    .fill("UI body profile");
  await page
    .getByRole("button", { name: "Find profiles", exact: true })
    .click();
  await select("Profile history", "UI body profile");
  await page.getByRole("button", { name: "Load trend", exact: true }).click();
  await page
    .getByText(/records on this page. End of this date window/)
    .waitFor();
  check(
    (await page.getByText("missing", { exact: true }).count()) >= 1,
    "Missing trend quantity became zero",
  );
  const paths = await chart
    .locator("path.recharts-line-curve")
    .evaluateAll((nodes) => nodes.map((n) => n.getAttribute("d") ?? ""));
  check(
    paths.some((path) => (path.match(/M/g) ?? []).length >= 2),
    "Chart drew a continuous line across a missing value",
  );
  await chart.scrollIntoViewIfNeeded();
  await page.screenshot({
    path: `${fixture.artifacts}/measurement-trend-gap-320.png`,
    fullPage: false,
    animations: "disabled",
  });
  const storage = await page.evaluate(() =>
    [...Object.values(localStorage), ...Object.values(sessionStorage)].join(
      "\n",
    ),
  );
  check(
    !storage.includes("Trend gap fixture") && !storage.includes("39.250000"),
    "Comparison or chart values entered browser storage",
  );
  return { measurementComparisonUiPassed: true };
}
