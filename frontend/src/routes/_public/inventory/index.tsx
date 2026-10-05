import { useQuery } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import { useMemo, useState } from "react"

import { CarsService } from "@/client"
import { CarCard } from "@/components/Cars/CarCard"
import {
  type CarFilterState,
  CarFilters,
  DEFAULT_FILTERS,
} from "@/components/Cars/CarFilters"
import { pluralize } from "@/utils"

export const Route = createFileRoute("/_public/inventory/")({
  component: InventoryPage,
  head: () => ({
    meta: [
      {
        title: "Inventory | Aurelia Motorworks",
      },
      {
        name: "description",
        content:
          "Browse the full collection of motor cars available from Aurelia Motorworks.",
      },
    ],
  }),
})

const PAGE_SIZE = 9

function InventoryPage() {
  const [filters, setFilters] = useState<CarFilterState>(DEFAULT_FILTERS)
  const [page, setPage] = useState(0)

  const query = useMemo(
    () => ({
      skip: page * PAGE_SIZE,
      limit: PAGE_SIZE,
      sort: filters.sort,
      make: filters.make === "all" ? undefined : filters.make,
      year:
        filters.year === "all" ? undefined : Number.parseInt(filters.year, 10),
      min_price: filters.minPrice
        ? Number.parseInt(filters.minPrice, 10)
        : undefined,
      max_price: filters.maxPrice
        ? Number.parseInt(filters.maxPrice, 10)
        : undefined,
    }),
    [filters, page],
  )

  const { data, isPending } = useQuery({
    queryKey: ["cars", "inventory", query],
    queryFn: async () => (await CarsService.readCars({ query })).data,
  })

  const cars = data?.data ?? []
  const totalPages = data ? Math.max(1, Math.ceil(data.count / PAGE_SIZE)) : 1

  // A filter change always takes the visitor back to the first page.
  const applyFilters = (next: CarFilterState) => {
    setFilters(next)
    setPage(0)
  }

  return (
    <div className="mx-auto max-w-7xl px-6 py-16">
      <header className="max-w-2xl">
        <p className="text-[0.65rem] uppercase tracking-luxe text-gold">
          The collection
        </p>
        <h1 className="mt-3 font-display text-4xl text-white md:text-5xl">
          Inventory
        </h1>
        <p className="mt-4 text-sm leading-relaxed text-white/50">
          Every motor car is inspected, documented and presented from our
          private showroom.
        </p>
      </header>

      <div className="mt-10">
        <CarFilters value={filters} onChange={applyFilters} />
      </div>

      {data && (
        <p className="mt-8 text-[0.65rem] uppercase tracking-luxe text-white/30">
          {pluralize(data.count, "vehicle")} available
        </p>
      )}

      <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {cars.map((car) => (
          <CarCard key={car.id} car={car} />
        ))}
      </div>

      {isPending && (
        <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }, (_, index) => (
            <div
              key={index}
              className="glass-panel aspect-16/10 animate-pulse rounded-xl"
            />
          ))}
        </div>
      )}

      {!isPending && cars.length === 0 && (
        <div className="glass-panel mt-6 rounded-xl px-8 py-20 text-center">
          <p className="font-display text-lg text-white/70">
            No vehicles match your criteria
          </p>
          <p className="mt-2 text-sm text-white/40">
            Widen your filters or contact our concierge for off-market vehicles.
          </p>
        </div>
      )}

      {totalPages > 1 && (
        <nav className="mt-12 flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => setPage((current) => Math.max(0, current - 1))}
            disabled={page === 0}
            className="border border-amber-500/20 px-4 py-2 text-[0.6rem] uppercase tracking-luxe text-white/60 transition-colors hover:border-amber-500/50 hover:text-gold disabled:opacity-30"
          >
            Previous
          </button>
          <span className="text-[0.65rem] uppercase tracking-luxe text-white/40">
            {page + 1} / {totalPages}
          </span>
          <button
            type="button"
            onClick={() =>
              setPage((current) => Math.min(totalPages - 1, current + 1))
            }
            disabled={page + 1 >= totalPages}
            className="border border-amber-500/20 px-4 py-2 text-[0.6rem] uppercase tracking-luxe text-white/60 transition-colors hover:border-amber-500/50 hover:text-gold disabled:opacity-30"
          >
            Next
          </button>
        </nav>
      )}
    </div>
  )
}
