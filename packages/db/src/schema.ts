import { sql } from "drizzle-orm";
import {
  boolean,
  check,
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
