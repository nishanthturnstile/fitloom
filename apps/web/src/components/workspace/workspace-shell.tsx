"use client";
import type {
  WorkspaceChoice,
  WorkspaceView,
} from "@fitloom/application/workspace-contracts";
import { Menu01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { type ReactNode, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  ensureCustomerReturnScope,
  listenForCustomerContextClear,
} from "./customer-return-session";
import { NavigationGuard } from "./navigation-guard";
import { WorkspaceNavigation } from "./workspace-navigation";
import { WorkspaceSwitcher } from "./workspace-switcher";
import { WorkspaceTopbar } from "./workspace-topbar";

export function WorkspaceShell({
  workspace,
  choices,
  locale,
  children,
  principalId,
}: {
  workspace: Pick<
    WorkspaceView,
    "tenantId" | "locationId" | "shopName" | "locationName" | "permissions"
  >;
  choices: WorkspaceChoice[];
  locale: string;
  children: ReactNode;
  principalId: string;
}) {
  useEffect(() => {
    ensureCustomerReturnScope({
      principalId,
      tenantId: workspace.tenantId,
      locationId: workspace.locationId,
    });
    return listenForCustomerContextClear();
  }, [principalId, workspace.tenantId, workspace.locationId]);
  const [menu, setMenu] = useState(false);
  const base = `/workspaces/${workspace.tenantId}/${workspace.locationId}`;
  const navigation = (
    <WorkspaceNavigation base={base} permissions={workspace.permissions} />
  );
  return (
    <NavigationGuard>
      <div className="workspace-app">
        <a href="#workspace-content" className="workspace-skip">
          Skip to content
        </a>
        <aside className="workspace-sidebar">
          <a
            href={base}
            className="workspace-brand"
            aria-label="fitloom / workspace"
          >
            fitloom<span className="text-primary">.</span>
          </a>
          <p className="mb-7 text-xs leading-relaxed text-muted-foreground">
            {workspace.shopName}
            <br />
            {workspace.locationName}
          </p>
          {navigation}
          <div className="mt-auto flex flex-col gap-3 border-t border-sidebar-border pt-5 text-xs text-muted-foreground">
            <a href="/workspaces">Browse all authorized shops and locations</a>
            <a href="/account">Your account</a>
          </div>
        </aside>
        <div className="workspace-body">
          <header className="workspace-app-topbar">
            <div className="workspace-mobile-menu">
              <Sheet open={menu} onOpenChange={setMenu}>
                <SheetTrigger
                  render={
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label="Open workspace menu"
                    />
                  }
                >
                  <HugeiconsIcon icon={Menu01Icon} />
                </SheetTrigger>
                <SheetContent side="left" className="overflow-y-auto">
                  <SheetHeader>
                    <SheetTitle>Workspace menu</SheetTitle>
                    <SheetDescription>
                      {workspace.shopName} · {workspace.locationName}
                    </SheetDescription>
                  </SheetHeader>
                  <div className="flex flex-col gap-6 px-4 pb-6">
                    {navigation}
                    <a
                      href="/workspaces"
                      className="text-sm text-muted-foreground"
                    >
                      Browse all authorized shops and locations
                    </a>
                    <a
                      href="/account"
                      className="text-sm text-muted-foreground"
                    >
                      Your account
                    </a>
                  </div>
                </SheetContent>
              </Sheet>
            </div>
            <WorkspaceTopbar base={base} permissions={workspace.permissions} />
            <WorkspaceSwitcher
              choices={choices}
              selected={`${workspace.tenantId}/${workspace.locationId}`}
              locale={locale}
            />
          </header>
          <main
            id="workspace-content"
            tabIndex={-1}
            className="workspace-content"
          >
            {children}
          </main>
        </div>
      </div>
    </NavigationGuard>
  );
}
