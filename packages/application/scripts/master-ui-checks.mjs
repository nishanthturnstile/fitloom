import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { randomUUID } from "node:crypto";
import { mkdir, mkdtemp, realpath, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import sharp from "sharp";
import {
  importCustomerColumns,
  importMeasurementColumns,
} from "../dist/import-contracts.js";
import { exerciseCustomerPhotosUI } from "./customer-photo-ui-checks.mjs";
import { exerciseCustomersUI } from "./customer-register-ui-checks.mjs";
import { exerciseCustomerWearersUI } from "./customer-wearers-ui-checks.mjs";
import { exerciseDomainImportsUI } from "./domain-import-ui-checks.mjs";
import { exerciseGarmentEditorFrameUI } from "./garment-editor-frame-ui-checks.mjs";
import { exerciseMasterAuthorityUI } from "./master-authority-ui-checks.mjs";
import {
  exerciseCatalogReadonlyUI,
  exerciseCatalogUI,
  exerciseStarterUI,
} from "./master-catalog-ui-checks.mjs";
import { exerciseMasterRegistersUI } from "./master-register-ui-checks.mjs";
import { exerciseGarmentUI } from "./master-ui-browser-checks.mjs";
import { exerciseMeasurementCardsUI } from "./measurement-card-ui-checks.mjs";
import { exerciseMeasurementComparisonUI } from "./measurement-comparison-ui-checks.mjs";
import { exerciseMeasurementCustomUI } from "./measurement-custom-ui-checks.mjs";
import { exerciseMeasurementPhotosUI } from "./measurement-photo-ui-checks.mjs";
import { exerciseMeasurementReuseUI } from "./measurement-reuse-ui-checks.mjs";
import {
  exerciseMeasurementNavigationUI,
  exerciseMeasurementRevisionUI,
  exerciseMeasurementRevocationUI,
} from "./measurement-revision-ui-checks.mjs";
import { exerciseMeasurementsUI } from "./measurement-ui-checks.mjs";
import {
  exerciseWorkspaceRoutesUI,
  exerciseWorkspaceShellUI,
} from "./workspace-shell-ui-checks.mjs";

const execute = promisify(execFile);
export async function masterUiChecks({
  base,
  workspacePath,
  api,
  cookie,
  admin,
  tenant,
  location,
  customers,
  measurements,
  account,
}) {
  const directory = await realpath(
    await mkdtemp(join(tmpdir(), "fitloom-ui-")),
  );
  const session = `g4-${process.pid}`;
  const artifacts = join(
    tmpdir(),
    process.env.FITLOOM_UI_ARTIFACTS ?? "fitloom-increment6-ui",
  );
  await mkdir(artifacts, { recursive: true });
  await sharp({
    create: { width: 32, height: 24, channels: 3, background: "#448866" },
  })
    .png()
    .toFile(join(directory, "photo-fixture.png"));
  await sharp({
    create: { width: 640, height: 480, channels: 3, background: "#9b886e" },
  })
    .jpeg()
    .toFile(join(directory, "measurement-photo-fixture.jpg"));
  await writeFile(
    join(directory, "invalid-utf8.csv"),
    Buffer.from([0xc3, 0x28]),
  );
  await writeFile(
    join(directory, "oversized.csv"),
    Buffer.alloc(1024 * 1024 + 1, 120),
  );
  const csv = (rows) =>
    rows
      .map((row) =>
        row
          .map((value) => '"' + String(value).replaceAll('"', '""') + '"')
          .join(","),
      )
      .join("\r\n") + "\r\n";
  const customerRow = [
    "ui_contact",
    "UI imported customer",
    "",
    "",
    "",
    "ui_wearer",
    "UI imported wearer",
    "family",
    "Private source notes. தமிழ் அளவீட்டு குறிப்புகள். " + "நீளம்".repeat(35),
  ];
  await writeFile(
    join(directory, "customers.csv"),
    csv([
      importCustomerColumns,
      customerRow,
      customerRow,
      ["ui_contact_only", "UI contact only", "", "", "", "", "", "", ""],
    ]),
  );
  const values = (decimal) =>
    JSON.stringify(
      [1, 2, 3, 4, 5].map((i) => ({
        kind: "length",
        fieldKey: `f00${i}`,
        decimal,
        unit: "in",
      })),
    );
  const measurementRow = (id, sequence, date, decimal) => [
    "ui_profile",
    id,
    sequence,
    "ui_contact",
    "ui_wearer",
    "UI imported body history",
    "body_v1",
    date,
    values(decimal),
    "[]",
    "Private fitting notes",
    "Unverified source tailor",
  ];
  await writeFile(
    join(directory, "measurements.csv"),
    csv([
      importMeasurementColumns,
      measurementRow("ui_newer", 10, "2020-01-01", "40.250000"),
      measurementRow("ui_older", 2, "2020-02-01", "39.250000"),
    ]),
  );
  const run = async (...args) => {
    const result = await execute("playwright-cli", [`-s=${session}`, ...args], {
      cwd: directory,
      env: { ...process.env, TMPDIR: "/tmp" },
      timeout: 180000,
      maxBuffer: 1024 * 1024,
    });
    // Navigation commands wait until timeout while the native dialog is pending.
    // Their error output can omit the modal, so inspect the actual browser state.
    if (["reload", "go-back"].includes(args[0])) {
      const state = await execute(
        "playwright-cli",
        [`-s=${session}`, "snapshot"],
        {
          cwd: directory,
          env: { ...process.env, TMPDIR: "/tmp" },
          timeout: 30000,
          maxBuffer: 1024 * 1024,
        },
      );
      if (state.stdout.includes("beforeunload"))
        return result.stdout + state.stdout;
    }
    if (result.stdout.includes("### Error")) {
      const diagnostic = await execute(
        "playwright-cli",
        [
          `-s=${session}`,
          "run-code",
          `async page => { await page.screenshot({path:${JSON.stringify(join(tmpdir(), "fitloom-inc6-failure.png"))}}); return {groups: await page.locator('fieldset[aria-label]').evaluateAll(nodes=>nodes.map(n=>({name:n.getAttribute('aria-label'),labels:[...n.querySelectorAll('label')].map(l=>l.textContent)})))}; }`,
        ],
        {
          cwd: directory,
          env: { ...process.env, TMPDIR: "/tmp" },
          maxBuffer: 1024 * 1024,
        },
      );
      throw new Error(
        `${result.stdout.slice(-2500)}\n${diagnostic.stdout.slice(-5000)}`,
      );
    }
    return result.stdout;
  };
  const get = async (suffix) =>
    (
      await fetch(`${base}${workspacePath}/masters${suffix}`, {
        headers: { cookie },
      })
    ).json();
  const services = await get("/services?visibility=all");
  const addons = await get("/addons");
  const service = services.items.find((s) => s.active),
    addon = addons.items[0];
  assert.ok(service && addon);
  const pricedLabel = `UI priced ${randomUUID().slice(0, 8)}`;
  const section = randomUUID();
  const definition = {
    formatVersion: 1,
    label: pricedLabel,
    category: "Tailoring",
    applicability: "unisex",
    iconId: "shirt",
    help: "UI fixture",
    illustrationId: null,
    sections: [{ id: section, label: "Dimensions" }],
    fields: [],
    constructionGroups: [],
    services: [{ serviceId: service.id, savedLabel: service.label }],
    addons: [{ addonId: addon.id, savedLabel: addon.label }],
    sourceVersionId: null,
  };
  const created = await api(`${workspacePath}/masters/commands/garment.save`, {
    mode: "create",
    definition,
    baseRate: "88.123456",
    currency: "INR",
    serviceOverrides: [{ serviceId: service.id, rateOverride: "0" }],
  });
  assert.equal(created.status, 200);
  const pricedId = (await created.json()).result.garmentId;
  for (let index = 0; index < 51; index++) {
    const item = await api(`${workspacePath}/masters/commands/garment.save`, {
      mode: "create",
      definition: {
        ...definition,
        label: `UI page ${index}`,
        services: [],
        addons: [],
      },
      baseRate: null,
      currency: "INR",
      serviceOverrides: [],
    });
    assert.equal(item.status, 200);
  }
  const secondLocation = randomUUID();
  await admin.query(
    "INSERT INTO app.locations(id,tenant_id,name) VALUES($1,$2,'UI second location')",
    [secondLocation, tenant],
  );
  await admin.query(
    "INSERT INTO app.location_grants SELECT tenant_id,membership_id,$1,role_id FROM app.location_grants WHERE tenant_id=$2 AND location_id=$3",
    [secondLocation, tenant, location],
  );
  const role = (
    await admin.query(
      "SELECT id FROM app.roles WHERE tenant_id=$1 AND preset='owner'",
      [tenant],
    )
  ).rows[0].id;
  const fixture = {
    base,
    tenant,
    location,
    secondLocation,
    pricedLabel,
    pricedId,
    newLabel: `UI custom ${randomUUID().slice(0, 8)}`,
    artifacts,
    customers: { ...customers, total: customers.total + 1 },
    measurements,
    account,
    invalidImportFile: join(directory, "invalid-utf8.csv"),
    oversizedImportFile: join(directory, "oversized.csv"),
    importCustomerFile: join(directory, "customers.csv"),
    importMeasurementFile: join(directory, "measurements.csv"),
    photoFile: join(directory, "photo-fixture.png"),
    measurementPhotoFile: join(directory, "measurement-photo-fixture.jpg"),
  };
  try {
    const state = {
      cookies: cookie
        .split("; ")
        .filter(Boolean)
        .map((pair) => {
          const index = pair.indexOf("=");
          return {
            name: pair.slice(0, index),
            value: pair.slice(index + 1),
            domain: "localhost",
            path: "/",
            expires: -1,
            httpOnly: true,
            secure: false,
            sameSite: "Lax",
          };
        }),
      origins: [],
    };
    const statePath = join(directory, "session.json");
    await writeFile(statePath, JSON.stringify(state), { mode: 0o600 });
    await run("open", base, "--browser=chrome");
    await run("state-load", statePath);
    const passed = /"garmentUiPassed"\s*:\s*true/;
    const exercise = async (phase) => {
      const result = await run(
        "run-code",
        `async page => { const exercise=${exerciseGarmentUI.toString()}; return exercise(page,${JSON.stringify({ ...fixture, phase })}); }`,
      );
      assert.ok(passed.test(result), result.slice(0, 1500));
    };
    const photoJourney = async () => {
      const photosResult = await run(
        "run-code",
        `async page=>{const exercise=${exerciseMeasurementPhotosUI.toString()};return exercise(page,${JSON.stringify(fixture)});}`,
      );
      assert.ok(
        /"measurementPhotosUiPassed"\s*:\s*true/.test(photosResult),
        photosResult.slice(-4500),
      );
      console.log(
        "Measurement photos UI passed: lost begin/upload/save/revoke recovery, one immutable membership, guarded draft, failed replacement, historical removal, archived privacy fallback and responsive private images.",
      );
    };
    const cardJourney = async () => {
      const result = await run(
        "run-code",
        `async page=>{const exercise=${exerciseMeasurementCardsUI.toString()};return exercise(page,${JSON.stringify(fixture)});}`,
      );
      assert.ok(
        /"measurementCardsUiPassed"\s*:\s*true/.test(result),
        result.slice(-4500),
      );
      console.log(
        "Measurement cards UI passed: fixed preview, exact issue/revoke recovery, protected PNG and print, responsive widths, no external resources, sign-in return and revoked read denial.",
      );
    };
    const measurementJourney = async () => {
      if (process.env.MEASUREMENT_CARDS_UI_ONLY === "1") {
        await cardJourney();
        return;
      }
      if (process.env.MEASUREMENT_PHOTOS_UI_ONLY === "1") {
        await photoJourney();
        return;
      }
      const measurementResult = await run(
        "run-code",
        `async page=>{const exercise=${exerciseMeasurementsUI.toString()};return exercise(page,${JSON.stringify(fixture)});}`,
      );
      assert.ok(
        /"measurementsUiPassed"\s*:\s*true/.test(measurementResult),
        measurementResult.slice(-4500),
      );
      console.log(
        "Measurement UI passed: wearer book, exact history, private return/search, body entry, unit display, dirty exit, committed-response-loss retry and empty-garment custom entry at desktop/narrow widths.",
      );
      const revisionResult = await run(
        "run-code",
        `async page=>{const exercise=${exerciseMeasurementRevisionUI.toString()};return exercise(page,${JSON.stringify(fixture)});}`,
      );
      assert.ok(
        /"measurementRevisionPrepared"\s*:\s*true/.test(revisionResult),
        revisionResult.slice(-4500),
      );
      const reloaded = await run("reload");
      assert.ok(reloaded.includes("beforeunload"), reloaded.slice(-1200));
      await run("dialog-dismiss");
      const back = await run("go-back");
      assert.ok(back.includes("beforeunload"), back.slice(-1200));
      await run("dialog-dismiss");
      const navigationResult = await run(
        "run-code",
        `async page=>{const exercise=${exerciseMeasurementNavigationUI.toString()};return exercise(page,${JSON.stringify(fixture)});}`,
      );
      assert.ok(
        /"measurementRevisionUiPassed"\s*:\s*true/.test(navigationResult),
        navigationResult.slice(-4500),
      );
      console.log(
        "Measurement revision UI passed: no-op, original units/history, exact uncertain retry, saved projection recovery, concurrent conflict, real server-field focus, native reload/back and scope-switch guards.",
      );
      const customResult = await run(
        "run-code",
        `async page=>{const exercise=${exerciseMeasurementCustomUI.toString()};return exercise(page,${JSON.stringify(fixture)});}`,
      );
      assert.ok(
        /"measurementCustomUiPassed"\s*:\s*true/.test(customResult),
        customResult.slice(-4500),
      );
      console.log(
        "Measurement custom/rebase UI passed: all five kinds, required false, zero, bounds, custom identity replacement, inactive choice carry-forward, reviewed current-schema draft, exact historical schema and parent archive race.",
      );
      const reuseResult = await run(
        "run-code",
        `async page=>{const exercise=${exerciseMeasurementReuseUI.toString()};return exercise(page,${JSON.stringify(fixture)});}`,
      );
      assert.ok(
        /"measurementReuseUiPassed"\s*:\s*true/.test(reuseResult),
        reuseResult.slice(0, 1800) + reuseResult.slice(-1800),
      );
      console.log(
        "Measurement reuse UI passed: independent and historical copies, exact retry, source independence, lifecycle replay, explicit reviewed ease, unsaved preview, manual provenance and responsive mapping.",
      );
      const comparisonResult = await run(
        "run-code",
        `async page=>{const exercise=${exerciseMeasurementComparisonUI.toString()};return exercise(page,${JSON.stringify(fixture)});}`,
      );
      assert.ok(
        /"measurementComparisonUiPassed"\s*:\s*true/.test(comparisonResult),
        comparisonResult.slice(0, 1800) + comparisonResult.slice(-1800),
      );
      console.log(
        "Measurement comparison UI passed: two/four exact versions, typed statuses, complete comparison table, 50+2 trend continuation, keyboard chart, actual gap path, scoped private state and desktop/narrow widths.",
      );
      await admin.query(
        "DELETE FROM app.permission_grants WHERE tenant_id=$1 AND role_id=$2 AND permission='measurements.read'",
        [tenant, role],
      );
      try {
        const deniedComparison = await run(
          "run-code",
          `async page=>{const exercise=${exerciseMeasurementComparisonUI.toString()};return exercise(page,${JSON.stringify({ ...fixture, phase: "denied-comparison" })});}`,
        );
        assert.ok(
          /"measurementComparisonDenied"\s*:\s*true/.test(deniedComparison),
          deniedComparison.slice(-2000),
        );
      } finally {
        await admin.query(
          "INSERT INTO app.permission_grants VALUES($1,$2,'measurements.read') ON CONFLICT DO NOTHING",
          [tenant, role],
        );
      }
      await photoJourney();
      await cardJourney();
      const preparedRevocation = await run(
        "run-code",
        `async page=>{const exercise=${exerciseMeasurementRevocationUI.toString()};return exercise(page,${JSON.stringify({ ...fixture, phase: "prepare-revocation" })});}`,
      );
      assert.ok(
        /"measurementRevocationPrepared"\s*:\s*true/.test(preparedRevocation),
        preparedRevocation.slice(-2000),
      );
      await admin.query(
        "DELETE FROM app.permission_grants WHERE tenant_id=$1 AND role_id=$2 AND permission='measurements.manage'",
        [tenant, role],
      );
      try {
        const revoked = await run(
          "run-code",
          `async page=>{const exercise=${exerciseMeasurementRevocationUI.toString()};return exercise(page,${JSON.stringify(fixture)});}`,
        );
        assert.ok(
          /"measurementRevocationUiPassed"\s*:\s*true/.test(revoked),
          revoked.slice(-2000),
        );
        console.log(
          "Measurement revoked-write UI passed: current 403 removes private draft and releases leave protection.",
        );
      } finally {
        await admin.query(
          "INSERT INTO app.permission_grants VALUES($1,$2,'measurements.manage') ON CONFLICT DO NOTHING",
          [tenant, role],
        );
      }
      await admin.query(
        "DELETE FROM app.permission_grants WHERE tenant_id=$1 AND role_id=$2 AND permission='measurements.read'",
        [tenant, role],
      );
      try {
        const deniedMeasurement = await run(
          "run-code",
          `async page=>{const exercise=${exerciseMeasurementsUI.toString()};return exercise(page,${JSON.stringify({ ...fixture, phase: "denied" })});}`,
        );
        assert.ok(
          /"measurementDeniedPassed"\s*:\s*true/.test(deniedMeasurement),
          deniedMeasurement.slice(-2000),
        );
      } finally {
        await admin.query(
          "INSERT INTO app.permission_grants VALUES($1,$2,'measurements.read') ON CONFLICT DO NOTHING",
          [tenant, role],
        );
      }
    };
    const importJourney = async () => {
      const result = await run(
        "run-code",
        `async page=>{const exercise=${exerciseDomainImportsUI.toString()};return exercise(page,${JSON.stringify(fixture)});}`,
      );
      assert.ok(
        /"importsUiPassed"\s*:\s*true/.test(result),
        result.slice(-4500),
      );
      await admin.query(
        "DELETE FROM app.permission_grants WHERE tenant_id=$1 AND role_id=$2 AND permission='customers.import'",
        [tenant, role],
      );
      try {
        const denied = await run(
          "run-code",
          `async page=>{const exercise=${exerciseDomainImportsUI.toString()};return exercise(page,${JSON.stringify({ ...fixture, phase: "denied" })});}`,
        );
        assert.ok(
          /"importDeniedPassed"\s*:\s*true/.test(denied),
          denied.slice(-3000),
        );
      } finally {
        await admin.query(
          "INSERT INTO app.permission_grants VALUES($1,$2,'customers.import') ON CONFLICT DO NOTHING",
          [tenant, role],
        );
      }
      console.log(
        "Import Chrome passed: exact lost preview retry, read-only lost chunk recovery, complete histories, explicit source owners, cancellation, revoked draft removal and 1440/1024/390/320 layouts.",
      );
    };
    if (process.env.IMPORT_UI_ONLY === "1") {
      await importJourney();
      return;
    }
    if (process.env.MEASUREMENT_UI_ONLY === "1") {
      await measurementJourney();
      return;
    }
    const customerResult = await run(
      "run-code",
      `async page => { const exercise=${exerciseCustomersUI.toString()};return exercise(page,${JSON.stringify(fixture)}); }`,
    );
    await writeFile(join(artifacts, "customer-run.txt"), customerResult);
    assert.ok(
      /"customersUiPassed"\s*:\s*true/.test(customerResult),
      customerResult.slice(-4500),
    );
    console.log(
      "Customer register UI passed: complete search/count/paging, views, private return context, stale responses and permission-aware switching.",
    );
    const wearerResult = await run(
      "run-code",
      `async page => { const exercise=${exerciseCustomerWearersUI.toString()};return exercise(page,${JSON.stringify(fixture)}); }`,
    );
    assert.ok(
      /"customerWearersUiPassed"\s*:\s*true/.test(wearerResult),
      wearerResult.slice(-4500),
    );
    console.log(
      "Customer wearer UI passed: family identities, independent preferences, exact profile units, guarded sheets, lifecycle and continuation.",
    );
    const photoResult = await run(
      "run-code",
      `async page => {const exercise=${exerciseCustomerPhotosUI.toString()};return exercise(page,${JSON.stringify(fixture)});}`,
    );
    assert.ok(
      /"customerPhotosUiPassed"\s*:\s*true/.test(photoResult),
      photoResult.slice(-4500),
    );
    console.log(
      "Customer photos UI passed: private preview/upload, exact bind retry, failed replacement recovery, removal and separate wearer slots.",
    );
    for (const phase of ["views", "reads", "catalogs"]) {
      const registers = await run(
        "run-code",
        `async page => { const exercise=${exerciseMasterRegistersUI.toString()}; return exercise(page,${JSON.stringify({ ...fixture, phase })}); }`,
      );
      assert.ok(
        /"masterRegistersPassed"\s*:\s*true/.test(registers),
        registers.slice(-2500),
      );
      console.log(`Master register UI ${phase} passed.`);
    }
    await measurementJourney();
    await importJourney();
    await exercise("build");
    const editorFrame = await run(
      "run-code",
      `async page => {const exercise=${exerciseGarmentEditorFrameUI.toString()};return exercise(page,${JSON.stringify(fixture)});}`,
    );
    assert.ok(
      /"garmentEditorFramePassed"\s*:\s*true/.test(editorFrame),
      editorFrame.slice(-2000),
    );
    console.log(
      "Garment editor frame passed: step identity retention, rail retention, no implicit saves, disabled preview and responsive layouts.",
    );
    const retainedViewDraft = await run(
      "run-code",
      `async page => { await page.getByRole("button",{name:"Measurements step",exact:true}).click(); const before = await page.getByLabel("Garment name",{exact:true}).inputValue(); const count = await page.getByRole("group",{name:/^Dimension [0-9]+$/}).count(); await page.getByRole("button",{name:"← Back to garments",exact:true}).click(); await page.getByRole("button",{name:"Card view",exact:true}).click(); await page.getByRole("button",{name:"Table view",exact:true}).click(); await page.getByRole("button",{name:/^Resume editing /}).click(); if(await page.getByLabel("Garment name",{exact:true}).inputValue() !== before || await page.getByRole("group",{name:/^Dimension [0-9]+$/}).count() !== count) throw Error("View switch reset the draft"); return {viewDraftRetained:true}; }`,
    );
    assert.ok(
      /"viewDraftRetained"\s*:\s*true/.test(retainedViewDraft),
      retainedViewDraft.slice(-1800),
    );
    const failedSwitch = await run(
      "run-code",
      `async page => { await page.route("**/api/workspaces/switch", route => route.fulfill({status:503,contentType:"application/json",body:'{"message":"Temporary failure"}'})); await page.getByLabel("Switch shop or location",{exact:true}).selectOption(${JSON.stringify(`${tenant}/${secondLocation}`)}); }`,
    );
    assert.ok(
      failedSwitch.includes("Discard unsaved garment changes?"),
      failedSwitch.slice(-1500),
    );
    await run("dialog-accept");
    const shellPhase = async (phase) => {
      const output = await run(
        "run-code",
        `async page => { const exercise=${exerciseWorkspaceShellUI.toString()}; return exercise(page,${JSON.stringify({ ...fixture, phase })}); }`,
      );
      assert.ok(
        /"workspaceShellPassed"\s*:\s*true/.test(output),
        output.slice(-2500),
      );
    };
    await shellPhase("mobile");
    const mobileExit = await run(
      "run-code",
      `async page => { await page.getByRole("dialog",{name:"Workspace menu"}).getByRole("link",{name:"Settings",exact:true}).click(); }`,
    );
    assert.ok(
      mobileExit.includes(
        "Discard unsaved garment changes and leave this page?",
      ),
      mobileExit.slice(-1500),
    );
    await run("dialog-dismiss");
    await shellPhase("capture");
    console.log(
      "Workspace shell UI passed: failed/canceled switches, mobile focus and navigation, shortcut, and 320/390/1024/1025/1440 widths.",
    );
    for (const action of ["back", "reload"]) {
      const result = await run(
        "run-code",
        `async page => { await page.evaluate(action => { if(action === "back") history.back(); else location.reload(); }, ${JSON.stringify(action)}); }`,
      );
      assert.ok(
        /beforeunload/i.test(result),
        `Dirty ${action} did not prompt: ${result.slice(-1500)}`,
      );
      await run("dialog-dismiss");
    }
    const navigation = await run(
      "run-code",
      `async page => { await page.getByRole('link',{name:'fitloom / workspace',exact:true}).click(); }`,
    );
    assert.ok(
      navigation.includes(
        "Discard unsaved garment changes and leave this page?",
      ),
      navigation.slice(0, 1500),
    );
    await run("dialog-dismiss");
    const switching = await run(
      "run-code",
      `async page => { if(page.url()!==${JSON.stringify(`${base}/workspaces/${tenant}/${location}/settings/garments`)})throw Error('Dirty navigation left the page'); await page.getByLabel('Switch shop or location',{exact:true}).selectOption(${JSON.stringify(`${tenant}/${secondLocation}`)}); }`,
    );
    assert.ok(
      switching.includes("Discard unsaved garment changes?"),
      switching.slice(0, 1500),
    );
    await run("dialog-dismiss");
    for (const button of ["Services", "Cancel"]) {
      if (button === "Cancel")
        await run(
          "run-code",
          `async page => { const resume=page.getByRole("button",{name:/^Resume editing /}); if(await resume.isVisible()) await resume.click(); }`,
        );
      const decision = await run(
        "run-code",
        `async page => { await page.getByRole('button',{name:${JSON.stringify(button)},exact:true}).click(); }`,
      );
      assert.ok(
        decision.includes("Discard unsaved garment changes?"),
        decision.slice(0, 1500),
      );
      await run("dialog-dismiss");
    }
    await exercise("continue");
    const reloading = await run(
      "run-code",
      `async page => { await page.getByRole('button',{name:'Reload saved version',exact:true}).click(); }`,
    );
    assert.ok(
      reloading.includes("Discard unsaved garment changes?"),
      reloading.slice(0, 1500),
    );
    await run("dialog-accept");
    await exercise("capture");
    const catalogResult = await run(
      "run-code",
      `async page => {const exercise=${exerciseCatalogUI.toString()}; return exercise(page,${JSON.stringify(fixture)});}`,
    );
    assert.ok(
      /"catalogUiPassed"\s*:\s*true/.test(catalogResult),
      catalogResult.slice(0, 1500),
    );
    const setup = await (
      await fetch(`${base}/api/setup`, { headers: { cookie } })
    ).json();
    const begun = await api("/api/setup/begin", {
      expectedVersion: setup.version,
      createAnother: true,
    });
    assert.equal(begun.status, 200);
    const version = (await begun.json()).result.version;
    const profile = {
      ...setup.draft,
      shopName: "UI starter fixture",
      expectedVersion: version,
    };
    assert.equal((await api("/api/setup", profile)).status, 200);
    const provision = await api("/api/setup/provision", {
      ...profile,
      expectedVersion: version + 1,
    });
    assert.equal(provision.status, 200);
    const starterTenant = (await provision.json()).result.tenantId;
    const workspaces = await (
      await fetch(`${base}/api/workspaces`, { headers: { cookie } })
    ).json();
    const starterWorkspace = workspaces.find(
      (w) => w.tenantId === starterTenant,
    );
    assert.ok(starterWorkspace);
    const starterResult = await run(
      "run-code",
      `async page => {const exercise=${exerciseStarterUI.toString()};return exercise(page,${JSON.stringify({ ...fixture, tenant: starterTenant, location: starterWorkspace.locationId })});}`,
    );
    assert.ok(
      /"starterUiPassed"\s*:\s*true/.test(starterResult),
      starterResult.slice(0, 1500),
    );
    const routes = await run(
      "run-code",
      `async page => { const exercise=${exerciseWorkspaceRoutesUI.toString()}; return exercise(page,${JSON.stringify(fixture)}); }`,
    );
    assert.ok(
      /"workspaceRoutesPassed"\s*:\s*true/.test(routes),
      routes.slice(-2500),
    );
    console.log(
      "Workspace route UI passed: preferences, profile, assigned routes, document history, direct catalogs, clean uncertain-operation replay, and successful switches.",
    );
    const refreshedProjection = await run(
      "run-code",
      `async page => {
      await page.goto(${JSON.stringify(`${base}/workspaces/${tenant}/${location}/settings/garments`)});
      await page.route(${JSON.stringify(`**/masters/garments/${pricedId}`)}, async route => {const response=await route.fetch();const data=await response.json();delete data.baseRate;delete data.currency;delete data.serviceOverrides;await route.fulfill({response,json:data});});
      await page.getByLabel("Search by name prefix",{exact:true}).fill(${JSON.stringify(pricedLabel)});
      await page.getByRole("button",{name:${JSON.stringify(`${pricedLabel} remote`)},exact:true}).click();
      await page.getByText("Read-only view. Your role cannot publish garment changes.",{exact:true}).waitFor();
      if(!await page.getByRole("checkbox",{name:"Active garment",exact:true}).isDisabled() || await page.getByRole("button",{name:"Save new version",exact:true}).count())throw Error("Schema-only current projection retained write controls");
      await page.unroute(${JSON.stringify(`**/masters/garments/${pricedId}`)});
      return {refreshedProjectionReadonly:true};
    }`,
    );
    assert.ok(
      /"refreshedProjectionReadonly"\s*:\s*true/.test(refreshedProjection),
      refreshedProjection.slice(-2000),
    );
    const authorityPhase = async (phase) => {
      const result = await run(
        "run-code",
        `async page => { const exercise=${exerciseMasterAuthorityUI.toString()}; return exercise(page,${JSON.stringify({ ...fixture, phase })}); }`,
      );
      assert.ok(
        /"authorityUiPassed"\s*:\s*true/.test(result),
        result.slice(-2500),
      );
    };
    await authorityPhase("prepare-addon");
    await admin.query(
      "DELETE FROM app.permission_grants WHERE role_id=$1 AND permission IN ('masters.manage','masters.rates.read')",
      [role],
    );
    await authorityPhase("revoked-addon");
    await admin.query(
      "INSERT INTO app.permission_grants SELECT $1,$2,p FROM unnest(ARRAY['masters.manage','masters.rates.read']) p ON CONFLICT DO NOTHING",
      [tenant, role],
    );
    await authorityPhase("restore-addon");
    // Native unload dialogs pause the CLI run before in-page listeners settle.
    // Accept the deliberate fixture discard through the owning browser driver.
    const garmentURL = `${base}/workspaces/${tenant}/${location}/settings/garments`;
    const leavingAddon = await run(
      "run-code",
      `async page => { await page.goto(${JSON.stringify(garmentURL)}); }`,
    );
    if (leavingAddon.includes("beforeunload")) await run("dialog-accept");
    await run(
      "run-code",
      `async page => { await page.waitForURL(${JSON.stringify(garmentURL)}); }`,
    );
    await authorityPhase("prepare-garment");
    await admin.query(
      "DELETE FROM app.permission_grants WHERE role_id=$1 AND permission IN ('masters.manage','masters.rates.read')",
      [role],
    );
    await authorityPhase("revoked-garment");
    const cancelRevoked = await run(
      "run-code",
      `async page => { await page.getByRole("button",{name:"Cancel",exact:true}).click(); }`,
    );
    assert.ok(
      cancelRevoked.includes("Discard unsaved garment changes?"),
      cancelRevoked.slice(-1500),
    );
    await run("dialog-accept");
    console.log(
      "Open-session authority UI passed: cached register, current, eligibility and exact-version prices removed; dirty drafts retained; no writes; 320/390/1024/1440px.",
    );
    const catalogReadonly = await run(
      "run-code",
      `async page => {const exercise=${exerciseCatalogReadonlyUI.toString()};return exercise(page,${JSON.stringify(fixture)});}`,
    );
    assert.ok(
      /"catalogReadonlyUiPassed"\s*:\s*true/.test(catalogReadonly),
      catalogReadonly.slice(0, 1500),
    );
    const readonly = await run(
      "run-code",
      `async page => { const exercise=${exerciseGarmentUI.toString()}; return exercise(page,${JSON.stringify({ ...fixture, phase: "readonly" })}); }`,
    );
    assert.ok(passed.test(readonly), readonly.slice(0, 1500));
    await admin.query(
      "DELETE FROM app.permission_grants WHERE role_id=$1 AND permission='masters.read'",
      [role],
    );
    const denied = await run(
      "run-code",
      `async page => { await page.goto(${JSON.stringify(`${base}/workspaces/${tenant}/${location}/settings/garments`)}); await page.getByRole('heading',{name:'Garment access is unavailable.',exact:true}).waitFor(); return {garmentUiPassed:true}; }`,
    );
    assert.ok(passed.test(denied), denied.slice(0, 1500));
    const restricted = await run(
      "run-code",
      `async page => { await page.screenshot({path:${JSON.stringify(`${artifacts}/restricted-catalog.png`)}}); await page.goto(${JSON.stringify(`${base}/workspaces/${tenant}/${location}`)}); await page.getByRole('heading',{name:'Home',exact:true}).waitFor(); if(await page.getByRole('link',{name:'Garments',exact:true}).count()) throw Error('Restricted navigation exposes catalog'); await page.screenshot({path:${JSON.stringify(`${artifacts}/restricted-home.png`)}}); await page.goto(${JSON.stringify(`${base}/workspaces/${tenant}/${location}/settings`)}); await page.getByRole('heading',{name:'Settings',exact:true}).waitFor(); return {restrictedWorkspacePassed:true}; }`,
    );
    assert.ok(
      /"restrictedWorkspacePassed"\s*:\s*true/.test(restricted),
      restricted.slice(-2000),
    );
    console.log(
      "Master UI checks passed: garment/service/add-on editors and history, eligibility, unset/zero rates, inactive references, ordering, visibility, first-use starters/collision rollback/no-op/replay, lost-response recovery, dirty navigation, roles, and desktop/narrow layouts.",
    );
  } finally {
    await admin.query(
      "INSERT INTO app.permission_grants SELECT $1,$2,p FROM unnest(ARRAY['masters.read','masters.manage','masters.rates.read']) p ON CONFLICT DO NOTHING",
      [tenant, role],
    );
    try {
      await run("close");
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  }
}
