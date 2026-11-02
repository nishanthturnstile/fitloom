"use client";
import { Search01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useNavigationGuard } from "./navigation-guard";

export function WorkspaceTopbar({
  base,
  canReadMasters,
}: {
  base: string;
  canReadMasters: boolean;
}) {
  const pathname = usePathname(),
    guard = useNavigationGuard();
  const destination = `${base}/settings/garments`;
  const search = () => {
    if (pathname === destination)
      window.dispatchEvent(new Event("fitloom:catalog-search"));
    else guard.navigate(`${destination}?focus=search`);
  };
  // Keep one shortcut listener with current navigation protection.
  useEffect(() => {
    if (!canReadMasters) return;
    const shortcut = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        if (pathname === destination)
          window.dispatchEvent(new Event("fitloom:catalog-search"));
        else guard.navigate(`${destination}?focus=search`);
      }
    };
    window.addEventListener("keydown", shortcut);
    return () => window.removeEventListener("keydown", shortcut);
  }, [canReadMasters, pathname, destination, guard.navigate]);
  const segment = pathname.slice(base.length);
  const label =
    segment === "/settings/shop"
      ? "Shop profile"
      : segment === "/settings/access"
        ? "People & access"
        : segment === "/settings/garments"
          ? "Garments and services"
          : segment === "/files"
            ? "Private files"
            : segment === "/settings"
              ? "Settings"
              : "Overview";
  return (
    <div className="flex min-w-0 flex-1 items-center justify-between gap-3">
      <nav
        aria-label="Breadcrumb"
        className="min-w-0 text-sm text-muted-foreground"
      >
        <a href={base} className="hover:text-foreground">
          Workspace
        </a>
        <span aria-hidden="true" className="mx-2">
          /
        </span>
        <span className="text-foreground">{label}</span>
      </nav>
      {canReadMasters && (
        <Button
          variant="outline"
          size="sm"
          onClick={search}
          aria-label="Search catalog"
        >
          <HugeiconsIcon icon={Search01Icon} data-icon="inline-start" />
          <span className="hidden min-[600px]:inline">Search catalog</span>
          <kbd className="hidden font-mono text-xs text-muted-foreground min-[800px]:inline">
            ⌘ / Ctrl K
          </kbd>
        </Button>
      )}
    </div>
  );
}
