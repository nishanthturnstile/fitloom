import type { ReactNode } from "react";

export function PageHeader({
  title,
  description,
  eyebrow,
  actions,
}: {
  title: string;
  description: ReactNode;
  eyebrow?: string;
  actions?: ReactNode;
}) {
  return (
    <header className="flex min-w-0 flex-col gap-5 py-7 md:flex-row md:items-center md:justify-between">
      <div className="flex min-w-0 flex-col gap-2">
        {eyebrow && (
          <p className="text-xs font-medium tracking-widest text-muted-foreground uppercase">
            {eyebrow}
          </p>
        )}
        <h1 className="break-words font-heading text-[28px] leading-tight font-medium tracking-tight text-foreground">
          {title}
        </h1>
        <p className="text-sm leading-relaxed text-muted-foreground">
          {description}
        </p>
      </div>
      {actions && <div className="min-w-0 md:w-72 md:shrink-0">{actions}</div>}
    </header>
  );
}
