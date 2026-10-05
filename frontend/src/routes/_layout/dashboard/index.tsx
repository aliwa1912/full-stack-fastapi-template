import { useQuery } from "@tanstack/react-query"
import { createFileRoute, Link } from "@tanstack/react-router"
import { ArrowRight, CarFront, Upload } from "lucide-react"

import { CarsService } from "@/client"
import { Button } from "@/components/ui/button"
import useAuth from "@/hooks/useAuth"

export const Route = createFileRoute("/_layout/dashboard/")({
  component: Dashboard,
  head: () => ({
    meta: [
      {
        title: "Dashboard - Aurelia Motorworks",
      },
    ],
  }),
})

function Dashboard() {
  const { user: currentUser } = useAuth()

  const { data: mine } = useQuery({
    queryKey: ["cars", "mine"],
    queryFn: async () =>
      (
        await CarsService.readCars({
          query: { limit: 100, include_sold: true, sort: "newest" },
        })
      ).data,
  })

  const cars = mine?.data ?? []
  const available = cars.filter((car) => !car.is_sold)

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Welcome back, {currentUser?.full_name || currentUser?.email}
        </h1>
        <p className="text-muted-foreground">
          Manage your listings and photography.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border bg-card p-6">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            Available
          </p>
          <p className="mt-2 font-display text-3xl">{available.length}</p>
        </div>
        <div className="rounded-xl border bg-card p-6">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            Total listings
          </p>
          <p className="mt-2 font-display text-3xl">{cars.length}</p>
        </div>
      </div>

      <div className="rounded-xl border bg-card p-8 text-center">
        <CarFront className="mx-auto size-8 text-primary" />
        <h2 className="mt-4 text-lg font-semibold">Add a motor car</h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
          Create a listing with full specification and upload the photography
          for the public showroom.
        </p>
        <Button asChild className="mt-6">
          <Link to="/dashboard/vehicles">
            <Upload className="size-4" />
            Manage Vehicles
            <ArrowRight className="size-4" />
          </Link>
        </Button>
      </div>
    </div>
  )
}
