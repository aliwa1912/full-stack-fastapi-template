import { Link } from "@tanstack/react-router"
import { Fuel, Settings2, Star } from "lucide-react"
import { useEffect, useState } from "react"
import type { CarPublic } from "@/client"
import { Badge } from "@/components/ui/badge"
import { carImages, formatMileage, formatPrice, resolveImageUrl } from "@/utils"

interface CarCardProps {
  car: CarPublic
}

const HOVER_INTERVAL = 2200

export function CarCard({ car }: CarCardProps) {
  const [activeIndex, setActiveIndex] = useState(0)
  const [isHovering, setIsHovering] = useState(false)

  const photos = carImages(car)
    .map((image) => resolveImageUrl(image.image_url))
    .filter((url): url is string => Boolean(url))

  // Cycle the gallery while the visitor rests on the card.
  useEffect(() => {
    if (!isHovering || photos.length < 2) return
    const timer = setInterval(() => {
      setActiveIndex((index) => (index + 1) % photos.length)
    }, HOVER_INTERVAL)
    return () => clearInterval(timer)
  }, [isHovering, photos.length])

  const showCarousel = photos.length > 1

  return (
    <Link
      to="/inventory/$carId"
      params={{ carId: car.id }}
      className="group relative block overflow-hidden rounded-xl border border-amber-500/15 bg-surface transition-all duration-500 hover:border-amber-500/40 hover:shadow-[0_20px_60px_-20px_rgba(212,175,55,0.35)]"
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => {
        setIsHovering(false)
        setActiveIndex(0)
      }}
    >
      <div className="relative aspect-16/10 overflow-hidden bg-obsidian">
        {photos.length > 0 ? (
          photos.map((photo, index) => (
            <img
              key={photo}
              src={photo}
              alt={`${car.title}, view ${index + 1}`}
              loading="lazy"
              className={`absolute inset-0 size-full object-cover transition-all duration-700 ${
                index === activeIndex
                  ? "scale-100 opacity-100"
                  : "scale-105 opacity-0"
              }`}
            />
          ))
        ) : (
          <div className="cinematic-surface flex size-full items-center justify-center">
            <span className="font-display text-xs uppercase tracking-luxe text-white/25">
              Photography pending
            </span>
          </div>
        )}

        <div className="absolute inset-0 bg-linear-to-t from-black/85 via-black/10 to-transparent" />

        {car.is_featured && (
          <Badge className="absolute left-4 top-4 gap-1 border-amber-500/40 bg-black/60 text-[0.6rem] uppercase tracking-luxe text-gold backdrop-blur-sm">
            <Star className="size-3 fill-gold text-gold" />
            Featured
          </Badge>
        )}

        {car.is_sold && (
          <span className="absolute right-4 top-4 bg-white/90 px-3 py-1 text-[0.6rem] font-semibold uppercase tracking-luxe text-obsidian">
            Sold
          </span>
        )}

        {showCarousel && (
          <div className="absolute bottom-4 left-4 flex gap-1.5">
            {photos.map((photo, index) => (
              <span
                key={photo}
                className={`h-1 rounded-full transition-all duration-300 ${
                  index === activeIndex ? "w-6 bg-gold" : "w-1.5 bg-white/40"
                }`}
              />
            ))}
          </div>
        )}
      </div>

      <div className="relative space-y-4 p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[0.6rem] uppercase tracking-luxe text-gold">
              {car.year} · {car.make}
            </p>
            <h3 className="mt-1 truncate font-display text-lg text-white">
              {car.model}
            </h3>
          </div>
          <p className="shrink-0 font-display text-lg text-gold-gradient">
            {formatPrice(car.price)}
          </p>
        </div>

        <dl className="grid grid-cols-3 gap-3 border-t border-white/5 pt-4 text-xs text-white/50">
          <div className="space-y-1">
            <dt className="flex items-center gap-1 text-[0.6rem] uppercase tracking-luxe text-white/30">
              <Fuel className="size-3" /> Mileage
            </dt>
            <dd className="text-white/80">{formatMileage(car.mileage)}</dd>
          </div>
          <div className="space-y-1">
            <dt className="flex items-center gap-1 text-[0.6rem] uppercase tracking-luxe text-white/30">
              <Settings2 className="size-3" /> Gearbox
            </dt>
            <dd className="truncate text-white/80">
              {car.transmission ?? "n/a"}
            </dd>
          </div>
          <div className="space-y-1">
            <dt className="text-[0.6rem] uppercase tracking-luxe text-white/30">
              Engine
            </dt>
            <dd className="truncate text-white/80">{car.engine ?? "n/a"}</dd>
          </div>
        </dl>
      </div>
    </Link>
  )
}

export default CarCard
