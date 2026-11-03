// One family/lifecycle journey uses the existing authenticated Chrome and test scope.
export async function exerciseCustomerWearersUI(page, fixture) {
  const check = (value, message) => {
    if (!value) throw Error(message);
  };
  const base = `${fixture.base}/workspaces/${fixture.tenant}/${fixture.location}`,
    register = `${base}/customers`;
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(`${register}/new`);
  await page
    .getByLabel("Customer name", { exact: true })
    .fill("UI family contact");
  await page.getByLabel("No phone provided", { exact: true }).check();
  await page
    .getByRole("checkbox", { name: /This customer is also a wearer/ })
    .uncheck();
  await page
    .getByRole("button", { name: "Save customer", exact: true })
    .click();
  await page
    .getByRole("heading", { name: "UI family contact", exact: true })
    .waitFor();
  const profileUrl = page.url(),
    id = profileUrl.split("?")[0].split("/").at(-1);
  const api = `${fixture.base}/api/workspaces/${fixture.tenant}/${fixture.location}/customers`;
  await page.getByRole("tab", { name: "Wearers", exact: true }).click();
  await page.getByText("No named wearers saved.", { exact: true }).waitFor();
  await page.getByRole("button", { name: "Add wearer", exact: true }).click();
  await page.getByLabel("Wearer name", { exact: true }).fill("Draft retained");
  await page.evaluate(() => {
    window.confirm = () => false;
  });
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  check(
    (await page.getByLabel("Wearer name", { exact: true }).inputValue()) ===
      "Draft retained",
    "Canceled sheet exit lost draft",
  );
  await page.getByLabel("Wearer name", { exact: true }).fill("UI wearer one");
  await page
    .getByLabel("Relationship (optional)", { exact: true })
    .pressSequentially("Family member");
  await page.getByText("Optional wearer details", { exact: true }).click();
  await page.getByLabel("Birthday", { exact: true }).fill("2000-02-29");
  await page
    .getByLabel("Gender (self-described)", { exact: true })
    .fill("Personal description");
  await page.getByLabel("Height", { exact: true }).fill("62.125000");
  await page.getByLabel("Height unit", { exact: true }).selectOption("in");
  await page.getByLabel("Weight", { exact: true }).fill("135.500000");
  await page.getByLabel("Weight unit", { exact: true }).selectOption("lb");
  await page
    .getByLabel("Fit preferences", { exact: true })
    .pressSequentially("Comfort fit");
  await page
    .getByLabel("Fit preferences", { exact: true })
    .fill("x".repeat(1001));
  await page.getByRole("button", { name: "Save wearer", exact: true }).click();
  await page.waitForFunction(() => document.activeElement?.id === "wearer-fit");
  check(
    (await page
      .getByLabel("Fit preferences", { exact: true })
      .getAttribute("aria-invalid")) === "true",
    "Nested preference error is not associated with its control",
  );
  await page.screenshot({
    path: `${fixture.artifacts}/wearer-preference-error-1440.png`,
    fullPage: false,
    timeout: 30000,
    animations: "disabled",
  });
  await page.getByLabel("Fit preferences", { exact: true }).fill("Comfort fit");
  await page.screenshot({
    path: `${fixture.artifacts}/wearer-sheet-1440.png`,
    fullPage: true,
    timeout: 30000,
    animations: "disabled",
  });
  await page.getByRole("button", { name: "Save wearer", exact: true }).click();
  await page
    .getByRole("heading", { name: "UI wearer one", exact: true })
    .waitFor();
  let detail = await (await page.request.get(`${api}/${id}`)).json();
  check(
    detail.wearers.total === 1,
    "Atomic contact-only/add-wearer flow count is wrong",
  );
  const first = detail.wearers.items[0];
  check(
    first.profile.height.value === "62.125000" &&
      first.profile.height.unit === "in",
    "Height lost original precision/unit",
  );
  check(
    first.profile.weight.value === "135.500000" &&
      first.profile.preferences.fit === "Comfort fit",
    "Weight/preferences lost input",
  );
  await page.getByRole("button", { name: "Add wearer", exact: true }).click();
  await page.getByLabel("Wearer name", { exact: true }).fill("UI wearer one");
  await page.getByText(/Repeated names are allowed/).waitFor();
  await page.getByLabel("Wearer name", { exact: true }).fill("UI wearer two");
  await page.getByRole("button", { name: "Save wearer", exact: true }).click();
  await page
    .getByRole("heading", { name: "UI wearer two", exact: true })
    .waitFor();
  await page
    .locator(`[data-wearer-id="${first.id}"]`)
    .getByRole("button", { name: "Edit wearer", exact: true })
    .click();
  await page.getByRole("button", { name: "Save wearer", exact: true }).click();
  await page.getByText("No changes to save.", { exact: true }).waitFor();
  const keys = await page.evaluate(() => ({
    operationKey: crypto.randomUUID(),
    correlationId: crypto.randomUUID(),
  }));
  const concurrent = await page.request.post(`${api}/commands/wearer.update`, {
    headers: { origin: fixture.base },
    data: {
      ...keys,
      payload: {
        customerId: id,
        wearerId: first.id,
        expectedVersion: first.version,
        profile: {
          ...first.profile,
          preferences: {
            ...first.profile.preferences,
            fabric: "Server fabric preference",
          },
        },
      },
    },
  });
  check(concurrent.ok(), "Concurrent wearer fixture update failed");
  const one = () => page.locator(`[data-wearer-id="${first.id}"]`);
  await one().getByRole("button", { name: "Edit wearer", exact: true }).click();
  await page.getByText("Optional wearer details", { exact: true }).click();
  await page
    .getByLabel("Fit preferences", { exact: true })
    .fill("Independent wearer preference");
  await page.getByRole("button", { name: "Save wearer", exact: true }).click();
  await page
    .getByRole("button", { name: "Reload saved profile", exact: true })
    .waitFor();
  check(
    (await page.getByLabel("Fit preferences", { exact: true }).inputValue()) ===
      "Independent wearer preference",
    "Version conflict lost local input",
  );
  await page.evaluate(() => {
    window.confirm = () => true;
  });
  await page
    .getByRole("button", { name: "Reload saved profile", exact: true })
    .click();
  await page
    .getByRole("heading", { name: "UI wearer one", exact: true })
    .waitFor();
  await one().getByRole("button", { name: "Edit wearer", exact: true }).click();
  await page.getByText("Optional wearer details", { exact: true }).click();
  check(
    (await page
      .getByLabel("Fabric preferences", { exact: true })
      .inputValue()) === "Server fabric preference",
    "Conflict reload did not refresh the saved version",
  );
  await page
    .getByLabel("Fit preferences", { exact: true })
    .fill("Independent wearer preference");
  await page.getByRole("button", { name: "Save wearer", exact: true }).click();
  await page
    .getByRole("heading", { name: "UI wearer one", exact: true })
    .waitFor();
  await one().getByText("Wearer details", { exact: true }).click();
  await one()
    .getByText("Independent wearer preference", { exact: true })
    .waitFor();
  await one()
    .getByRole("button", { name: "Archive wearer", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Confirm archive", exact: true })
    .click();
  await one().getByText("Archived", { exact: true }).waitFor();
  await page
    .getByRole("button", { name: "Archive customer", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Confirm archive", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Restore customer", exact: true })
    .waitFor();
  await page.getByRole("tab", { name: "Wearers", exact: true }).click();
  await page
    .getByText(/0 selectable while this customer is archived/)
    .waitFor();
  check(
    (await page
      .getByRole("button", { name: "Add wearer", exact: true })
      .count()) === 0,
    "Archived customer exposed wearer creation",
  );
  check(
    (await page
      .getByRole("button", { name: "Restore wearer", exact: true })
      .count()) === 0,
    "Archived customer exposed wearer mutation",
  );
  await page
    .getByRole("button", { name: "Restore customer", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Confirm restore", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Archive customer", exact: true })
    .waitFor();
  await page.getByRole("tab", { name: "Wearers", exact: true }).click();
  await one().getByText("Archived", { exact: true }).waitFor();
  detail = await (await page.request.get(`${api}/${id}`)).json();
  check(
    detail.wearers.items.find((w) => w.id === first.id).archivedAt !== null,
    "Customer restore changed own wearer archive state",
  );
  check(
    detail.wearers.items.filter((w) => w.effectiveActive).length === 1,
    "Effective availability ignores own/parent archive state",
  );
  await one()
    .getByRole("button", { name: "Restore wearer", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Confirm restore", exact: true })
    .click();
  await one().getByText("Active", { exact: true }).waitFor();
  // Actual commands create one extra page for both wearers and safe CRM activity.
  await page.evaluate(
    async ({ api, id }) => {
      for (let n = 0; n < 24; n++) {
        const r = await fetch(`${api}/commands/wearer.create`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            operationKey: crypto.randomUUID(),
            correlationId: crypto.randomUUID(),
            payload: {
              customerId: id,
              profile: {
                name: `Continuation wearer ${String(n).padStart(2, "0")}`,
                relationship: null,
                birthday: null,
                gender: { kind: "unspecified" },
                height: null,
                weight: null,
                notes: null,
                preferences: { fit: null, fabric: null, design: null },
              },
            },
          }),
        });
        if (!r.ok) throw Error("Continuation fixture creation failed");
      }
    },
    { api, id },
  );
  await page.reload();
  await page.getByRole("heading", { name: "Wearers", exact: true }).waitFor();
  check(
    (await page.locator("[data-wearer-id]").count()) === 25,
    "Initial wearer page is unbounded",
  );
  await page.getByRole("button", { name: "Next wearers", exact: true }).click();
  await page
    .getByRole("heading", { name: "UI wearer two", exact: true })
    .waitFor();
  check(
    (await page.locator("[data-wearer-id]").count()) === 1,
    "Next wearer page is wrong",
  );
  await page
    .getByRole("button", { name: "Previous wearers", exact: true })
    .click();
  await page
    .getByRole("heading", { name: "Continuation wearer 00", exact: true })
    .waitFor();
  check(
    (await page.locator("[data-wearer-id]").count()) === 25,
    "Previous wearer page did not restore first page",
  );
  await page.getByRole("tab", { name: "Activity", exact: true }).click();
  await page
    .getByRole("heading", { name: "CRM activity", exact: true })
    .waitFor();
  const activityPanel = page.getByRole("tabpanel", {
    name: "Activity",
    exact: true,
  });
  await activityPanel.getByRole("listitem").nth(24).waitFor();
  check(
    (await activityPanel.getByRole("listitem").count()) === 25,
    "Activity first page is unbounded",
  );
  await page
    .getByRole("button", { name: "Next activity", exact: true })
    .click();
  await page.getByText("customer · create · You", { exact: true }).waitFor();
  check(
    (await activityPanel.getByRole("listitem").count()) === 8,
    "Activity continuation is wrong",
  );
  await page
    .getByRole("button", { name: "Previous activity", exact: true })
    .click();
  await activityPanel.getByRole("listitem").nth(24).waitFor();
  check(
    (await activityPanel.getByRole("listitem").count()) === 25,
    "Activity previous page is wrong",
  );
  await page.getByRole("tab", { name: "Overview", exact: true }).click();
  await page.getByRole("tab", { name: "Activity", exact: true }).click();
  await page.getByText("33 changes", { exact: true }).waitFor();
  await page.setViewportSize({ width: 390, height: 1000 });
  check(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
    "Profile overflows at 390px",
  );
  await page.screenshot({
    path: `${fixture.artifacts}/customer-activity-390.png`,
    fullPage: true,
    timeout: 30000,
    animations: "disabled",
  });
  await page.getByRole("tab", { name: "Wearers", exact: true }).click();
  await page.getByRole("button", { name: "Add wearer", exact: true }).click();
  await page.getByLabel("Wearer name", { exact: true }).waitFor();
  check(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
    "Wearer sheet overflows at 390px",
  );
  await page.screenshot({
    path: `${fixture.artifacts}/wearer-sheet-390.png`,
    fullPage: true,
    timeout: 30000,
    animations: "disabled",
  });
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await page.route("**/customers/commands/wearer.create", (route) =>
    route.fulfill({
      status: 403,
      contentType: "application/json",
      body: JSON.stringify({
        outcome: "error",
        category: "access",
        code: "denied",
        message: "Wearer access denied",
        issues: [],
        correlationId: "55555555-5555-4555-8555-555555555555",
      }),
    }),
  );
  await page.getByRole("button", { name: "Add wearer", exact: true }).click();
  await page
    .getByLabel("Wearer name", { exact: true })
    .fill("Retained after denial");
  await page.getByRole("button", { name: "Save wearer", exact: true }).click();
  await page.getByText(/Wearer access denied/).waitFor();
  check(
    await page.getByLabel("Wearer name", { exact: true }).isDisabled(),
    "Denied wearer operation unlocked its draft",
  );
  await page.evaluate(() => {
    window.confirm = () => true;
  });
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  check(
    (await page
      .getByRole("button", { name: "Add wearer", exact: true })
      .count()) === 0,
    "Closing a denied wearer sheet re-enabled writes",
  );
  await page.unroute("**/customers/commands/wearer.create");
  return { customerWearersUiPassed: true };
}
