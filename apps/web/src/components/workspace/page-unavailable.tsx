import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
export function PageUnavailable({
  title,
  href,
  retryHref,
}: {
  title: string;
  href: string;
  retryHref?: string;
}) {
  return (
    <div className="py-7">
      <Alert>
        <AlertTitle>
          <h1 className="font-heading text-lg">{title}</h1>
        </AlertTitle>
        <AlertDescription>
          <p>
            Your access may have changed, or the workspace could not be reached.
          </p>
          <div className="flex gap-4">
            {retryHref && <a href={retryHref}>Try again</a>}
            <a href={href}>Return to workspace</a>
          </div>
        </AlertDescription>
      </Alert>
    </div>
  );
}
