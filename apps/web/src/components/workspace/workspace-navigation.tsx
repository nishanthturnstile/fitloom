"use client";
import {
  Folder01Icon,
  Home01Icon,
  Settings01Icon,
  UserGroupIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { usePathname, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";

export function WorkspaceNavigation({
  base,
  permissions,
}: {
  base: string;
  permissions: string[];
}) {
  const pathname = usePathname(),
    query = useSearchParams();
  const groups = [
    {
      label: "Workspace",
      items: [{ label: "Overview", href: base, icon: Home01Icon }],
    },
    {
      label: "Catalog",
      items: permissions.includes("masters.read")
        ? [
            {
              label: "Garments",
              href: `${base}/settings/garments`,
              icon: Folder01Icon,
            },
            {
              label: "Services",
              href: `${base}/settings/garments?kind=service`,
              icon: Folder01Icon,
            },
            {
              label: "Add-ons",
              href: `${base}/settings/garments?kind=addon`,
              icon: Folder01Icon,
            },
          ]
        : [],
    },
    {
      label: "Manage",
      items: [
        { label: "Settings", href: `${base}/settings`, icon: Settings01Icon },
        ...(permissions.includes("access.manage")
          ? [
              {
                label: "People & access",
                href: `${base}/settings/access`,
                icon: UserGroupIcon,
              },
            ]
          : []),
        ...(permissions.includes("files.read")
          ? [
              {
                label: "Private files",
                href: `${base}/files`,
                icon: Folder01Icon,
              },
            ]
          : []),
      ],
    },
  ];
  return (
    <nav aria-label="Workspace navigation" className="flex flex-col gap-6">
      {groups
        .filter((group) => group.items.length)
        .map((group) => (
          <div key={group.label}>
            <p className="mb-2 px-3 text-[10px] font-medium tracking-widest text-muted-foreground uppercase">
              {group.label}
            </p>
            <ul className="flex flex-col gap-1">
              {group.items.map((item) => {
                const url = new URL(item.href, "https://fitloom.invalid");
                const active =
                  pathname === url.pathname &&
                  (pathname.endsWith("/garments")
                    ? (query.get("kind") ?? "garment") ===
                      (url.searchParams.get("kind") ?? "garment")
                    : true);
                return (
                  <li key={item.href}>
                    <a
                      href={item.href}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                        active &&
                          "bg-sidebar-accent font-medium text-sidebar-accent-foreground",
                      )}
                    >
                      <HugeiconsIcon
                        icon={item.icon}
                        size={18}
                        strokeWidth={1.5}
                      />
                      {item.label}
                    </a>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
    </nav>
  );
}
