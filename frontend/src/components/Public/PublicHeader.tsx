import { Link } from "@tanstack/react-router"
import { LogIn, Menu, ShieldCheck } from "lucide-react"
import { useState } from "react"

import { Wordmark } from "@/components/Common/Wordmark"
import { Button } from "@/components/ui/button"
import useAuth, { isLoggedIn } from "@/hooks/useAuth"
import { cn } from "@/lib/utils"

const navItems = [
  { title: "Showroom", to: "/" },
  { title: "Inventory", to: "/inventory" },
] as const

export function PublicHeader() {
  const [isOpen, setIsOpen] = useState(false)
  const loggedIn = isLoggedIn()
  const { user } = useAuth()

  return (
    <header className="sticky top-0 z-50 w-full border-b border-amber-500/15 bg-black/60 backdrop-blur-md">
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-6">
        <Wordmark />

        <nav className="hidden items-center gap-10 md:flex">
          {navItems.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="text-xs font-medium uppercase tracking-luxe text-white/70 transition-colors hover:text-gold"
              activeProps={{ className: "text-gold" }}
            >
              {item.title}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          {loggedIn ? (
            <>
              <Button
                asChild
                variant="ghost"
                className="text-xs uppercase tracking-luxe text-white/70 hover:text-gold"
              >
                <Link to="/dashboard/vehicles">Dashboard</Link>
              </Button>
              {user?.is_superuser && (
                <Button
                  asChild
                  variant="outline"
                  className="border-amber-500/30 bg-black/40 text-xs uppercase tracking-luxe text-gold hover:bg-gold/10"
                >
                  <Link to="/admin">
                    <ShieldCheck className="size-3.5" />
                    Admin
                  </Link>
                </Button>
              )}
            </>
          ) : (
            <Button
              asChild
              variant="outline"
              className="border-amber-500/30 bg-black/40 text-xs uppercase tracking-luxe text-gold hover:bg-gold/10"
            >
              <Link to="/login">
                <LogIn className="size-3.5" />
                Concierge
              </Link>
            </Button>
          )}
        </div>

        <Button
          variant="ghost"
          size="icon"
          className="text-white/80 md:hidden"
          onClick={() => setIsOpen((open) => !open)}
          aria-label="Toggle navigation"
        >
          <Menu />
        </Button>
      </div>

      {isOpen && (
        <div className="glass-panel border-t border-amber-500/15 md:hidden">
          <nav className="flex flex-col gap-1 px-6 py-4">
            {navItems.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setIsOpen(false)}
                className="py-2 text-xs uppercase tracking-luxe text-white/80"
              >
                {item.title}
              </Link>
            ))}
            <div
              className={cn(
                "my-2 h-px w-full",
                "bg-linear-to-r from-transparent via-amber-500/30 to-transparent",
              )}
            />
            {loggedIn ? (
              <Link
                to="/dashboard/vehicles"
                onClick={() => setIsOpen(false)}
                className="py-2 text-xs uppercase tracking-luxe text-gold"
              >
                Dashboard
              </Link>
            ) : (
              <Link
                to="/login"
                onClick={() => setIsOpen(false)}
                className="py-2 text-xs uppercase tracking-luxe text-gold"
              >
                Concierge Login
              </Link>
            )}
          </nav>
        </div>
      )}
    </header>
  )
}

export default PublicHeader
