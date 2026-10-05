import { ChevronLeft, ChevronRight, Expand, X } from "lucide-react"
import { useCallback, useEffect, useState } from "react"

import type { CarImagePublic } from "@/client"
import { cn } from "@/lib/utils"
import { resolveImageUrl } from "@/utils"

interface CarGalleryProps {
  images: CarImagePublic[]
  alt: string
}

export function CarGallery({ images, alt }: CarGalleryProps) {
  const photos = images
    .map((image) => resolveImageUrl(image.image_url))
    .filter((url): url is string => Boolean(url))

  const [index, setIndex] = useState(0)
  const [isLightboxOpen, setIsLightboxOpen] = useState(false)

  const goTo = useCallback(
    (next: number) => {
      if (photos.length === 0) return
      setIndex((next + photos.length) % photos.length)
    },
    [photos.length],
  )

  const onKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsLightboxOpen(false)
      if (event.key === "ArrowRight") goTo(index + 1)
      if (event.key === "ArrowLeft") goTo(index - 1)
    },
    [goTo, index],
  )

  useEffect(() => {
    if (!isLightboxOpen) return
    document.addEventListener("keydown", onKeyDown)
    document.body.style.overflow = "hidden"
    return () => {
      document.removeEventListener("keydown", onKeyDown)
      document.body.style.overflow = ""
    }
  }, [isLightboxOpen, onKeyDown])

  if (photos.length === 0) {
    return (
      <div className="cinematic-surface flex aspect-16/9 items-center justify-center rounded-2xl border border-amber-500/15">
        <span className="font-display text-sm uppercase tracking-luxe text-white/25">
          Photography pending
        </span>
      </div>
    )
  }

  const openLightbox = (next: number) => {
    setIndex(next)
    setIsLightboxOpen(true)
  }

  return (
    <>
      <div className="space-y-3">
        <button
          type="button"
          onClick={() => openLightbox(index)}
          className="group relative block aspect-16/9 w-full overflow-hidden rounded-2xl border border-amber-500/15"
        >
          <img
            src={photos[index]}
            alt={`${alt}, view ${index + 1}`}
            className="size-full object-cover transition-transform duration-700 group-hover:scale-105"
          />
          <span className="glass-panel absolute bottom-4 right-4 flex items-center gap-2 rounded-full px-4 py-2 text-[0.6rem] uppercase tracking-luxe text-white">
            <Expand className="size-3.5" />
            {index + 1} / {photos.length}
          </span>
        </button>

        {photos.length > 1 && (
          <div className="flex gap-3 overflow-x-auto pb-1">
            {photos.map((photo, photoIndex) => (
              <button
                key={photo}
                type="button"
                onClick={() => setIndex(photoIndex)}
                onDoubleClick={() => openLightbox(photoIndex)}
                className={cn(
                  "relative aspect-16/10 w-28 shrink-0 overflow-hidden rounded-lg border transition-all",
                  photoIndex === index
                    ? "border-gold opacity-100"
                    : "border-white/10 opacity-50 hover:opacity-80",
                )}
              >
                <img
                  src={photo}
                  alt={`${alt} thumbnail ${photoIndex + 1}`}
                  className="size-full object-cover"
                />
              </button>
            ))}
          </div>
        )}
      </div>

      {isLightboxOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label={`${alt} gallery`}
          onClick={(event) => {
            if (event.target === event.currentTarget) setIsLightboxOpen(false)
          }}
          onKeyDown={(event) => {
            if (event.key === "Escape") setIsLightboxOpen(false)
          }}
        >
          <button
            type="button"
            onClick={() => setIsLightboxOpen(false)}
            className="absolute right-6 top-6 text-white/70 transition-colors hover:text-gold"
            aria-label="Close gallery"
          >
            <X className="size-8" />
          </button>

          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation()
              goTo(index - 1)
            }}
            className="absolute left-4 text-white/60 transition-colors hover:text-gold md:left-10"
            aria-label="Previous photo"
          >
            <ChevronLeft className="size-10" />
          </button>

          <img
            src={photos[index]}
            alt={`${alt}, view ${index + 1}`}
            className="max-h-[85vh] max-w-[90vw] object-contain"
          />

          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation()
              goTo(index + 1)
            }}
            className="absolute right-4 text-white/60 transition-colors hover:text-gold md:right-10"
            aria-label="Next photo"
          >
            <ChevronRight className="size-10" />
          </button>

          <span className="absolute bottom-8 text-[0.65rem] uppercase tracking-luxe text-white/50">
            {index + 1} / {photos.length}
          </span>
        </div>
      )}
    </>
  )
}

export default CarGallery
