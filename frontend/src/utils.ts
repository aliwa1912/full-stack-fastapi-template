import { AxiosError } from "axios"

import type { CarImagePublic, CarPublic } from "@/client"

function extractErrorMessage(err: Error): string {
  if (err instanceof AxiosError) {
    const errDetail = (err.response?.data as any)?.detail
    if (Array.isArray(errDetail) && errDetail.length > 0) {
      return errDetail[0].msg
    }
    if (typeof errDetail === "string") {
      return errDetail
    }
    return err.message
  }
  return "Something went wrong."
}

export const handleError = function (this: (msg: string) => void, err: Error) {
  const errorMessage = extractErrorMessage(err)
  this(errorMessage)
}

export const getInitials = (name: string): string => {
  return name
    .split(" ")
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase()
}

const API_URL = import.meta.env.VITE_API_URL ?? ""

/**
 * Turn a stored image path into something the browser can load.
 *
 * The API already returns absolute URLs, but banners and older records may hold a
 * bare `/uploads/...` path, which still has to be pointed at the API host.
 */
export const resolveImageUrl = (
  url: string | null | undefined,
): string | undefined => {
  if (!url) return undefined
  if (url.startsWith("http://") || url.startsWith("https://")) return url
  return `${API_URL.replace(/\/$/, "")}/${url.replace(/^\//, "")}`
}

export const formatPrice = (price: number | null | undefined): string => {
  if (price === null || price === undefined) return "Price on request"
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(price)
}

export const formatMileage = (mileage: number | null | undefined): string => {
  if (mileage === null || mileage === undefined) return "n/a"
  return `${new Intl.NumberFormat("en-US").format(mileage)} mi`
}

export const pluralize = (count: number, singular: string, plural?: string) =>
  `${count} ${count === 1 ? singular : (plural ?? `${singular}s`)}`

/**
 * `images` is optional in the generated schema, so always read galleries
 * through this helper instead of touching `car.images` directly.
 */
export const carImages = (car: CarPublic): CarImagePublic[] => car.images ?? []

export const coverImage = (car: CarPublic): CarImagePublic | undefined =>
  carImages(car).find((image) => image.is_primary) ?? carImages(car)[0]
