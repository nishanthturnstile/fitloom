import type { WorkspaceDestination } from "@fitloom/application/workspace-contracts";
export function workspaceRoute(
  base: string,
  pathname: string,
  query: Pick<URLSearchParams, "get">,
): {
  destination: WorkspaceDestination;
  label: string;
  customerPage: "register" | "new" | "profile" | "edit" | null;
} {
  const suffix =
    pathname === base
      ? ""
      : pathname.startsWith(`${base}/`)
        ? pathname.slice(base.length)
        : null;
  if (suffix === "/customers" || suffix?.startsWith("/customers/")) {
    const part = suffix.split("/").filter(Boolean);
    const page =
      part.length === 1
        ? "register"
        : part[1] === "new"
          ? "new"
          : part[2] === "edit"
            ? "edit"
            : "profile";
    return {
      destination: { kind: "customers" },
      label:
        page === "new" ? "New customer" : page === "edit" ? "Edit" : "Profile",
      customerPage: page,
    };
  }
  if (suffix === "/settings/garments") {
    const kind = query.get("kind");
    return {
      destination: {
        kind: "catalog",
        catalog: kind === "service" || kind === "addon" ? kind : "garment",
      },
      label: "Garments and services",
      customerPage: null,
    };
  }
  const section =
    suffix === "/settings"
      ? "root"
      : suffix === "/settings/shop"
        ? "shop"
        : suffix === "/settings/access"
          ? "access"
          : suffix === "/files"
            ? "files"
            : null;
  if (section)
    return {
      destination: { kind: "settings", section },
      label:
        section === "root"
          ? "Settings"
          : section === "shop"
            ? "Shop profile"
            : section === "access"
              ? "People & access"
              : "Private files",
      customerPage: null,
    };
  return { destination: { kind: "home" }, label: "Home", customerPage: null };
}
export function workspaceSearch(
  base: string,
  pathname: string,
  query: Pick<URLSearchParams, "get">,
  permissions: string[],
) {
  const route = workspaceRoute(base, pathname, query);
  const catalog =
    permissions.includes("masters.read") &&
    (route.destination.kind === "catalog" ||
      !permissions.includes("customers.read"));
  if (catalog)
    return {
      label: "Search catalog",
      event: "fitloom:catalog-search",
      path: `${base}/settings/garments`,
      href: `${base}/settings/garments?${route.destination.kind === "catalog" && route.destination.catalog !== "garment" ? `kind=${route.destination.catalog}&` : ""}focus=search`,
    };
  if (permissions.includes("customers.read"))
    return {
      label: "Search customers",
      event: "fitloom:customer-search",
      path: `${base}/customers`,
      href: `${base}/customers?focus=search`,
    };
  return null;
}
