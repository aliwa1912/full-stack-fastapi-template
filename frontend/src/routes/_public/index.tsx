import { useQuery } from "@tanstack/react-query"
import { createFileRoute, Link } from "@tanstack/react-router"
import { ArrowRight } from "lucide-react"

import { CarsService } from "@/client"
import { CarCard } from "@/components/Cars/CarCard"
import { Hero } from "@/components/Cars/Hero"
import { Button } from "@/components/ui/button"
import { pluralize } from "@/utils"

export const Route = createFileRoute("/_public/")({
  component: ShowroomHome,
  head: () => ({
    meta: [
      {
        title: "Aurelia Motorworks | Extraordinary Motor Cars",
      },
      {
        name: "description",
        content:
          "A curated collection of the world's finest motor cars, delivered with discretion.",
      },
    ],
  }),
})

function ShowroomHome() {
  const { data: featured } = useQuery({
    queryKey: ["cars", "featured"],
    queryFn: async () =>
      (
        await CarsService.readCars({
          query: { is_featured: true, limit: 6, sort: "newest" },
        })
      ).data,
  })

  const cars = featured?.data ?? []

  return (
    <>
      <Hero />

      <section className="mx-auto max-w-7xl px-6 py-20">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="text-[0.65rem] uppercase tracking-luxe text-gold">
              The collection
            </p>
            <h2 className="mt-3 font-display text-3xl text-white md:text-4xl">
              Featured inventory
            </h2>
          </div>
          <Button
            asChild
            variant="ghost"
            className="text-xs uppercase tracking-luxe text-gold hover:bg-transparent hover:text-gold-light"
          >
            <Link to="/inventory">
              View all
              <ArrowRight className="size-4" />
            </Link>
          </Button>
        </div>

        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {cars.map((car) => (
            <CarCard key={car.id} car={car} />
          ))}
        </div>

        {cars.length === 0 && (
          <div className="glass-panel mt-10 rounded-xl px-8 py-16 text-center">
            <p className="font-display text-lg text-white/70">
              The showroom is being curated
            </p>
            <p className="mt-2 text-sm text-white/40">
              New arrivals are photographed and added each week.
            </p>
          </div>
        )}
      </section>

      {featured && featured.count > 0 && (
        <section className="mx-auto max-w-7xl px-6 pb-4">
          <p className="text-center text-xs uppercase tracking-luxe text-white/30">
            {pluralize(featured.count, "vehicle")} currently available
          </p>
        </section>
      )}

      <PrivateViewingCta />
    </>
  )
}

function PrivateViewingCta() {
  return (
    <section id="private-viewing" className="mx-auto max-w-7xl px-6 py-24">
      <div className="glass-panel noise-overlay relative overflow-hidden rounded-2xl px-8 py-16 text-center md:px-16">
        <div className="relative z-10">
          <p className="text-[0.65rem] uppercase tracking-luxe text-gold">
            By appointment
          </p>
          <h2 className="mx-auto mt-4 max-w-2xl font-display text-3xl text-white md:text-4xl">
            Reserve a private viewing
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-white/50">
            Select a motor car and our concierge will arrange a private
            presentation at our showroom or at a location of your choosing.
          </p>
          <Button
            asChild
            size="lg"
            className="mt-8 h-12 bg-gold px-8 text-xs uppercase tracking-luxe text-obsidian hover:bg-gold-light"
          >
            <Link to="/inventory">
              Browse the collection
              <ArrowRight className="size-4" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  )
}
