import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import type { ColumnDef } from "@tanstack/react-table"
import {
  ArrowUpDown,
  Images,
  Pencil,
  Sparkles,
  Tag,
  Trash2,
} from "lucide-react"
import { useMemo, useState } from "react"

import { AdminService, type CarPublic, type CarUpdate } from "@/client"
import { ImageManager } from "@/components/Cars/ImageManager"
import { VehicleForm } from "@/components/Cars/VehicleForm"
import { ConfirmDialog } from "@/components/Common/ConfirmDialog"
import { DataTable } from "@/components/Common/DataTable"
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
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

export const Route = createFileRoute("/_layout/admin/inventory")({
  component: ManageInventory,
  head: () => ({
    meta: [
      {
        title: "Inventory - Aurelia Motorworks",
      },
    ],
  }),
})

function ManageInventory() {
  const queryClient = useQueryClient()
  const { showSuccessToast, showErrorToast } = useCustomToast()

  const [editing, setEditing] = useState<CarPublic | null>(null)
  const [media, setMedia] = useState<CarPublic | null>(null)
  const [deleting, setDeleting] = useState<CarPublic | null>(null)

  const { data, isPending } = useQuery({
    queryKey: ["cars", "admin"],
    queryFn: async () =>
      (
        await AdminService.readAllCars({
          query: { limit: 200, sort: "newest" },
        })
      ).data,
  })

  const cars = data?.data ?? []

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["cars"] })

  const patchMutation = useMutation({
    mutationFn: ({ carId, patch }: { carId: string; patch: CarUpdate }) =>
      AdminService.adminUpdateCar({ path: { car_id: carId }, body: patch }),
    onError: handleError.bind(showErrorToast),
    onSettled: refresh,
  })

  const deleteMutation = useMutation({
    mutationFn: (carId: string) =>
      AdminService.adminDeleteCar({ path: { car_id: carId } }),
    onSuccess: () => {
      showSuccessToast("Vehicle removed")
      setDeleting(null)
    },
    onError: handleError.bind(showErrorToast),
    onSettled: () => {
      refresh()
      setMedia(null)
      setEditing(null)
    },
  })

  const columns = useMemo<ColumnDef<CarPublic>[]>(
    () => [
      {
        id: "vehicle",
        header: ({ column }) => (
          <button
            type="button"
            className="flex items-center gap-1"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Vehicle
            <ArrowUpDown className="size-3.5" />
          </button>
        ),
        cell: ({ row }) => {
          const car = row.original
          const cover = coverImage(car)
          return (
            <div className="flex items-center gap-3">
              <div className="aspect-16/10 w-20 shrink-0 overflow-hidden rounded bg-muted">
                {cover && (
                  <img
                    src={resolveImageUrl(cover.image_url)}
                    alt=""
                    className="size-full object-cover"
                  />
                )}
              </div>
              <div className="min-w-0">
                <p className="truncate font-medium">{car.title}</p>
                <p className="text-xs text-muted-foreground">
                  {car.make} · {car.model} · {car.year}
                </p>
              </div>
            </div>
          )
        },
      },
      {
        accessorKey: "price",
        header: () => <div className="text-right">Price</div>,
        cell: ({ row }) => (
          <div className="text-right font-medium">
            {formatPrice(row.original.price)}
          </div>
        ),
      },
      {
        accessorKey: "mileage",
        header: () => <div className="text-right">Mileage</div>,
        cell: ({ row }) => (
          <div className="text-right text-muted-foreground">
            {formatMileage(row.original.mileage)}
          </div>
        ),
      },
      {
        id: "status",
        header: "Status",
        cell: ({ row }) => {
          const car = row.original
          return (
            <div className="flex flex-wrap gap-1">
              {car.is_featured && (
                <span className="rounded bg-gold/15 px-2 py-0.5 text-[0.6rem] font-semibold uppercase tracking-wider text-gold">
                  Featured
                </span>
              )}
              {car.is_sold && (
                <span className="rounded bg-muted px-2 py-0.5 text-[0.6rem] font-semibold uppercase tracking-wider text-muted-foreground">
                  Sold
                </span>
              )}
              <span className="rounded bg-muted px-2 py-0.5 text-[0.6rem] font-semibold uppercase tracking-wider text-muted-foreground">
                {pluralize(carImages(car).length, "photo")}
              </span>
            </div>
          )
        },
      },
      {
        id: "actions",
        header: () => <div className="text-right">Actions</div>,
        cell: ({ row }) => {
          const car = row.original
          return (
            <div className="flex justify-end gap-1">
              <Button
                size="icon"
                variant="outline"
                onClick={() => setMedia(car)}
                aria-label="Manage photography"
              >
                <Images className="size-4" />
              </Button>
              <Button
                size="icon"
                variant="outline"
                onClick={() => setEditing(car)}
                aria-label="Edit vehicle"
              >
                <Pencil className="size-4" />
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    size="icon"
                    variant="outline"
                    aria-label="More actions"
                  >
                    <Tag className="size-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Visibility</DropdownMenuLabel>
                  <DropdownMenuItem
                    onClick={() =>
                      patchMutation.mutate({
                        carId: car.id,
                        patch: { is_featured: !car.is_featured },
                      })
                    }
                  >
                    <Sparkles className="size-4" />
                    {car.is_featured ? "Remove featured" : "Mark as featured"}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() =>
                      patchMutation.mutate({
                        carId: car.id,
                        patch: { is_sold: !car.is_sold },
                      })
                    }
                  >
                    {car.is_sold ? "Mark as available" : "Mark as sold"}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <Button
                size="icon"
                variant="outline"
                onClick={() => setDeleting(car)}
                disabled={deleteMutation.isPending}
                aria-label="Delete vehicle"
              >
                <Trash2 className="size-4 text-destructive" />
              </Button>
            </div>
          )
        },
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [deleteMutation.isPending, patchMutation.mutate],
  )

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Inventory</h1>
        <p className="text-muted-foreground">
          Total control across every uploader: listings, photography ordering
          and showroom visibility.
        </p>
      </div>

      <section className="space-y-4">
        <div className="flex items-baseline justify-between">
          <h2 className="text-lg font-semibold">Vehicle Inventory</h2>
          <span className="text-sm text-muted-foreground">
            {cars.length} vehicle{cars.length === 1 ? "" : "s"}
          </span>
        </div>

        {isPending ? (
          <div className="h-64 animate-pulse rounded-xl border bg-card" />
        ) : (
          <DataTable columns={columns} data={cars} />
        )}
      </section>

      {/* Edit dialog */}
      <Dialog
        open={Boolean(editing)}
        onOpenChange={(open) => !open && setEditing(null)}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Edit vehicle</DialogTitle>
            <DialogDescription>{editing?.title}</DialogDescription>
          </DialogHeader>

          {editing && (
            <VehicleForm
              car={editing}
              onCancel={() => setEditing(null)}
              onSuccess={() => {
                setEditing(null)
                refresh()
              }}
            />
          )}

          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Close</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Media dialog */}
      <Dialog
        open={Boolean(media)}
        onOpenChange={(open) => !open && setMedia(null)}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Manage photography</DialogTitle>
            <DialogDescription>{media?.title}</DialogDescription>
          </DialogHeader>

          {media && (
            <ImageManager
              carId={media.id}
              images={carImages(media)}
              onChanged={refresh}
            />
          )}

          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Done</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Delete confirm */}
      <ConfirmDialog
        open={Boolean(deleting)}
        onOpenChange={(open) => !open && setDeleting(null)}
        title="Remove this vehicle?"
        description={
          deleting
            ? `${deleting.title} will be deleted along with its photography and inquiries. This cannot be undone.`
            : ""
        }
        confirmLabel="Remove vehicle"
        pending={deleteMutation.isPending}
        onConfirm={() => deleting && deleteMutation.mutate(deleting.id)}
      />
    </div>
  )
}
