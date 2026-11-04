export async function exerciseMeasurementPhotosUI(page, fixture) {
  page.setDefaultTimeout(15000);
  page.setDefaultNavigationTimeout(20000);
  const check = (ok, message) => {
      if (!ok) throw Error(message);
    },
    m = fixture.measurements,
    api = `${fixture.base}/api/workspaces/${fixture.tenant}/${fixture.location}/measurements`,
    ownerApi = `${api}/${m.customerId}/${m.wearerId}`,
    book = `${fixture.base}/workspaces/${fixture.tenant}/${fixture.location}/customers/${m.customerId}/wearers/${m.wearerId}/measurements`;
  const post = async (path, data) => {
    const r = await page.request.post(path, {
      headers: { origin: fixture.base },
      data,
    });
    check(r.ok(), await r.text());
    return r.json();
  };
  const command = async (name, payload) =>
    post(`${api}/commands/${name}`, {
      payload,
      operationKey: await page.evaluate(() => crypto.randomUUID()),
      correlationId: await page.evaluate(() => crypto.randomUUID()),
    });
  const get = async (path) => {
    const r = await page.request.get(path);
    check(r.ok(), await r.text());
    return r.json();
  };
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(`${book}/new`);
  await page.waitForFunction(
    () => document.querySelector("#measurement-photo-file")?.disabled === false,
  );
  await page
    .getByLabel("Choose reference photo", { exact: true })
    .setInputFiles(fixture.measurementPhotoFile);
  await page
    .getByAltText("Selected unsaved reference photo", { exact: true })
    .waitFor();
  await page.evaluate(() => {
    window.confirm = () => false;
  });
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  check(
    await page
      .getByAltText("Selected unsaved reference photo", { exact: true })
      .isVisible(),
    "Canceled photo-only exit lost the selected reference",
  );
  await page.evaluate(() => {
    window.confirm = () => true;
  });
  await page
    .getByLabel("Profile label", { exact: true })
    .fill("UI private measurement photos");
  await page.getByLabel("Chest circumference", { exact: true }).fill("38.25");
  const begins = [],
    uploads = [];
  let lostBegin = false,
    lostUpload = false;
  await page.route("**/commands/measurement-photo.begin", async (route) => {
    begins.push(route.request().postData());
    if (!lostBegin) {
      lostBegin = true;
      await route.fetch();
      await route.abort("failed");
    } else await route.continue();
  });
  await page.route("**/photos/uploads/*", async (route) => {
    uploads.push(route.request().postDataBuffer()?.toString("base64"));
    if (!lostUpload) {
      lostUpload = true;
      await route.fetch();
      await route.abort("failed");
    } else await route.continue();
  });
  await page
    .getByRole("button", { name: "Upload reference to draft", exact: true })
    .click();
  const retry = page.getByRole("button", {
    name: "Retry exact photo upload",
    exact: true,
  });
  await retry.waitFor();
  await retry.click();
  await retry.waitFor();
  await retry.click();
  await page
    .getByText(
      "Reference uploaded to this unsaved draft. Save the measurement version to attach it.",
      { exact: true },
    )
    .waitFor();
  check(
    begins.length === 2 && begins[0] === begins[1],
    "Lost begin did not reuse one exact envelope",
  );
  check(
    uploads.length === 2 && uploads[0] === uploads[1],
    "Lost upload did not reuse exact bytes and file identity",
  );
  await page.unroute("**/commands/measurement-photo.begin");
  await page.unroute("**/photos/uploads/*");
  await page
    .getByLabel("Reference photo 1 note", { exact: true })
    .fill("Synthetic private measurement reference");
  check(
    (
      await post(`${ownerApi}/book`, {
        search: "UI private measurement photos",
      })
    ).total === 0,
    "Photo staging created measurement content before Save",
  );
  for (const width of [1440, 1024, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    await page
      .getByLabel("Reference photo 1 note", { exact: true })
      .scrollIntoViewIfNeeded();
    check(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      `Photo editor overflow at ${width}`,
    );
    await page.screenshot({
      path: `${fixture.artifacts}/measurement-photos-draft-${width}.png`,
      fullPage: false,
      animations: "disabled",
    });
  }
  let lostSave = false;
  const saves = [];
  await page.route("**/commands/measurement.create", async (route) => {
    saves.push(route.request().postData());
    if (!lostSave) {
      lostSave = true;
      await route.fetch();
      await route.abort("failed");
    } else await route.continue();
  });
  await page
    .getByRole("button", { name: "Save measurement version", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Retry exact save", exact: true })
    .waitFor();
  check(
    await page
      .getByRole("button", {
        name: "Discard photo changes and restart",
        exact: true,
      })
      .isDisabled(),
    "An uncertain Save allowed conflicting photo changes",
  );
  await page
    .getByRole("button", { name: "Retry exact save", exact: true })
    .click();
  await page
    .getByRole("heading", {
      name: "UI private measurement photos",
      exact: true,
      level: 1,
    })
    .waitFor();
  await page.unroute("**/commands/measurement.create");
  check(
    saves.length === 2 && saves[0] === saves[1],
    "Photo-bearing Save changed its retry envelope",
  );
  const created = JSON.parse(saves[0]).payload,
    current = await get(`${ownerApi}/${created.profileId}`),
    firstId = current.versionId,
    fileId = current.photos.items[0].fileId,
    photoPath = `${ownerApi}/${created.profileId}/versions/${firstId}/photos/${fileId}`;
  check(
    current.sequence === 1 && current.photos.items.length === 1,
    "Photo retry created duplicate content or membership",
  );
  await page.waitForFunction(() =>
    Array.from(document.images).some(
      (img) =>
        img.alt === "Saved reference photo 1" &&
        img.complete &&
        img.naturalWidth > 0,
    ),
  );
  check(
    await page
      .getByAltText("Saved reference photo 1", { exact: true })
      .evaluate((img) => img.complete && img.naturalWidth > 0),
    "Saved private image did not load",
  );
  // A transient media failure must recover the parent controls after retry.
  await page.route(photoPath, (route) => route.abort("failed"));
  await page.reload();
  await page
    .getByRole("button", { name: "Retry reference photo", exact: true })
    .waitFor();
  await page.unroute(photoPath);
  await page
    .getByRole("button", { name: "Retry reference photo", exact: true })
    .click();
  await page
    .getByLabel("Reason to revoke reference photo 1", { exact: true })
    .waitFor();
  await page.goto(`${book}/${created.profileId}/edit`);
  await page.waitForFunction(
    () => document.querySelector("#measurement-photo-file")?.disabled === false,
  );
  await page
    .getByLabel("Choose reference photo", { exact: true })
    .setInputFiles(fixture.measurementPhotoFile);
  await page.route("**/photos/uploads/*", (route) =>
    route.fulfill({
      status: 503,
      contentType: "application/json",
      body: JSON.stringify({
        outcome: "error",
        code: "temporary",
        category: "temporary",
        message: "Synthetic photo outage",
        issues: [],
        correlationId: "55555555-5555-4555-8555-555555555555",
      }),
    }),
  );
  await page
    .getByRole("button", { name: "Upload reference to draft", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Retry exact photo upload", exact: true })
    .waitFor();
  await page.waitForFunction(() =>
    Array.from(document.images).some(
      (img) =>
        img.alt === "Reference photo 1" && img.complete && img.naturalWidth > 0,
    ),
  );
  check(
    await page
      .getByAltText("Reference photo 1", { exact: true })
      .evaluate((img) => img.complete && img.naturalWidth > 0),
    "Failed replacement lost the saved preview",
  );
  await page.screenshot({
    path: `${fixture.artifacts}/measurement-photos-failed-replacement-320.png`,
    fullPage: false,
  });
  await page
    .getByRole("button", {
      name: "Discard photo changes and restart",
      exact: true,
    })
    .click();
  await page.unroute("**/photos/uploads/*");
  await page
    .getByRole("button", {
      name: "Remove reference photo 1 from draft",
      exact: true,
    })
    .click();
  check(
    (await page.request.get(photoPath)).ok(),
    "Draft removal revoked the historical bytes before Save",
  );
  await page
    .getByRole("button", { name: "Save measurement version", exact: true })
    .click();
  await page
    .getByRole("heading", {
      name: "UI private measurement photos",
      exact: true,
      level: 1,
    })
    .waitFor();
  const removed = await get(`${ownerApi}/${created.profileId}`);
  check(
    removed.sequence === 2 && removed.photos.items.length === 0,
    "Photo removal did not create an independent immutable version",
  );
  check(
    (await page.request.get(photoPath)).ok(),
    "New version removal revoked historical photo access",
  );
  await command("measurement.archive", {
    customerId: m.customerId,
    wearerId: m.wearerId,
    profileId: created.profileId,
    expectedRevision: removed.revision,
  });
  await page.goto(`${book}/${created.profileId}/versions/${firstId}`);
  await page
    .getByLabel("Reason to revoke reference photo 1", { exact: true })
    .fill("Synthetic archived privacy request");
  let lostRevoke = false;
  const revokes = [];
  await page.route("**/commands/measurement-photo.revoke", async (route) => {
    revokes.push(route.request().postData());
    if (!lostRevoke) {
      lostRevoke = true;
      await route.fetch();
      await route.abort("failed");
    } else await route.continue();
  });
  await page
    .getByRole("button", { name: "Revoke photo access", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Retry exact photo revocation", exact: true })
    .waitFor();
  await page.evaluate(() => {
    window.confirm = () => false;
  });
  const revokeUrl = page.url();
  await page
    .getByRole("link", { name: "Back to measurement book", exact: true })
    .click();
  check(page.url() === revokeUrl, "Cancelled photo exit discarded exact retry");
  check(
    await page.evaluate(() => {
      const e = new Event("beforeunload", { cancelable: true });
      window.dispatchEvent(e);
      return e.defaultPrevented;
    }),
    "Uncertain photo revocation has no reload protection",
  );
  await page.evaluate(() => {
    window.confirm = () => true;
  });
  await page
    .getByRole("button", { name: "Retry exact photo revocation", exact: true })
    .click();
  await page.getByText("Photo access revoked", { exact: true }).waitFor();
  await page.unroute("**/commands/measurement-photo.revoke");
  check(
    revokes.length === 2 && revokes[0] === revokes[1],
    "Photo revoke retry changed the envelope",
  );
  check(
    (await page.request.get(photoPath)).status() === 404,
    "Revoked bytes remain readable",
  );
  await page
    .getByText("Photo access revoked", { exact: true })
    .scrollIntoViewIfNeeded();
  await page.screenshot({
    path: `${fixture.artifacts}/measurement-photos-revoked-320.png`,
    fullPage: false,
    animations: "disabled",
  });
  const capture = await get(
    `${ownerApi}/${created.profileId}/versions/${firstId}/capture`,
  );
  check(
    !JSON.stringify(capture).includes(fileId),
    "Scalar capture leaked photo identity",
  );
  const storage = await page.evaluate(() =>
    [...Object.values(localStorage), ...Object.values(sessionStorage)].join(
      "\n",
    ),
  );
  check(
    !storage.includes(fileId) &&
      !storage.includes("Synthetic private measurement reference"),
    "Photo identity or note entered browser storage",
  );
  return { measurementPhotosUiPassed: true };
}
