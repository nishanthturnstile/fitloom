import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";
import Ajv from "ajv/dist/2020.js";
import { requestHash } from "../dist/commands.js";
import * as c from "../dist/import-contracts.js";
import {
  canonicalImportGroup,
  createImportManifest,
  importTemplate,
  parseImportFile,
  prepareImportHistory,
} from "../dist/import-formats.js";
import { bodyCoreV1 } from "../dist/measurement-body-schema.js";

const encode = (v) => new TextEncoder().encode(v);
const csv = (columns, rows) =>
  columns.join(",") +
  "\r\n" +
  rows
    .map((r) =>
      r.map((v) => '"' + String(v).replaceAll('"', '""') + '"').join(","),
    )
    .join("\r\n") +
  "\r\n";
const body = createImportManifest(
  "body_v1",
  { kind: "body", bundleVersion: "body-core-v1" },
  bodyCoreV1(),
);
const customer = (id, name = "Sample", phone = "") => [
  id,
  name,
  phone ? "IN" : "",
  phone,
  "",
  "",
  "",
  "",
  "",
];
const measurement = (
  id,
  version,
  sequence,
  values,
  custom = "[]",
  key = "body_v1",
) => [
  id,
  version,
  sequence,
  "customer_001",
  "wearer_001",
  "Same display label",
  key,
  "2020-01-02",
  JSON.stringify(values),
  custom,
  "Multiline\nnotes",
  "Unverified source",
];
const parse = (
  f,
  rows,
  columns = f === "customers"
    ? c.importCustomerColumns
    : c.importMeasurementColumns,
) => parseImportFile(encode(csv(columns, rows)), f);

test("strict CSV parses every row, preserves opaque identity and inert formula text, and classifies group failures", () => {
  const rows = [
    customer("0001", "=literal"),
    ["0001", "=literal", "", "", "", "w1", "Named wearer", "family", ""],
    ["0001", "=literal", "", "", "", "w1", "Named wearer", "family", ""],
  ];
  const parsed = parse("customers", rows);
  assert.equal(parsed.rowCount, 3);
  assert.equal(parsed.groups.length, 1);
  assert.equal(parsed.groups[0].payload.sourceId, "0001");
  assert.equal(parsed.groups[0].payload.profile.name, "=literal");
  assert.equal(parsed.groups[0].payload.wearers.length, 1);
  assert.deepEqual(parsed.groups[0].redundantRows, [3]);
  const conflicting = parse("customers", [
    ...rows,
    customer("0001", "Changed"),
    customer("other"),
  ]);
  assert.equal(conflicting.groups[0].payload, null);
  assert.equal(conflicting.groups[1].payload.sourceId, "other");
  assert.equal(conflicting.groups[0].issues[0].row, 4);
  const ownership = parse("customers", [
    ["a", "A", "", "", "", "child", "Child", "", ""],
    ["b", "B", "", "", "", "child", "Child", "", ""],
  ]);
  assert.ok(
    ownership.groups.every((g) => g.payload === null && g.issues.length),
  );
  for (const input of [
    "",
    "source_customer_id,customer_name\r\n",
    "source_customer_id,customer_name,customer_name\r\na,b,c",
    "source_customer_id,customer_name,unknown\r\na,b,c",
    'source_customer_id,customer_name\r\n"unterminated,b',
    "source_customer_id,customer_name\r\na,b,c",
  ])
    assert.throws(() => parseImportFile(encode(input), "customers"));
  assert.throws(() =>
    parseImportFile(new Uint8Array([0xc3, 0x28]), "customers"),
  );
  assert.throws(() =>
    parseImportFile(new Uint8Array(c.IMPORT_FILE_BYTES + 1), "customers"),
  );
  assert.throws(() =>
    parse(
      "customers",
      Array.from({ length: 201 }, (_, i) => customer(String(i))),
    ),
  );
  assert.throws(() =>
    parseImportFile(
      encode(
        'source_customer_id,customer_name\r\na,"' + "x".repeat(65537) + '"',
      ),
      "customers",
    ),
  );
  assert.equal(
    parseImportFile(
      encode("\ufeff" + csv(c.importCustomerColumns, [customer("bom")])),
      "customers",
    ).rowCount,
    1,
  );
  const hugeGroup = parse(
    "customers",
    Array.from({ length: 21 }, (_, i) => [
      "a",
      "A",
      "",
      "",
      "",
      "w" + i,
      "Wearer " + i,
      "",
      "",
    ]),
  );
  assert.equal(hugeGroup.groups[0].payload, null);
  const full = parse(
    "customers",
    Array.from({ length: 200 }, (_, i) =>
      customer(String(i), "Name " + i, "98765" + String(40000 + i)),
    ),
  );
  assert.equal(full.groups.length, 200);
  assert.ok(full.groups.every((g) => g.payload));
});
test("canonical groups normalize phone and decimal spelling while complete histories retain source sequence and distinct profiles", () => {
  const a = parse("customers", [customer("case", "Name", "98765 43210")])
      .groups[0].payload,
    b = parse("customers", [customer("case", "Name", "+91 9876543210")])
      .groups[0].payload;
  assert.equal(
    requestHash(canonicalImportGroup(a)),
    requestHash(canonicalImportGroup(b)),
  );
  const values = [
    { kind: "length", fieldKey: "f001", decimal: "40.00", unit: "in" },
  ];
  const file = parse("measurements", [
    measurement("one", "v2", "10", values),
    measurement("one", "v1", "2", values),
    measurement("two", "v3", "1", values),
  ]);
  assert.equal(file.groups.length, 2);
  assert.deepEqual(
    file.groups[0].payload.versions.map((v) => v.sequence),
    [2, 10],
  );
  const change = structuredClone(file.groups[0].payload);
  change.versions[0].values[0].decimal = "40";
  change.versions[1].values[0].decimal = "40.0";
  assert.equal(
    requestHash(canonicalImportGroup(change)),
    requestHash(canonicalImportGroup(file.groups[0].payload)),
  );
  const binding = {
    schemaKey: "body_v1",
    sourceRef: body.schemaRef,
    targetRef: body.schemaRef,
    mappings: [],
  };
  const prepared = prepareImportHistory(file.groups[0].payload, [
    { binding, source: body, target: body },
  ]);
  assert.deepEqual(
    prepared.versions.map((v) => v.sourceSequence),
    [2, 10],
  );
  assert.equal(new Set(prepared.versions.map((v) => v.versionId)).size, 2);
  for (const bad of [
    [{ ...values[0], decimal: 40 }],
    [{ ...values[0], decimal: "-0" }],
    [{ ...values[0], fieldKey: "unknown" }],
    [{ ...values[0], fieldKey: "f000" }],
    [values[0], values[0]],
    [{ kind: "boolean", fieldKey: "f001", value: false, extra: true }],
  ])
    assert.equal(
      parse("measurements", [measurement("bad", "v", "1", bad)]).groups[0]
        .payload,
      null,
    );
  assert.equal(
    parse("measurements", [
      measurement("same", "v", "1", values),
      measurement("same", "v", "2", values),
    ]).groups[0].payload,
    null,
  );
});
test("generated grammar and templates use the runtime contracts; all kinds, custom ownership and stale mapping decisions are checked", async () => {
  const schemas = c.importJSONSchemas(),
    ajv = new Ajv({ strict: false, validateFormats: false });
  const values = ajv.compile(schemas.values),
    custom = ajv.compile(schemas.customFields);
  const section = randomUUID(),
    base = {
      id: randomUUID(),
      sectionId: section,
      label: "Length",
      required: false,
      semanticId: null,
      help: "",
      illustrationId: "dimension",
    };
  const fields = [
    {
      ...base,
      kind: "length",
      basis: "garment",
      displayUnit: "in",
      displayPrecision: 2,
      min: "0",
      max: null,
    },
    {
      ...base,
      id: randomUUID(),
      label: "Choice",
      kind: "select",
      illustrationId: null,
      choices: [
        {
          id: randomUUID(),
          label: "Choice A",
          active: true,
          illustrationId: null,
        },
      ],
    },
    {
      ...base,
      id: randomUUID(),
      label: "Confirmed",
      illustrationId: null,
      kind: "boolean",
    },
    {
      ...base,
      id: randomUUID(),
      label: "Count",
      illustrationId: null,
      kind: "number",
      unit: "count",
      decimalPlaces: 0,
      min: "0",
      max: null,
    },
    {
      ...base,
      id: randomUUID(),
      label: "Text",
      illustrationId: null,
      kind: "text",
      maxLength: 100,
    },
  ];
  const manifest = createImportManifest(
    "all",
    { kind: "garment", garmentId: randomUUID(), versionId: randomUUID() },
    {
      formatVersion: 1,
      label: "All kinds",
      guidance: "",
      sections: [{ id: section, label: "Dimensions" }],
      fields,
    },
  );
  const examples = [
    { kind: "length", fieldKey: "f001", decimal: "40.00", unit: "in" },
    { kind: "select", fieldKey: "f002", choiceKey: "c001" },
    { kind: "boolean", fieldKey: "f003", value: false },
    { kind: "number", fieldKey: "f004", decimal: "0" },
    { kind: "text", fieldKey: "f005", text: "Relaxed fit" },
    {
      kind: "length",
      fieldKey: "custom.back_length",
      decimal: "60",
      unit: "cm",
    },
  ];
  const definitions = [
    {
      key: "custom.back_length",
      label: "Back length",
      kind: "length",
      required: false,
      help: "Confirm endpoints",
      basis: "garment",
      displayUnit: "cm",
      displayPrecision: 2,
      min: "0",
      max: null,
    },
  ];
  assert.equal(values(examples), true, JSON.stringify(values.errors));
  assert.equal(custom(definitions), true, JSON.stringify(custom.errors));
  c.importValues.parse(examples);
  c.importCustomFields.parse(definitions);
  for (const bad of [
    [{ ...examples[0], unexpected: 1 }],
    [{ ...examples[0], decimal: "-1" }],
    [{ ...examples[3], decimal: "-0" }],
    [{ ...examples[1], choiceKey: null }],
  ]) {
    assert.equal(values(bad), false);
    assert.equal(c.importValues.safeParse(bad).success, false);
  }
  for (const bad of [
    [{ ...definitions[0], sectionId: section }],
    [{ ...definitions[0], min: null, unknown: true }],
  ]) {
    assert.equal(custom(bad), false);
    assert.equal(c.importCustomFields.safeParse(bad).success, false);
  }
  const parsed = parse("measurements", [
    measurement("all", "v1", "1", examples, JSON.stringify(definitions), "all"),
    measurement(
      "all",
      "v2",
      "2",
      examples,
      JSON.stringify([{ ...definitions[0], label: "Updated display label" }]),
      "all",
    ),
  ]).groups[0].payload;
  const binding = {
    schemaKey: "all",
    sourceRef: manifest.schemaRef,
    targetRef: manifest.schemaRef,
    mappings: [],
  };
  const output = prepareImportHistory(parsed, [
    { binding, source: manifest, target: manifest },
  ]);
  assert.equal(
    output.versions[0].customFields[0].id,
    output.versions[1].customFields[0].id,
  );
  assert.equal(output.versions[0].values[2].value, false);
  assert.equal(output.versions[0].values[3].decimal, "0");
  const spoof = structuredClone(parsed);
  spoof.versions[0].values[1].choiceKey = "c002";
  assert.throws(() =>
    prepareImportHistory(spoof, [
      { binding, source: manifest, target: manifest },
    ]),
  );
  assert.equal(
    parseImportFile(encode(importTemplate("customers")), "customers").groups[0]
      .issues.length,
    0,
  );
  assert.equal(
    parseImportFile(
      encode(importTemplate("measurements", body)),
      "measurements",
    ).groups[0].issues.length,
    0,
  );
  const artifact = (name) =>
    readFile(
      new URL(`../../../apps/web/public/imports/${name}`, import.meta.url),
      "utf8",
    );
  assert.deepEqual(
    JSON.parse(await artifact("body-core-v1.manifest.json")),
    body,
  );
  assert.equal(
    await artifact("fitloom-customers-v1.csv"),
    importTemplate("customers"),
  );
  assert.equal(
    await artifact("fitloom-measurements-v1.csv"),
    importTemplate("measurements", body),
  );
  for (const [name, schema] of Object.entries(schemas)) {
    const retained = JSON.parse(
      await readFile(
        new URL(
          `../../../apps/web/public/imports/${name}.schema.json`,
          import.meta.url,
        ),
        "utf8",
      ),
    );
    assert.deepEqual(retained, schema);
  }
});
