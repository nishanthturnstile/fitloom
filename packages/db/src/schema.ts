import { sql } from "drizzle-orm";
import {
  boolean,
  foreignKey,
  index,
  integer,
  jsonb,
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
