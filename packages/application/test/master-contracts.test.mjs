import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  copyHistoricalDefinition,
  definitionIdentities,
  estimatedDefinitionBytes,
  garmentPreview,
  identityIssues,
  masterRequestFits,
  resolveGarmentRate,
} from "../dist/garment-definition.js";
import * as c from "../dist/master-contracts.js";
import { createStarterBundle } from "../dist/master-starters.js";

const bundle = () => createStarterBundle(randomUUID);
const definition = () => bundle().garments[0].definition;
const registry = (d) =>
  definitionIdentities(d).map((n) => ({
    nodeId: n.id,
    signature: n.signature,
    retiredRevision: null,
  }));
function fails(schema, input, path) {
  const result = schema.safeParse(input);
  assert.equal(result.success, false);
  if (path)
    assert.ok(
      result.error.issues.some((i) => i.path.join(".") === path),
      JSON.stringify(result.error.issues),
    );
}
function allKinds() {
  const d = definition();
  const common = {
    sectionId: d.sections[0].id,
    label: "Custom",
    required: false,
    semanticId: null,
    help: "",
    illustrationId: null,
  };
  d.fields.push(
    {
      ...common,
      id: randomUUID(),
      kind: "number",
      unit: "count",
      decimalPlaces: 0,
      min: "0",
      max: "12",
    },
    { ...common, id: randomUUID(), kind: "text", maxLength: 500 },
    { ...common, id: randomUUID(), kind: "boolean" },
    {
      ...common,
      id: randomUUID(),
      kind: "select",
      choices: [
        {
          id: randomUUID(),
          label: "Regular",
          illustrationId: null,
          active: true,
        },
      ],
    },
  );
  d.constructionGroups.push({
    ...d.constructionGroups[0],
    id: randomUUID(),
    kind: "multiple",
    choices: [
      { id: randomUUID(), label: "Lined", illustrationId: null, active: true },
    ],
  });
  return d;
}

test("original starter bundle allocates independent IDs, with no inferred prices", () => {
  const first = bundle();
  const second = bundle();
  assert.equal(first.bundleVersion, "tailoring-core-v1");
  assert.deepEqual(
    first.garments.map((g) => g.templateKey),
    ["shirt", "blouse", "trouser"],
  );
  for (const garment of first.garments) {
    assert.equal(garment.baseRate, null);
    assert.ok(garment.serviceOverrides.every((s) => s.rateOverride === null));
    c.garmentSave.parse({
      mode: "create",
      ...Object.fromEntries(
        Object.entries(garment).filter(([k]) => k !== "templateKey"),
      ),
    });
  }
  const ids = first.garments.flatMap((g) =>
    definitionIdentities(g.definition).map((n) => n.id),
  );
  assert.equal(ids.length, new Set(ids).size);
  assert.ok(
    second.garments
      .flatMap((g) => definitionIdentities(g.definition))
      .every((n) => !ids.includes(n.id)),
  );
});

test("all field and construction variants render ordered, value-free previews", () => {
  const d = c.garmentDefinition.parse(allKinds());
  const p = garmentPreview(d);
  assert.deepEqual(
    p.sections[0].fields.map((f) => f.kind),
    [
      "length",
      "length",
      "length",
      "length",
      "number",
      "text",
      "boolean",
      "select",
    ],
  );
  assert.deepEqual(
    p.constructionGroups.map((g) => g.kind),
    ["single", "multiple"],
  );
  assert.equal(p.emptyMessage, null);
  assert.equal("baseRate" in p, false);
  assert.equal(
    p.sections[0].fields[0].illustration.src,
    "/illustrations/garments/dimension.svg",
  );
  const empty = {
    ...d,
    fields: [],
    sections: [],
    constructionGroups: [],
    iconId: null,
  };
  assert.equal(
    garmentPreview(empty).emptyMessage,
    "No dimensions are required.",
  );
  assert.deepEqual(garmentPreview(empty).illustration, {
    src: null,
    alt: d.label,
  });
  fails(c.garmentDefinition, { ...d, formatVersion: 2 }, "formatVersion");
});

for (const input of [
  "-0",
  "-0.000000",
  "-1",
  "NaN",
  "Infinity",
  "1e2",
  "01",
  "1.0000000",
  "1000000000000000000",
  0,
  null,
])
  test(`rate rejects ${JSON.stringify(input)}`, () =>
    fails(c.masterRateInput, input));
for (const [input, output] of [
  ["0", "0.000000"],
  ["12.34", "12.340000"],
  ["999999999999999999.999999", "999999999999999999.999999"],
])
  test(`rate canonicalizes ${input}`, () =>
    assert.equal(c.masterRateInput.parse(input), output));
test("rate precedence retains zero and unset", () => {
  assert.equal(
    resolveGarmentRate({ baseRate: "5.000000", rateOverride: "0.000000" }),
    "0.000000",
  );
  assert.equal(
    resolveGarmentRate({ baseRate: "5.000000", rateOverride: null }),
    "5.000000",
  );
  assert.equal(
    resolveGarmentRate({ baseRate: null, rateOverride: null }),
    null,
  );
});

const invalidDefinitions = [
  [
    "empty label",
    (d) => {
      d.label = "   ";
    },
    "label",
  ],
  [
    "unknown key",
    (d) => {
      d.customer = {};
    },
  ],
  [
    "unknown kind",
    (d) => {
      d.fields[0].kind = "date";
    },
  ],
  [
    "unknown semantic",
    (d) => {
      d.fields[0].semanticId = "body.unknown";
    },
  ],
  [
    "semantic basis",
    (d) => {
      d.fields[0].basis = "garment";
    },
    "fields.0.semanticId",
  ],
  [
    "cross-section reference",
    (d) => {
      d.fields[0].sectionId = randomUUID();
    },
    "fields.0.sectionId",
  ],
  [
    "duplicate field",
    (d) => {
      d.fields.push(d.fields[0]);
    },
    "fields.4.id",
  ],
  [
    "cross-kind duplicate",
    (d) => {
      d.fields[0].id = d.sections[0].id;
    },
    "fields.0.id",
  ],
  [
    "duplicate option",
    (d) => {
      d.constructionGroups[0].choices.push(d.constructionGroups[0].choices[0]);
    },
    "constructionGroups.0.choices.2.id",
  ],
  [
    "URL illustration",
    (d) => {
      d.fields[0].illustrationId = "https://example.com/x.svg";
    },
  ],
  [
    "SVG markup",
    (d) => {
      d.iconId = "<svg/>";
    },
  ],
  [
    "inverted bounds",
    (d) => {
      d.fields[0].min = "2";
      d.fields[0].max = "1";
    },
    "fields.0.max",
  ],
  [
    "negative length",
    (d) => {
      d.fields[0].min = "-1";
    },
    "fields.0.min",
  ],
  [
    "negative zero length",
    (d) => {
      d.fields[0].min = "-0";
    },
    "fields.0.min",
  ],
  [
    "invalid decimal bound",
    (d) => {
      d.fields[0].min = "NaN";
    },
    "fields.0.min",
  ],
  [
    "overflow bound",
    (d) => {
      d.fields[0].max = "1000000000000000000";
    },
    "fields.0.max",
  ],
  [
    "precision bound",
    (d) => {
      d.fields[0].max = "0.0000001";
    },
    "fields.0.max",
  ],
  [
    "duplicate binding",
    (d) => {
      d.services.push(d.services[0]);
    },
    "services.2",
  ],
  [
    "empty required group",
    (d) => {
      d.constructionGroups[0].required = true;
      d.constructionGroups[0].choices.forEach((c) => {
        c.active = false;
      });
    },
    "constructionGroups.0.choices",
  ],
  [
    "too many fields",
    (d) => {
      d.fields = Array.from({ length: 61 }, () => ({
        ...d.fields[0],
        id: randomUUID(),
      }));
    },
    "fields",
  ],
];
for (const [name, mutate, path] of invalidDefinitions)
  test(`definition rejects ${name}`, () => {
    const d = definition();
    mutate(d);
    fails(c.garmentDefinition, d, path);
  });

test("number and select policies have field-specific issues", () => {
  const d = allKinds();
  d.fields[4].decimalPlaces = 1;
  fails(c.garmentDefinition, d, "fields.4.decimalPlaces");
  d.fields[4].decimalPlaces = 0;
  d.fields[4].min = "0.1";
  fails(c.garmentDefinition, d, "fields.4.min");
  d.fields[4].min = "0";
  d.fields[7].required = true;
  d.fields[7].choices[0].active = false;
  fails(c.garmentDefinition, d, "fields.7.choices");
  d.fields[7].required = false;
  d.fields[4].unit = "unitless";
  d.fields[4].min = "-1.5";
  c.garmentDefinition.parse(d);
});

test("normalized UUIDs cannot bypass duplicate identity checks", () => {
  const d = definition();
  d.fields.push({ ...d.fields[0], id: d.fields[0].id.toUpperCase() });
  fails(c.garmentDefinition, d, "fields.4.id");
});

test("cosmetic edits preserve lineage; changed meaning and retired IDs fail", () => {
  const d = allKinds();
  const r = registry(d);
  const changed = structuredClone(d);
  changed.fields.reverse();
  changed.sections[0].label = "Renamed";
  changed.fields[0].label = "Updated label";
  changed.fields[0].required = true;
  changed.fields.find((f) => f.kind === "length").displayPrecision = 6;
  assert.deepEqual(identityIssues(c.garmentDefinition.parse(changed), r), []);
  const field = changed.fields.find((f) => f.kind === "length");
  field.semanticId = null;
  field.basis = "garment";
  assert.match(
    identityIssues(c.garmentDefinition.parse(changed), r)[0].message,
    /meaning/,
  );
  const retired = r.map((n) => ({ ...n, retiredRevision: 3 }));
  assert.ok(
    identityIssues(d, retired).every((i) => i.message.includes("Retired")),
  );
  const copy = copyHistoricalDefinition({
    definition: d,
    sourceVersionId: randomUUID(),
    registry: retired,
    newId: randomUUID,
  });
  assert.deepEqual(identityIssues(copy, retired), []);
  assert.ok(
    definitionIdentities(copy).every(
      (n) => !r.some((old) => old.nodeId === n.id),
    ),
  );
  assert.notEqual(copy.fields[0].sectionId, d.fields[0].sectionId);
});

test("option ownership, group kind and number unit are immutable", () => {
  const d = allKinds();
  const r = registry(d);
  const moved = structuredClone(d);
  moved.constructionGroups[1].choices.push(
    moved.constructionGroups[0].choices.pop(),
  );
  moved.constructionGroups[0].kind = "multiple";
  moved.fields[4].unit = "unitless";
  assert.equal(identityIssues(c.garmentDefinition.parse(moved), r).length, 3);
});

test("copying a retired parent regenerates its live options too", () => {
  const d = allKinds();
  const r = registry(d);
  const parent = r.find((n) => n.nodeId === d.fields[7].id);
  parent.retiredRevision = 2;
  const copy = copyHistoricalDefinition({
    definition: d,
    sourceVersionId: randomUUID(),
    registry: r,
    newId: randomUUID,
  });
  assert.notEqual(copy.fields[7].id, d.fields[7].id);
  assert.notEqual(copy.fields[7].choices[0].id, d.fields[7].choices[0].id);
  assert.equal(copy.fields[0].id, d.fields[0].id);
  assert.deepEqual(identityIssues(copy, r), []);
});

test("save requires exact eligible overrides, explicit prices and a create/update variant", () => {
  const g = bundle().garments[0];
  const { templateKey, ...fields } = g;
  const input = { ...fields, mode: "create" };
  c.garmentSave.parse(input);
  fails(c.garmentSave, { ...input, baseRate: undefined }, "baseRate");
  fails(c.garmentSave, { ...input, currency: "USD" }, "currency");
  fails(c.garmentSave, { ...input, mode: "update" }, "garmentId");
  fails(c.garmentSave, { ...input, expectedVersion: 1 });
  fails(c.garmentSave, { ...input, serviceOverrides: [] }, "serviceOverrides");
  fails(c.garmentSave, {
    ...input,
    serviceOverrides: [g.serviceOverrides[0], g.serviceOverrides[0]],
  });
  fails(c.garmentSave, {
    ...input,
    serviceOverrides: [
      { serviceId: randomUUID(), rateOverride: null },
      g.serviceOverrides[1],
    ],
  });
});

test("schema-only projections reject every supplied price property", () => {
  const id = randomUUID();
  const header = {
    id,
    label: "Test",
    active: true,
    version: 1,
    revision: 1,
    currentVersionId: randomUUID(),
  };
  const garment = {
    ...header,
    origin: "custom",
    templateKey: null,
    applicability: "unisex",
  };
  c.garmentSummary.parse(garment);
  fails(c.garmentSummary, { ...garment, baseRate: "1.000000" });
  c.pricedGarmentSummary.parse({ ...garment, baseRate: null, currency: "INR" });
  fails(c.addonSummary, { ...header, amount: "0.000000" });
  const detail = {
    garmentId: id,
    garmentVersionId: randomUUID(),
    version: 1,
    revision: 1,
    definition: definition(),
    services: [],
    addons: [],
  };
  c.garmentDetail.parse(detail);
  fails(c.garmentDetail, { ...detail, serviceOverrides: [] });
  fails(c.masterHistoryPage, {
    items: [],
    total: 0,
    nextOffset: null,
    catalogVersion: 0,
    amount: "1.000000",
  });
});

test("query, collection, operation and issue bounds", () => {
  assert.equal(c.masterPageQuery.parse({}).limit, 50);
  for (const input of [
    { limit: "51" },
    { offset: "100001" },
    { sort: "label" },
  ])
    fails(c.masterPageQuery, input);
  fails(c.masterReorder, {
    kind: "garment",
    movedId: bundle().services[0].id,
    beforeId: null,
    expectedCatalogVersion: -1,
  });
  const id = randomUUID();
  fails(c.masterReorder, {
    kind: "garment",
    movedId: id,
    beforeId: id.toUpperCase(),
    expectedCatalogVersion: 0,
  });
  const d = definition();
  d.fields = Array.from({ length: 60 }, () => ({
    ...d.fields[0],
    id: randomUUID(),
    label: "",
  }));
  const result = c.garmentDefinition.safeParse(d);
  assert.equal(result.success, false);
  const issues = c.masterIssues(result.error);
  assert.equal(issues.length, 30);
  issues.forEach((i) => {
    c.masterValidationIssue.parse(i);
  });
});

test("UTF-8 estimate and transport envelope bounds", () => {
  const d = definition();
  d.label = "தமிழ்";
  assert.equal(
    estimatedDefinitionBytes(d),
    Buffer.byteLength(JSON.stringify(d)),
  );
  assert.equal(
    masterRequestFits({ text: "x".repeat(c.MASTER_REQUEST_BYTES) }),
    false,
  );
  assert.equal(
    masterRequestFits({ text: "x".repeat(c.MASTER_REQUEST_BYTES - 11) }),
    true,
  );
});

test("browser exports have no transitive server, database or secret imports", async () => {
  const visited = new Set();
  // The import grammar here deliberately matches both imports and re-exports.
  async function walk(file) {
    if (visited.has(file.href)) return;
    visited.add(file.href);
    const source = await readFile(file, "utf8");
    for (const [, specifier] of source.matchAll(
      /(?:from\s*|import\s*\()\s*["']([^"']+)["']/g,
    )) {
      if (specifier.startsWith(".")) await walk(new URL(specifier, file));
      else
        assert.ok(
          ["zod", "decimal.js"].includes(specifier),
          `Unexpected browser dependency: ${specifier}`,
        );
    }
  }
  await walk(new URL("../dist/master-contracts.js", import.meta.url));
  await walk(new URL("../dist/garment-definition.js", import.meta.url));
});

test("all illustration manifest entries resolve to original static SVGs", async () => {
  for (const illustration of Object.values(c.MASTER_ILLUSTRATIONS)) {
    const source = await readFile(
      new URL(`../../../apps/web/public${illustration.src}`, import.meta.url),
      "utf8",
    );
    assert.match(source, /<svg/);
    assert.match(source, /<title>/);
    assert.doesNotMatch(source, /<script|https?:\/\/(?!www.w3.org)/);
    assert.ok(illustration.alt);
  }
});

test("fresh identity admits a semantic change without altering the old definition", () => {
  const d = definition();
  const original = structuredClone(d);
  const r = registry(d);
  d.fields[0] = {
    ...d.fields[0],
    id: randomUUID(),
    semanticId: "garment.chest.circumference",
    basis: "garment",
  };
  assert.deepEqual(identityIssues(c.garmentDefinition.parse(d), r), []);
  assert.equal(original.fields[0].semanticId, "body.chest.circumference");
  assert.notEqual(original.fields[0].id, d.fields[0].id);
});

test("manifest schemas match their authoritative registries", () => {
  assert.deepEqual(
    [...c.illustrationId.options].sort(),
    Object.keys(c.MASTER_ILLUSTRATIONS).sort(),
  );
  assert.deepEqual(
    [...c.semanticId.options].sort(),
    Object.keys(c.SEMANTIC_REGISTRY).sort(),
  );
});

test("service, add-on and lifecycle commands validate their own boundaries", () => {
  c.serviceSave.parse({ mode: "create", label: "  Hemming  " });
  c.addonSave.parse({
    mode: "create",
    label: "Lining",
    amount: "0",
    currency: "INR",
  });
  fails(
    c.addonSave,
    { mode: "create", label: "Lining", amount: "-0", currency: "INR" },
    "amount",
  );
  fails(
    c.serviceSave,
    {
      mode: "update",
      serviceId: randomUUID(),
      expectedVersion: 0,
      label: "Hemming",
    },
    "expectedVersion",
  );
  for (const [schema, key] of [
    [c.garmentLifecycle, "garmentId"],
    [c.serviceLifecycle, "serviceId"],
    [c.addonLifecycle, "addonId"],
  ]) {
    schema.parse({ [key]: randomUUID(), expectedVersion: 1, active: false });
    fails(schema, {
      [key]: randomUUID(),
      expectedVersion: 1,
      active: false,
      tenantId: randomUUID(),
    });
  }
  const invocation = c.masterInvocation(c.serviceSave);
  invocation.parse({
    operationKey: "save-1",
    correlationId: randomUUID(),
    payload: { mode: "create", label: "Hemming" },
  });
  fails(invocation, {
    operationKey: "save-1",
    correlationId: randomUUID(),
    payload: { mode: "create", label: "Hemming" },
    principalId: randomUUID(),
  });
});
