import { useMutation, useQueryClient } from "@tanstack/react-query"
import { ImagePlus, Trash2, Upload, X } from "lucide-react"
import { useCallback, useEffect, useRef, useState } from "react"

import { type CarImagePublic, CarsService } from "@/client"
import { ConfirmDialog } from "@/components/Common/ConfirmDialog"
import { Button } from "@/components/ui/button"
import { LoadingButton } from "@/components/ui/loading-button"
import useCustomToast from "@/hooks/useCustomToast"
import { cn } from "@/lib/utils"
import { handleError, resolveImageUrl } from "@/utils"

const MAX_FILES = 12

interface Preview {
  key: string
  file: File
  url: string
}

interface ImageUploaderProps {
  carId: string
  existingImages: CarImagePublic[]
  onChanged?: () => void
  readOnly?: boolean
}

export function ImageUploader({
  carId,
  existingImages,
  onChanged,
  readOnly = false,
}: ImageUploaderProps) {
  const queryClient = useQueryClient()
  const { showSuccessToast, showErrorToast } = useCustomToast()
  const inputRef = useRef<HTMLInputElement>(null)

  const [previews, setPreviews] = useState<Preview[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const [deleting, setDeleting] = useState<CarImagePublic | null>(null)

  // Object URLs must be revoked or the tab leaks memory.
  useEffect(() => {
    return () => {
      for (const preview of previews) {
        URL.revokeObjectURL(preview.url)
      }
    }
  }, [previews])

  const addFiles = useCallback((incoming: FileList | File[]) => {
    const images = Array.from(incoming).filter((file) =>
      file.type.startsWith("image/"),
    )
    setPreviews((current) => {
      const room = MAX_FILES - current.length
      return [
        ...current,
        ...images.slice(0, room).map((file) => ({
          key: `${file.name}-${file.size}-${crypto.randomUUID()}`,
          file,
          url: URL.createObjectURL(file),
        })),
      ]
    })
  }, [])

  const removePreview = (key: string) => {
    setPreviews((current) => {
      const target = current.find((preview) => preview.key === key)
      if (target) URL.revokeObjectURL(target.url)
      return current.filter((preview) => preview.key !== key)
    })
  }

  const uploadMutation = useMutation({
    mutationFn: (files: File[]) =>
      CarsService.uploadCarImages({
        path: { car_id: carId },
        body: { files },
      }),
    onSuccess: () => {
      showSuccessToast("Photography uploaded")
      setPreviews([])
    },
    onError: handleError.bind(showErrorToast),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["cars"] })
      onChanged?.()
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (imageId: string) =>
      CarsService.deleteCarImage({
        path: { car_id: carId, image_id: imageId },
      }),
    onSuccess: () => {
      showSuccessToast("Photo removed")
      setDeleting(null)
    },
    onError: handleError.bind(showErrorToast),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["cars"] })
      onChanged?.()
    },
  })

  if (readOnly) {
    return (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {existingImages.map((image) => (
          <div
            key={image.id}
            className="relative aspect-4/3 overflow-hidden rounded-lg border border-amber-500/15"
          >
            <img
              src={resolveImageUrl(image.image_url)}
              alt=""
              className="size-full object-cover"
            />
            {image.is_primary && (
              <span className="absolute left-2 top-2 bg-gold px-2 py-0.5 text-[0.55rem] font-semibold uppercase tracking-wider text-obsidian">
                Primary
              </span>
            )}
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div
        className={cn(
          "rounded-xl border-2 border-dashed transition-colors",
          isDragging
            ? "border-gold bg-gold/5"
            : "border-amber-500/25 hover:border-amber-500/50",
        )}
      >
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          onDragOver={(event) => {
            event.preventDefault()
            setIsDragging(true)
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(event) => {
            event.preventDefault()
            setIsDragging(false)
            addFiles(event.dataTransfer.files)
          }}
          className="flex w-full cursor-pointer flex-col items-center justify-center rounded-xl px-6 py-12 text-center"
        >
          <ImagePlus className="size-8 text-gold" />
          <p className="mt-4 text-sm font-medium">
            Drag photography here, or click to browse
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            JPEG, PNG, WebP or AVIF · up to {MAX_FILES} images
          </p>
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(event) => {
            if (event.target.files) addFiles(event.target.files)
            event.target.value = ""
          }}
        />
      </div>

      {previews.length > 0 && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {previews.map((preview, index) => (
              <div
                key={preview.key}
                className="group relative aspect-4/3 overflow-hidden rounded-lg border"
              >
                <img
                  src={preview.url}
                  alt={preview.file.name}
                  className="size-full object-cover"
                />
                {index === 0 && (
                  <span className="absolute left-2 top-2 bg-white/90 px-2 py-0.5 text-[0.55rem] font-semibold uppercase tracking-wider text-obsidian">
                    Lead
                  </span>
                )}
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation()
                    removePreview(preview.key)
                  }}
                  className="absolute right-2 top-2 rounded-full bg-black/70 p-1.5 text-white opacity-0 transition-opacity group-hover:opacity-100"
                  aria-label={`Remove ${preview.file.name}`}
                >
                  <X className="size-3.5" />
                </button>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              {previews.length} photo{previews.length === 1 ? "" : "s"} ready
            </p>
            <LoadingButton
              loading={uploadMutation.isPending}
              onClick={() =>
                uploadMutation.mutate(previews.map((preview) => preview.file))
              }
            >
              <Upload className="size-4" />
              Upload photography
            </LoadingButton>
          </div>
        </div>
      )}

      {existingImages.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            Published photography
          </p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {existingImages.map((image) => (
              <div
                key={image.id}
                className="group relative aspect-4/3 overflow-hidden rounded-lg border"
              >
                <img
                  src={resolveImageUrl(image.image_url)}
                  alt=""
                  className="size-full object-cover"
                />
                {image.is_primary && (
                  <span className="absolute left-2 top-2 bg-gold px-2 py-0.5 text-[0.55rem] font-semibold uppercase tracking-wider text-obsidian">
                    Primary
                  </span>
                )}

                <div className="absolute inset-x-0 bottom-0 flex justify-end gap-1 bg-linear-to-t from-black/85 to-transparent p-2 opacity-0 transition-opacity group-hover:opacity-100">
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
            ))}
          </div>
        </div>
      )}

      <ConfirmDialog
        open={Boolean(deleting)}
        onOpenChange={(open) => !open && setDeleting(null)}
        title="Delete this photo?"
        description="The photo and its file will be removed from this listing permanently. This cannot be undone."
        confirmLabel="Delete photo"
        pending={deleteMutation.isPending}
        onConfirm={() => deleting && deleteMutation.mutate(deleting.id)}
      />
    </div>
  )
}

export default ImageUploader
