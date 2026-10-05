import { useQuery } from "@tanstack/react-query"
import { createFileRoute, Link } from "@tanstack/react-router"
import type { LucideIcon } from "lucide-react"
import {
  ArrowRight,
  CarFront,
  Globe,
  Inbox,
  Sparkles,
  TrendingUp,
  Users,
} from "lucide-react"

import { AdminService } from "@/client"
import { Button } from "@/components/ui/button"
import { pluralize } from "@/utils"

export const Route = createFileRoute("/_layout/admin/")({
  component: AdminOverview,
  head: () => ({
    meta: [
      {
        title: "Control Panel - Aurelia Motorworks",
      },
    ],
  }),
})

type Stat = {
  label: string
  value: number
  icon: LucideIcon
  to: string
  hint?: string
}

function StatCard({ stat }: { stat: Stat }) {
  return (
    <Link
      to={stat.to}
      className="rounded-xl border bg-card p-5 transition-colors hover:bg-accent"
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">
          {stat.label}
        </p>
        <stat.icon className="size-4 shrink-0 text-gold" />
      </div>
      <p className="mt-2 font-display text-3xl">{stat.value}</p>
      {stat.hint && (
        <p className="mt-1 text-xs text-muted-foreground">{stat.hint}</p>
      )}
    </Link>
  )
}

const sections = [
  {
    title: "Inventory",
    description: "Every listing across all sellers, photography and pricing.",
    to: "/admin/inventory",
    icon: CarFront,
  },
  {
    title: "Inquiries",
    description: "Private viewing requests from the public showroom.",
    to: "/admin/inquiries",
    icon: Inbox,
  },
  {
    title: "Users",
    description: "Accounts, roles and access to the dashboard.",
    to: "/admin/users",
    icon: Users,
  },
  {
    title: "Site & Branding",
    description: "Hero banner, dealership details and contact information.",
    to: "/admin/site",
    icon: Globe,
  },
]

function AdminOverview() {
  const { data: stats, isPending: statsPending } = useQuery({
    queryKey: ["admin", "stats"],
    queryFn: async () => (await AdminService.readAdminStats()).data,
  })

  const { data: recent, isPending: leadsPending } = useQuery({
    queryKey: ["inquiries", "recent"],
    queryFn: async () =>
      (await AdminService.readInquiries({ query: { limit: 5 } })).data,
  })

  const cards: Stat[] = [
    {
      label: "Vehicles",
      value: stats?.total_cars ?? 0,
      icon: CarFront,
      to: "/admin/inventory",
      hint: `${stats?.available_cars ?? 0} available`,
    },
    {
      label: "Sold",
      value: stats?.sold_cars ?? 0,
      icon: TrendingUp,
      to: "/admin/inventory",
      hint: `${stats?.featured_cars ?? 0} featured`,
    },
    {
      label: "Users",
      value: stats?.total_users ?? 0,
      icon: Users,
      to: "/admin/users",
    },
    {
      label: "New leads",
      value: stats?.new_inquiries ?? 0,
      icon: Inbox,
      to: "/admin/inquiries",
      hint: `${stats?.total_inquiries ?? 0} all time`,
    },
  ]

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Control Panel</h1>
        <p className="text-muted-foreground">
          Everything published on this website is managed from here.
        </p>
      </div>

      {statsPending ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }, (_, index) => (
            <div
              key={index}
              className="h-28 animate-pulse rounded-xl border bg-card"
            />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {cards.map((stat) => (
            <StatCard key={stat.label} stat={stat} />
          ))}
        </div>
      )}

      <section className="space-y-4">
        <div className="flex items-baseline justify-between gap-4">
          <h2 className="text-lg font-semibold">Latest inquiries</h2>
          <Button asChild variant="ghost" size="sm">
            <Link to="/admin/inquiries">
              View all
              <ArrowRight className="size-4" />
            </Link>
          </Button>
        </div>

        <div className="rounded-xl border bg-card">
          {leadsPending ? (
            <div className="h-40 animate-pulse" />
          ) : recent && recent.data.length > 0 ? (
            <ul className="divide-y">
              {recent.data.map((lead) => (
                <li
                  key={lead.id}
                  className="flex flex-wrap items-center justify-between gap-3 p-4"
                >
                  <div className="min-w-0">
                    <p className="flex items-center gap-2 font-medium">
                      {lead.name}
                      {!lead.is_read && (
                        <span className="rounded bg-gold/15 px-2 py-0.5 text-[0.6rem] font-semibold uppercase tracking-wider text-gold">
                          New
                        </span>
                      )}
                    </p>
                    <p className="truncate text-sm text-muted-foreground">
                      {lead.car?.title ?? "Vehicle removed"}
                    </p>
                  </div>
                  <p className="text-sm text-muted-foreground">{lead.email}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="p-8 text-center text-sm text-muted-foreground">
              No inquiries yet. Leads from the public showroom appear here.
            </p>
          )}
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Manage</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {sections.map((section) => (
            <Link
              key={section.to}
              to={section.to}
              className="flex items-start gap-4 rounded-xl border bg-card p-5 transition-colors hover:bg-accent"
            >
              <section.icon className="mt-0.5 size-5 shrink-0 text-gold" />
              <div className="min-w-0">
                <p className="flex items-center gap-1 font-medium">
                  {section.title}
                  <ArrowRight className="size-3.5" />
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {section.description}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        <Sparkles className="size-4 text-gold" />
        {pluralize(stats?.total_cars ?? 0, "vehicle")} published ·{" "}
        {pluralize(stats?.new_inquiries ?? 0, "lead")} awaiting a reply
      </p>
    </div>
  )
}
