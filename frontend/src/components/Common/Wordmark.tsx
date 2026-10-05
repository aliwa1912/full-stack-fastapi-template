import { Link } from "@tanstack/react-router"

import { cn } from "@/lib/utils"

interface WordmarkProps {
  className?: string
  /** Hide the sub line for tight placements such as the dashboard sidebar. */
  compact?: boolean
  asLink?: boolean
}

export function Wordmark({
  className,
  compact = false,
  asLink = true,
}: WordmarkProps) {
  const content = (
    <span className={cn("flex flex-col leading-none", className)}>
      <span className="font-display text-lg font-semibold tracking-[0.28em] text-gold-gradient">
        AURELIA
      </span>
      {!compact && (
        <span className="mt-1 text-[0.6rem] font-medium uppercase tracking-luxe text-muted-foreground">
          Motorworks
        </span>
      )}
    </span>
  )

  if (!asLink) return content

  return (
    <Link
      to="/"
      className="group inline-flex items-center"
      aria-label="Aurelia home"
    >
      {content}
    </Link>
  )
}

export default Wordmark
