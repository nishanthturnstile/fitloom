import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import {
  customerDetail,
  customerResponse,
} from "../dist/customer-contracts.js";
import * as c from "../dist/measurement-contracts.js";
import { measurementCardHttpChecks } from "./measurement-card-http-checks.mjs";
import { measurementPhotoHttpChecks } from "./measurement-photo-http-checks.mjs";
export async function measurementHttpChecks({
  base,
  workspacePath,
  api,
  cookie,
  admin,
  tenant,
}) {
  const prefix = `${workspacePath}/measurements`;
  const post = (path, body) =>
    fetch(base + path, {
      method: "POST",
      headers: { cookie, origin: base, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  const get = (path) => fetch(base + path, { headers: { cookie } });
  const read = async (response, status, schema) => {
    assert.equal(response.status, status, await response.clone().text());
    assert.ok(response.headers.get("cache-control")?.includes("no-store"));
    return schema.parse(await response.json());
  };
  const noRates = (object) => {
    if (object && typeof object === "object")
      for (const [key, value] of Object.entries(object)) {
        assert.ok(
          ![
            "baseRate",
            "rates",
            "rateOverride",
            "serviceOverrides",
            "services",
            "addons",
            "constructionGroups",
            "phone",
            "email",
          ].includes(key),
          key,
        );
        noRates(value);
      }
  };
  const preferences = { fit: null, fabric: null, design: null };
  const created = await read(
    await api(`${workspacePath}/customers/commands/customer.create`, {
      profile: {
        name: "Measurement HTTP customer",
        phone: null,
        email: null,
        address: null,
        taxCountryCode: null,
        gstin: null,
        segment: null,
        notes: null,
        preferences,
        tags: [],
      },
      selfWearer: {
        kind: "self",
        attributes: {
          relationship: null,
          birthday: null,
          gender: { kind: "unspecified" },
          height: null,
          weight: null,
          notes: null,
          preferences,
        },
      },
      intent: { kind: "check-first" },
    }),
    200,
    customerResponse,
  );
  const customer = await read(
      await get(`${workspacePath}/customers/${created.result.customerId}`),
      200,
      customerDetail,
    ),
    wearer = customer.wearers.items[0];
  assert.ok(wearer);
  const owner = { customerId: customer.id, wearerId: wearer.id },
    ownerPath = `${prefix}/${customer.id}/${wearer.id}`;
  const context = await read(await get(ownerPath), 200, c.measurementContext);
  noRates(context);
  const schema = await read(
    await post(`${ownerPath}/intake`, context.bodySchemaRef),
    200,
    c.measurementSchema,
  );
  noRates(schema);
  const currentBody = await read(
    await post(`${ownerPath}/current-intake`, context.bodySchemaRef),
    200,
    c.measurementCurrentIntake,
  );
  assert.deepEqual(currentBody.schemaRef, context.bodySchemaRef);
  noRates(currentBody);
  assert.equal(
    (
      await post(`${ownerPath}/current-intake`, {
        ...context.bodySchemaRef,
        customerId: randomUUID(),
      })
    ).status,
    400,
  );
  const inactiveForFixture = (
    await admin.query(
      "UPDATE app.garments SET active=false WHERE tenant_id=$1 AND active RETURNING id",
      [tenant],
    )
  ).rows.map((row) => row.id);
  try {
    const none = await read(
      await post(`${ownerPath}/garments`, {}),
      200,
      c.measurementGarments,
    );
    assert.equal(none.total, 0);
    noRates(
      await read(
        await post(`${ownerPath}/intake`, context.bodySchemaRef),
        200,
        c.measurementSchema,
      ),
    );
  } finally {
    if (inactiveForFixture.length)
      await admin.query(
        "UPDATE app.garments SET active=true WHERE id=ANY($1::uuid[])",
        [inactiveForFixture],
      );
  }
  assert.equal(
    (
      await get(
        `/api/workspaces/${tenant}/${randomUUID()}/measurements/${customer.id}/${wearer.id}`,
      )
    ).status,
    403,
  );
  await read(
    await post(`${prefix}/commands/measurement.create`, {
      payload: "x".repeat(131073),
    }),
    413,
    c.measurementErrorResponse,
  );
  await read(await post(`${ownerPath}/entry`, {}), 200, c.measurementContext);
  const values = [
    {
      kind: "length",
      fieldId: schema.fields[0].id,
      decimal: "38.250000",
      unit: "in",
    },
  ];
  const payload = {
    ...owner,
    profileId: randomUUID(),
    versionId: randomUUID(),
    schemaRef: context.bodySchemaRef,
    label: "HTTP body profile",
    measuredOn: "2020-01-02",
    values,
    customFields: [],
    notes: "Private measurement notes",
    sourceNote: null,
    origin: { kind: "manual" },
  };
  const first = await read(
    await api(`${prefix}/commands/measurement.create`, payload),
    200,
    c.measurementSaveResponse,
  );
  let revision = 1;
  for (let index = 2; index <= 52; index++) {
    const result = await read(
      await api(`${prefix}/commands/measurement.revise`, {
        ...payload,
        versionId: randomUUID(),
        expectedRevision: revision,
        label: `HTTP version ${index}`,
      }),
      200,
      c.measurementSaveResponse,
    );
    revision = result.result.revision;
  }
  for (let index = 0; index < 51; index++)
    await read(
      await api(`${prefix}/commands/measurement.create`, {
        ...payload,
        profileId: randomUUID(),
        versionId: randomUUID(),
        label: `HTTP paged ${String(index).padStart(2, "0")}`,
      }),
      200,
      c.measurementSaveResponse,
    );
  const book = await read(
    await post(`${ownerPath}/book`, { limit: 50 }),
    200,
    c.measurementBook,
  );
  assert.equal(book.total, 52);
  assert.equal(book.items.length, 50);
  assert.equal(book.nextOffset, 50);
  const next = await read(
    await post(`${ownerPath}/book`, { limit: 50, offset: 50 }),
    200,
    c.measurementBook,
  );
  assert.equal(next.items.length, 2);
  assert.equal(next.nextOffset, null);
  const history = await read(
    await post(`${ownerPath}/${payload.profileId}/history`, { limit: 50 }),
    200,
    c.measurementHistory,
  );
  assert.equal(history.items.length, 50);
  assert.equal(history.items[0].sequence, 52);
  const older = await read(
    await post(`${ownerPath}/${payload.profileId}/history`, {
      limit: 50,
      beforeSequence: history.nextBeforeSequence,
    }),
    200,
    c.measurementHistory,
  );
  assert.equal(older.items.length, 2);
  assert.equal(older.items[1].sequence, 1);
  const exact = await read(
    await get(
      `${ownerPath}/${payload.profileId}/versions/${first.result.versionId}`,
    ),
    200,
    c.measurementDetail,
  );
  assert.equal(exact.document.label, payload.label);
  assert.equal(exact.document.values[0].decimal, "38.250000");
  noRates(exact);
  await read(
    await get(`${ownerPath}/${payload.profileId}/versions/${randomUUID()}`),
    404,
    c.measurementErrorResponse,
  );
  await read(
    await post(`${ownerPath}/book`, { search: "HTTP paged 50" }),
    200,
    c.measurementBook,
  );
  assert.equal(
    (await post(`${ownerPath}/book`, { tenantId: tenant })).status,
    400,
  );
  for (const suffix of ["?search=private", "?x=1&x=2", "?constructor=x"])
    assert.equal((await get(ownerPath + suffix)).status, 400);
  assert.equal((await fetch(base + ownerPath)).status, 401);
  assert.equal(
    (
      await fetch(`${base}${ownerPath}/book`, {
        method: "POST",
        headers: {
          cookie,
          origin: "https://outside.invalid",
          "Content-Type": "application/json",
        },
        body: "{}",
      })
    ).status,
    403,
  );
  const html = await (
    await get(
      `/workspaces/${tenant}/${workspacePath.split("/").at(-1)}/customers/${customer.id}/wearers/${wearer.id}/measurements/new`,
    )
  ).text();
  assert.ok(html.includes("Add measurements"));
  assert.ok(!html.includes("baseRate") && !html.includes("serviceOverrides"));
  const currentDetail = await read(
    await get(`${ownerPath}/${payload.profileId}`),
    200,
    c.measurementDetail,
  );
  const compareBody = {
    versions: [
      { profileId: payload.profileId, versionId: first.result.versionId },
      { profileId: payload.profileId, versionId: currentDetail.versionId },
    ],
    unit: "cm",
  };
  const compared = await read(
    await post(`${ownerPath}/compare`, compareBody),
    200,
    c.measurementComparison,
  );
  noRates(compared);
  assert.equal(compared.rows[0].cells[1].status, "same");
  const capture = await read(
    await get(
      `${ownerPath}/${payload.profileId}/versions/${first.result.versionId}/capture`,
    ),
    200,
    c.measurementCapture,
  );
  noRates(capture);
  assert.equal(capture.eligibility.currentVersion, false);
  assert.equal(capture.immutable.versionId, first.result.versionId);
  assert.equal(
    capture.immutable.document.values[0].decimal,
    exact.document.values[0].decimal,
  );
  const trendBody = {
    anchorVersionId: currentDetail.versionId,
    fieldId: schema.fields[0].id,
    from: "2020-01-01",
    to: "2020-12-31",
    unit: "cm",
    limit: 50,
  };
  const trendPage = await read(
    await post(`${ownerPath}/${payload.profileId}/trend`, trendBody),
    200,
    c.measurementTrend,
  );
  noRates(trendPage);
  assert.equal(trendPage.items.length, 50);
  assert.ok(trendPage.next);
  const trendEnd = await read(
    await post(`${ownerPath}/${payload.profileId}/trend`, {
      ...trendBody,
      after: trendPage.next,
    }),
    200,
    c.measurementTrend,
  );
  assert.equal(trendEnd.items.length, 2);
  assert.equal(trendEnd.next, null);
  assert.equal(
    (
      await post(`${ownerPath}/compare`, {
        versions: [compareBody.versions[0]],
      })
    ).status,
    400,
  );
  assert.equal(
    (
      await post(`${ownerPath}/${payload.profileId}/trend`, {
        ...trendBody,
        to: "9999-12-31",
      })
    ).status,
    400,
  );
  assert.equal(
    (
      await post(`${ownerPath}/compare`, {
        ...compareBody,
        versions: [
          compareBody.versions[0],
          { profileId: payload.profileId, versionId: randomUUID() },
        ],
      })
    ).status,
    404,
  );
  const photoChecks = await measurementPhotoHttpChecks({
    base,
    prefix,
    cookie,
    owner,
    payload: { ...payload, versionId: first.result.versionId },
    admin,
  });
  const cardChecks = await measurementCardHttpChecks({
    base,
    prefix,
    cookie,
    owner,
    payload: { ...payload, versionId: first.result.versionId },
    admin,
    tenant,
  });
  const member = (
    await admin.query(
      "SELECT g.role_id,g.membership_id,g.location_id FROM app.location_grants g JOIN app.memberships m ON m.id=g.membership_id WHERE m.tenant_id=$1 AND m.is_owner AND g.location_id=$2 LIMIT 1",
      [tenant, workspacePath.split("/").at(-1)],
    )
  ).rows[0];
  const role = randomUUID();
  await admin.query(
    "INSERT INTO app.roles(id,tenant_id,name) VALUES($1,$2,'Measurement-only HTTP fixture')",
    [role, tenant],
  );
  for (const permission of [
    "workspace.read",
    "customers.read",
    "measurements.read",
    "measurements.manage",
  ])
    await admin.query("INSERT INTO app.permission_grants VALUES($1,$2,$3)", [
      tenant,
      role,
      permission,
    ]);
  try {
    await admin.query(
      "UPDATE app.location_grants SET role_id=$1 WHERE membership_id=$2 AND location_id=$3",
      [role, member.membership_id, member.location_id],
    );
    await cardChecks.reader();
    await photoChecks.restricted();
    noRates(await read(await get(ownerPath), 200, c.measurementContext));
    const choices = await read(
      await post(`${ownerPath}/garments`, {}),
      200,
      c.measurementGarments,
    );
    noRates(choices);
    noRates(
      await read(
        await post(`${ownerPath}/compare`, compareBody),
        200,
        c.measurementComparison,
      ),
    );
    noRates(
      await read(
        await post(`${ownerPath}/${payload.profileId}/trend`, trendBody),
        200,
        c.measurementTrend,
      ),
    );
    noRates(
      await read(
        await get(
          `${ownerPath}/${payload.profileId}/versions/${first.result.versionId}/capture`,
        ),
        200,
        c.measurementCapture,
      ),
    );

    noRates(
      await read(
        await post(`${ownerPath}/current-intake`, context.bodySchemaRef),
        200,
        c.measurementCurrentIntake,
      ),
    );
    if (choices.items[0])
      noRates(
        await read(
          await post(`${ownerPath}/intake`, {
            kind: "garment",
            garmentId: choices.items[0].garmentId,
            versionId: choices.items[0].versionId,
          }),
          200,
          c.measurementSchema,
        ),
      );
    if (choices.items[0])
      noRates(
        await read(
          await post(`${ownerPath}/current-intake`, {
            kind: "garment",
            garmentId: choices.items[0].garmentId,
            versionId: choices.items[0].versionId,
          }),
          200,
          c.measurementCurrentIntake,
        ),
      );
    await admin.query(
      "DELETE FROM app.permission_grants WHERE role_id=$1 AND permission='measurements.manage'",
      [role],
    );
    await read(await get(ownerPath), 200, c.measurementContext);
    noRates(
      await read(
        await post(`${ownerPath}/compare`, compareBody),
        200,
        c.measurementComparison,
      ),
    );
    noRates(
      await read(
        await post(`${ownerPath}/${payload.profileId}/trend`, trendBody),
        200,
        c.measurementTrend,
      ),
    );
    const readOnlyHtml = await (
      await get(
        `/workspaces/${tenant}/${workspacePath.split("/").at(-1)}/customers/${owner.customerId}/wearers/${owner.wearerId}/measurements/${payload.profileId}`,
      )
    ).text();
    assert.ok(
      !readOnlyHtml.includes("Archive profile") &&
        !readOnlyHtml.includes("Revise current measurements"),
    );

    assert.equal(
      (await post(`${ownerPath}/current-intake`, context.bodySchemaRef)).status,
      403,
    );
    await admin.query(
      "INSERT INTO app.permission_grants VALUES($1,$2,'measurements.manage')",
      [tenant, role],
    );
    assert.equal((await get(`${workspacePath}/masters/garments`)).status, 403);
    await read(await post(`${ownerPath}/entry`, {}), 200, c.measurementContext);
    await admin.query(
      "DELETE FROM app.permission_grants WHERE role_id=$1 AND permission='measurements.read'",
      [role],
    );
    assert.equal((await get(ownerPath)).status, 403);
    assert.equal((await post(`${ownerPath}/compare`, compareBody)).status, 403);
    assert.equal(
      (await post(`${ownerPath}/${payload.profileId}/trend`, trendBody)).status,
      403,
    );
    assert.equal(
      (
        await get(
          `${ownerPath}/${payload.profileId}/versions/${first.result.versionId}/capture`,
        )
      ).status,
      403,
    );

    assert.equal(
      (await post(`${ownerPath}/current-intake`, context.bodySchemaRef)).status,
      403,
    );
  } finally {
    await admin.query(
      "UPDATE app.location_grants SET role_id=$1 WHERE membership_id=$2 AND location_id=$3",
      [member.role_id, member.membership_id, member.location_id],
    );
  }
  await api(`${workspacePath}/customers/commands/wearer.archive`, {
    ...owner,
    expectedVersion: 1,
  });
  await read(
    await post(`${ownerPath}/entry`, {}),
    409,
    c.measurementErrorResponse,
  );
  assert.equal(
    (await post(`${ownerPath}/current-intake`, context.bodySchemaRef)).status,
    409,
  );
  await read(
    await get(`${ownerPath}/${payload.profileId}`),
    200,
    c.measurementDetail,
  );
  await cardChecks.archive();
  await photoChecks.revokeArchived();
  await api(`${workspacePath}/customers/commands/wearer.restore`, {
    ...owner,
    expectedVersion: 2,
  });
  await cardChecks.finish();
  const emptyMaster = await api(
    `${workspacePath}/masters/commands/garment.save`,
    {
      mode: "create",
      definition: {
        formatVersion: 1,
        label: "HTTP empty garment",
        category: "Tailoring",
        applicability: "unspecified",
        iconId: null,
        help: "No standard dimensions",
        illustrationId: null,
        sections: [],
        fields: [],
        constructionGroups: [],
        services: [],
        addons: [],
        sourceVersionId: null,
      },
      baseRate: null,
      currency: "INR",
      serviceOverrides: [],
    },
  );
  assert.equal(emptyMaster.status, 200);
  const emptyGarment = (await emptyMaster.json()).result;
  const customId = randomUUID();
  const custom = {
    ...schema.fields[0],
    id: customId,
    sectionId: c.MEASUREMENT_CUSTOM_SECTION_ID,
    label: "Custom empty garment length",
    semanticId: null,
    basis: "garment",
  };
  const emptySaved = await read(
    await api(`${prefix}/commands/measurement.create`, {
      ...payload,
      profileId: randomUUID(),
      versionId: randomUUID(),
      schemaRef: {
        kind: "garment",
        garmentId: emptyGarment.garmentId,
        versionId: emptyGarment.garmentVersionId,
      },
      customFields: [custom],
      values: [
        { kind: "length", fieldId: customId, decimal: "4.5", unit: "in" },
      ],
    }),
    200,
    c.measurementSaveResponse,
  );
  const emptyDetail = await read(
    await get(`${ownerPath}/${emptySaved.result.profileId}`),
    200,
    c.measurementDetail,
  );
  assert.equal(emptyDetail.document.schema.sections.length, 0);
  assert.equal(emptyDetail.document.schema.fields.length, 0);
  assert.equal(emptyDetail.document.customFields.length, 1);
  const mappedSection = randomUUID(),
    mappedFieldId = randomUUID();
  const mappedMaster = await api(
    `${workspacePath}/masters/commands/garment.save`,
    {
      mode: "create",
      definition: {
        formatVersion: 1,
        label: "HTTP ease garment",
        category: "Tailoring",
        applicability: "unspecified",
        iconId: null,
        help: "Reviewed finished measurements",
        illustrationId: null,
        sections: [{ id: mappedSection, label: "Finished" }],
        fields: [
          {
            ...schema.fields[0],
            id: mappedFieldId,
            sectionId: mappedSection,
            label: "Finished chest",
            basis: "garment",
            semanticId: "garment.chest.circumference",
            required: true,
          },
        ],
        constructionGroups: [],
        services: [],
        addons: [],
        sourceVersionId: null,
      },
      baseRate: null,
      currency: "INR",
      serviceOverrides: [],
    },
  );
  assert.equal(mappedMaster.status, 200);
  const mappedGarment = (await mappedMaster.json()).result;
  console.log(
    "Measurement HTTP passed: explicit wearer, price-free measuring-only intake, 52 profiles/versions with continuation, exact history, strict origin/query/body ownership, current permissions and archived entry denial.",
  );
  return {
    total: 54,
    emptyGarmentLabel: "HTTP empty garment",
    mappedGarmentLabel: "HTTP ease garment",
    mappedGarmentId: mappedGarment.garmentId,
    mappedFieldId,
    ...owner,
    profileId: payload.profileId,
    versionId: first.result.versionId,
  };
}
