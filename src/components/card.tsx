import { cn } from "@/lib/utils";

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("rounded-card bg-white p-5 shadow-sm ring-1 ring-blush/60", className)} {...props} />;
}
