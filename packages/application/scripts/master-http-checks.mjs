import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";

// Called by the optimized-app smoke harness with its synthetic shop and session.
export async function masterHttpChecks({
  base,
  workspacePath,
  api,
  cookie,
  admin,
  tenant,
}) {
  const path = `${workspacePath}/masters`;
  const get = async (suffix, session = cookie) => {
    try {
      return await fetch(`${base}${path}${suffix}`, {
        headers: { cookie: session },
      });
    } catch (error) {
      throw new Error(`Master GET failed: ${suffix}`, { cause: error });
    }
  };
  const command = async (action, payload, key) => {
    try {
      return await api(`${path}/commands/${action}`, payload, key);
    } catch (error) {
      throw new Error(`Master command failed: ${action}`, { cause: error });
    }
  };
  const json = async (response, status = 200) => {
    assert.equal(response.status, status, await response.clone().text());
    assert.ok(response.headers.get("cache-control").includes("no-store"));
    return response.json();
  };
  const priceKeys = new Set([
    "baseRate",
    "serviceOverrides",
    "rateOverride",
    "amount",
    "currency",
  ]);
  const assertPriceFree = (value, path = "response") => {
    if (!value || typeof value !== "object") return;
    for (const [key, child] of Object.entries(value)) {
      assert.equal(priceKeys.has(key), false, `${path}.${key} leaks a price`);
      assertPriceFree(child, `${path}.${key}`);
    }
  };
  const empty = await json(await get("/catalog"));
  assert.equal(empty.catalogVersion, 0);
  await json(await get("/catalog", ""), 403);
  await json(await get("/garments?limit=51"), 400);
  await json(await get("/garments?offset=0&offset=1"), 400);
  await json(await get("/garments?unknown=1"), 400);
  await json(await get("/garments?constructor=1"), 400);
  await json(await get("/garments?toString=1"), 400);
  await json(await get("/catalog?unknown=1"), 400);
  const install = {
      bundleVersion: "tailoring-core-v1",
      expectedCatalogVersion: 0,
    },
    installKey = randomUUID();
  const first = await json(
    await command("masters.starters.install", install, installKey),
  );
  assert.equal(first.result.catalogVersion, 1);
  const retry = await json(
    await command("masters.starters.install", install, installKey),
  );
  assert.equal(retry.replayed, true);
  assert.deepEqual(retry.result, first.result);
  await json(
    await command("masters.visibility", {
      expectedCatalogVersion: 0,
      hideStandardGarments: true,
      hideStandardServices: false,
    }),
    409,
  );
  const page = await json(await get("/garments"));
  assert.equal(page.total, 3);
  const garmentId = first.result.garmentIds[0];
  const original = await json(await get(`/garments/${garmentId}`));
  assert.equal(original.baseRate, null);
  const edit = {
    mode: "update",
    garmentId,
    expectedVersion: original.version,
    definition: { ...original.definition, label: "HTTP edited shirt" },
    baseRate: "0",
    currency: "INR",
    serviceOverrides: original.serviceOverrides,
  };
  const key = randomUUID();
  const saved = await json(await command("garment.save", edit, key));
  assert.equal(saved.result.catalogVersion, 1);
  assert.equal(
    (await json(await get(`/garments/${garmentId}`))).baseRate,
    "0.000000",
  );
  const lost = await json(await command("garment.save", edit, key));
  assert.equal(lost.replayed, true);
  assert.deepEqual(lost.result, saved.result);
  await json(await command("garment.save", edit), 409);
  await json(
    await command("garment.save", { ...edit, baseRate: "1" }, key),
    409,
  );
  const exact = await json(
    await get(`/garments/${garmentId}/versions/${original.garmentVersionId}`),
  );
  assert.equal(exact.definition.label, original.definition.label);
  assert.equal(
    (await json(await get(`/garments/${garmentId}/versions`))).total,
    2,
  );
  const invalid = await json(
    await command("garment.save", {
      ...edit,
      expectedVersion: saved.result.version,
      baseRate: "-0",
    }),
    400,
  );
  assert.ok(invalid.issues.length > 0 && invalid.issues.length <= 30);
  assert.ok(invalid.correlationId);
  const serviceId = first.result.serviceIds[0];
  const oldService = await json(await get(`/services/${serviceId}`));
  await json(
    await command("service.save", {
      mode: "update",
      serviceId,
      expectedVersion: 1,
      label: "HTTP renamed service",
    }),
  );
  assert.equal(
    (await json(await get(`/services/${serviceId}/versions/${oldService.id}`)))
      .label,
    oldService.label,
  );
  assert.equal(
    (await json(await get("/services"))).items.find((s) => s.id === serviceId)
      .label,
    "HTTP renamed service",
  );
  assert.equal(
    (
      await json(
        await get(
          `/garments/${garmentId}/versions/${original.garmentVersionId}`,
        ),
      )
    ).definition.services.find((s) => s.serviceId === serviceId).savedLabel,
    oldService.label,
  );
  const addon = await json(
    await command("addon.save", {
      mode: "create",
      label: "HTTP add-on",
      amount: "12.3456",
      currency: "INR",
    }),
  );
  assert.equal(
    (await json(await get(`/addons/${addon.result.addonId}`))).amount,
    "12.345600",
  );
  assert.equal(
    (await json(await get(`/addons/${addon.result.addonId}/versions`))).total,
    1,
  );
  const role = (
    await admin.query(
      "SELECT id FROM app.roles WHERE tenant_id=$1 AND preset='owner'",
      [tenant],
    )
  ).rows[0].id;
  await admin.query(
    "DELETE FROM app.permission_grants WHERE role_id=$1 AND permission='masters.rates.read'",
    [role],
  );
  try {
    await json(await command("garment.save", edit, key), 403);
    await json(
      await command("garment.save", {
        ...edit,
        expectedVersion: saved.result.version,
      }),
      403,
    );
    for (const suffix of [
      "/catalog",
      "/garments",
      "/services",
      "/addons",
      `/garments/${garmentId}`,
      `/garments/${garmentId}/versions`,
      `/garments/${garmentId}/versions/${original.garmentVersionId}`,
      `/services/${serviceId}`,
      `/services/${serviceId}/versions`,
      `/services/${serviceId}/versions/${oldService.id}`,
      `/addons/${addon.result.addonId}`,
      `/addons/${addon.result.addonId}/versions`,
      `/addons/${addon.result.addonId}/versions/${addon.result.addonVersionId}`,
    ])
      assertPriceFree(await json(await get(suffix)), suffix);
  } finally {
    await admin.query(
      "INSERT INTO app.permission_grants VALUES($1,$2,'masters.rates.read')",
      [tenant, role],
    );
  }
  // Every write dependency is checked before replay, independently of rates access.
  for (const permission of ["masters.manage", "masters.read"]) {
    await admin.query(
      "DELETE FROM app.permission_grants WHERE role_id=$1 AND permission=$2",
      [role, permission],
    );
    try {
      await json(await command("garment.save", edit, key), 403);
      if (permission === "masters.read") {
        await json(await get("/catalog"), 403);
        await json(
          await get(
            `/garments/${garmentId}/versions/${original.garmentVersionId}`,
          ),
          403,
        );
      } else {
        assert.equal(
          (await json(await get(`/garments/${garmentId}`))).baseRate,
          "0.000000",
        );
      }
    } finally {
      await admin.query("INSERT INTO app.permission_grants VALUES($1,$2,$3)", [
        tenant,
        role,
        permission,
      ]);
    }
  }
  const current = await json(await get("/catalog"));
  const visibility = await json(
    await command("masters.visibility", {
      expectedCatalogVersion: current.catalogVersion,
      hideStandardGarments: true,
      hideStandardServices: true,
    }),
  );
  assert.equal((await json(await get("/garments"))).total, 0);
  assert.equal((await json(await get("/garments?visibility=all"))).total, 3);
  await json(
    await command("masters.reorder", {
      kind: "garment",
      movedId: first.result.garmentIds[2],
      beforeId: first.result.garmentIds[0],
      expectedCatalogVersion: visibility.result.catalogVersion,
    }),
  );
  const fresh = await json(await get("/catalog"));
  const noop = await json(
    await command("masters.starters.install", {
      ...install,
      expectedCatalogVersion: fresh.catalogVersion,
    }),
  );
  assert.equal(noop.result.catalogVersion, fresh.catalogVersion);
  // Definition saves can exceed 16 KiB while other mutation routes retain their default.
  const large = structuredClone(edit);
  large.expectedVersion = saved.result.version;
  large.definition.fields = Array.from({ length: 35 }, () => ({
    id: randomUUID(),
    kind: "text",
    sectionId: original.definition.sections[0].id,
    label: "Notes",
    required: false,
    semanticId: null,
    help: "x".repeat(500),
    illustrationId: null,
    maxLength: 500,
  }));
  assert.ok(Buffer.byteLength(JSON.stringify(large)) > 16384);
  const largeSaved = await json(await command("garment.save", large));
  const aggregate = structuredClone(large);
  aggregate.expectedVersion = largeSaved.result.version;
  aggregate.definition.fields = Array.from({ length: 60 }, () => ({
    ...large.definition.fields[0],
    id: randomUUID(),
    label: '"'.repeat(100),
    help: '"'.repeat(500),
  }));
  assert.ok(Buffer.byteLength(JSON.stringify(aggregate)) < 131072);
  const budget = await json(await command("garment.save", aggregate), 400);
  assert.ok(budget.issues.some((issue) => issue.path.includes("definition")));

  const token = (await json(await get("/catalog"))).catalogVersion;
  const retired = await json(
    await command("garment.lifecycle", {
      garmentId,
      expectedVersion: largeSaved.result.version,
      active: false,
    }),
  );
  assert.equal(retired.result.catalogVersion, token + 1);
  const archived = await json(
    await get(`/garments/${garmentId}/versions/${original.garmentVersionId}`),
  );
  assert.deepEqual(archived.definition, original.definition);
  assert.equal(archived.baseRate, original.baseRate);
  await json(
    await command("masters.visibility", {
      expectedCatalogVersion: token,
      hideStandardGarments: false,
      hideStandardServices: false,
    }),
    409,
  );
  const restored = await json(
    await command("garment.lifecycle", {
      garmentId,
      expectedVersion: retired.result.version,
      active: true,
    }),
  );
  assert.equal(restored.result.catalogVersion, token + 2);

  const oversize = JSON.stringify({
    operationKey: randomUUID(),
    correlationId: randomUUID(),
    payload: { padding: "x".repeat(131072) },
  });
  const overflow = await fetch(`${base}${path}/commands/garment.save`, {
    method: "POST",
    headers: { origin: base, "content-type": "application/json", cookie },
    body: oversize,
  });
  await json(overflow, 413);
  const defaultLimit = await fetch(`${base}${path}/commands/service.save`, {
    method: "POST",
    headers: { origin: base, "content-type": "application/json", cookie },
    body: JSON.stringify({ padding: "x".repeat(17000) }),
  });
  await json(defaultLimit, 413);
  const badOrigin = await fetch(`${base}${path}/commands/service.save`, {
    method: "POST",
    headers: {
      origin: "https://example.invalid",
      "content-type": "application/json",
      cookie,
    },
    body: "{}",
  });
  await json(badOrigin, 403);
  const cross = path.replace(tenant, randomUUID());
  await json(
    await fetch(`${base}${cross}/catalog`, { headers: { cookie } }),
    403,
  );
  console.log(
    "Master HTTP checks passed: scoped registers, starter replay, immutable archived history, lifecycle/catalog tokens, conflicts, revoked write dependencies, price-free current/exact/history projections, and request bounds.",
  );
}
