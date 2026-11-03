"use client";
import type { MasterCatalog } from "@fitloom/application/master-contracts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { FieldSet } from "@/components/ui/field";

export function StarterLibrary({
  catalog,
  writable,
  locked,
  onInstall,
  onVisibility,
}: {
  catalog: MasterCatalog;
  writable: boolean;
  locked: boolean;
  onInstall: () => void;
  onVisibility: (change: {
    hideStandardGarments: boolean;
    hideStandardServices: boolean;
  }) => void;
}) {
  return (
    <details className="catalog-library">
      <summary>Library setup</summary>
      <div className="grid gap-4 pt-4 md:grid-cols-2">
        <Card size="sm">
          <CardHeader>
            <CardTitle>Starter library</CardTitle>
            <CardDescription>
              Shirt, Blouse, Trouser, New stitching and Alteration. Rates start
              unset. Installation adds missing starter records and preserves
              your existing edits.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Badge variant="outline">
              {catalog.starterBundleVersion
                ? `Installed: ${catalog.starterBundleVersion}`
                : "No starter library installed yet."}
            </Badge>
            {writable && (
              <Button
                className="w-fit"
                variant="outline"
                disabled={locked}
                onClick={onInstall}
              >
                Install starter library
              </Button>
            )}
          </CardContent>
        </Card>
        <Card size="sm">
          <CardHeader>
            <CardTitle>Standard visibility</CardTitle>
            <CardDescription>
              Hide standards from available lists. Saved bindings and custom
              records are retained.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <FieldSet disabled={!writable || locked}>
              <label className="flex items-start gap-2 text-sm">
                <input
                  type="checkbox"
                  className="catalog-library-check"
                  checked={catalog.hideStandardGarments}
                  onChange={(event) =>
                    onVisibility({
                      hideStandardGarments: event.target.checked,
                      hideStandardServices: catalog.hideStandardServices,
                    })
                  }
                />
                Hide standard garments
              </label>
              <label className="flex items-start gap-2 text-sm">
                <input
                  type="checkbox"
                  className="catalog-library-check"
                  checked={catalog.hideStandardServices}
                  onChange={(event) =>
                    onVisibility({
                      hideStandardGarments: catalog.hideStandardGarments,
                      hideStandardServices: event.target.checked,
                    })
                  }
                />
                Hide standard services
              </label>
            </FieldSet>
          </CardContent>
        </Card>
      </div>
    </details>
  );
}
