import { z } from "zod";

const text = (max: number) => z.string().trim().max(max);
export const setupFields = {
  shopName: text(200).default(""),
  locationName: text(200).default(""),
  businessMode: z.enum(["tailoring", "boutique", "mixed"]).default("tailoring"),
  ownerName: text(200).default(""),
  ownerPhone: text(30).default(""),
  address: text(1000).default(""),
  timezone: text(100).default(""),
  consentAccepted: z.boolean().default(false),
  consentVersion: z
    .literal("workspace-authority-v1")
    .default("workspace-authority-v1"),
};
export const setupDraftSchema = z.strictObject(setupFields);
export const completedSetupSchema = setupDraftSchema.superRefine(
  (value, ctx) => {
    for (const field of [
      "shopName",
      "locationName",
      "ownerName",
      "address",
    ] satisfies (keyof typeof value)[])
      if (!value[field])
        ctx.addIssue({ code: "custom", path: [field], message: "Required" });
    if (!/^[+0-9 ()-]{7,30}$/.test(value.ownerPhone))
      ctx.addIssue({
        code: "custom",
        path: ["ownerPhone"],
        message: "Enter an owner contact number",
      });
    let valid = false;
    try {
      new Intl.DateTimeFormat("en", { timeZone: value.timezone });
      valid = /^(UTC|[A-Za-z]+\/[A-Za-z0-9_+/-]+)$/.test(value.timezone);
    } catch {
      /* Invalid timezone. */
    }
    if (!valid)
      ctx.addIssue({
        code: "custom",
        path: ["timezone"],
        message: "Choose an IANA timezone",
      });
    if (!value.consentAccepted)
      ctx.addIssue({
        code: "custom",
        path: ["consentAccepted"],
        message: "Confirm your authority to create this workspace",
      });
  },
);
export const workspaceTarget = z.strictObject({
  tenantId: z.uuid(),
  locationId: z.uuid(),
});
export const workspaceChoice = z.strictObject({
  ...workspaceTarget.shape,
  shopName: z.string(),
  locationName: z.string(),
});
export const workspaceView = z.strictObject({
  ...workspaceChoice.shape,
  businessMode: z.string().nullable(),
  timezone: z.string().nullable(),
  address: z.string().nullable(),
  version: z.int().nullable(),
  permissions: z.array(z.string()),
  owner: z
    .strictObject({ name: z.string(), email: z.email(), phone: z.string() })
    .nullable()
    .optional(),
});
export type SetupDraft = z.infer<typeof setupDraftSchema>;
export type WorkspaceChoice = z.infer<typeof workspaceChoice>;
export type WorkspaceView = z.infer<typeof workspaceView>;

export const operatorJobInput = z.strictObject({
  operationKey: z.string().min(1).max(200),
  correlationId: z.uuid(),
  jobId: z.uuid(),
  action: z.enum(["retry", "cancel"]),
  reason: z.string().trim().min(1).max(500),
});
export type OperatorJobInput = z.infer<typeof operatorJobInput>;

const operatorCommandFields = {
  operationKey: z.string().min(1).max(200),
  correlationId: z.uuid(),
  reason: z.string().trim().min(1).max(500),
};
export const operatorCommandInput = z.discriminatedUnion("action", [
  z.strictObject({
    ...operatorCommandFields,
    action: z.literal("tenant.suspend"),
    tenantId: z.uuid(),
  }),
  z.strictObject({
    ...operatorCommandFields,
    action: z.literal("tenant.restore"),
    tenantId: z.uuid(),
  }),
  z.strictObject({
    ...operatorCommandFields,
    action: z.literal("sessions.revoke"),
    tenantId: z.uuid(),
    principalId: z.uuid(),
  }),
  z.strictObject({
    ...operatorCommandFields,
    action: z.literal("owner.recover"),
    tenantId: z.uuid(),
    principalId: z.uuid(),
  }),
  z.strictObject({
    ...operatorCommandFields,
    action: z.literal("job.retry"),
    jobId: z.uuid(),
  }),
  z.strictObject({
    ...operatorCommandFields,
    action: z.literal("job.cancel"),
    jobId: z.uuid(),
  }),
]);
export const operatorCommandResult = z.strictObject({
  operationId: z.uuid(),
  replayed: z.boolean(),
  result: z.strictObject({ accepted: z.literal(true) }),
});
export const operatorTenantView = z.strictObject({
  tenantId: z.uuid(),
  shopName: z.string(),
  active: z.boolean(),
  locationCount: z.number().int().nonnegative(),
  ownerCount: z.int().nonnegative(),
  owners: z.array(z.strictObject({ principalId: z.uuid() })),
});
export const privateFileResult = z.strictObject({
  id: z.uuid(),
  version: z.int().nonnegative(),
});
export const privateFileSummary = privateFileResult.extend({
  size: z.int().positive(),
  mediaType: z.enum(["image/png", "image/jpeg"]),
  createdAt: z.string(),
});
export const privateFileList = z.array(privateFileSummary);
export const privateFileCommandResponse = z.object({
  result: privateFileResult,
});
export type PrivateFileSummary = z.infer<typeof privateFileSummary>;

export const pageOffset = z.coerce.number().int().min(0).max(100000).default(0);
export function pageOf<T extends z.ZodType>(item: T) {
  return z.strictObject({
    items: z.array(item).max(50),
    total: z.int().nonnegative(),
    nextOffset: z.int().nonnegative().nullable(),
  });
}
export const choicePage = pageOf(workspaceChoice);
export const privateFilePage = pageOf(privateFileSummary);
export const jobSummary = z.strictObject({
  id: z.uuid(),
  kind: z.string(),
  status: z.enum(["pending", "running", "succeeded", "failed", "cancelled"]),
  attempts: z.int().nonnegative(),
  last_error: z.string().nullable(),
  created_at: z.string(),
  finished_at: z.string().nullable(),
});
export const operatorJobSummary = jobSummary.extend({
  provider: z.string().nullable(),
  account: z.string().nullable(),
  environment: z.string().nullable(),
  inbox_outcome: z.string().nullable(),
});
export const workspaceTeam = z.strictObject({
  roles: z
    .array(
      z.strictObject({
        id: z.uuid(),
        name: z.string(),
        preset: z.string().nullable(),
        permissions: z.array(z.string()),
      }),
    )
    .max(50),
  members: z
    .array(
      z.strictObject({
        id: z.uuid(),
        principalId: z.uuid(),
        name: z.string(),
        roleId: z.uuid(),
        version: z.int().nonnegative(),
        owner: z.boolean(),
      }),
    )
    .max(50),
  invitations: z
    .array(
      z.strictObject({
        id: z.uuid(),
        email: z.email(),
        roleId: z.uuid(),
        expiresAt: z.string(),
        revoked: z.boolean(),
        accepted: z.boolean(),
      }),
    )
    .max(50),
  counts: z.strictObject({
    roles: z.int().nonnegative(),
    members: z.int().nonnegative(),
    invitations: z.int().nonnegative(),
  }),
  nextOffset: z.int().nonnegative().nullable(),
});
export type WorkspaceTeam = z.infer<typeof workspaceTeam>;

export function workspacePermissionLabel(permission: string): string {
  switch (permission) {
    case "masters.read":
      return "View garments and services";
    case "masters.manage":
      return "Manage garments and services";
    case "masters.rates.read":
      return "View garment and add-on rates";
    case "customers.read":
      return "View customers and wearers";
    case "customers.manage":
      return "Create and edit customers and wearers";
    case "customers.archive":
      return "Archive and restore customers and wearers";
    case "customers.photos.read":
      return "View customer and wearer photos";
    case "customers.photos.manage":
      return "Manage customer and wearer photos";
    case "measurements.read":
      return "View wearer measurements and history";
    case "measurements.manage":
      return "Create and revise measurements";
    case "measurements.archive":
      return "Archive and restore measurements";
    case "measurements.photos.read":
      return "View measurement reference photos";
    case "measurements.photos.manage":
      return "Manage measurement reference photos";
    case "measurements.cards.manage":
      return "Issue and revoke measurement cards";
    case "customers.import":
      return "Import customers and wearers";
    case "measurements.import":
      return "Import measurement profiles";
    default:
      return permission;
  }
}

export const workspacePermission = z.enum([
  "workspace.read",
  "workspace.manage",
  "workspace.private.read",
  "access.manage",
  "locations.all",
  "audit.read",
  "journal.read",
  "journal.post",
  "files.read",
  "files.manage",
  "masters.read",
  "masters.manage",
  "masters.rates.read",
  "customers.read",
  "customers.manage",
  "customers.archive",
  "customers.photos.read",
  "customers.photos.manage",
  "measurements.read",
  "measurements.manage",
  "measurements.archive",
  "measurements.photos.read",
  "measurements.photos.manage",
  "measurements.cards.manage",
  "customers.import",
  "measurements.import",
]);
export function workspacePermissionDependencies(permission: string): string[] {
  const base = permission === "workspace.read" ? [] : ["workspace.read"];
  switch (permission) {
    case "masters.manage":
      return [...base, "masters.read", "masters.rates.read"];
    case "customers.manage":
    case "customers.archive":
    case "customers.photos.read":
      return [...base, "customers.read"];
    case "customers.photos.manage":
      return [...base, "customers.manage", "customers.photos.read"];
    case "measurements.read":
      return [...base, "customers.read"];
    case "measurements.manage":
    case "measurements.archive":
    case "measurements.photos.read":
    case "measurements.cards.manage":
      return [...base, "measurements.read"];
    case "measurements.photos.manage":
      return [...base, "measurements.manage", "measurements.photos.read"];
    case "customers.import":
      return [...base, "customers.read", "customers.manage"];
    case "measurements.import":
      return [...base, "measurements.manage"];
    default:
      return base;
  }
}
export const customRoleInput = z
  .strictObject({
    name: z.string().trim().min(1).max(80),
    permissions: z
      .array(workspacePermission)
      .min(1)
      .max(workspacePermission.options.length),
  })
  .superRefine((role, context) => {
    if (!role.permissions.includes("workspace.read"))
      context.addIssue({
        code: "custom",
        path: ["permissions"],
        message: "Roles require workspace read access",
      });
    const selected = new Set<string>(role.permissions);
    for (const permission of selected)
      if (
        workspacePermissionDependencies(permission).some(
          (required) => !selected.has(required),
        )
      )
        context.addIssue({
          code: "custom",
          path: ["permissions"],
          message: `Include the read and management dependencies for ${permission}`,
        });
  });
export function changeRolePermission(
  selected: string[],
  permission: string,
  checked: boolean,
): string[] {
  const result = new Set(selected);
  const visited = new Set<string>();
  const add = (value: string) => {
    if (visited.has(value)) return;
    visited.add(value);
    result.add(value);
    for (const dependency of workspacePermissionDependencies(value))
      add(dependency);
  };
  if (checked) add(permission);
  else {
    result.delete(permission);
    let changed = true;
    while (changed) {
      changed = false;
      for (const value of result)
        if (
          workspacePermissionDependencies(value).some(
            (dependency) => !result.has(dependency),
          )
        ) {
          result.delete(value);
          changed = true;
        }
    }
  }
  return [...result];
}

export const workspaceDestination = z.discriminatedUnion("kind", [
  z.strictObject({ kind: z.literal("home") }),
  z.strictObject({ kind: z.literal("customers") }),
  z.strictObject({
    kind: z.literal("imports"),
    family: z.enum(["customers", "measurements"]),
  }),
  z.strictObject({
    kind: z.literal("catalog"),
    catalog: z.enum(["garment", "service", "addon"]),
  }),
  z.strictObject({
    kind: z.literal("settings"),
    section: z.enum(["root", "shop", "access", "files"]),
  }),
]);
export type WorkspaceDestination = z.infer<typeof workspaceDestination>;
export const workspaceSwitchRequest = z.strictObject({
  operationKey: z.uuidv4(),
  correlationId: z.uuid(),
  target: workspaceTarget,
  locale: z.enum(["en", "ta", "hi"]),
  destination: workspaceDestination,
});
export const workspaceSwitchResponse = z.strictObject({
  destination: z
    .string()
    .regex(
      /^\/workspaces\/[0-9a-f-]{36}\/[0-9a-f-]{36}(?:\/(?:customers(?:\/import)?|measurements\/import|files|settings(?:\/(?:shop|access|garments))?))?(?:\?kind=(?:service|addon))?$/i,
    ),
});
export function resolveWorkspaceDestination(
  workspace: Pick<WorkspaceView, "tenantId" | "locationId" | "permissions">,
  requested: WorkspaceDestination,
): string {
  const base = `/workspaces/${workspace.tenantId}/${workspace.locationId}`;
  const allowed = (permission: string) =>
    workspace.permissions.includes(permission);
  switch (requested.kind) {
    case "home":
      return base;
    case "customers":
      return allowed("customers.read") ? `${base}/customers` : base;
    case "imports":
      return allowed(`${requested.family}.import`)
        ? `${base}/${requested.family}/import`
        : allowed("customers.read")
          ? `${base}/customers`
          : base;
    case "catalog":
      return allowed("masters.read")
        ? `${base}/settings/garments${requested.catalog === "garment" ? "" : `?kind=${requested.catalog}`}`
        : base;
    case "settings":
      switch (requested.section) {
        case "root":
          return `${base}/settings`;
        case "shop":
          return `${base}/settings/shop`;
        case "access":
          return allowed("access.manage") ? `${base}/settings/access` : base;
        case "files":
          return allowed("files.read") ? `${base}/files` : base;
      }
  }
}
