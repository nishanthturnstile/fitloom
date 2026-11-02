"use client";
import { estimatedDefinitionBytes } from "@fitloom/application/garment-definition";
import * as c from "@fitloom/application/master-contracts";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";

export function EditorSaveBar(props: {
  dirty: boolean;
  definition?: c.GarmentDefinition;
  writable: boolean;
  locked: boolean;
  busy: boolean;
  form: string;
  recovery?: ReactNode;
  onCancel: () => void;
}) {
  return (
    <footer className="editor-save-bar">
      <div>
        <p className="text-sm">
          {props.dirty ? "Unsaved changes" : "No unsaved changes"}
        </p>
        {props.definition && (
          <p className="mt-1 font-mono text-[11px] text-muted-foreground">
            {Math.ceil(estimatedDefinitionBytes(props.definition) / 1024)} KiB
            estimated · {Math.round(c.MASTER_DEFINITION_BYTES / 1024)} KiB
            stored limit · {Math.round(c.MASTER_REQUEST_BYTES / 1024)} KiB
            request limit
          </p>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        {props.recovery}
        <Button
          variant="outline"
          disabled={props.busy}
          onClick={props.onCancel}
        >
          Cancel
        </Button>
        {props.writable && (
          <Button
            type="submit"
            form={props.form}
            disabled={props.locked || !props.dirty}
          >
            Save new version
          </Button>
        )}
      </div>
    </footer>
  );
}
