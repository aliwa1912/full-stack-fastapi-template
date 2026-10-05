import { createFileRoute } from "@tanstack/react-router"

import { SiteSettingsManager } from "@/components/Cars/SiteSettingsManager"

export const Route = createFileRoute("/_layout/admin/site")({
  component: AdminSite,
  head: () => ({
    meta: [
      {
        title: "Site & Branding - Aurelia Motorworks",
      },
    ],
  }),
})

function AdminSite() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Site &amp; Branding
        </h1>
        <p className="text-muted-foreground">
          What visitors see on the public showroom. Changes apply immediately.
        </p>
      </div>

      <div className="rounded-xl border bg-card p-6">
        <SiteSettingsManager />
      </div>
    </div>
  )
}
