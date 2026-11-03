// Reuses the authenticated browser and database owned by the master HTTP harness.
export async function exerciseCustomersUI(page, fixture) {
  const check = (condition, message) => {
    if (!condition) throw Error(message);
  };
  const base = `${fixture.base}/workspaces/${fixture.tenant}/${fixture.location}`,
    register = `${base}/customers`;
  const { lateName, lateId, readOnlyLocation, crmOnlyLocation, total } =
    fixture.customers;
  const search = () =>
    page.getByRole("textbox", { name: "Search name or phone", exact: true });
  const refresh = () =>
    page
      .getByRole("button", { name: "Refresh customers", exact: true })
      .click();
  const count = async (n) =>
    page
      .getByRole("status")
      .filter({ hasText: new RegExp(`^${n} customers?$`) })
      .waitFor();
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(register);
  await count(total);
  check(
    (await page.getByRole("row").count()) === 26,
    "Customer table is not a bounded 25-row page",
  );
  check(
    (await page
      .getByRole("navigation", { name: "Workspace navigation", exact: true })
      .getByRole("link", { name: "Customers", exact: true })
      .getAttribute("aria-current")) === "page",
    "Customer register navigation is inactive",
  );
  await page.screenshot({
    path: `${fixture.artifacts}/customers-1440.png`,
    fullPage: true,
    timeout: 30000,
    animations: "disabled",
  });
  await page
    .getByRole("button", { name: "Next customers", exact: true })
    .click();
  await page.getByText(`26–50 of ${total}`, { exact: true }).waitFor();
  await page.getByLabel("Status", { exact: true }).selectOption("archived");
  await page
    .getByRole("status")
    .filter({ hasText: /^1 customer archived$/ })
    .waitFor();
  await page.getByLabel("Status", { exact: true }).selectOption("active");
  await count(total);
  await search().fill("beyond 500");
  await count(1);
  await page.getByRole("link", { name: lateName, exact: true }).waitFor();
  check(!page.url().includes("beyond"), "Search text entered browser history");
  await page
    .getByRole("button", { name: "Clear filters", exact: true })
    .click();
  await count(total);
  for (const tag of ["Family", "Priority"]) {
    await page
      .getByRole("textbox", { name: "Filter by tag", exact: true })
      .fill(tag);
    await page.getByRole("button", { name: "Add tag", exact: true }).click();
  }
  await count(1);
  await page
    .getByLabel("Staff-assigned segment", { exact: true })
    .selectOption("important");
  await count(1);
  await page.getByRole("button", { name: "Card view", exact: true }).click();
  await page.getByRole("link", { name: lateName, exact: true }).click();
  await page.getByRole("heading", { name: lateName, exact: true }).waitFor();
  check(
    (await page
      .getByRole("navigation", { name: "Workspace navigation", exact: true })
      .getByRole("link", { name: "Customers", exact: true })
      .getAttribute("aria-current")) === "page",
    "Customer detail route lost its active section",
  );
  check(
    !page.url().includes("Family") && !page.url().includes("Priority"),
    "Tag text entered profile URL",
  );
  await page
    .getByRole("link", { name: "← Back to customers", exact: true })
    .click();
  await count(1);
  check(
    (await page
      .getByLabel("Staff-assigned segment", { exact: true })
      .inputValue()) === "important",
    "Return context lost segment",
  );
  await page
    .getByRole("button", { name: "Remove tag filter Family", exact: true })
    .waitFor();
  check(
    (await page
      .getByRole("button", { name: "Card view", exact: true })
      .getAttribute("aria-pressed")) === "true",
    "Return context lost card view",
  );
  await page.waitForFunction(
    (id) => document.activeElement?.getAttribute("data-customer-id") === id,
    lateId,
  );
  const otherTab = await page.context().newPage();
  try {
    await otherTab.goto(register);
    await otherTab.evaluate(() =>
      sessionStorage.setItem(
        "fitloom.customer-return.v1:entry:logout-probe",
        "{}",
      ),
    );
    await page.evaluate(() => {
      const channel = new BroadcastChannel("fitloom:account");
      channel.postMessage({ type: "context-cleared" });
      channel.close();
    });
    await otherTab.waitForFunction(
      () => !Object.keys(sessionStorage).some((k) => k.includes("entry:")),
    );
    await page.waitForFunction(
      () => !Object.keys(sessionStorage).some((k) => k.includes("entry:")),
    );
  } finally {
    await otherTab.close();
  }
  await page.setViewportSize({ width: 390, height: 844 });
  check(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
    "Customer cards overflow at 390px",
  );
  await page.screenshot({
    path: `${fixture.artifacts}/customers-390.png`,
    fullPage: true,
    timeout: 30000,
    animations: "disabled",
  });
  await page.keyboard.press("Control+k");
  check(
    await search().evaluate((node) => node === document.activeElement),
    "Customer shortcut did not focus search",
  );
  await page
    .getByRole("button", { name: "Clear filters", exact: true })
    .click();
  await count(total);
  await page.route("**/customers/search", async (route) => {
    const body = route.request().postDataJSON();
    if (body.search === "slow") {
      await page.waitForTimeout(700);
      await route
        .fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ items: [], total: 999, nextOffset: null }),
        })
        .catch(() => {});
    } else await route.continue();
  });
  const slow = page.waitForRequest(
    (r) =>
      r.url().endsWith("/customers/search") &&
      r.postDataJSON().search === "slow",
  );
  await search().fill("slow");
  await slow;
  await search().fill("beyond 500");
  await count(1);
  await page.waitForTimeout(800);
  await count(1);
  await page.unroute("**/customers/search");
  await page.route("**/customers/search", (route) =>
    route.fulfill({
      status: 503,
      contentType: "text/html",
      body: "<h1>Unavailable</h1>",
    }),
  );
  await refresh();
  await page
    .getByText("Customers could not be loaded", { exact: true })
    .waitFor();
  await page.getByText("Customer count unavailable", { exact: true }).waitFor();
  await page.unroute("**/customers/search");
  await refresh();
  await count(1);
  await page.getByRole("link", { name: lateName, exact: true }).click();
  await page.getByRole("heading", { name: lateName, exact: true }).waitFor();
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.evaluate(() => {
    window.BroadcastChannel = class {
      constructor() {
        throw new DOMException("Blocked", "SecurityError");
      }
    };
  });
  await page
    .getByLabel("Switch shop or location", { exact: true })
    .selectOption(`${fixture.tenant}/${crmOnlyLocation}`);
  await page.waitForURL(
    `${fixture.base}/workspaces/${fixture.tenant}/${crmOnlyLocation}/customers`,
  );
  await page.getByText("No customers yet", { exact: true }).waitFor();
  check(
    (await page
      .getByRole("link", { name: "Garments", exact: true })
      .count()) === 0,
    "CRM-only shop exposed catalog navigation",
  );
  check(
    !(await page.evaluate(() => Object.keys(sessionStorage))).some((k) =>
      k.includes("entry:"),
    ),
    "Successful switch retained customer return entries",
  );
  await page
    .getByLabel("Switch shop or location", { exact: true })
    .selectOption(`${fixture.tenant}/${readOnlyLocation}`);
  await page.waitForURL(
    `${fixture.base}/workspaces/${fixture.tenant}/${readOnlyLocation}`,
  );
  check(
    (await page
      .getByRole("navigation", { name: "Workspace navigation", exact: true })
      .getByRole("link", { name: "Customers", exact: true })
      .count()) === 0,
    "Denied target exposed Customers",
  );
  await page
    .getByLabel("Switch shop or location", { exact: true })
    .selectOption(`${fixture.tenant}/${fixture.location}`);
  await page.waitForURL(base);
  // One create/edit/recovery journey shares the existing optimized app and fixtures.
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(`${register}/new`);
  await page
    .getByLabel("Customer name", { exact: true })
    .fill("UI customer journey");
  await page.getByLabel("No phone provided", { exact: true }).check();
  await page.screenshot({
    path: `${fixture.artifacts}/customer-new-1440.png`,
    fullPage: true,
    timeout: 30000,
    animations: "disabled",
  });
  await page
    .getByRole("button", { name: "Save customer", exact: true })
    .click();
  await page
    .getByRole("heading", { name: "UI customer journey", exact: true })
    .waitFor();
  await page.getByRole("tab", { name: "Wearers", exact: true }).click();
  await page.getByText("1 saved wearers", { exact: false }).waitFor();
  const createdUrl = page.url();
  await page.getByRole("link", { name: "Edit customer", exact: true }).click();
  await page
    .getByLabel("Customer name", { exact: true })
    .fill("UI customer edited");
  await page.getByText("Optional details", { exact: true }).click();
  await page
    .getByLabel("Notes", { exact: true })
    .pressSequentially("Saved through the customer UI");
  await page.getByLabel("Notes", { exact: true }).press("Enter");
  await page
    .getByLabel("Notes", { exact: true })
    .pressSequentially("Second line");
  check(
    (await page.getByLabel("Notes", { exact: true }).inputValue()) ===
      "Saved through the customer UI\nSecond line",
    "Typing erased spaces or line breaks",
  );
  // Commit the update but lose its response. Retry must reuse identical bytes.
  let retainedBytes;
  let intercepted = false;
  let deniedRetry = false;
  await page.route("**/customers/commands/customer.update", async (route) => {
    if (!intercepted) {
      intercepted = true;
      retainedBytes = route.request().postData();
      await route.fetch();
      await route.abort("failed");
    } else {
      check(
        route.request().postData() === retainedBytes,
        "Uncertain retry changed the operation envelope",
      );
      if (!deniedRetry) {
        deniedRetry = true;
        await route.fulfill({
          status: 403,
          contentType: "application/json",
          body: JSON.stringify({
            outcome: "error",
            category: "access",
            code: "denied",
            message: "Replay access temporarily unavailable",
            issues: [],
            correlationId: JSON.parse(retainedBytes).correlationId,
          }),
        });
      } else await route.continue();
    }
  });
  await page
    .getByRole("button", { name: "Save customer", exact: true })
    .click();
  await page.getByRole("button", { name: "Retry save", exact: true }).waitFor();
  check(
    await page.getByLabel("Customer name", { exact: true }).isDisabled(),
    "Uncertain input remained editable",
  );
  await page.getByRole("button", { name: "Retry save", exact: true }).click();
  await page.getByText(/Replay access temporarily unavailable/).waitFor();
  check(
    await page.getByLabel("Customer name", { exact: true }).isDisabled(),
    "Denied retry unlocked the unresolved draft",
  );
  await page.getByRole("button", { name: "Retry save", exact: true }).click();
  await page
    .getByRole("heading", { name: "UI customer edited", exact: true })
    .waitFor();
  await page.unroute("**/customers/commands/customer.update");
  await page.getByText(/Saved through the customer UI\s+Second line/).waitFor();
  check(
    page.url().split("?")[0] === createdUrl.split("?")[0],
    "Edit changed customer identity",
  );
  // Wearer name remains independent after the contact rename.
  await page.getByRole("tab", { name: "Wearers", exact: true }).click();
  await page.getByText("UI customer journey", { exact: true }).waitFor();
  await page.goto(`${register}/new`);
  await page
    .getByLabel("Customer name", { exact: true })
    .fill("UI shared phone");
  async function submitForReview() {
    for (let attempt = 0; attempt < 4; attempt++) {
      const response = page.waitForResponse(
        (r) =>
          r.url().endsWith("/customers/commands/customer.create") &&
          r.request().method() === "POST",
      );
      await page
        .getByRole("button", {
          name: attempt === 0 ? "Save customer" : "Retry save",
          exact: true,
        })
        .click();
      const body = await (await response).json();
      if (body.outcome === "review-required") {
        await page
          .getByRole("region", { name: "Duplicate review", exact: true })
          .waitFor();
        return;
      }
      check(
        body.outcome === "error" &&
          ["busy", "rate-limit", "temporary"].includes(body.code),
        `Unexpected duplicate outcome: ${body.outcome}/${body.code}`,
      );
      await page
        .getByRole("button", { name: "Retry save", exact: true })
        .waitFor();
      await page.waitForTimeout(200);
    }
    throw Error("Duplicate admission remained busy after explicit retries");
  }
  await page.getByLabel("Phone", { exact: true }).fill("+919876543219");
  await submitForReview();
  await page
    .getByRole("region", { name: "Duplicate review", exact: true })
    .waitFor();
  await page.screenshot({
    path: `${fixture.artifacts}/customer-duplicate-1440.png`,
    fullPage: false,
    timeout: 30000,
    animations: "disabled",
  });
  await page.getByRole("button", { name: "Back to edit", exact: true }).click();
  check(
    (await page.getByLabel("Customer name", { exact: true }).inputValue()) ===
      "UI shared phone",
    "Duplicate review lost draft",
  );
  await submitForReview();
  await page
    .getByRole("button", { name: "Keep separate", exact: true })
    .click();
  await page
    .getByRole("heading", { name: "UI shared phone", exact: true })
    .waitFor();
  await page.setViewportSize({ width: 390, height: 1000 });
  await page.getByRole("link", { name: "Edit customer", exact: true }).click();
  check(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
    "Customer form overflows on mobile",
  );
  await page.screenshot({
    path: `${fixture.artifacts}/customer-edit-390.png`,
    fullPage: true,
    timeout: 30000,
    animations: "disabled",
  });
  await page.goto(register);
  await page.goto(`${register}/new`);
  await page.route("**/customers/duplicate-check", (route) =>
    route.fulfill({
      status: 403,
      contentType: "application/json",
      body: JSON.stringify({
        outcome: "error",
        category: "access",
        code: "denied",
        message: "Customer check access denied",
        issues: [],
        correlationId: "55555555-5555-4555-8555-555555555555",
      }),
    }),
  );
  await page.getByLabel("Phone", { exact: true }).fill("+919876543219");
  await page.getByText(/Customer check access denied/).waitFor();
  check(
    await page.getByLabel("Customer name", { exact: true }).isDisabled(),
    "Advisory denial did not block the form",
  );
  check(
    (await page
      .getByRole("button", { name: "Save customer", exact: true })
      .count()) === 0,
    "Save remained enabled after advisory denial",
  );
  await page.evaluate(() => {
    window.confirm = () => true;
  });
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await page.getByRole("heading", { name: "Customers", exact: true }).waitFor();
  await page.unroute("**/customers/duplicate-check");
  return { customersUiPassed: true };
}
