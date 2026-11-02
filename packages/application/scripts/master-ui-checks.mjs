import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { randomUUID } from "node:crypto";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import {
  exerciseCatalogReadonlyUI,
  exerciseCatalogUI,
  exerciseStarterUI,
} from "./master-catalog-ui-checks.mjs";
import { exerciseGarmentUI } from "./master-ui-browser-checks.mjs";

const execute = promisify(execFile);
export async function masterUiChecks({
  base,
  workspacePath,
  api,
  cookie,
  admin,
  tenant,
  location,
}) {
  const directory = await mkdtemp(join(tmpdir(), "fitloom-ui-"));
  const session = `g4-${process.pid}`;
  const artifacts = join(tmpdir(), "fitloom-increment6-ui");
  await mkdir(artifacts, { recursive: true });
  const run = async (...args) => {
    const result = await execute("playwright-cli", [`-s=${session}`, ...args], {
      cwd: directory,
      env: { ...process.env, TMPDIR: "/tmp" },
      timeout: 180000,
      maxBuffer: 1024 * 1024,
    });
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
    await exercise("build");
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
    await admin.query(
      "DELETE FROM app.permission_grants WHERE role_id=$1 AND permission IN ('masters.manage','masters.rates.read')",
      [role],
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
