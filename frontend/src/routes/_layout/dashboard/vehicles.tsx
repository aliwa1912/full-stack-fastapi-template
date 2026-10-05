import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import { Check, Pencil, Plus, Trash2 } from "lucide-react"
import { useState } from "react"

import { type CarPublic, CarsService } from "@/client"
import { ImageUploader } from "@/components/Cars/ImageUploader"
import { VehicleForm } from "@/components/Cars/VehicleForm"
import { ConfirmDialog } from "@/components/Common/ConfirmDialog"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import useAuth from "@/hooks/useAuth"
import useCustomToast from "@/hooks/useCustomToast"
import {
  carImages,
  coverImage,
  formatMileage,
  formatPrice,
  handleError,
  pluralize,
  resolveImageUrl,
} from "@/utils"

export const Route = createFileRoute("/_layout/dashboard/vehicles")({
  component: VehiclesDashboard,
  head: () => ({
    meta: [
      {
        title: "My Vehicles - Aurelia Motorworks",
      },
    ],
  }),
})

function VehiclesDashboard() {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const { showSuccessToast, showErrorToast } = useCustomToast()

  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editing, setEditing] = useState<CarPublic | null>(null)
  const [selected, setSelected] = useState<CarPublic | null>(null)
  const [deleting, setDeleting] = useState<CarPublic | null>(null)

  const { data, isPending } = useQuery({
    queryKey: ["cars", "mine"],
    queryFn: async () =>
      (
        await CarsService.readCars({
          query: { limit: 100, include_sold: true, sort: "newest" },
        })
      ).data,
  })

  const cars = (data?.data ?? []).filter(
    (car) => car.created_by_id === user?.id,
  )

  const deleteMutation = useMutation({
    mutationFn: (carId: string) =>
      CarsService.deleteCar({ path: { car_id: carId } }),
    onSuccess: () => {
      showSuccessToast("Listing removed")
      setDeleting(null)
    },
    onError: handleError.bind(showErrorToast),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["cars"] })
      setSelected(null)
    },
  })

  const openCreate = () => {
    setEditing(null)
    setSelected(null)
    setIsFormOpen(true)
  }

  const openEdit = (car: CarPublic) => {
    setEditing(car)
    setSelected(null)
    setIsFormOpen(true)
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">My Vehicles</h1>
          <p className="text-muted-foreground">
            Create listings and publish photography to the showroom.
          </p>
        </div>
        <Button
          onClick={openCreate}
          className="bg-gold text-obsidian hover:bg-gold-light"
        >
          <Plus className="size-4" />
          Add vehicle
        </Button>
      </div>

      {isPending && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }, (_, index) => (
            <div
              key={index}
              className="h-64 animate-pulse rounded-xl border bg-card"
            />
          ))}
        </div>
      )}

      {!isPending && cars.length === 0 && (
        <div className="rounded-xl border border-dashed bg-card p-16 text-center">
          <p className="text-lg font-semibold">No listings yet</p>
          <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
            Add your first motor car, then upload the photography that will
            appear on the public showroom.
          </p>
          <Button onClick={openCreate} className="mt-6">
            <Plus className="size-4" />
            Add vehicle
          </Button>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cars.map((car) => {
          const cover = resolveImageUrl(coverImage(car)?.image_url)

          return (
            <div
              key={car.id}
              className="group overflow-hidden rounded-xl border bg-card"
            >
              <div className="relative aspect-16/10 bg-muted">
                {cover ? (
                  <img
                    src={cover}
                    alt={car.title}
                    className="size-full object-cover"
                  />
                ) : (
                  <div className="flex size-full items-center justify-center text-xs text-muted-foreground">
                    No photography
                  </div>
                )}
                {car.is_sold && (
                  <span className="absolute right-3 top-3 bg-white/90 px-2 py-0.5 text-[0.6rem] font-semibold uppercase tracking-wider text-obsidian">
                    Sold
                  </span>
                )}
                {car.is_featured && (
                  <span className="absolute left-3 top-3 flex items-center gap-1 bg-gold px-2 py-0.5 text-[0.6rem] font-semibold uppercase tracking-wider text-obsidian">
                    <Check className="size-3" />
                    Featured
                  </span>
                )}
              </div>

              <div className="space-y-3 p-4">
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    {car.make} · {car.year}
                  </p>
                  <p className="mt-1 truncate font-medium">{car.title}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {formatPrice(car.price)} · {formatMileage(car.mileage)}
                  </p>
                </div>

                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  {pluralize(carImages(car).length, "photo")}
                </div>

                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1"
                    onClick={() => setSelected(car)}
                  >
                    Photography
                  </Button>
                  <Button
                    size="icon"
                    variant="outline"
                    onClick={() => openEdit(car)}
                    aria-label={`Edit ${car.title}`}
                  >
                    <Pencil className="size-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="outline"
                    onClick={() => setDeleting(car)}
                    disabled={deleteMutation.isPending}
                    aria-label={`Delete ${car.title}`}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Create / edit dialog */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>
              {editing ? "Edit listing" : "Add a vehicle"}
            </DialogTitle>
            <DialogDescription>
              {editing
                ? "Update the specification of this motor car."
                : "Fill in the specification to publish a new listing."}
            </DialogDescription>
          </DialogHeader>

          <VehicleForm
            car={editing ?? undefined}
            onCancel={() => setIsFormOpen(false)}
            onSuccess={() => {
              setIsFormOpen(false)
              setEditing(null)
              queryClient.invalidateQueries({ queryKey: ["cars"] })
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Photography dialog */}
      <Dialog
        open={Boolean(selected)}
        onOpenChange={(open) => !open && setSelected(null)}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Photography</DialogTitle>
            <DialogDescription>{selected?.title}</DialogDescription>
          </DialogHeader>

          {selected && (
            <ImageUploader
              carId={selected.id}
              existingImages={carImages(selected)}
              onChanged={() => {
                queryClient.invalidateQueries({ queryKey: ["cars"] })
              }}
            />
          )}

          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Done</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={Boolean(deleting)}
        onOpenChange={(open) => !open && setDeleting(null)}
        title="Remove this listing?"
        description={
          deleting
            ? `${deleting.title} will be removed from your dashboard along with its photography and any inquiries. This cannot be undone.`
            : ""
        }
        confirmLabel="Remove listing"
        pending={deleteMutation.isPending}
        onConfirm={() => deleting && deleteMutation.mutate(deleting.id)}
      />
    </div>
  )
}
