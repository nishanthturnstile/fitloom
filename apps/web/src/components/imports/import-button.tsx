"use client";
import type { ComponentProps } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function ImportButton({
  className,
  ...props
}: ComponentProps<typeof Button>) {
  return (
    <Button
      {...props}
      className={cn(
        "h-auto min-h-9 min-w-0 max-w-full whitespace-normal break-words py-2",
        className,
      )}
    />
  );
}
