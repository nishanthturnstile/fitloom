"use client";
import { Search01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useNavigationGuard } from "./navigation-guard";
import { workspaceRoute, workspaceSearch } from "./workspace-route-policy";
export function WorkspaceTopbar({
  base,
  permissions,
}: {
  base: string;
  permissions: string[];
}) {
  const pathname = usePathname(),
    query = useSearchParams(),
    guard = useNavigationGuard();
  const route = workspaceRoute(base, pathname, query),
    search = workspaceSearch(base, pathname, query, permissions);
  const activate = () => {
    if (!search) return;
    if (pathname === search.path) window.dispatchEvent(new Event(search.event));
    else guard.navigate(search.href);
  };
  const label = search?.label,
    eventName = search?.event,
    path = search?.path,
    href = search?.href;
  useEffect(() => {
    if (!eventName || !path || !href) return;
    const shortcut = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        if (pathname === path) window.dispatchEvent(new Event(eventName));
        else guard.navigate(href);
      }
    };
    window.addEventListener("keydown", shortcut);
    return () => window.removeEventListener("keydown", shortcut);
  }, [eventName, path, href, pathname, guard.navigate]);
  const customer = route.destination.kind === "customers";
  return (
    <div className="flex min-w-0 flex-1 items-center justify-between gap-3">
      <nav
        aria-label="Breadcrumb"
        className="min-w-0 text-sm text-muted-foreground"
      >
        {pathname === base ? (
          <span aria-current="page" className="text-foreground">
            Home
          </span>
        ) : (
          <>
            <a href={base} className="hover:text-foreground">
              Home
            </a>
            <span aria-hidden="true" className="mx-2">
              /
            </span>
            {customer && route.customerPage !== "register" ? (
              <>
                <a href={`${base}/customers`}>Customers</a>
                <span aria-hidden="true" className="mx-2">
                  /
                </span>
              </>
            ) : null}
            <span aria-current="page" className="text-foreground">
              {customer && route.customerPage === "register"
                ? "Customers"
                : route.label}
            </span>
          </>
        )}
      </nav>
      {search && (
        <Button
          variant="outline"
          size="sm"
          onClick={activate}
          aria-label={label}
        >
          <HugeiconsIcon icon={Search01Icon} data-icon="inline-start" />
          <span className="hidden min-[600px]:inline">{label}</span>
          <kbd className="hidden font-mono text-xs text-muted-foreground min-[800px]:inline">
            ⌘ / Ctrl K
          </kbd>
        </Button>
      )}
    </div>
  );
}
