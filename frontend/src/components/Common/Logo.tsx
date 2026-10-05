import { Link } from "@tanstack/react-router"

import { Wordmark } from "@/components/Common/Wordmark"
import { cn } from "@/lib/utils"

interface LogoProps {
  variant?: "full" | "icon" | "responsive"
  className?: string
  asLink?: boolean
}

export function Logo({
  variant = "full",
  className,
  asLink = true,
}: LogoProps) {
  const content =
    variant === "responsive" ? (
      <>
        <Wordmark
          className={cn(
            "text-base group-data-[collapsible=icon]:hidden",
            className,
          )}
        />
        <Wordmark
          compact
          className={cn(
            "hidden group-data-[collapsible=icon]:block",
            className,
          )}
        />
      </>
    ) : (
      <Wordmark
        compact={variant === "icon"}
        className={cn("text-base", className)}
      />
    )

  if (!asLink) {
    return content
  }

  return <Link to="/dashboard">{content}</Link>
}
