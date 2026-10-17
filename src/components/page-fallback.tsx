import { copy } from "@/lib/copy"

export function PageFallback({ label = copy.loading }: { label?: string }) {
  return (
    <p className="text-base text-muted-foreground" role="status">
      {label}
    </p>
  )
}
