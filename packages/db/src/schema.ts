import { type SQLWrapper, sql } from "drizzle-orm";
import {
  boolean,
  check,
  date,
  foreignKey,
  index,
  integer,
  jsonb,
  numeric,
  type PgTableExtraConfigValue,
  pgPolicy,
  pgSchema,
  primaryKey,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { user } from "./auth-schema.js";

export const app = pgSchema("app");
const id = () => uuid("id").defaultRandom().primaryKey();
const createdAt = () =>
  timestamp("created_at", { withTimezone: true }).defaultNow().notNull();
export const principals = app.table("principals", {
  id: id(),
  authUserId: text("auth_user_id")
    .notNull()
    .unique()
    .references(() => user.id),
  active: boolean("active").default(true).notNull(),
  createdAt: createdAt(),
});
export const tenants = app.table("tenants", {
  id: id(),
  name: text("name").notNull(),
  active: boolean("active").default(true).notNull(),
  createdAt: createdAt(),
});
export const locations = app.table(
  "locations",
  {
    id: id(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id),
    name: text("name").notNull(),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
  },
  (t) => [unique().on(t.tenantId, t.id), unique().on(t.tenantId, t.name)],
);
export const memberships = app.table(
  "memberships",
  {
    id: id(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id),
    principalId: uuid("principal_id")
      .notNull()
      .references(() => principals.id),
    active: boolean("active").default(true).notNull(),
  },
  (t) => [
    unique().on(t.tenantId, t.id),
    unique().on(t.tenantId, t.principalId),
    index().on(t.principalId),
  ],
);
export const roles = app.table(
  "roles",
  {
    id: id(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id),
    name: text("name").notNull(),
  },
  (t) => [unique().on(t.tenantId, t.id), unique().on(t.tenantId, t.name)],
);
export const permissionGrants = app.table(
  "permission_grants",
  {
    tenantId: uuid("tenant_id").notNull(),
    roleId: uuid("role_id").notNull(),
    permission: text("permission").notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.tenantId, t.roleId, t.permission] }),
    foreignKey({
      columns: [t.tenantId, t.roleId],
      foreignColumns: [roles.tenantId, roles.id],
    }),
  ],
);
// Roles are assigned per location. No null location or All Locations sentinel.
export const locationGrants = app.table(
  "location_grants",
  {
    tenantId: uuid("tenant_id").notNull(),
    membershipId: uuid("membership_id").notNull(),
    locationId: uuid("location_id").notNull(),
    roleId: uuid("role_id").notNull(),
  },
  (t) => [
    primaryKey({
      columns: [t.tenantId, t.membershipId, t.locationId, t.roleId],
    }),
    foreignKey({
      columns: [t.tenantId, t.membershipId],
      foreignColumns: [memberships.tenantId, memberships.id],
    }),
    foreignKey({
      columns: [t.tenantId, t.locationId],
      foreignColumns: [locations.tenantId, locations.id],
    }),
    foreignKey({
      columns: [t.tenantId, t.roleId],
      foreignColumns: [roles.tenantId, roles.id],
    }),
    index().on(t.tenantId, t.locationId),
    index().on(t.tenantId, t.roleId),
  ],
);
export const setupDrafts = app.table("setup_drafts", {
  version: integer("version").default(0).notNull(),
  principalId: uuid("principal_id")
    .primaryKey()
    .references(() => principals.id),
  provisioningId: uuid("provisioning_id").defaultRandom().notNull().unique(),
  draft: jsonb("draft").default(sql`'{}'::jsonb`).notNull(),
  createdAt: createdAt(),
});
export const tenantSetup = app.table(
  "tenant_setup",
  {
    tenantId: uuid("tenant_id")
      .primaryKey()
      .references(() => tenants.id),
    principalId: uuid("principal_id")
      .notNull()
      .references(() => principals.id),
    provisioningId: uuid("provisioning_id").notNull().unique(),
    createdAt: createdAt(),
  },
  (t) => [index().on(t.principalId)],
);
export const operatorGrants = app.table(
  "operator_grants",
  {
    principalId: uuid("principal_id")
      .notNull()
      .references(() => principals.id),
    permission: text("permission").notNull(),
  },
  (t) => [primaryKey({ columns: [t.principalId, t.permission] })],
);
export const securityAudit = app.table(
  "security_audit",
  {
    id: id(),
    principalId: uuid("principal_id")
      .notNull()
      .references(() => principals.id),
    action: text("action").notNull(),
    subjectId: uuid("subject_id").notNull(),
    createdAt: createdAt(),
  },
  (t) => [index().on(t.principalId, t.createdAt)],
);

// Master table ownership, forced RLS, immutable/deferred triggers, and restricted
// functions are installed by retained migrations 0023–0029. Numeric defaults stay strings.
const masterTenant = () =>
  uuid("tenant_id")
    .notNull()
    .references(() => tenants.id);
const masterVersion = () => integer("version").notNull();
const masterHeader = () => ({
  id: id(),
  tenantId: masterTenant(),
  active: boolean("active").default(true).notNull(),
  normalizedName: text("normalized_name").notNull(),
  sortPosition: integer("sort_position").notNull(),
  version: masterVersion(),
  currentVersionId: uuid("current_version_id"),
});
const masterOrigin = () => ({
  origin: text("origin").notNull(),
  templateKey: text("template_key"),
});
const masterProvenance = () => ({
  authorId: uuid("author_id")
    .notNull()
    .references(() => principals.id),
  createdLocationId: uuid("created_location_id").notNull(),
  // command_operations is a retained SQL foundation table.
  operationId: uuid("operation_id").notNull(),
  createdAt: createdAt(),
});
const masterPolicy = () =>
  pgPolicy("migration_access", {
    to: "fitloom_migrator",
    using: sql`true`,
    withCheck: sql`true`,
  });
export const masterCatalogState = app
  .table(
    "master_catalog_state",
    {
      tenantId: uuid("tenant_id")
        .primaryKey()
        .references(() => tenants.id),
      version: integer("version").default(0).notNull(),
      hideStandardGarments: boolean("hide_standard_garments")
        .default(false)
        .notNull(),
      hideStandardServices: boolean("hide_standard_services")
        .default(false)
        .notNull(),
      starterBundleVersion: text("starter_bundle_version"),
      updatedAt: timestamp("updated_at", { withTimezone: true })
        .defaultNow()
        .notNull(),
    },
    (t) => [
      check("master_catalog_state_version_check", sql`${t.version} >= 0`),
      check(
        "master_catalog_state_starter_bundle_version_check",
        sql`${t.starterBundleVersion} = 'tailoring-core-v1'`,
      ),
      masterPolicy(),
    ],
  )
  .enableRLS();
export const garments = app
  .table(
    "garments",
    {
      ...masterHeader(),
      ...masterOrigin(),
      applicability: text("applicability").notNull(),
      createdAt: createdAt(),
    },
    (t): PgTableExtraConfigValue[] => [
      unique().on(t.tenantId, t.id),
      unique().on(t.tenantId, t.normalizedName),
      unique().on(t.tenantId, t.templateKey),
      foreignKey({
        columns: [t.tenantId, t.id, t.currentVersionId],
        foreignColumns: [
          garmentVersions.tenantId,
          garmentVersions.garmentId,
          garmentVersions.id,
        ],
      }),
      check("garments_version_check", sql`${t.version}>0`),
      check("garments_sort_position_check", sql`${t.sortPosition}>=0`),
      check(
        "garments_normalized_name_check",
        sql`length(${t.normalizedName}) BETWEEN 1 AND 100`,
      ),
      check("garments_origin_check", sql`${t.origin} IN ('standard','custom')`),
      check(
        "garments_provenance_check",
        sql`(${t.origin}='custom' AND ${t.templateKey} IS NULL) OR (${t.origin}='standard' AND ${t.templateKey} IS NOT NULL AND ${t.templateKey} IN ('shirt','blouse','trouser'))`,
      ),
      check(
        "garments_applicability_check",
        sql`${t.applicability} IN ('masculine','feminine','unisex','unspecified')`,
      ),
      index("garments_applicability").on(
        t.tenantId,
        t.applicability,
        t.sortPosition,
        t.id,
      ),
      index("garments_name_prefix").on(
        t.tenantId,
        t.normalizedName.op("text_pattern_ops"),
      ),
      index("garments_register").on(
        t.tenantId,
        t.origin,
        t.active,
        t.sortPosition,
        t.id,
      ),
      masterPolicy(),
    ],
  )
  .enableRLS();
export const masterServices = app
  .table(
    "master_services",
    {
      ...masterHeader(),
      ...masterOrigin(),
    },
    (t): PgTableExtraConfigValue[] => [
      unique().on(t.tenantId, t.id),
      unique().on(t.tenantId, t.normalizedName),
      unique().on(t.tenantId, t.templateKey),
      foreignKey({
        columns: [t.tenantId, t.id, t.currentVersionId],
        foreignColumns: [
          masterServiceVersions.tenantId,
          masterServiceVersions.serviceId,
          masterServiceVersions.id,
        ],
      }),
      check("master_services_version_check", sql`${t.version}>0`),
      check("master_services_sort_position_check", sql`${t.sortPosition}>=0`),
      check(
        "master_services_normalized_name_check",
        sql`length(${t.normalizedName}) BETWEEN 1 AND 100`,
      ),
      check(
        "master_services_origin_check",
        sql`${t.origin} IN ('standard','custom')`,
      ),
      check(
        "master_services_provenance_check",
        sql`(${t.origin}='custom' AND ${t.templateKey} IS NULL) OR (${t.origin}='standard' AND ${t.templateKey} IS NOT NULL AND ${t.templateKey} IN ('new-stitching','alteration'))`,
      ),
      index("services_name_prefix").on(
        t.tenantId,
        t.normalizedName.op("text_pattern_ops"),
      ),
      index("services_register").on(
        t.tenantId,
        t.origin,
        t.active,
        t.sortPosition,
        t.id,
      ),
      masterPolicy(),
    ],
  )
  .enableRLS();
export const masterAddons = app
  .table(
    "master_addons",
    {
      ...masterHeader(),
    },
    (t): PgTableExtraConfigValue[] => [
      unique().on(t.tenantId, t.id),
      unique().on(t.tenantId, t.normalizedName),
      foreignKey({
        columns: [t.tenantId, t.id, t.currentVersionId],
        foreignColumns: [
          masterAddonVersions.tenantId,
          masterAddonVersions.addonId,
          masterAddonVersions.id,
        ],
      }),
      check("master_addons_version_check", sql`${t.version}>0`),
      check("master_addons_sort_position_check", sql`${t.sortPosition}>=0`),
      check(
        "master_addons_normalized_name_check",
        sql`length(${t.normalizedName}) BETWEEN 1 AND 100`,
      ),
      index("addons_name_prefix").on(
        t.tenantId,
        t.normalizedName.op("text_pattern_ops"),
      ),
      index("addons_register").on(t.tenantId, t.active, t.sortPosition, t.id),
      masterPolicy(),
    ],
  )
  .enableRLS();
export const garmentVersions = app
  .table(
    "garment_versions",
    {
      id: id(),
      tenantId: uuid("tenant_id").notNull(),
      garmentId: uuid("garment_id").notNull(),
      revision: integer("revision").notNull(),
      ...masterProvenance(),
      formatVersion: integer("format_version").notNull(),
      definition: jsonb("definition").notNull(),
      baseRate: numeric("base_rate", { precision: 24, scale: 6 }),
      currency: text("currency").notNull(),
    },
    (t): PgTableExtraConfigValue[] => [
      unique().on(t.tenantId, t.garmentId, t.id),
      unique().on(t.tenantId, t.garmentId, t.revision),
      foreignKey({
        columns: [t.tenantId, t.garmentId],
        foreignColumns: [garments.tenantId, garments.id],
      }),
      foreignKey({
        columns: [t.tenantId, t.createdLocationId],
        foreignColumns: [locations.tenantId, locations.id],
      }),
      check("garment_versions_revision_check", sql`${t.revision}>0`),
      check("garment_versions_format_version_check", sql`${t.formatVersion}=1`),
      check(
        "garment_versions_definition_check",
        sql`jsonb_typeof(${t.definition})='object' AND octet_length(${t.definition}::text)<=65536`,
      ),
      check(
        "garment_versions_rate_check",
        sql`${t.baseRate}>=0 AND ${t.baseRate}<=999999999999999999.999999`,
      ),
      check("garment_versions_currency_check", sql`${t.currency}='INR'`),
      index().on(t.authorId),
      index().on(t.tenantId, t.createdLocationId),
      index().on(t.operationId),
      masterPolicy(),
    ],
  )
  .enableRLS();
export const masterServiceVersions = app
  .table(
    "master_service_versions",
    {
      id: id(),
      tenantId: uuid("tenant_id").notNull(),
      serviceId: uuid("service_id").notNull(),
      revision: integer("revision").notNull(),
      ...masterProvenance(),
      label: text("label").notNull(),
    },
    (t): PgTableExtraConfigValue[] => [
      unique().on(t.tenantId, t.serviceId, t.id),
      unique().on(t.tenantId, t.serviceId, t.revision),
      foreignKey({
        columns: [t.tenantId, t.serviceId],
        foreignColumns: [masterServices.tenantId, masterServices.id],
      }),
      foreignKey({
        columns: [t.tenantId, t.createdLocationId],
        foreignColumns: [locations.tenantId, locations.id],
      }),
      check("master_service_versions_revision_check", sql`${t.revision}>0`),
      check(
        "master_service_versions_label_check",
        sql`length(btrim(${t.label})) BETWEEN 1 AND 100`,
      ),
      index().on(t.authorId),
      index().on(t.tenantId, t.createdLocationId),
      index().on(t.operationId),
      masterPolicy(),
    ],
  )
  .enableRLS();
export const masterAddonVersions = app
  .table(
    "master_addon_versions",
    {
      id: id(),
      tenantId: uuid("tenant_id").notNull(),
      addonId: uuid("addon_id").notNull(),
      revision: integer("revision").notNull(),
      ...masterProvenance(),
      label: text("label").notNull(),
      amount: numeric("amount", { precision: 24, scale: 6 }).notNull(),
      currency: text("currency").notNull(),
    },
    (t): PgTableExtraConfigValue[] => [
      unique().on(t.tenantId, t.addonId, t.id),
      unique().on(t.tenantId, t.addonId, t.revision),
      foreignKey({
        columns: [t.tenantId, t.addonId],
        foreignColumns: [masterAddons.tenantId, masterAddons.id],
      }),
      foreignKey({
        columns: [t.tenantId, t.createdLocationId],
        foreignColumns: [locations.tenantId, locations.id],
      }),
      check("master_addon_versions_revision_check", sql`${t.revision}>0`),
      check(
        "master_addon_versions_label_check",
        sql`length(btrim(${t.label})) BETWEEN 1 AND 100`,
      ),
      check(
        "master_addon_versions_rate_check",
        sql`${t.amount}>=0 AND ${t.amount}<=999999999999999999.999999`,
      ),
      check("master_addon_versions_currency_check", sql`${t.currency}='INR'`),
      index().on(t.authorId),
      index().on(t.tenantId, t.createdLocationId),
      index().on(t.operationId),
      masterPolicy(),
    ],
  )
  .enableRLS();
export const garmentSchemaIdentities = app
  .table(
    "garment_schema_identities",
    {
      tenantId: uuid("tenant_id").notNull(),
      garmentId: uuid("garment_id").notNull(),
      nodeId: uuid("node_id").notNull(),
      nodeKind: text("node_kind").notNull(),
      signature: jsonb("signature").notNull(),
      ownerNodeId: uuid("owner_node_id"),
      createdRevision: integer("created_revision").notNull(),
      retiredRevision: integer("retired_revision"),
    },
    (t): PgTableExtraConfigValue[] => [
      primaryKey({ columns: [t.tenantId, t.garmentId, t.nodeId] }),
      foreignKey({
        columns: [t.tenantId, t.garmentId],
        foreignColumns: [garments.tenantId, garments.id],
      }),
      foreignKey({
        columns: [t.tenantId, t.garmentId, t.ownerNodeId],
        foreignColumns: [
          garmentSchemaIdentities.tenantId,
          garmentSchemaIdentities.garmentId,
          garmentSchemaIdentities.nodeId,
        ],
      }),
      check(
        "garment_schema_identities_node_kind_check",
        sql`${t.nodeKind} IN ('field','section','group','option')`,
      ),
      check(
        "garment_schema_identities_created_revision_check",
        sql`${t.createdRevision}>0`,
      ),
      check(
        "garment_schema_identities_retired_revision_check",
        sql`${t.retiredRevision}>${t.createdRevision}`,
      ),
      index("identities_owner").on(t.tenantId, t.garmentId, t.ownerNodeId),
      masterPolicy(),
    ],
  )
  .enableRLS();
export const garmentVersionServices = app
  .table(
    "garment_version_services",
    {
      tenantId: uuid("tenant_id").notNull(),
      garmentId: uuid("garment_id").notNull(),
      garmentVersionId: uuid("garment_version_id").notNull(),
      serviceId: uuid("service_id").notNull(),
      position: integer("position").notNull(),
      savedLabel: text("saved_label").notNull(),
      rateOverride: numeric("rate_override", { precision: 24, scale: 6 }),
    },
    (t): PgTableExtraConfigValue[] => [
      primaryKey({ columns: [t.tenantId, t.garmentVersionId, t.serviceId] }),
      unique().on(t.tenantId, t.garmentVersionId, t.position),
      foreignKey({
        columns: [t.tenantId, t.serviceId],
        foreignColumns: [masterServices.tenantId, masterServices.id],
      }),
      foreignKey({
        columns: [t.tenantId, t.garmentId, t.garmentVersionId],
        foreignColumns: [
          garmentVersions.tenantId,
          garmentVersions.garmentId,
          garmentVersions.id,
        ],
      }),
      check("garment_version_services_position_check", sql`${t.position}>=0`),
      check(
        "garment_version_services_saved_label_check",
        sql`length(btrim(${t.savedLabel})) BETWEEN 1 AND 100`,
      ),
      check(
        "garment_version_services_rate_override_check",
        sql`${t.rateOverride}>=0 AND ${t.rateOverride}<=999999999999999999.999999`,
      ),
      index("garment_services_version").on(
        t.tenantId,
        t.garmentId,
        t.garmentVersionId,
      ),
      index("garment_services_reference").on(t.tenantId, t.serviceId),
      masterPolicy(),
    ],
  )
  .enableRLS();
export const garmentVersionAddons = app
  .table(
    "garment_version_addons",
    {
      tenantId: uuid("tenant_id").notNull(),
      garmentId: uuid("garment_id").notNull(),
      garmentVersionId: uuid("garment_version_id").notNull(),
      addonId: uuid("addon_id").notNull(),
      position: integer("position").notNull(),
      savedLabel: text("saved_label").notNull(),
    },
    (t): PgTableExtraConfigValue[] => [
      primaryKey({ columns: [t.tenantId, t.garmentVersionId, t.addonId] }),
      unique().on(t.tenantId, t.garmentVersionId, t.position),
      foreignKey({
        columns: [t.tenantId, t.addonId],
        foreignColumns: [masterAddons.tenantId, masterAddons.id],
      }),
      foreignKey({
        columns: [t.tenantId, t.garmentId, t.garmentVersionId],
        foreignColumns: [
          garmentVersions.tenantId,
          garmentVersions.garmentId,
          garmentVersions.id,
        ],
      }),
      check("garment_version_addons_position_check", sql`${t.position}>=0`),
      check(
        "garment_version_addons_saved_label_check",
        sql`length(btrim(${t.savedLabel})) BETWEEN 1 AND 100`,
      ),
      index("garment_addons_version").on(
        t.tenantId,
        t.garmentId,
        t.garmentVersionId,
      ),
      index("garment_addons_reference").on(t.tenantId, t.addonId),
      masterPolicy(),
    ],
  )
  .enableRLS();

// CRM storage has no runtime table grants. Its command/read protocol owns access.
const customerVersionFields = () => ({
  version: integer("version").default(1).notNull(),
  createdAt: createdAt(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  createdBy: uuid("created_by")
    .notNull()
    .references(() => principals.id),
  updatedBy: uuid("updated_by")
    .notNull()
    .references(() => principals.id),
  archivedAt: timestamp("archived_at", { withTimezone: true }),
  archivedBy: uuid("archived_by").references(() => principals.id),
  creationOperationId: uuid("creation_operation_id").notNull(),
});
const customerPreferenceFields = () => ({
  notes: text("notes"),
  fitNotes: text("fit_notes"),
  fabricNotes: text("fabric_notes"),
  designNotes: text("design_notes"),
});
const customerTextCheck = (
  name: string,
  column: SQLWrapper,
  max: number,
  multiline = false,
) =>
  check(
    name,
    sql`app.customer_text_valid(${column},${sql.raw(String(max))},${sql.raw(multiline ? "true" : "false")})`,
  );

export const customers = app
  .table(
    "customers",
    {
      id: id(),
      tenantId: uuid("tenant_id")
        .notNull()
        .references(() => tenants.id),
      locationId: uuid("location_id").notNull(),
      name: text("name").notNull(),
      normalizedName: text("normalized_name")
        .generatedAlwaysAs(sql`app.normalize_customer_name(name)`)
        .notNull(),
      phoneDisplay: text("phone_display"),
      phoneCountryCode: text("phone_country_code"),
      phoneE164: text("phone_e164"),
      phoneDigits: text("phone_digits").generatedAlwaysAs(
        sql`substring(phone_e164 from 2)`,
      ),
      email: text("email"),
      addressLine1: text("address_line1"),
      addressLine2: text("address_line2"),
      city: text("city"),
      region: text("region"),
      postalCode: text("postal_code"),
      addressCountryCode: text("address_country_code"),
      taxCountryCode: text("tax_country_code"),
      gstin: text("gstin"),
      segment: text("segment"),
      ...customerPreferenceFields(),
      ...customerVersionFields(),
    },
    (t) => [
      unique("customers_tenant_identity").on(t.tenantId, t.id),
      unique("customers_location_identity").on(t.tenantId, t.locationId, t.id),
      foreignKey({
        name: "customers_location_fk",
        columns: [t.tenantId, t.locationId],
        foreignColumns: [locations.tenantId, locations.id],
      }),
      check(
        "customers_name_check",
        sql`app.customer_text_valid(${t.name},120,false) AND ${t.name}=app.customer_display_name(${t.name})`,
      ),
      check(
        "customers_phone_check",
        sql`(${t.phoneE164} IS NULL AND ${t.phoneDisplay} IS NULL AND ${t.phoneCountryCode} IS NULL) OR (${t.phoneE164} IS NOT NULL AND ${t.phoneDisplay} IS NOT NULL AND ${t.phoneCountryCode} IS NOT NULL AND ${t.phoneE164} ~ '^\\+[1-9][0-9]{6,14}$' AND ${t.phoneCountryCode} ~ '^[A-Z]{2}$' AND app.customer_text_valid(${t.phoneDisplay},64,false))`,
      ),
      check(
        "customers_country_check",
        sql`(${t.addressCountryCode} IS NULL OR ${t.addressCountryCode} ~ '^[A-Z]{2}$') AND (${t.taxCountryCode} IS NULL OR ${t.taxCountryCode} ~ '^[A-Z]{2}$')`,
      ),
      check(
        "customers_address_country_check",
        sql`${t.addressCountryCode} IS NOT NULL OR (${t.addressLine1} IS NULL AND ${t.addressLine2} IS NULL AND ${t.city} IS NULL AND ${t.region} IS NULL AND ${t.postalCode} IS NULL)`,
      ),
      check(
        "customers_gstin_check",
        sql`${t.gstin} IS NULL OR (${t.taxCountryCode} IS NOT NULL AND ${t.taxCountryCode}='IN' AND ${t.gstin} ~ '^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$')`,
      ),
      check(
        "customers_segment_check",
        sql`${t.segment} IS NULL OR ${t.segment} IN ('new','regular','important','bulk')`,
      ),
      check("customers_version_check", sql`${t.version}>0`),
      check(
        "customers_archive_check",
        sql`(${t.archivedAt} IS NULL)=(${t.archivedBy} IS NULL)`,
      ),
      customerTextCheck("customers_email_check", t.email, 254),
      customerTextCheck("customers_address_line1_check", t.addressLine1, 200),
      customerTextCheck("customers_address_line2_check", t.addressLine2, 200),
      customerTextCheck("customers_city_check", t.city, 100),
      customerTextCheck("customers_region_check", t.region, 100),
      customerTextCheck("customers_postal_check", t.postalCode, 32),
      customerTextCheck("customers_notes_check", t.notes, 2000, true),
      customerTextCheck("customers_fit_check", t.fitNotes, 1000, true),
      customerTextCheck("customers_fabric_check", t.fabricNotes, 1000, true),
      customerTextCheck("customers_design_check", t.designNotes, 1000, true),
      index("customers_name_order").on(
        t.tenantId,
        t.locationId,
        t.normalizedName,
        t.id,
      ),
      index("customers_active_name_order")
        .on(t.tenantId, t.locationId, t.normalizedName, t.id)
        .where(sql`${t.archivedAt} IS NULL`),
      index("customers_phone_lookup")
        .on(t.tenantId, t.locationId, t.phoneE164)
        .where(sql`${t.phoneE164} IS NOT NULL`),
      index("customers_name_trigrams").using(
        "gin",
        t.normalizedName.op("gin_trgm_ops"),
      ),
      index("customers_phone_trigrams").using(
        "gin",
        t.phoneDigits.op("gin_trgm_ops"),
      ),
      index("customers_created_by").on(t.createdBy),
      index("customers_updated_by").on(t.updatedBy),
      index("customers_archived_by").on(t.archivedBy),
      index("customers_creation_operation").on(t.creationOperationId),
      masterPolicy(),
    ],
  )
  .enableRLS();

export const customerWearers = app
  .table(
    "customer_wearers",
    {
      id: id(),
      tenantId: uuid("tenant_id").notNull(),
      locationId: uuid("location_id").notNull(),
      customerId: uuid("customer_id").notNull(),
      name: text("name").notNull(),
      normalizedName: text("normalized_name")
        .generatedAlwaysAs(sql`app.normalize_customer_name(name)`)
        .notNull(),
      relationship: text("relationship"),
      birthday: date("birthday"),
      genderKind: text("gender_kind").default("unspecified").notNull(),
      genderDescription: text("gender_description"),
      heightValue: text("height_value"),
      heightUnit: text("height_unit"),
      weightValue: text("weight_value"),
      weightUnit: text("weight_unit"),
      ...customerPreferenceFields(),
      ...customerVersionFields(),
    },
    (t) => [
      unique("customer_wearers_tenant_identity").on(t.tenantId, t.id),
      unique("customer_wearers_parent_identity").on(
        t.tenantId,
        t.locationId,
        t.customerId,
        t.id,
      ),
      foreignKey({
        name: "customer_wearers_parent_fk",
        columns: [t.tenantId, t.locationId, t.customerId],
        foreignColumns: [
          customers.tenantId,
          customers.locationId,
          customers.id,
        ],
      }),
      check(
        "customer_wearers_name_check",
        sql`app.customer_text_valid(${t.name},120,false) AND ${t.name}=app.customer_display_name(${t.name})`,
      ),
      check(
        "customer_wearers_gender_check",
        sql`(${t.genderKind}='unspecified' AND ${t.genderDescription} IS NULL) OR (${t.genderKind}='self-described' AND ${t.genderDescription} IS NOT NULL AND app.customer_text_valid(${t.genderDescription},60,false))`,
      ),
      check(
        "customer_wearers_height_check",
        sql`app.customer_attribute_valid(${t.heightValue},${t.heightUnit},'height')`,
      ),
      check(
        "customer_wearers_weight_check",
        sql`app.customer_attribute_valid(${t.weightValue},${t.weightUnit},'weight')`,
      ),
      check(
        "customer_wearers_birthday_check",
        sql`${t.birthday} IS NULL OR (${t.birthday} BETWEEN '0001-01-01'::date AND '9999-12-31'::date AND isfinite(${t.birthday}))`,
      ),
      check("customer_wearers_version_check", sql`${t.version}>0`),
      check(
        "customer_wearers_archive_check",
        sql`(${t.archivedAt} IS NULL)=(${t.archivedBy} IS NULL)`,
      ),
      customerTextCheck(
        "customer_wearers_relationship_check",
        t.relationship,
        60,
      ),
      customerTextCheck("customer_wearers_notes_check", t.notes, 2000, true),
      customerTextCheck("customer_wearers_fit_check", t.fitNotes, 1000, true),
      customerTextCheck(
        "customer_wearers_fabric_check",
        t.fabricNotes,
        1000,
        true,
      ),
      customerTextCheck(
        "customer_wearers_design_check",
        t.designNotes,
        1000,
        true,
      ),
      index("customer_wearers_parent_order").on(
        t.tenantId,
        t.locationId,
        t.customerId,
        t.normalizedName,
        t.id,
      ),
      index("customer_wearers_created_by").on(t.createdBy),
      index("customer_wearers_updated_by").on(t.updatedBy),
      index("customer_wearers_archived_by").on(t.archivedBy),
      index("customer_wearers_creation_operation").on(t.creationOperationId),
      masterPolicy(),
    ],
  )
  .enableRLS();

export const customerTags = app
  .table(
    "customer_tags",
    {
      tenantId: uuid("tenant_id").notNull(),
      locationId: uuid("location_id").notNull(),
      customerId: uuid("customer_id").notNull(),
      label: text("label").notNull(),
      normalizedTag: text("normalized_tag")
        .generatedAlwaysAs(sql`app.normalize_customer_name(label)`)
        .notNull(),
    },
    (t) => [
      primaryKey({
        columns: [t.tenantId, t.locationId, t.customerId, t.normalizedTag],
      }),
      foreignKey({
        name: "customer_tags_parent_fk",
        columns: [t.tenantId, t.locationId, t.customerId],
        foreignColumns: [
          customers.tenantId,
          customers.locationId,
          customers.id,
        ],
      }),
      customerTextCheck("customer_tags_label_check", t.label, 40),
      index("customer_tags_filter").on(
        t.tenantId,
        t.locationId,
        t.normalizedTag,
        t.customerId,
      ),
      masterPolicy(),
    ],
  )
  .enableRLS();

export const customerActivity = app
  .table(
    "customer_activity",
    {
      id: id(),
      tenantId: uuid("tenant_id").notNull(),
      locationId: uuid("location_id").notNull(),
      customerId: uuid("customer_id").notNull(),
      wearerId: uuid("wearer_id"),
      actorId: uuid("actor_id")
        .notNull()
        .references(() => principals.id),
      kind: text("kind").notNull(),
      changedFields: text("changed_fields").array().notNull(),
      previousVersion: integer("previous_version").notNull(),
      nextVersion: integer("next_version").notNull(),
      operationId: uuid("operation_id").notNull(),
      createdAt: createdAt(),
    },
    (t) => [
      foreignKey({
        columns: [t.tenantId, t.locationId, t.customerId],
        foreignColumns: [
          customers.tenantId,
          customers.locationId,
          customers.id,
        ],
      }),
      foreignKey({
        columns: [t.tenantId, t.locationId, t.customerId, t.wearerId],
        foreignColumns: [
          customerWearers.tenantId,
          customerWearers.locationId,
          customerWearers.customerId,
          customerWearers.id,
        ],
      }),
      check(
        "customer_activity_kind",
        sql`${t.kind} IN ('customer.create','customer.update','customer.archive','customer.restore','wearer.create','wearer.update','wearer.archive','wearer.restore','customer-photo.bind','customer-photo.remove','customer.import','wearer.import')`,
      ),
      check(
        "customer_activity_versions",
        sql`${t.previousVersion}>=0 AND ${t.nextVersion}>${t.previousVersion}`,
      ),
      check(
        "customer_activity_fields",
        sql`cardinality(${t.changedFields})<=30`,
      ),
      index("customer_activity_page").on(
        t.tenantId,
        t.locationId,
        t.customerId,
        t.createdAt,
        t.id,
      ),
      index("customer_activity_wearer").on(
        t.tenantId,
        t.locationId,
        t.customerId,
        t.wearerId,
      ),
      index("customer_activity_actor").on(t.actorId),
      index("customer_activity_operation").on(t.operationId),
      masterPolicy(),
    ],
  )
  .enableRLS();

export const customerDuplicateReviews = app
  .table(
    "customer_duplicate_reviews",
    {
      id: id(),
      tenantId: uuid("tenant_id").notNull(),
      locationId: uuid("location_id").notNull(),
      actorId: uuid("actor_id")
        .notNull()
        .references(() => principals.id),
      commandKind: text("command_kind").notNull(),
      phone: text("phone").notNull(),
      draftHash: text("draft_hash").notNull(),
      candidateFingerprint: text("candidate_fingerprint").notNull(),
      candidateIds: uuid("candidate_ids").array().notNull(),
      excludedCustomerId: uuid("excluded_customer_id"),
      expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
      consumedOperationId: uuid("consumed_operation_id"),
    },
    (t) => [
      foreignKey({
        columns: [t.tenantId, t.locationId],
        foreignColumns: [locations.tenantId, locations.id],
      }),
      foreignKey({
        columns: [t.tenantId, t.locationId, t.excludedCustomerId],
        foreignColumns: [
          customers.tenantId,
          customers.locationId,
          customers.id,
        ],
      }),
      check(
        "customer_review_kind",
        sql`${t.commandKind} IN ('customer.create','customer.update')`,
      ),
      check("customer_review_phone", sql`${t.phone} ~ '^[+][1-9][0-9]{6,14}$'`),
      check("customer_review_hash", sql`${t.draftHash} ~ '^v1:[a-f0-9]{64}$'`),
      index("customer_review_expiry").on(t.expiresAt),
      index("customer_review_actor").on(t.actorId),
      index("customer_review_scope").on(
        t.tenantId,
        t.locationId,
        t.excludedCustomerId,
      ),
      index("customer_review_operation").on(t.consumedOperationId),
      masterPolicy(),
    ],
  )
  .enableRLS();

export const customerRequestBudgets = app
  .table(
    "customer_request_budgets",
    {
      tenantId: uuid("tenant_id").notNull(),
      locationId: uuid("location_id").notNull(),
      principalId: uuid("principal_id")
        .notNull()
        .references(() => principals.id),
      minute: timestamp("minute", { withTimezone: true }).notNull(),
      checks: integer("checks").notNull().default(0),
      leases: jsonb("leases").notNull().default({}),
    },
    (t) => [
      primaryKey({
        columns: [t.tenantId, t.locationId, t.principalId, t.minute],
      }),
      foreignKey({
        columns: [t.tenantId, t.locationId],
        foreignColumns: [locations.tenantId, locations.id],
      }),
      check("customer_budget_checks", sql`${t.checks} BETWEEN 0 AND 30`),
      check("customer_budget_leases", sql`jsonb_typeof(${t.leases})='object'`),
      index("customer_budget_expiry").on(t.minute),
      index("customer_budget_actor").on(t.principalId),
      masterPolicy(),
    ],
  )
  .enableRLS();

export const customerPhotos = app
  .table(
    "customer_photos",
    {
      id: id(),
      tenantId: uuid("tenant_id").notNull(),
      locationId: uuid("location_id").notNull(),
      customerId: uuid("customer_id").notNull(),
      wearerId: uuid("wearer_id"),
      role: text("role").notNull(),
      fileId: uuid("file_id").notNull(),
      version: integer("version").notNull(),
      note: text("note").notNull(),
      actorId: uuid("actor_id")
        .notNull()
        .references(() => principals.id),
      createdAt: createdAt(),
      retiredAt: timestamp("retired_at", { withTimezone: true }),
    },
    (t) => [
      foreignKey({
        columns: [t.tenantId, t.locationId, t.customerId],
        foreignColumns: [
          customers.tenantId,
          customers.locationId,
          customers.id,
        ],
      }),
      foreignKey({
        columns: [t.tenantId, t.locationId, t.customerId, t.wearerId],
        foreignColumns: [
          customerWearers.tenantId,
          customerWearers.locationId,
          customerWearers.customerId,
          customerWearers.id,
        ],
      }),
      check(
        "customer_photo_shape",
        sql`(${t.role}='avatar' AND ${t.wearerId} IS NULL) OR (${t.role} IN ('face','body') AND ${t.wearerId} IS NOT NULL)`,
      ),
      check("customer_photo_version", sql`${t.version}>0`),
      check(
        "customer_photo_note",
        sql`char_length(${t.note}) BETWEEN 1 AND 1000`,
      ),
      uniqueIndex("customer_photo_file").on(t.fileId),
      uniqueIndex("customer_photo_avatar_current")
        .on(t.tenantId, t.locationId, t.customerId)
        .where(sql`${t.retiredAt} IS NULL AND ${t.wearerId} IS NULL`),
      uniqueIndex("customer_photo_wearer_current")
        .on(t.tenantId, t.locationId, t.customerId, t.wearerId, t.role)
        .where(sql`${t.retiredAt} IS NULL AND ${t.wearerId} IS NOT NULL`),
      index("customer_photo_history").on(
        t.tenantId,
        t.locationId,
        t.customerId,
        t.wearerId,
        t.role,
        t.version,
      ),
      index("customer_photo_actor").on(t.actorId),
      masterPolicy(),
    ],
  )
  .enableRLS();

// Measurement content is append-only. SQL owns mutation, forced RLS and deferred bootstrap.
export const measurementBodySchemas = app
  .table(
    "measurement_body_schemas",
    {
      version: text("version").primaryKey(),
      canonicalHash: text("canonical_hash").notNull(),
      definition: jsonb("definition").notNull(),
    },
    (t): PgTableExtraConfigValue[] => [
      check(
        "measurement_body_hash",
        sql`${t.canonicalHash} ~ '^[a-f0-9]{64}$'`,
      ),
      masterPolicy(),
    ],
  )
  .enableRLS();
export const measurementBodySchemaState = app
  .table(
    "measurement_body_schema_state",
    {
      singleton: boolean("singleton").primaryKey().default(true),
      currentVersion: text("current_version")
        .notNull()
        .references(() => measurementBodySchemas.version),
      revision: integer("revision").notNull(),
    },
    (t): PgTableExtraConfigValue[] => [
      check(
        "measurement_body_singleton",
        sql`${t.singleton} AND ${t.revision}>0`,
      ),
      masterPolicy(),
    ],
  )
  .enableRLS();
const measurementOwner = () => ({
  tenantId: uuid("tenant_id").notNull(),
  locationId: uuid("location_id").notNull(),
  customerId: uuid("customer_id").notNull(),
  wearerId: uuid("wearer_id").notNull(),
});
export const measurementProfiles = app
  .table(
    "measurement_profiles",
    {
      id: id(),
      ...measurementOwner(),
      kind: text("kind").notNull(),
      garmentId: uuid("garment_id"),
      currentVersionId: uuid("current_version_id"),
      revision: integer("revision").notNull(),
      createdAt: createdAt(),
      updatedAt: timestamp("updated_at", { withTimezone: true })
        .defaultNow()
        .notNull(),
      createdBy: uuid("created_by")
        .notNull()
        .references(() => principals.id),
      updatedBy: uuid("updated_by")
        .notNull()
        .references(() => principals.id),
      archivedAt: timestamp("archived_at", { withTimezone: true }),
      archivedBy: uuid("archived_by").references(() => principals.id),
      creationOperationId: uuid("creation_operation_id").notNull(),
    },
    (t): PgTableExtraConfigValue[] => [
      unique("measurement_profile_owner").on(
        t.tenantId,
        t.locationId,
        t.customerId,
        t.wearerId,
        t.id,
      ),
      foreignKey({
        name: "measurement_profile_wearer_fk",
        columns: [t.tenantId, t.locationId, t.customerId, t.wearerId],
        foreignColumns: [
          customerWearers.tenantId,
          customerWearers.locationId,
          customerWearers.customerId,
          customerWearers.id,
        ],
      }),
      foreignKey({
        name: "measurement_profile_garment_fk",
        columns: [t.tenantId, t.garmentId],
        foreignColumns: [garments.tenantId, garments.id],
      }),
      foreignKey({
        name: "measurement_profile_current_fk",
        columns: [
          t.tenantId,
          t.locationId,
          t.customerId,
          t.wearerId,
          t.id,
          t.currentVersionId,
        ],
        foreignColumns: [
          measurementVersions.tenantId,
          measurementVersions.locationId,
          measurementVersions.customerId,
          measurementVersions.wearerId,
          measurementVersions.profileId,
          measurementVersions.id,
        ],
      }),
      check(
        "measurement_profile_kind",
        sql`(${t.kind}='body' AND ${t.garmentId} IS NULL) OR (${t.kind}='garment' AND ${t.garmentId} IS NOT NULL)`,
      ),
      check("measurement_profile_revision", sql`${t.revision}>0`),
      check(
        "measurement_profile_archive",
        sql`(${t.archivedAt} IS NULL)=(${t.archivedBy} IS NULL)`,
      ),
      index("measurement_book").on(
        t.tenantId,
        t.locationId,
        t.customerId,
        t.wearerId,
        t.kind,
        t.garmentId,
        t.archivedAt,
        t.id,
      ),
      index("measurement_garment").on(t.tenantId, t.garmentId),
      index("measurement_profile_created_by").on(t.createdBy),
      index("measurement_profile_updated_by").on(t.updatedBy),
      index("measurement_profile_archived_by").on(t.archivedBy),
      index("measurement_profile_operation").on(t.creationOperationId),
      masterPolicy(),
    ],
  )
  .enableRLS();
export const measurementVersions = app
  .table(
    "measurement_versions",
    {
      id: id(),
      ...measurementOwner(),
      profileId: uuid("profile_id").notNull(),
      sequence: integer("sequence").notNull(),
      garmentId: uuid("garment_id"),
      garmentVersionId: uuid("garment_version_id"),
      bodySchemaVersion: text("body_schema_version").references(
        () => measurementBodySchemas.version,
      ),
      measuredOn: date("measured_on").notNull(),
      recordedAt: timestamp("recorded_at", { withTimezone: true })
        .defaultNow()
        .notNull(),
      recordedBy: uuid("recorded_by")
        .notNull()
        .references(() => principals.id),
      operationId: uuid("operation_id").notNull(),
      priorVersionId: uuid("prior_version_id"),
      document: jsonb("document").notNull(),
    },
    (t): PgTableExtraConfigValue[] => [
      unique("measurement_version_owner").on(
        t.tenantId,
        t.locationId,
        t.customerId,
        t.wearerId,
        t.profileId,
        t.id,
      ),
      unique("measurement_version_sequence").on(t.profileId, t.sequence),
      foreignKey({
        name: "measurement_version_profile_fk",
        columns: [
          t.tenantId,
          t.locationId,
          t.customerId,
          t.wearerId,
          t.profileId,
        ],
        foreignColumns: [
          measurementProfiles.tenantId,
          measurementProfiles.locationId,
          measurementProfiles.customerId,
          measurementProfiles.wearerId,
          measurementProfiles.id,
        ],
      }),
      foreignKey({
        name: "measurement_version_garment_fk",
        columns: [t.tenantId, t.garmentId, t.garmentVersionId],
        foreignColumns: [
          garmentVersions.tenantId,
          garmentVersions.garmentId,
          garmentVersions.id,
        ],
      }),
      foreignKey({
        name: "measurement_version_prior_fk",
        columns: [
          t.tenantId,
          t.locationId,
          t.customerId,
          t.wearerId,
          t.profileId,
          t.priorVersionId,
        ],
        foreignColumns: [
          t.tenantId,
          t.locationId,
          t.customerId,
          t.wearerId,
          t.profileId,
          t.id,
        ],
      }),
      check(
        "measurement_version_schema",
        sql`(${t.bodySchemaVersion} IS NOT NULL AND ${t.garmentId} IS NULL AND ${t.garmentVersionId} IS NULL) OR (${t.bodySchemaVersion} IS NULL AND ${t.garmentId} IS NOT NULL AND ${t.garmentVersionId} IS NOT NULL)`,
      ),
      check("measurement_version_sequence_positive", sql`${t.sequence}>0`),
      check(
        "measurement_version_date",
        sql`${t.measuredOn} BETWEEN '0001-01-01'::date AND '9999-12-31'::date AND isfinite(${t.measuredOn})`,
      ),
      check(
        "measurement_version_document",
        sql`jsonb_typeof(${t.document})='object' AND octet_length(${t.document}::text)<=131072`,
      ),
      index("measurement_history").on(t.profileId, t.sequence.desc(), t.id),
      index("measurement_trend").on(
        t.profileId,
        t.measuredOn,
        t.recordedAt,
        t.id,
      ),
      index("measurement_version_garment").on(
        t.tenantId,
        t.garmentId,
        t.garmentVersionId,
      ),
      index("measurement_version_body").on(t.bodySchemaVersion),
      index("measurement_version_actor").on(t.recordedBy),
      index("measurement_version_operation").on(t.operationId),
      masterPolicy(),
    ],
  )
  .enableRLS();
export const measurementCustomIdentities = app
  .table(
    "measurement_custom_identities",
    {
      ...measurementOwner(),
      profileId: uuid("profile_id").notNull(),
      nodeId: uuid("node_id").notNull(),
      signature: jsonb("signature").notNull(),
      introducedSequence: integer("introduced_sequence").notNull(),
      retiredSequence: integer("retired_sequence"),
    },
    (t): PgTableExtraConfigValue[] => [
      primaryKey({ columns: [t.profileId, t.nodeId] }),
      foreignKey({
        name: "measurement_custom_profile_fk",
        columns: [
          t.tenantId,
          t.locationId,
          t.customerId,
          t.wearerId,
          t.profileId,
        ],
        foreignColumns: [
          measurementProfiles.tenantId,
          measurementProfiles.locationId,
          measurementProfiles.customerId,
          measurementProfiles.wearerId,
          measurementProfiles.id,
        ],
      }),
      check(
        "measurement_custom_sequence",
        sql`${t.introducedSequence}>0 AND (${t.retiredSequence} IS NULL OR ${t.retiredSequence}>${t.introducedSequence})`,
      ),
      index("measurement_custom_owner").on(
        t.tenantId,
        t.locationId,
        t.customerId,
        t.wearerId,
        t.profileId,
      ),
      masterPolicy(),
    ],
  )
  .enableRLS();

export const measurementPhotoReservations = app
  .table(
    "measurement_photo_reservations",
    {
      id: id(),
      ...measurementOwner(),
      actorId: uuid("actor_id")
        .notNull()
        .references(() => principals.id),
      profileId: uuid("profile_id").notNull(),
      versionId: uuid("version_id").notNull(),
      expectedRevision: integer("expected_revision").notNull(),
      schemaRef: jsonb("schema_ref").notNull(),
      createdAt: createdAt(),
      expiresAt: timestamp("expires_at", { withTimezone: true })
        .default(sql`now() + interval '1 hour'`)
        .notNull(),
      creationOperationId: uuid("creation_operation_id").notNull(),
      consumedVersionId: uuid("consumed_version_id"),
      consumptionOperationId: uuid("consumption_operation_id"),
    },
    (t): PgTableExtraConfigValue[] => [
      unique("measurement_photo_reservation_owner").on(
        t.tenantId,
        t.locationId,
        t.customerId,
        t.wearerId,
        t.actorId,
        t.profileId,
        t.id,
      ),
      unique("measurement_photo_reserved_version").on(
        t.tenantId,
        t.locationId,
        t.customerId,
        t.wearerId,
        t.profileId,
        t.versionId,
      ),
      foreignKey({
        name: "measurement_photo_reservation_wearer_fk",
        columns: [t.tenantId, t.locationId, t.customerId, t.wearerId],
        foreignColumns: [
          customerWearers.tenantId,
          customerWearers.locationId,
          customerWearers.customerId,
          customerWearers.id,
        ],
      }),
      foreignKey({
        name: "measurement_photo_consumed_version_fk",
        columns: [
          t.tenantId,
          t.locationId,
          t.customerId,
          t.wearerId,
          t.profileId,
          t.consumedVersionId,
        ],
        foreignColumns: [
          measurementVersions.tenantId,
          measurementVersions.locationId,
          measurementVersions.customerId,
          measurementVersions.wearerId,
          measurementVersions.profileId,
          measurementVersions.id,
        ],
      }),
      check(
        "measurement_photo_reservation_state",
        sql`(${t.consumedVersionId} IS NULL)=(${t.consumptionOperationId} IS NULL) AND (${t.consumedVersionId} IS NULL OR ${t.consumedVersionId}=${t.versionId}) AND ${t.expectedRevision}>=0 AND ${t.expiresAt}>${t.createdAt} AND ${t.expiresAt}<=${t.createdAt}+interval '1 hour' AND jsonb_typeof(${t.schemaRef})='object'`,
      ),
      index("measurement_photo_reservation_actor").on(t.actorId),
      index("measurement_photo_reservation_creation").on(t.creationOperationId),
      index("measurement_photo_reservation_consumption").on(
        t.consumptionOperationId,
      ),
      index("measurement_photo_reservation_expiry")
        .on(t.expiresAt)
        .where(sql`${t.consumedVersionId} IS NULL`),
      masterPolicy(),
    ],
  )
  .enableRLS();
export const measurementPhotoMemberships = app
  .table(
    "measurement_photo_memberships",
    {
      ...measurementOwner(),
      profileId: uuid("profile_id").notNull(),
      versionId: uuid("version_id").notNull(),
      fileId: uuid("file_id").notNull(),
      position: integer("position").notNull(),
      note: text("note"),
    },
    (t): PgTableExtraConfigValue[] => [
      primaryKey({ columns: [t.versionId, t.fileId] }),
      unique("measurement_photo_position").on(t.versionId, t.position),
      foreignKey({
        name: "measurement_photo_membership_version_fk",
        columns: [
          t.tenantId,
          t.locationId,
          t.customerId,
          t.wearerId,
          t.profileId,
          t.versionId,
        ],
        foreignColumns: [
          measurementVersions.tenantId,
          measurementVersions.locationId,
          measurementVersions.customerId,
          measurementVersions.wearerId,
          measurementVersions.profileId,
          measurementVersions.id,
        ],
      }),
      check(
        "measurement_photo_membership_bounds",
        sql`${t.position} BETWEEN 1 AND 5 AND app.customer_text_valid(${t.note},1000,true)`,
      ),
      index("measurement_photo_membership_file").on(t.fileId),
      masterPolicy(),
    ],
  )
  .enableRLS();

export const measurementCards = app
  .table(
    "measurement_cards",
    {
      id: id(),
      ...measurementOwner(),
      issuerId: uuid("issuer_id")
        .notNull()
        .references(() => principals.id),
      wearerLabel: text("wearer_label").notNull(),
      projectionVersion: integer("projection_version").notNull().default(1),
      createdAt: createdAt(),
      expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
      revision: integer("revision").notNull().default(1),
      creationOperationId: uuid("creation_operation_id").notNull(),
      revokedAt: timestamp("revoked_at", { withTimezone: true }),
      revokedBy: uuid("revoked_by").references(() => principals.id),
      revocationReason: text("revocation_reason"),
      revocationOperationId: uuid("revocation_operation_id"),
    },
    (t) => [
      unique("measurement_card_owner").on(
        t.tenantId,
        t.locationId,
        t.customerId,
        t.wearerId,
        t.id,
      ),
      foreignKey({
        name: "measurement_card_wearer_fk",
        columns: [t.tenantId, t.locationId, t.customerId, t.wearerId],
        foreignColumns: [
          customerWearers.tenantId,
          customerWearers.locationId,
          customerWearers.customerId,
          customerWearers.id,
        ],
      }),
      check(
        "measurement_card_shape",
        sql`${t.projectionVersion}=1 AND app.customer_text_valid(${t.wearerLabel},120,false) AND ${t.revision}>0 AND ${t.expiresAt}>${t.createdAt} AND ${t.expiresAt}<=${t.createdAt}+interval '30 days' AND ((${t.revokedAt} IS NULL AND ${t.revokedBy} IS NULL AND ${t.revocationReason} IS NULL AND ${t.revocationOperationId} IS NULL) OR (${t.revokedAt} IS NOT NULL AND ${t.revokedBy} IS NOT NULL AND ${t.revocationReason} IS NOT NULL AND ${t.revocationOperationId} IS NOT NULL AND app.customer_text_valid(${t.revocationReason},1000,false)))`,
      ),
      index("measurement_card_book").on(
        t.tenantId,
        t.locationId,
        t.customerId,
        t.wearerId,
        t.createdAt.desc(),
        t.id,
      ),
      index("measurement_card_issuer").on(t.issuerId),
      index("measurement_card_revoker").on(t.revokedBy),
      uniqueIndex("measurement_card_creation").on(t.creationOperationId),
      index("measurement_card_revocation").on(t.revocationOperationId),
      masterPolicy(),
    ],
  )
  .enableRLS();
export const measurementCardSelections = app
  .table(
    "measurement_card_selections",
    {
      ...measurementOwner(),
      cardId: uuid("card_id").notNull(),
      position: integer("position").notNull(),
      profileId: uuid("profile_id").notNull(),
      versionId: uuid("version_id").notNull(),
      fieldIds: jsonb("field_ids").notNull(),
      projection: jsonb("projection").notNull(),
    },
    (t) => [
      primaryKey({ columns: [t.cardId, t.position] }),
      unique("measurement_card_exact_version").on(t.cardId, t.versionId),
      foreignKey({
        name: "measurement_card_selection_card_fk",
        columns: [t.tenantId, t.locationId, t.customerId, t.wearerId, t.cardId],
        foreignColumns: [
          measurementCards.tenantId,
          measurementCards.locationId,
          measurementCards.customerId,
          measurementCards.wearerId,
          measurementCards.id,
        ],
      }),
      foreignKey({
        name: "measurement_card_selection_version_fk",
        columns: [
          t.tenantId,
          t.locationId,
          t.customerId,
          t.wearerId,
          t.profileId,
          t.versionId,
        ],
        foreignColumns: [
          measurementVersions.tenantId,
          measurementVersions.locationId,
          measurementVersions.customerId,
          measurementVersions.wearerId,
          measurementVersions.profileId,
          measurementVersions.id,
        ],
      }),
      check(
        "measurement_card_selection_shape",
        sql`${t.position} BETWEEN 1 AND 10 AND jsonb_typeof(${t.fieldIds})='array' AND jsonb_array_length(${t.fieldIds}) BETWEEN 1 AND 30 AND jsonb_typeof(${t.projection})='object' AND octet_length(${t.projection}::text)<=262144`,
      ),
      index("measurement_card_selection_profile").on(t.profileId, t.cardId),
      index("measurement_card_selection_version").on(t.versionId),
      masterPolicy(),
    ],
  )
  .enableRLS();
export const measurementCardAdmissions = app
  .table(
    "measurement_card_admissions",
    {
      principalId: uuid("principal_id")
        .primaryKey()
        .references(() => principals.id),
      windowStartedAt: timestamp("window_started_at", { withTimezone: true })
        .defaultNow()
        .notNull(),
      requests: integer("requests").notNull().default(0),
    },
    (t) => [
      check(
        "measurement_card_admission_requests",
        sql`${t.requests} BETWEEN 0 AND 31`,
      ),
      masterPolicy(),
    ],
  )
  .enableRLS();

const importScope = () => ({
  tenantId: uuid("tenant_id").notNull(),
  locationId: uuid("location_id").notNull(),
  actorId: uuid("actor_id")
    .notNull()
    .references(() => principals.id),
});
export const domainImportBatches = app
  .table(
    "domain_import_batches",
    {
      id: id(),
      ...importScope(),
      family: text("family").notNull(),
      namespace: text("namespace"),
      digest: text("digest").notNull(),
      state: text("state").notNull().default("preview"),
      revision: integer("revision").notNull().default(1),
      rowCount: integer("row_count").notNull(),
      createdAt: createdAt(),
      expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
      purgedAt: timestamp("purged_at", { withTimezone: true }),
      leaseToken: uuid("lease_token"),
      leaseUntil: timestamp("lease_until", { withTimezone: true }),
      creationOperationId: uuid("creation_operation_id").notNull(),
    },
    (t) => [
      unique("domain_import_batch_owner").on(
        t.tenantId,
        t.locationId,
        t.actorId,
        t.id,
      ),
      foreignKey({
        columns: [t.tenantId, t.locationId],
        foreignColumns: [locations.tenantId, locations.id],
      }),
      check(
        "domain_import_batch_shape",
        sql`${t.family} IN ('customers','measurements') AND ${t.state} IN ('preview','running','complete','cancelled') AND ${t.revision}>0 AND ${t.rowCount} BETWEEN 1 AND 200 AND (${t.namespace} IS NULL OR app.customer_text_valid(${t.namespace},100,false)) AND (${t.namespace} IS NULL)=(${t.purgedAt} IS NOT NULL) AND (${t.leaseToken} IS NULL)=(${t.leaseUntil} IS NULL)`,
      ),
      index("domain_import_batch_actor").on(
        t.actorId,
        t.tenantId,
        t.locationId,
        t.createdAt.desc(),
      ),
      index("domain_import_batch_expiry").on(t.createdAt, t.id),
      index("domain_import_batch_location").on(t.tenantId, t.locationId),
      uniqueIndex("domain_import_batch_operation").on(t.creationOperationId),
      masterPolicy(),
    ],
  )
  .enableRLS();
export const domainImportRecords = app
  .table(
    "domain_import_records",
    {
      id: id(),
      ...importScope(),
      batchId: uuid("batch_id").notNull(),
      ordinal: integer("ordinal").notNull(),
      revision: integer("revision").notNull().default(1),
      state: text("state").notNull().default("pending"),
      sourceId: text("source_id"),
      rows: jsonb("rows").notNull(),
      redundantRows: jsonb("redundant_rows").notNull(),
      payload: jsonb("payload"),
      issues: jsonb("issues").notNull().default(sql`'[]'::jsonb`),
      decision: jsonb("decision"),
      candidates: jsonb("candidates").notNull().default(sql`'[]'::jsonb`),
      candidateCount: integer("candidate_count").notNull().default(0),
      candidateFingerprint: text("candidate_fingerprint"),
      bindings: jsonb("bindings").notNull().default(sql`'[]'::jsonb`),
      prepared: jsonb("prepared"),
      canonicalHash: text("canonical_hash"),
      intentHash: text("intent_hash"),
      operationKey: uuid("operation_key").notNull(),
      requestHash: text("request_hash"),
      outcomeOperationId: uuid("outcome_operation_id"),
      counts: jsonb("counts")
        .notNull()
        .default(
          sql`'{"customers":0,"wearers":0,"profiles":0,"versions":0}'::jsonb`,
        ),
    },
    (t) => [
      unique("domain_import_record_owner").on(
        t.tenantId,
        t.locationId,
        t.actorId,
        t.batchId,
        t.id,
      ),
      unique("domain_import_record_order").on(t.batchId, t.ordinal),
      foreignKey({
        name: "domain_import_record_batch_fk",
        columns: [t.tenantId, t.locationId, t.actorId, t.batchId],
        foreignColumns: [
          domainImportBatches.tenantId,
          domainImportBatches.locationId,
          domainImportBatches.actorId,
          domainImportBatches.id,
        ],
      }),
      check(
        "domain_import_record_shape",
        sql`${t.ordinal} BETWEEN 1 AND 200 AND ${t.revision}>0 AND ${t.state} IN ('pending','in-progress','created','reused','already-imported','skipped','needs-review','failed','cancelled') AND jsonb_array_length(${t.rows}) BETWEEN 1 AND 200 AND jsonb_array_length(${t.redundantRows})<=200 AND (${t.payload} IS NULL OR octet_length(${t.payload}::text)<=655360) AND (${t.prepared} IS NULL OR octet_length(${t.prepared}::text)<=1048576) AND ${t.candidateCount}>=0`,
      ),
      index("domain_import_records_actor").on(t.actorId),
      index("domain_import_records_outcome").on(t.outcomeOperationId),
      uniqueIndex("domain_import_record_attempt").on(t.operationKey),
      masterPolicy(),
    ],
  )
  .enableRLS();
export const domainImportAttempts = app
  .table(
    "domain_import_attempts",
    {
      operationKey: uuid("operation_key").primaryKey(),
      ...importScope(),
      batchId: uuid("batch_id").notNull(),
      recordId: uuid("record_id").notNull(),
      revision: integer("revision").notNull(),
      requestHash: text("request_hash").notNull(),
      intentHash: text("intent_hash").notNull(),
      state: text("state").notNull().default("pending"),
      leaseToken: uuid("lease_token"),
      startedAt: timestamp("started_at", { withTimezone: true }),
      outcomeOperationId: uuid("outcome_operation_id"),
    },
    (t) => [
      foreignKey({
        name: "domain_import_attempt_record_fk",
        columns: [t.tenantId, t.locationId, t.actorId, t.batchId, t.recordId],
        foreignColumns: [
          domainImportRecords.tenantId,
          domainImportRecords.locationId,
          domainImportRecords.actorId,
          domainImportRecords.batchId,
          domainImportRecords.id,
        ],
      }),
      check(
        "domain_import_attempt_shape",
        sql`${t.revision}>0 AND ${t.state} IN ('pending','in-progress','rolled-back','committed') AND ${t.requestHash} ~ '^v1:[0-9a-f]{64}$' AND ${t.intentHash} ~ '^v1:[0-9a-f]{64}$' AND ${t.operationKey}::text ~ '^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'`,
      ),
      unique("domain_import_attempt_revision").on(t.recordId, t.revision),
      index("domain_import_attempt_record").on(
        t.tenantId,
        t.locationId,
        t.actorId,
        t.batchId,
        t.recordId,
      ),
      index("domain_import_attempt_actor").on(t.actorId),
      index("domain_import_attempt_outcome").on(t.outcomeOperationId),
      masterPolicy(),
    ],
  )
  .enableRLS();
export const domainImportSources = app
  .table(
    "domain_import_sources",
    {
      id: id(),
      tenantId: uuid("tenant_id").notNull(),
      locationId: uuid("location_id").notNull(),
      family: text("family").notNull(),
      namespace: text("namespace").notNull(),
      kind: text("kind").notNull(),
      sourceId: text("source_id").notNull(),
      parentSourceId: text("parent_source_id"),
      sourceCustomerId: text("source_customer_id"),
      sourceWearerId: text("source_wearer_id"),
      sourceSequence: integer("source_sequence"),
      acceptedHash: text("accepted_hash").notNull(),
      customerId: uuid("customer_id").notNull(),
      wearerId: uuid("wearer_id"),
      profileId: uuid("profile_id"),
      versionId: uuid("version_id"),
      operationId: uuid("operation_id").notNull(),
    },
    (t) => [
      unique("domain_import_source_identity").on(
        t.tenantId,
        t.locationId,
        t.family,
        t.namespace,
        t.kind,
        t.sourceId,
      ),
      foreignKey({
        name: "domain_import_source_customer_fk",
        columns: [t.tenantId, t.locationId, t.customerId],
        foreignColumns: [
          customers.tenantId,
          customers.locationId,
          customers.id,
        ],
      }),
      foreignKey({
        name: "domain_import_source_wearer_fk",
        columns: [t.tenantId, t.locationId, t.customerId, t.wearerId],
        foreignColumns: [
          customerWearers.tenantId,
          customerWearers.locationId,
          customerWearers.customerId,
          customerWearers.id,
        ],
      }),
      foreignKey({
        name: "domain_import_source_profile_fk",
        columns: [
          t.tenantId,
          t.locationId,
          t.customerId,
          t.wearerId,
          t.profileId,
        ],
        foreignColumns: [
          measurementProfiles.tenantId,
          measurementProfiles.locationId,
          measurementProfiles.customerId,
          measurementProfiles.wearerId,
          measurementProfiles.id,
        ],
      }),
      foreignKey({
        name: "domain_import_source_version_fk",
        columns: [
          t.tenantId,
          t.locationId,
          t.customerId,
          t.wearerId,
          t.profileId,
          t.versionId,
        ],
        foreignColumns: [
          measurementVersions.tenantId,
          measurementVersions.locationId,
          measurementVersions.customerId,
          measurementVersions.wearerId,
          measurementVersions.profileId,
          measurementVersions.id,
        ],
      }),
      check(
        "domain_import_source_shape",
        sql`${t.family} IN ('customers','measurements') AND ${t.kind} IN ('customer','wearer','profile','version') AND app.customer_text_valid(${t.namespace},100,false) AND app.customer_text_valid(${t.sourceId},100,false) AND ${t.acceptedHash} ~ '^v1:[0-9a-f]{64}$' AND ((${t.kind}='customer' AND ${t.family}='customers' AND ${t.wearerId} IS NULL AND ${t.profileId} IS NULL AND ${t.versionId} IS NULL) OR (${t.kind}='wearer' AND ${t.family}='customers' AND ${t.wearerId} IS NOT NULL AND ${t.profileId} IS NULL AND ${t.versionId} IS NULL AND ${t.parentSourceId} IS NOT NULL) OR (${t.kind}='profile' AND ${t.family}='measurements' AND ${t.wearerId} IS NOT NULL AND ${t.profileId} IS NOT NULL AND ${t.versionId} IS NULL) OR (${t.kind}='version' AND ${t.family}='measurements' AND ${t.wearerId} IS NOT NULL AND ${t.profileId} IS NOT NULL AND ${t.versionId} IS NOT NULL AND ${t.sourceSequence}>0 AND ${t.parentSourceId} IS NOT NULL))`,
      ),
      index("domain_import_source_customer").on(
        t.tenantId,
        t.locationId,
        t.customerId,
      ),
      index("domain_import_source_wearer").on(
        t.tenantId,
        t.locationId,
        t.customerId,
        t.wearerId,
      ),
      index("domain_import_source_profile").on(
        t.tenantId,
        t.locationId,
        t.customerId,
        t.wearerId,
        t.profileId,
      ),
      index("domain_import_source_version").on(t.versionId),
      index("domain_import_source_operation").on(t.operationId),
      masterPolicy(),
    ],
  )
  .enableRLS();
export const domainImportBudgets = app
  .table(
    "domain_import_budgets",
    {
      ...importScope(),
      windowStartedAt: timestamp("window_started_at", { withTimezone: true })
        .notNull()
        .defaultNow(),
      previews: integer("previews").notNull().default(0),
      chunks: integer("chunks").notNull().default(0),
      leases: jsonb("leases").notNull().default(sql`'{}'::jsonb`),
    },
    (t) => [
      primaryKey({ columns: [t.tenantId, t.locationId, t.actorId] }),
      foreignKey({
        columns: [t.tenantId, t.locationId],
        foreignColumns: [locations.tenantId, locations.id],
      }),
      check(
        "domain_import_budget_shape",
        sql`${t.previews} BETWEEN 0 AND 5 AND ${t.chunks} BETWEEN 0 AND 10 AND jsonb_typeof(${t.leases})='object'`,
      ),
      index("domain_import_budget_actor").on(t.actorId),
      masterPolicy(),
    ],
  )
  .enableRLS();
