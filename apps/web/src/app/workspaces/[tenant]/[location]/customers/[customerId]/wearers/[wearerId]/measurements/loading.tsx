import { Skeleton } from "@/components/ui/skeleton";
export default function Loading() {
  return (
    <div
      role="status"
      aria-label="Loading measurements"
      className="flex flex-col gap-5"
    >
      <Skeleton className="h-24" />
      <Skeleton className="h-48" />
    </div>
  );
}
