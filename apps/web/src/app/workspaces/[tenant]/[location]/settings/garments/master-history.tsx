"use client";
import type * as c from "@fitloom/application/master-contracts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export function MasterHistory(props: {
  history: ReturnType<typeof c.masterHistoryPage.parse> | null;
  currentVersionId: string | null;
  selectedVersionId?: string | null;
  disabled: boolean;
  onInspect: (id: string) => void;
  onMore: () => void;
}) {
  return (
    <section className="saved-history" aria-label="Saved history">
      <h3>Saved history</h3>
      <p className="mb-4 text-xs text-muted-foreground">
        Inspect an immutable revision. Opening history leaves your draft
        unchanged.
      </p>
      {!props.currentVersionId && (
        <p className="text-sm text-muted-foreground">
          Save this record to start its revision history.
        </p>
      )}
      <ol className="divide-y divide-border">
        {props.history?.items.map((version) => (
          <li key={version.id} className="py-3">
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant={
                  props.selectedVersionId === version.id
                    ? "secondary"
                    : "outline"
                }
                size="sm"
                disabled={props.disabled}
                aria-pressed={props.selectedVersionId === version.id}
                onClick={() => props.onInspect(version.id)}
              >
                Revision {version.revision}
              </Button>
              {props.currentVersionId === version.id && (
                <Badge variant="outline">Current</Badge>
              )}
            </div>
            <time
              className="mt-2 block text-xs text-muted-foreground"
              dateTime={version.createdAt}
            >
              {new Date(version.createdAt).toLocaleString()}
            </time>
            <details className="mt-2 text-xs text-muted-foreground">
              <summary className="cursor-pointer">Revision details</summary>
              <dl className="mt-2 grid gap-2 break-all font-mono">
                <div>
                  <dt>Author ID</dt>
                  <dd>{version.authorId}</dd>
                </div>
                <div>
                  <dt>Saved at location ID</dt>
                  <dd>{version.createdLocationId}</dd>
                </div>
              </dl>
            </details>
          </li>
        ))}
      </ol>
      {props.history && props.history.nextOffset !== null && (
        <Button
          variant="outline"
          size="sm"
          disabled={props.disabled}
          onClick={props.onMore}
        >
          More history
        </Button>
      )}
    </section>
  );
}
