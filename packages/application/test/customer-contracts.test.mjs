import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";
import * as c from "../dist/customer-contracts.js";
import * as p from "../dist/customer-phone.js";
import {
  changeRolePermission,
  customRoleInput,
  workspacePermission,
} from "../dist/workspace-contracts.js";

const preferences = () => ({ fit: null, fabric: null, design: null });
const profile = () => ({
  name: "அ",
  phone: null,
  email: null,
  address: null,
  taxCountryCode: null,
  gstin: null,
  segment: null,
  notes: null,
  preferences: preferences(),
  tags: [],
});
const attributes = () => ({
  relationship: null,
  birthday: null,
  gender: { kind: "unspecified" },
  height: null,
  weight: null,
  notes: null,
  preferences: preferences(),
});
const fails = (schema, value) =>
  assert.equal(schema.safeParse(value).success, false);

test("customer names, notes and tags use Unicode code points and the SQL folding policy", () => {
  assert.equal(c.customerName.parse(" \tE\u0301\n Tamil  "), "É Tamil");
  assert.equal(c.customerName.parse("😀".repeat(120)), "😀".repeat(120));
  fails(c.customerName, "😀".repeat(121));
  fails(c.customerName, "a\u0001b");
  fails(c.customerSearchQuery, { search: "abc\u0000def" });
  fails(c.customerSearchQuery, { search: "abc\u0001def" });
  fails(c.customerName, "\ud800");
  fails(c.customerText(2000, true), "a\udc00b");
  assert.equal(c.customerName.parse("அ"), "அ");
  assert.equal(
    c.customerText(2000, true).parse("fit\r\nnotes\tok"),
    "fit\nnotes\tok",
  );
  fails(c.customerText(2000, true), "private\u0085note");
  fails(c.customerTags, ["  Family  ", "family"]);
  fails(c.customerTags, ["E\u0301", "É"]);
  assert.deepEqual(c.customerTags.parse(["É", "é", "தமிழ்"]), [
    "É",
    "é",
    "தமிழ்",
  ]);
  assert.equal(c.normalizeCustomerSearch(" É \tABC  "), "É abc");
  fails(c.customerProfile, { ...profile(), notes: "" });
  fails(c.customerProfile, { ...profile(), unknown: true });
});

test("strict max-metadata phone parsing preserves input and rejects extraction/extensions", () => {
  const national = p.customerPhone.parse({
    countryCode: "IN",
    display: "  98765 43210  ",
  });
  const international = p.customerPhone.parse({
    countryCode: "GB",
    display: "+91 98765 43210",
  });
  assert.equal(national.e164, "+919876543210");
  assert.equal(international.e164, national.e164);
  assert.equal(national.display, "98765 43210");
  assert.equal(national.digits, "919876543210");
  assert.equal(
    p.customerPhone.parse({ countryCode: "GB", display: "020 7946 0018" }).e164,
    "+442079460018",
  );
  for (const display of [
    "Call 9876543210",
    "9876543210 ext. 2",
    "9876543210x2",
    "123",
    "+999123456789",
    "98765432101234567890",
  ])
    fails(p.customerPhone, { countryCode: "IN", display });
  fails(p.customerPhone, { countryCode: "XX", display: "9876543210" });
  fails(p.customerPhone, {
    countryCode: "IN",
    display: "9876543210",
    e164: "+123",
  });
  fails(p.canonicalCustomerPhone, { ...national, digits: "1234567" });
  assert.deepEqual(p.canonicalCustomerPhone.parse(national), national);
  const commandProfile = c.customerProfile.parse({
    ...profile(),
    phone: national,
  });
  assert.deepEqual(c.customerProfile.parse(commandProfile), commandProfile);
  fails(c.customerProfile, {
    ...profile(),
    phone: { ...national, e164: "+12133734253" },
  });
});

test("wearer attributes preserve original decimal precision and exact unit bounds", () => {
  assert.deepEqual(c.wearerHeight.parse({ value: "118.110236", unit: "in" }), {
    value: "118.110236",
    unit: "in",
  });
  fails(c.wearerHeight, { value: "118.110237", unit: "in" });
  assert.equal(
    c.wearerWeight.parse({ value: "1543.235835", unit: "lb" }).value,
    "1543.235835",
  );
  fails(c.wearerWeight, { value: "1543.235836", unit: "lb" });
  for (const value of [
    "NaN",
    "Infinity",
    "-1",
    "0",
    "0.000000",
    "1e2",
    "1.0000001",
    "999999999999999999999999",
  ]) {
    fails(c.wearerHeight, { value, unit: "cm" });
    fails(c.wearerWeight, { value, unit: "kg" });
  }
  fails(c.wearerProfile, {
    ...attributes(),
    name: "Wearer",
    birthday: "2025-02-29",
  });
  fails(c.wearerProfile, {
    ...attributes(),
    name: "Wearer",
    birthday: "0000-01-01",
  });
  assert.equal(c.wearerBirthdayAllowed("2026-11-03", "2026-11-02"), false);
  assert.equal(c.wearerBirthdayAllowed("2026-11-02", "2026-11-02"), true);
  fails(c.wearerGender, { kind: "unspecified", description: "inferred" });
});

test("create/update intentions and opaque operation results cannot smuggle scope or profile data", () => {
  const create = {
    profile: profile(),
    selfWearer: { kind: "self", attributes: attributes() },
    intent: { kind: "check-first" },
  };
  c.customerCreate.parse(create);
  fails(c.customerCreate, { ...create, tenantId: randomUUID() });
  fails(c.customerUpdate, {
    customerId: randomUUID(),
    expectedVersion: 1,
    profile: profile(),
    intent: { kind: "keep-separate", reviewId: randomUUID() },
  });
  fails(c.customerCreate, {
    ...create,
    intent: { kind: "keep-duplicate-phone", reviewId: randomUUID() },
  });
  fails(c.customerInvocation(c.customerCreate), {
    operationKey: "retry",
    correlationId: randomUUID(),
    payload: create,
  });
  fails(c.customerInvocation(c.customerCreate), {
    operationKey: "00000000-0000-1000-8000-000000000000",
    correlationId: randomUUID(),
    payload: create,
  });
  c.customerInvocation(c.customerCreate).parse({
    operationKey: randomUUID(),
    correlationId: randomUUID(),
    payload: create,
  });
  fails(c.customerDurableResult, {
    kind: "review-required",
    reviewId: randomUUID(),
    candidateCount: 1,
    expiresAt: new Date().toISOString(),
    candidates: [profile()],
  });
  const review = {
    outcome: "review-required",
    review: {
      reviewId: randomUUID(),
      candidateCount: 1,
      expiresAt: new Date().toISOString(),
      candidates: [],
    },
    correlationId: randomUUID(),
  };
  c.customerResponse.parse(review);
  c.customerResponse.parse({
    outcome: "error",
    category: "validation",
    code: "validation",
    message: "Invalid phone",
    issues: [{ path: ["profile", "phone", "e164"], message: "Invalid phone" }],
    correlationId: randomUUID(),
  });
  fails(c.customerResponse, { ...review, correlationId: "missing" });
  fails(c.customerDirectoryQuery, { search: "private" });
  fails(c.customerSearchQuery, { offset: true });
  fails(c.customerSearchQuery, { offset: 100001 });
  fails(c.customerSearchQuery, { tags: Array(6).fill("tag") });
});

test("GSTIN and maximal Unicode create payload stay within the profile transport allowance", () => {
  c.customerProfile.parse({
    ...profile(),
    taxCountryCode: "IN",
    gstin: "27aapfu0939f1zv",
  });
  fails(c.customerProfile, {
    ...profile(),
    taxCountryCode: "GB",
    gstin: "27AAPFU0939F1ZV",
  });
  fails(c.customerProfile, { ...profile(), gstin: "27AAPFU0939F1ZV" });
  const notes = "😀".repeat(2000),
    prefs = {
      fit: "😀".repeat(1000),
      fabric: "😀".repeat(1000),
      design: "😀".repeat(1000),
    };
  const maximal = {
    profile: {
      ...profile(),
      name: "😀".repeat(120),
      phone: p.customerPhone.parse({
        countryCode: "IN",
        display: `+91${" ".repeat(51)}9876543210`,
      }),
      email: `${"a".repeat(64)}@${"b".repeat(63)}.${"c".repeat(63)}.${"d".repeat(61)}`,
      taxCountryCode: "IN",
      gstin: "27AAPFU0939F1ZV",
      segment: "important",
      notes,
      preferences: prefs,
      tags: Array.from(
        { length: 20 },
        (_, i) => String(i).padStart(2, "0") + "😀".repeat(38),
      ),
      address: {
        line1: "😀".repeat(200),
        line2: "😀".repeat(200),
        city: "😀".repeat(100),
        region: "😀".repeat(100),
        postalCode: "😀".repeat(32),
        countryCode: "IN",
      },
    },
    selfWearer: {
      kind: "self",
      attributes: {
        ...attributes(),
        birthday: "2026-11-02",
        height: { value: "118.110236", unit: "in" },
        weight: { value: "1543.235835", unit: "lb" },
        notes,
        preferences: prefs,
        relationship: "😀".repeat(60),
        gender: { kind: "self-described", description: "😀".repeat(60) },
      },
    },
    intent: { kind: "check-first" },
  };
  const parsed = c.customerInvocation(c.customerCreate).parse({
    operationKey: randomUUID(),
    correlationId: randomUUID(),
    payload: maximal,
  });
  const bytes = Buffer.byteLength(JSON.stringify(parsed));
  assert.ok(bytes < c.CUSTOMER_PROFILE_REQUEST_BYTES);
  assert.ok(bytes > 40000);
  console.log("Maximal Unicode profile contract bytes:", bytes);
});

test("CRM role dependencies are shared by browser choices and server validation", () => {
  assert.equal(workspacePermission.options.length, 26);
  for (const permission of [
    "customers.manage",
    "customers.archive",
    "customers.photos.read",
    "customers.photos.manage",
  ])
    fails(customRoleInput, {
      name: "Invalid",
      permissions: ["workspace.read", permission],
    });
  const selected = changeRolePermission(
    ["workspace.read"],
    "customers.photos.manage",
    true,
  );
  customRoleInput.parse({ name: "Photos", permissions: selected });
  assert.ok(
    selected.includes("customers.read") &&
      selected.includes("customers.manage") &&
      selected.includes("customers.photos.read"),
  );
  const removed = changeRolePermission(selected, "customers.read", false);
  assert.deepEqual(removed, ["workspace.read"]);
  customRoleInput.parse({
    name: "Customer reader",
    permissions: ["workspace.read", "customers.read"],
  });
});

test("customer browser subpaths remain free of transitive server and database imports", async () => {
  const visited = new Set();
  async function walk(file) {
    if (visited.has(file.href)) return;
    visited.add(file.href);
    const source = await readFile(file, "utf8");
    assert.doesNotMatch(source, /process\.env|node:|@fitloom\/db|server-only/);
    for (const [, specifier] of source.matchAll(
      /(?:from\s*|import\s*\()\s*["']([^"']+)["']/g,
    )) {
      if (specifier.startsWith(".")) await walk(new URL(specifier, file));
      else
        assert.ok(
          ["zod", "libphonenumber-js/max", "decimal.js"].includes(specifier),
          specifier,
        );
    }
  }
  await walk(new URL("../dist/customer-contracts.js", import.meta.url));
  await walk(new URL("../dist/customer-phone.js", import.meta.url));
  await walk(new URL("../dist/customer-photo-contracts.js", import.meta.url));
  await walk(new URL("../dist/import-contracts.js", import.meta.url));
});

test("workspace route families and switches use current target permissions", async () => {
  const { resolveWorkspaceDestination, workspaceSwitchRequest } = await import(
    "../dist/workspace-contracts.js"
  );
  const { workspaceRoute, workspaceSearch } = await import(
    "../../../apps/web/src/components/workspace/workspace-route-policy.ts"
  );
  const target = { tenantId: randomUUID(), locationId: randomUUID() },
    base = `/workspaces/${target.tenantId}/${target.locationId}`;
  for (const suffix of [
    "/customers",
    "/customers/new",
    `/customers/${randomUUID()}`,
    `/customers/${randomUUID()}/edit`,
  ])
    assert.equal(
      workspaceRoute(base, base + suffix, new URLSearchParams()).destination
        .kind,
      "customers",
    );
  assert.equal(
    workspaceRoute(base, `${base}/customers-elsewhere`, new URLSearchParams())
      .destination.kind,
    "home",
  );
  for (const family of ["customers", "measurements"]) {
    const path = `${base}/${family}/import`;
    assert.deepEqual(
      workspaceRoute(base, path, new URLSearchParams()).destination,
      { kind: "imports", family },
    );
    assert.equal(
      resolveWorkspaceDestination(
        {
          ...target,
          permissions: ["workspace.read", "customers.read", `${family}.import`],
        },
        { kind: "imports", family },
      ),
      path,
    );
    assert.equal(
      resolveWorkspaceDestination(
        { ...target, permissions: ["workspace.read", "customers.read"] },
        { kind: "imports", family },
      ),
      `${base}/customers`,
    );
  }
  const crm = { ...target, permissions: ["workspace.read", "customers.read"] };
  assert.equal(
    resolveWorkspaceDestination(crm, { kind: "customers" }),
    `${base}/customers`,
  );
  assert.equal(
    resolveWorkspaceDestination(crm, { kind: "catalog", catalog: "addon" }),
    base,
  );
  assert.equal(
    resolveWorkspaceDestination(
      { ...target, permissions: ["workspace.read"] },
      { kind: "customers" },
    ),
    base,
  );
  assert.equal(
    workspaceSearch(base, base, new URLSearchParams(), crm.permissions).label,
    "Search customers",
  );
  assert.equal(
    workspaceSearch(
      base,
      `${base}/settings/garments`,
      new URLSearchParams("kind=service"),
      [...crm.permissions, "masters.read"],
    ).href,
    `${base}/settings/garments?kind=service&focus=search`,
  );
  assert.equal(
    workspaceSwitchRequest.safeParse({
      operationKey: randomUUID(),
      correlationId: randomUUID(),
      target,
      locale: "en",
      destination: { kind: "customers", href: "https://outside.invalid" },
    }).success,
    false,
  );
});
