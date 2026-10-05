import { useMutation, useQueryClient } from "@tanstack/react-query"
import { ArrowLeft, ArrowRight, Star, Trash2 } from "lucide-react"
import { useState } from "react"

import { AdminService, type CarImagePublic } from "@/client"
import { ConfirmDialog } from "@/components/Common/ConfirmDialog"
import { Button } from "@/components/ui/button"
import useCustomToast from "@/hooks/useCustomToast"
import { handleError, resolveImageUrl } from "@/utils"

interface ImageManagerProps {
  carId: string
  images: CarImagePublic[]
  onChanged?: () => void
}

export function ImageManager({ carId, images, onChanged }: ImageManagerProps) {
  const queryClient = useQueryClient()
  const { showSuccessToast, showErrorToast } = useCustomToast()
  const [pendingOrder, setPendingOrder] = useState<string[] | null>(null)
  const [deleting, setDeleting] = useState<CarImagePublic | null>(null)

  // Optimistic order while the mutation is in flight.
  const orderedImages: CarImagePublic[] = pendingOrder
    ? pendingOrder
        .map((id) => images.find((image) => image.id === id))
        .filter((image): image is CarImagePublic => Boolean(image))
    : images

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["cars"] })
    onChanged?.()
  }

  const reorderMutation = useMutation({
    mutationFn: (imageIds: string[]) =>
      AdminService.adminReorderCarImages({
        path: { car_id: carId },
        body: { image_ids: imageIds },
      }),
    onSuccess: () => showSuccessToast("Gallery order saved"),
    onError: handleError.bind(showErrorToast),
    onSettled: () => {
      setPendingOrder(null)
      invalidate()
    },
  })

  const setPrimaryMutation = useMutation({
    mutationFn: (imageId: string) =>
      AdminService.adminUpdateCarImage({
        path: { car_id: carId, image_id: imageId },
        query: { is_primary: true },
      }),
    onSuccess: () => showSuccessToast("Primary thumbnail updated"),
    onError: handleError.bind(showErrorToast),
    onSettled: invalidate,
  })

  const deleteMutation = useMutation({
    mutationFn: (imageId: string) =>
      AdminService.adminDeleteCarImage({
        path: { car_id: carId, image_id: imageId },
      }),
    onSuccess: () => {
      showSuccessToast("Photo removed")
      setDeleting(null)
    },
    onError: handleError.bind(showErrorToast),
    onSettled: () => {
      setPendingOrder(null)
      invalidate()
    },
  })

  const currentOrder = orderedImages.map((image) => image.id)

  const move = (index: number, direction: -1 | 1) => {
    const next = [...currentOrder]
    const target = index + direction
    if (target < 0 || target >= next.length) return
    ;[next[index], next[target]] = [next[target], next[index]]
    setPendingOrder(next)
    reorderMutation.mutate(next)
  }

  if (images.length === 0) {
    return (
      <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
        No photography published for this vehicle.
      </p>
    )
  }

  return (
    <div className="space-y-3">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">
        Drag order determines the lead photo. The first image is the thumbnail
        used across the showroom.
      </p>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {orderedImages.map((image, index) => (
          <div
            key={image.id}
            className="group relative aspect-4/3 overflow-hidden rounded-lg border"
          >
            <img
              src={resolveImageUrl(image.image_url)}
              alt=""
              className="size-full object-cover"
            />

            <span className="absolute left-2 top-2 flex size-6 items-center justify-center rounded-full bg-black/80 text-[0.65rem] font-semibold text-white">
              {index + 1}
            </span>

            {image.is_primary && (
              <span className="absolute bottom-2 left-2 flex items-center gap-1 bg-gold px-2 py-0.5 text-[0.55rem] font-semibold uppercase tracking-wider text-obsidian">
                <Star className="size-2.5 fill-obsidian" />
                Primary
              </span>
            )}

            <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-1 bg-linear-to-t from-black/90 to-transparent p-2 opacity-0 transition-opacity group-hover:opacity-100">
              <div className="flex gap-1">
                <Button
                  type="button"
                  size="icon-sm"
                  variant="secondary"
                  disabled={index === 0 || reorderMutation.isPending}
                  onClick={() => move(index, -1)}
                  aria-label="Move earlier"
                >
                  <ArrowLeft className="size-3.5" />
                </Button>
                <Button
                  type="button"
                  size="icon-sm"
                  variant="secondary"
                  disabled={
                    index === orderedImages.length - 1 ||
                    reorderMutation.isPending
                  }
                  onClick={() => move(index, 1)}
                  aria-label="Move later"
                >
                  <ArrowRight className="size-3.5" />
                </Button>
              </div>

              <div className="flex gap-1">
                {!image.is_primary && (
                  <Button
                    type="button"
                    size="icon-sm"
                    variant="secondary"
                    onClick={() => setPrimaryMutation.mutate(image.id)}
                    disabled={setPrimaryMutation.isPending}
                    aria-label="Set as primary"
                  >
                    <Star className="size-3.5" />
                  </Button>
                )}
                <Button
                  type="button"
                  size="icon-sm"
                  variant="destructive"
                  onClick={() => setDeleting(image)}
                  disabled={deleteMutation.isPending}
                  aria-label="Delete photo"
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <ConfirmDialog
        open={Boolean(deleting)}
        onOpenChange={(open) => !open && setDeleting(null)}
        title="Delete this photo?"
        description={
          "The photo and its file will be removed from this listing permanently. This cannot be undone."
        }
        confirmLabel="Delete photo"
        pending={deleteMutation.isPending}
        onConfirm={() => deleting && deleteMutation.mutate(deleting.id)}
      />
    </div>
  )
}

export default ImageManager
