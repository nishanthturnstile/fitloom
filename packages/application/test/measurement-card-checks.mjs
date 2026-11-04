import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { withScope } from "@fitloom/db";
import { sql } from "drizzle-orm";
import {
  createCustomerService,
  createMasterService,
  createMeasurementCardService,
} from "../dist/index.js";

const invoke = (payload) => ({
  payload,
  operationKey: randomUUID(),
  correlationId: randomUUID(),
});
const rejected =
  (...codes) =>
  (error) =>
    codes.includes(error?.code) ||
    codes.includes(error?.category) ||
    codes.includes(error?.cause?.code);
function noPrivate(data) {
  if (data && typeof data === "object")
    for (const [key, value] of Object.entries(data)) {
      assert.ok(
        ![
          "phone",
          "email",
          "address",
          "notes",
          "sourceNote",
          "photos",
          "photoIds",
          "fileId",
          "fieldId",
          "choiceId",
          "rates",
          "baseRate",
          "services",
          "addons",
          "constructionGroups",
        ].includes(key),
        key,
      );
      noPrivate(value);
    }
}
export async function exerciseMeasurementCards({
  t,
  admin,
  web,
  a,
  b,
  actor,
  payload,
  owner,
}) {
  const resolveIdentity = async () => ({ principalId: a.principalId }),
    cards = createMeasurementCardService({ pool: web, resolveIdentity }),
    foreign = createMeasurementCardService({
      pool: web,
      resolveIdentity: async () => ({ principalId: b.principalId }),
    }),
    masters = createMasterService({ pool: web, resolveIdentity }),
    customers = createCustomerService({ pool: web, resolveIdentity });
  const reset = () =>
    admin.query(
      "DELETE FROM app.measurement_card_admissions WHERE principal_id=$1",
      [a.principalId],
    );
  const create = async (selections) =>
    cards.command(
      "measurement-card.create",
      a.target,
      invoke({ ...owner, selections, expiresInDays: 7 }),
    );
  const selected = (p, fieldIds = p.values.map((v) => v.fieldId)) => ({
    profileId: p.profileId,
    versionId: p.versionId,
    fieldIds,
  });
  let measure,
    created,
    request,
    definition,
    ref,
    readerId,
    reader,
    readerMember,
    readerRole,
    sequenceRevision = 1;
  const section = randomUUID(),
    common = (label) => ({
      id: randomUUID(),
      sectionId: section,
      label,
      required: false,
      semanticId: null,
      help: "Private guidance excluded",
      illustrationId: null,
    });
  await t.test(
    "cards fix all five value kinds and exact labels while rejecting unrelated data",
    async () => {
      const length = {
          ...common("Length <safe> தமிழ்"),
          kind: "length",
          basis: "garment",
          displayUnit: "in",
          displayPrecision: 2,
          min: null,
          max: null,
        },
        number = {
          ...common("Button count"),
          kind: "number",
          unit: "count",
          decimalPlaces: 0,
          min: null,
          max: null,
        },
        text = { ...common("Selected text"), kind: "text", maxLength: 500 },
        boolean = { ...common("Confirmed"), kind: "boolean" },
        choice = {
          id: randomUUID(),
          label: "Original saved choice",
          active: true,
          illustrationId: null,
        },
        select = { ...common("Selection"), kind: "select", choices: [choice] },
        missing = { ...length, ...common("Not recorded") },
        custom = { ...length, ...common("Saved custom allowance") };
      definition = {
        formatVersion: 1,
        label: "Card schema",
        category: "Tailoring",
        applicability: "unspecified",
        iconId: null,
        help: "Private master help",
        illustrationId: null,
        sections: [{ id: section, label: "Dimensions" }],
        fields: [length, number, text, boolean, select, missing],
        constructionGroups: [],
        services: [],
        addons: [],
        sourceVersionId: null,
      };
      const master = await masters.command(
        "garment.save",
        a.target,
        invoke({
          mode: "create",
          definition,
          baseRate: "1000",
          currency: "INR",
          serviceOverrides: [],
        }),
      );
      ref = {
        kind: "garment",
        garmentId: master.result.garmentId,
        versionId: master.result.garmentVersionId,
      };
      measure = payload("1", {
        schemaRef: ref,
        label: "Card source label",
        values: [
          {
            kind: "length",
            fieldId: length.id,
            decimal: "1.000000",
            unit: "in",
          },
          { kind: "number", fieldId: number.id, decimal: "0" },
          {
            kind: "text",
            fieldId: text.id,
            text: "<script>inert text</script>",
          },
          { kind: "boolean", fieldId: boolean.id, value: false },
          { kind: "select", fieldId: select.id, choiceId: choice.id },
          {
            kind: "length",
            fieldId: custom.id,
            decimal: "12.500000",
            unit: "cm",
          },
        ],
        customFields: [custom],
        notes: "Private notes never on cards",
        sourceNote: "Private author attribution",
      });
      await a.service.command("measurement.create", a.target, invoke(measure));
      const selections = [
        selected(
          measure,
          [...definition.fields, custom].map((field) => field.id),
        ),
      ];
      request = invoke({ ...owner, selections, expiresInDays: 7 });
      const preview = await cards.preview(a.target, { ...owner, selections });
      noPrivate(preview);
      assert.equal(preview.items[0].values[1].decimal, "0");
      assert.equal(preview.items[0].values[3].value, false);
      assert.equal(preview.items[0].values[4].choiceLabel, choice.label);
      assert.deepEqual(preview.items[0].values[5], {
        kind: "missing",
        label: missing.label,
        basis: "garment",
      });
      assert.deepEqual(preview.items[0].values[6], {
        kind: "length",
        label: custom.label,
        basis: "garment",
        decimal: "12.500000",
        unit: "cm",
      });
      created = await cards.command(
        "measurement-card.create",
        a.target,
        request,
      );
      assert.equal(
        (await cards.command("measurement-card.create", a.target, request))
          .replayed,
        true,
      );
      const original = await cards.resolve(created.result.cardId);
      noPrivate(original);
      assert.deepEqual(original.items, preview.items);
      assert.ok(!JSON.stringify(original).includes("Private"));
      assert.ok(!JSON.stringify(original).includes(length.id));
      const revision = {
        ...measure,
        versionId: randomUUID(),
        expectedRevision: 1,
        label: "Changed current profile",
        customFields: [{ ...custom, label: "Changed custom display label" }],
        values: measure.values.map((value) =>
          value.kind === "length" ? { ...value, decimal: "2" } : value,
        ),
      };
      await a.service.command("measurement.revise", a.target, invoke(revision));
      sequenceRevision = 2;
      const changed = {
        ...definition,
        fields: definition.fields.map((field) => ({
          ...field,
          label: `Updated ${field.label}`,
        })),
        sourceVersionId: master.result.garmentVersionId,
      };
      const next = await masters.command(
        "garment.save",
        a.target,
        invoke({
          mode: "update",
          garmentId: ref.garmentId,
          expectedVersion: master.result.version,
          definition: changed,
          baseRate: "2000",
          currency: "INR",
          serviceOverrides: [],
        }),
      );
      await masters.command(
        "garment.lifecycle",
        a.target,
        invoke({
          garmentId: ref.garmentId,
          expectedVersion: next.result.version,
          active: false,
        }),
      );
      await admin.query(
        "UPDATE app.customer_wearers SET name='Changed wearer display label' WHERE id=$1",
        [owner.wearerId],
      );
      assert.deepEqual(await cards.resolve(created.result.cardId), original);
      for (const [query, args] of [
        [
          "UPDATE app.measurement_cards SET wearer_label='rewrite' WHERE id=$1",
          [created.result.cardId],
        ],
        [
          "UPDATE app.measurement_card_selections SET field_ids='[]' WHERE card_id=$1",
          [created.result.cardId],
        ],
        [
          "DELETE FROM app.measurement_card_selections WHERE card_id=$1",
          [created.result.cardId],
        ],
      ])
        await assert.rejects(
          admin.query(query, args),
          rejected("42501", "23514"),
        );
      await assert.rejects(
        create([{ ...selected(measure), fieldIds: [randomUUID()] }]),
        rejected("validation"),
      );
      await assert.rejects(
        cards.command(
          "measurement-card.create",
          b.target,
          invoke({ ...owner, selections, expiresInDays: 7 }),
        ),
        rejected("unavailable", "denied"),
      );
      const unknown = await cards.resolve(randomUUID()).catch((e) => e);
      const inaccessible = await foreign
        .resolve(created.result.cardId)
        .catch((e) => e);
      assert.equal(unknown.code, "unavailable");
      assert.equal(inaccessible.code, "unavailable");
      assert.equal(unknown.message, inaccessible.message);
      const locked = await admin.connect();
      try {
        await locked.query("BEGIN");
        await locked.query(
          "SELECT 1 FROM app.measurement_profiles WHERE id=$1 FOR UPDATE",
          [measure.profileId],
        );
        await assert.rejects(
          foreign.command(
            "measurement-card.create",
            b.target,
            invoke({
              customerId: b.customerId,
              wearerId: b.wearerId,
              selections,
              expiresInDays: 7,
            }),
          ),
          rejected("unavailable"),
          "Foreign selections must not reach another owner's row lock",
        );
      } finally {
        await locked.query("ROLLBACK");
        locked.release();
      }
    },
  );
  await t.test(
    "current reader and issuer authority govern resolution; an authorized manager reissues under their own identity",
    async () => {
      await reset();
      readerId = await actor();
      readerMember = randomUUID();
      readerRole = randomUUID();
      await admin.query(
        "INSERT INTO app.roles(id,tenant_id,name) VALUES($1,$2,'Card reader')",
        [readerRole, a.target.tenantId],
      );
      await admin.query(
        "INSERT INTO app.permission_grants SELECT $1,$2,p FROM unnest(ARRAY['workspace.read','customers.read','measurements.read']) p",
        [a.target.tenantId, readerRole],
      );
      await admin.query(
        "INSERT INTO app.memberships(id,tenant_id,principal_id) VALUES($1,$2,$3)",
        [readerMember, a.target.tenantId, readerId],
      );
      await admin.query(
        "INSERT INTO app.location_grants(tenant_id,membership_id,location_id,role_id) VALUES($1,$2,$3,$4)",
        [a.target.tenantId, readerMember, a.target.locationId, readerRole],
      );
      reader = createMeasurementCardService({
        pool: web,
        resolveIdentity: async () => ({ principalId: readerId }),
      });
      assert.equal(
        (await reader.resolve(created.result.cardId)).items[0].profileLabel,
        "Card source label",
      );
      assert.deepEqual((await reader.list(a.target, owner)).items, []);
      await assert.rejects(
        reader.command(
          "measurement-card.create",
          a.target,
          invoke({
            ...owner,
            selections: [selected(measure)],
            expiresInDays: 7,
          }),
        ),
        rejected("denied"),
      );
      await assert.rejects(
        reader.command(
          "measurement-card.revoke",
          a.target,
          invoke({
            ...owner,
            cardId: created.result.cardId,
            expectedRevision: 1,
            reason: "Foreign reader attempt",
          }),
        ),
        rejected("unavailable"),
      );
      await admin.query("UPDATE app.memberships SET active=false WHERE id=$1", [
        readerMember,
      ]);
      await assert.rejects(
        reader.resolve(created.result.cardId),
        rejected("unavailable"),
      );
      await admin.query("UPDATE app.memberships SET active=true WHERE id=$1", [
        readerMember,
      ]);
      await admin.query("UPDATE app.principals SET active=false WHERE id=$1", [
        a.principalId,
      ]);
      try {
        await assert.rejects(
          reader.resolve(created.result.cardId),
          rejected("unavailable"),
        );
      } finally {
        await admin.query("UPDATE app.principals SET active=true WHERE id=$1", [
          a.principalId,
        ]);
      }
      const own = await create([selected(measure)]);
      await admin.query(
        "DELETE FROM app.permission_grants WHERE tenant_id=$1 AND role_id IN(SELECT id FROM app.roles WHERE tenant_id=$1 AND preset='owner') AND permission='measurements.cards.manage'",
        [a.target.tenantId],
      );
      try {
        await assert.rejects(
          reader.resolve(created.result.cardId),
          rejected("unavailable"),
        );
        await assert.rejects(
          cards.command("measurement-card.create", a.target, request),
          rejected("denied"),
        );
        assert.equal(
          (await cards.list(a.target, owner)).items.find(
            (card) => card.cardId === created.result.cardId,
          ).issuerAvailable,
          false,
        );
        await cards.command(
          "measurement-card.revoke",
          a.target,
          invoke({
            ...owner,
            cardId: own.result.cardId,
            expectedRevision: 1,
            reason: "Issuer privacy revoke after role loss",
          }),
        );
        await admin.query(
          "INSERT INTO app.permission_grants VALUES($1,$2,'measurements.cards.manage')",
          [a.target.tenantId, readerRole],
        );
        await reader.command(
          "measurement-card.revoke",
          a.target,
          invoke({
            ...owner,
            cardId: created.result.cardId,
            expectedRevision: 1,
            reason: "Authorized replacement",
          }),
        );
        const reissued = await reader.command(
          "measurement-card.create",
          a.target,
          invoke({
            ...owner,
            selections: [selected(measure)],
            expiresInDays: 7,
          }),
        );
        assert.equal(
          (await reader.resolve(reissued.result.cardId)).items[0].values[4]
            .choiceLabel,
          "Original saved choice",
        );
        assert.equal(
          (
            await admin.query(
              "SELECT issuer_id FROM app.measurement_cards WHERE id=$1",
              [reissued.result.cardId],
            )
          ).rows[0].issuer_id,
          readerId,
        );
      } finally {
        await admin.query(
          "INSERT INTO app.permission_grants SELECT tenant_id,id,'measurements.cards.manage' FROM app.roles WHERE tenant_id=$1 AND preset='owner' ON CONFLICT DO NOTHING",
          [a.target.tenantId],
        );
      }
      await assert.rejects(
        cards.resolve(created.result.cardId),
        rejected("unavailable"),
      );
    },
  );
  await t.test(
    "profile, wearer and customer archives revoke permanently and expiry never broadens a grant",
    async () => {
      await reset();
      const profileCard = await create([selected(measure)]);
      await a.service.command(
        "measurement.archive",
        a.target,
        invoke({
          ...owner,
          profileId: measure.profileId,
          expectedRevision: sequenceRevision,
        }),
      );
      sequenceRevision++;
      await assert.rejects(
        cards.resolve(profileCard.result.cardId),
        rejected("unavailable"),
      );
      await a.service.command(
        "measurement.restore",
        a.target,
        invoke({
          ...owner,
          profileId: measure.profileId,
          expectedRevision: sequenceRevision,
        }),
      );
      sequenceRevision++;
      await assert.rejects(
        cards.resolve(profileCard.result.cardId),
        rejected("unavailable"),
      );
      for (const kind of ["wearer", "customer"]) {
        const card = await create([selected(measure)]),
          table = kind === "wearer" ? "customer_wearers" : "customers",
          id = kind === "wearer" ? owner.wearerId : owner.customerId;
        const version = (
          await admin.query(`SELECT version FROM app.${table} WHERE id=$1`, [
            id,
          ])
        ).rows[0].version;
        const target =
          kind === "wearer" ? owner : { customerId: owner.customerId };
        await customers.command(
          `${kind}.archive`,
          a.target,
          invoke({ ...target, expectedVersion: version }),
        );
        await assert.rejects(
          cards.resolve(card.result.cardId),
          rejected("unavailable"),
        );
        await customers.command(
          `${kind}.restore`,
          a.target,
          invoke({ ...target, expectedVersion: version + 1 }),
        );
        await assert.rejects(
          cards.resolve(card.result.cardId),
          rejected("unavailable"),
        );
      }
      const expiring = await create([selected(measure)]);
      await assert.rejects(
        admin.query(
          "UPDATE app.measurement_cards SET expires_at=now()+interval '30 days' WHERE id=$1",
          [expiring.result.cardId],
        ),
        rejected("42501"),
      );
      await admin.query(
        "ALTER TABLE app.measurement_cards DISABLE TRIGGER immutable_header",
      );
      try {
        await admin.query(
          "UPDATE app.measurement_cards SET created_at=now()-interval '10 days',expires_at=now()-interval '3 days' WHERE id=$1",
          [expiring.result.cardId],
        );
      } finally {
        await admin.query(
          "ALTER TABLE app.measurement_cards ENABLE TRIGGER immutable_header",
        );
      }
      await assert.rejects(
        cards.resolve(expiring.result.cardId),
        rejected("unavailable"),
      );
    },
  );
  await t.test(
    "card limits, independent SQL validation, bounded lists and database-wide resolution admissions hold",
    async () => {
      await reset();
      const body = [];
      for (let i = 0; i < 11; i++) {
        const p = payload(String(i + 1));
        await a.service.command("measurement.create", a.target, invoke(p));
        body.push(selected(p));
      }
      await create(body.slice(0, 10));
      await assert.rejects(create(body), rejected("validation"));
      const manyFields = Array.from({ length: 31 }, (_, i) => ({
        ...common(`Bound field ${i + 1}`),
        kind: "length",
        basis: "body",
        displayUnit: "cm",
        displayPrecision: 2,
        min: null,
        max: null,
      }));
      const master = await masters.command(
        "garment.save",
        a.target,
        invoke({
          mode: "create",
          definition: {
            ...definition,
            label: "Bounded card fields",
            sourceVersionId: null,
            fields: manyFields,
          },
          baseRate: null,
          currency: "INR",
          serviceOverrides: [],
        }),
      );
      const p = payload("1", {
        schemaRef: {
          kind: "garment",
          garmentId: master.result.garmentId,
          versionId: master.result.garmentVersionId,
        },
        values: manyFields.map((field) => ({
          kind: "length",
          fieldId: field.id,
          decimal: "1",
          unit: "cm",
        })),
      });
      await a.service.command("measurement.create", a.target, invoke(p));
      const thirty = await create([
        selected(
          p,
          manyFields.slice(0, 30).map((field) => field.id),
        ),
      ]);
      assert.equal(
        (await cards.resolve(thirty.result.cardId)).items[0].values.length,
        30,
      );
      await assert.rejects(create([selected(p)]), rejected("validation"));
      await assert.rejects(
        withScope(web, a.scope, async (db) => {
          await db.execute(
            sql`SELECT * FROM app.claim_operation('tenant','measurement-card.create',${randomUUID()},${`v1:${"b".repeat(64)}`},${randomUUID()}::uuid)`,
          );
          await db.execute(
            sql`SELECT app.measurement_card_mutate('measurement-card.create',${JSON.stringify({ ...owner, selections: [selected(p)], expiresInDays: 7 })}::jsonb)`,
          );
        }),
        rejected("FM004"),
      );
      for (let i = 0; i < 27; i++) await create([body[0]]);
      let cursor = null,
        ids = [];
      do {
        const page = await cards.list(a.target, { ...owner, after: cursor });
        assert.ok(page.items.length <= 25);
        ids.push(...page.items.map((item) => item.cardId));
        cursor = page.next;
      } while (cursor);
      assert.equal(new Set(ids).size, ids.length);
      assert.equal(
        ids.length,
        (
          await admin.query(
            "SELECT count(*)::int n FROM app.measurement_cards WHERE customer_id=$1 AND wearer_id=$2",
            [owner.customerId, owner.wearerId],
          )
        ).rows[0].n,
      );
      await reset();
      const admitted = await Promise.all(
        Array.from({ length: 40 }, () =>
          withScope(
            web,
            { kind: "principal", principalId: a.principalId },
            async (db) =>
              (
                await db.execute(
                  sql`SELECT app.measurement_card_admit() AS allowed`,
                )
              ).rows[0].allowed,
          ),
        ),
      );
      assert.equal(admitted.filter(Boolean).length, 30);
      await assert.rejects(
        cards.resolve(thirty.result.cardId),
        rejected("rate-limit"),
      );
      await reset();
      await assert.rejects(
        cards.resolve("not-a-uuid"),
        rejected("unavailable"),
      );
      assert.equal(
        (
          await admin.query(
            "SELECT requests FROM app.measurement_card_admissions WHERE principal_id=$1",
            [a.principalId],
          )
        ).rows[0].requests,
        1,
      );
      await reset();
      for (const table of [
        "measurement_cards",
        "measurement_card_selections",
        "measurement_card_admissions",
      ])
        for (const role of [
          "fitloom_web",
          "fitloom_worker",
          "fitloom_auth",
          "fitloom_operator",
        ])
          assert.equal(
            (
              await admin.query(
                "SELECT has_table_privilege($1,$2,'SELECT') AS allowed",
                [role, `app.${table}`],
              )
            ).rows[0].allowed,
            false,
          );
    },
  );
}
