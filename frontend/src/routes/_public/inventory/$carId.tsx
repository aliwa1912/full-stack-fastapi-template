import { useQuery } from "@tanstack/react-query"
import { createFileRoute, Link } from "@tanstack/react-router"
import { ArrowLeft, Check } from "lucide-react"

import { CarsService } from "@/client"
import { CarGallery } from "@/components/Cars/CarGallery"
import { FinancingCalculator } from "@/components/Cars/FinancingCalculator"
import { InquiryForm } from "@/components/Cars/InquiryForm"
import { carImages, formatMileage, formatPrice } from "@/utils"

export const Route = createFileRoute("/_public/inventory/$carId")({
  component: CarDetailPage,
  head: ({ params }) => ({
    meta: [
      {
        title: "Vehicle | Aurelia Motorworks",
      },
      {
        name: "description",
        content: `Details and photography for vehicle ${params.carId}.`,
      },
    ],
  }),
})

function CarDetailPage() {
  const { carId } = Route.useParams()

  const {
    data: car,
    isPending,
    isError,
  } = useQuery({
    queryKey: ["cars", carId],
    queryFn: async () =>
      (await CarsService.readCar({ path: { car_id: carId } })).data,
  })

  if (isPending) {
    return (
      <div className="mx-auto max-w-7xl space-y-6 px-6 py-16">
        <div className="glass-panel aspect-16/9 animate-pulse rounded-2xl" />
        <div className="glass-panel h-64 animate-pulse rounded-xl" />
      </div>
    )
  }

  if (isError || !car) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-32 text-center">
        <h1 className="font-display text-3xl text-white">
          Vehicle unavailable
        </h1>
        <p className="mt-3 text-sm text-white/50">
          This motor car is no longer listed in our showroom.
        </p>
        <Link
          to="/inventory"
          className="mt-8 inline-flex items-center gap-2 text-xs uppercase tracking-luxe text-gold"
        >
          <ArrowLeft className="size-4" />
          Back to inventory
        </Link>
      </div>
    )
  }

  const specs = [
    { label: "Year", value: String(car.year) },
    { label: "Mileage", value: formatMileage(car.mileage) },
    { label: "Engine", value: car.engine ?? "n/a" },
    { label: "Transmission", value: car.transmission ?? "n/a" },
    { label: "Exterior", value: car.exterior_color ?? "n/a" },
    { label: "Interior", value: car.interior_color ?? "n/a" },
    { label: "VIN", value: car.vin ?? "n/a" },
    { label: "Reference", value: car.id.slice(0, 8).toUpperCase() },
  ]

  return (
    <div className="mx-auto max-w-7xl px-6 py-12">
      <Link
        to="/inventory"
        className="inline-flex items-center gap-2 text-[0.65rem] uppercase tracking-luxe text-white/40 transition-colors hover:text-gold"
      >
        <ArrowLeft className="size-3.5" />
        Inventory
      </Link>

      <header className="mt-6 flex flex-wrap items-end justify-between gap-6">
        <div>
          <p className="text-[0.65rem] uppercase tracking-luxe text-gold">
            {car.make} · {car.year}
          </p>
          <h1 className="mt-2 font-display text-4xl text-white md:text-5xl">
            {car.title}
          </h1>
        </div>
        <div className="text-right">
          <p className="font-display text-3xl text-gold-gradient">
            {formatPrice(car.price)}
          </p>
          {car.is_sold && (
            <p className="mt-1 text-[0.6rem] uppercase tracking-luxe text-white/40">
              Currently sold
            </p>
          )}
        </div>
      </header>

      <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_380px]">
        <div className="space-y-10">
          <CarGallery images={carImages(car)} alt={car.title} />

          {car.description && (
            <section>
              <h2 className="text-[0.65rem] uppercase tracking-luxe text-gold">
                Presentation
              </h2>
              <p className="mt-4 whitespace-pre-line text-sm leading-relaxed text-white/60">
                {car.description}
              </p>
            </section>
          )}

          <section>
            <h2 className="text-[0.65rem] uppercase tracking-luxe text-gold">
              Concierge assurances
            </h2>
            <ul className="mt-4 grid gap-3 sm:grid-cols-2">
              {[
                "150 point independent inspection",
                "Full service history verified",
                "Enclosed transport available",
                "Ownership concierge included",
              ].map((item) => (
                <li
                  key={item}
                  className="flex items-center gap-3 text-sm text-white/60"
                >
                  <Check className="size-4 shrink-0 text-gold" />
                  {item}
                </li>
              ))}
            </ul>
          </section>
        </div>

        {/* Sticky spec sheet with the calculator and inquiry form. */}
        <aside className="space-y-6 lg:sticky lg:top-28 lg:self-start">
          <div className="glass-panel rounded-xl p-6">
            <h2 className="text-[0.65rem] uppercase tracking-luxe text-gold">
              Specification
            </h2>
            <dl className="mt-4 divide-y divide-white/5">
              {specs.map((spec) => (
                <div
                  key={spec.label}
                  className="flex justify-between gap-4 py-3"
                >
                  <dt className="text-[0.6rem] uppercase tracking-luxe text-white/35">
                    {spec.label}
                  </dt>
                  <dd className="truncate text-sm text-white/80">
                    {spec.value}
                  </dd>
                </div>
              ))}
            </dl>
          </div>

          <FinancingCalculator price={car.price} />

          <InquiryForm carId={car.id} carTitle={car.title} />
        </aside>
      </div>
    </div>
  )
}
