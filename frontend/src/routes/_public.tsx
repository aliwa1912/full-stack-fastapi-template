import { createFileRoute, Outlet } from "@tanstack/react-router"

import { PublicFooter } from "@/components/Public/PublicFooter"
import { PublicHeader } from "@/components/Public/PublicHeader"

export const Route = createFileRoute("/_public")({
  component: PublicLayout,
})

function PublicLayout() {
  return (
    // The showroom is always obsidian, regardless of the staff dashboard theme.
    <div className="dark min-h-screen bg-background text-foreground">
      <PublicHeader />
      <main>
        <Outlet />
      </main>
      <PublicFooter />
    </div>
  )
}
