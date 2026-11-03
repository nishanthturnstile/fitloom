// One photo journey reuses the existing authenticated browser and isolated fixture scope.
export async function exerciseCustomerPhotosUI(page, fixture) {
  const absolute = (src) => (src.startsWith("/") ? fixture.base + src : src);
  const check = (value, message) => {
    if (!value) throw Error(message);
  };
  const base = `${fixture.base}/workspaces/${fixture.tenant}/${fixture.location}`,
    register = `${base}/customers`;
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(`${register}/new`);
  await page
    .getByLabel("Customer name", { exact: true })
    .fill("UI photo customer");
  await page.getByLabel("No phone provided", { exact: true }).check();
  await page
    .getByRole("button", { name: "Save customer", exact: true })
    .click();
  await page
    .getByRole("heading", { name: "UI photo customer", exact: true, level: 1 })
    .waitFor();
  const badScope = await page.request.post(
    `${fixture.base}/api/workspaces/${fixture.tenant}/not-a-uuid/customers/photos/commands/begin`,
    {
      headers: { origin: fixture.base },
      data: {
        operationKey: "55555555-5555-4555-8555-555555555555",
        correlationId: "55555555-5555-4555-8555-555555555555",
        payload: {
          owner: {
            kind: "customer-avatar",
            customerId: page.url().split("?")[0].split("/").at(-1),
          },
        },
      },
    },
  );
  check(
    badScope.status() === 400,
    "Malformed photo scope did not return validation",
  );
  const openAvatar = () =>
    page.getByRole("button", { name: "Customer photo", exact: true }).click();
  const select = async (note) => {
    await page
      .getByLabel("Choose JPEG or PNG", { exact: true })
      .setInputFiles(fixture.photoFile);
    await page
      .getByLabel("Permission or provenance note", { exact: true })
      .fill(note);
    await page
      .getByAltText("Selected customer avatar preview", { exact: true })
      .waitFor();
  };
  await openAvatar();
  await page.getByText("No photo saved.", { exact: true }).waitFor();
  const photoDialog = page.getByRole("dialog", {
    name: "Customer photo",
    exact: true,
  });
  await photoDialog.press("Escape");
  await photoDialog.waitFor({ state: "hidden" });
  await openAvatar();
  await page.getByText("No photo saved.", { exact: true }).waitFor();
  await select("Synthetic customer permission");
  await page.evaluate(() => {
    window.confirm = () => false;
  });
  await page
    .getByRole("dialog", { name: "Customer photo", exact: true })
    .press("Escape");
  await page
    .getByAltText("Selected customer avatar preview", { exact: true })
    .waitFor();
  check(
    (await page
      .getByLabel("Permission or provenance note", { exact: true })
      .inputValue()) === "Synthetic customer permission",
    "Canceled keyboard exit lost photo input",
  );
  let lost = false,
    bytes;
  await page.route("**/photos/commands/bind", async (route) => {
    if (!lost) {
      lost = true;
      bytes = route.request().postData();
      await route.fetch();
      await route.abort("failed");
    } else {
      check(
        route.request().postData() === bytes,
        "Photo replay changed its exact envelope",
      );
      await route.continue();
    }
  });
  await page.getByRole("button", { name: "Save photo", exact: true }).click();
  await page
    .getByRole("button", { name: "Retry photo action", exact: true })
    .waitFor();
  await page
    .getByRole("button", { name: "Retry photo action", exact: true })
    .click();
  await page
    .getByRole("heading", { name: "UI photo customer", exact: true, level: 1 })
    .waitFor();
  await page.unroute("**/photos/commands/bind");
  await openAvatar();
  await page.waitForFunction(() => {
    const img = document.querySelector('img[alt="Customer avatar"]');
    return img?.complete && img.naturalWidth > 0;
  });
  const oldSrc = await page
    .getByAltText("Customer avatar", { exact: true })
    .getAttribute("src");
  const read = await page.request.get(absolute(oldSrc));
  check(
    read.ok() && read.headers()["content-disposition"].startsWith("inline"),
    "Photo stream is not authorized inline content",
  );
  check(
    read.headers()["cache-control"] === "private, no-store",
    "Photo stream is cacheable",
  );
  await select("Replacement permission");
  await page.route("**/photos/uploads/*", (route) =>
    route.fulfill({
      status: 503,
      contentType: "text/html",
      body: "<h1>Temporary storage outage</h1>",
    }),
  );
  await page.getByRole("button", { name: "Save photo", exact: true }).click();
  await page
    .getByRole("button", { name: "Retry photo action", exact: true })
    .waitFor();
  check(
    (await page
      .getByAltText("Customer avatar", { exact: true })
      .getAttribute("src")) === oldSrc,
    "Failed replacement removed the saved image",
  );
  await page.screenshot({
    path: `${fixture.artifacts}/photo-replacement-error-1440.png`,
    fullPage: false,
    timeout: 30000,
    animations: "disabled",
  });
  await page.unroute("**/photos/uploads/*");
  await page
    .getByRole("button", { name: "Retry photo action", exact: true })
    .click();
  await page
    .getByRole("heading", { name: "UI photo customer", exact: true, level: 1 })
    .waitFor();
  await openAvatar();
  await page.getByAltText("Customer avatar", { exact: true }).waitFor();
  const newSrc = await page
    .getByAltText("Customer avatar", { exact: true })
    .getAttribute("src");
  check(newSrc !== oldSrc, "Replacement retained the old binding");
  check(
    (await page.request.get(absolute(oldSrc))).status() === 404,
    "Retired photo remains readable",
  );
  await page.setViewportSize({ width: 390, height: 1000 });
  check(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
    "Photo sheet overflows on mobile",
  );
  await page.screenshot({
    path: `${fixture.artifacts}/customer-photo-390.png`,
    fullPage: false,
    timeout: 30000,
    animations: "disabled",
  });
  await page.evaluate(() => {
    window.confirm = () => true;
  });
  await page.getByRole("button", { name: "Remove photo", exact: true }).click();
  await page
    .getByRole("heading", { name: "UI photo customer", exact: true, level: 1 })
    .waitFor();
  await openAvatar();
  await page.getByText("No photo saved.", { exact: true }).waitFor();
  check(
    (await page.request.get(absolute(newSrc))).status() === 404,
    "Removed photo is still readable",
  );
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await page.getByRole("tab", { name: "Wearers", exact: true }).click();
  await page
    .getByRole("button", { name: "Face photo", exact: true })
    .first()
    .click();
  await page.getByText("No photo saved.", { exact: true }).waitFor();
  await page
    .getByLabel("Choose JPEG or PNG", { exact: true })
    .setInputFiles(fixture.photoFile);
  await page
    .getByLabel("Permission or provenance note", { exact: true })
    .fill("Synthetic wearer face permission");
  await page.getByRole("button", { name: "Save photo", exact: true }).click();
  await page
    .getByRole("heading", { name: "UI photo customer", exact: true, level: 1 })
    .waitFor();
  await page
    .getByRole("button", { name: "Body photo", exact: true })
    .first()
    .click();
  await page.getByText("No photo saved.", { exact: true }).waitFor();
  await page
    .getByLabel("Choose JPEG or PNG", { exact: true })
    .setInputFiles(fixture.photoFile);
  await page
    .getByLabel("Permission or provenance note", { exact: true })
    .fill("Synthetic wearer body permission");
  await page.getByRole("button", { name: "Save photo", exact: true }).click();
  await page
    .getByRole("heading", { name: "UI photo customer", exact: true, level: 1 })
    .waitFor();
  await page.screenshot({
    path: `${fixture.artifacts}/customer-profile-390.png`,
    fullPage: true,
    timeout: 30000,
    animations: "disabled",
  });
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
    .getByRole("button", { name: "Body photo", exact: true })
    .first()
    .click();
  await page.getByAltText("body photo", { exact: true }).waitFor();
  check(
    (await page
      .getByRole("button", { name: "Save photo", exact: true })
      .count()) === 0,
    "Archived photo owner exposed new bindings",
  );
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  return { customerPhotosUiPassed: true };
}
