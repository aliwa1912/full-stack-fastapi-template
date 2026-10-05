import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation } from "@tanstack/react-query"
import { useForm } from "react-hook-form"
import { z } from "zod"

import {
  type CarCreate,
  type CarPublic,
  CarsService,
  type CarUpdate,
} from "@/client"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { LoadingButton } from "@/components/ui/loading-button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import useCustomToast from "@/hooks/useCustomToast"
import { handleError } from "@/utils"

const currentYear = new Date().getFullYear()
const YEAR_OPTIONS = Array.from(
  { length: 60 },
  (_, index) => currentYear + 1 - index,
)

const TRANSMISSIONS = [
  "Automatic",
  "Manual",
  "7-Speed DCT",
  "8-Speed DCT",
  "9-Speed DCT",
  "CVT",
  "Single Speed",
] as const

const formSchema = z.object({
  title: z.string().min(1, { message: "A listing title is required" }),
  make: z.string().min(1, { message: "Make is required" }),
  model: z.string().min(1, { message: "Model is required" }),
  year: z
    .number({ message: "Year is required" })
    .int()
    .min(1886, { message: "Year looks too early" })
    .max(currentYear + 2, { message: "Year is in the future" }),
  price: z
    .number({ message: "Price is required" })
    .int({ message: "Price must be a whole amount" })
    .min(0, { message: "Price must be zero or more" }),
  mileage: z
    .number({ message: "Mileage is required" })
    .int({ message: "Mileage must be a whole number" })
    .min(0, { message: "Mileage must be zero or more" }),
  engine: z.string().optional(),
  transmission: z.string().optional(),
  exterior_color: z.string().optional(),
  interior_color: z.string().optional(),
  vin: z
    .string()
    .max(17, { message: "A VIN is at most 17 characters" })
    .optional(),
  description: z.string().optional(),
  is_featured: z.boolean(),
})

type FormValues = z.infer<typeof formSchema>

/** `type="number"` inputs hand react-hook-form a string unless told otherwise. */
const asNumber = (value: string) =>
  value === "" ? Number.NaN : Number.parseFloat(value)

interface VehicleFormProps {
  car?: CarPublic
  onSuccess?: (car: CarPublic) => void
  onCancel?: () => void
}

export function VehicleForm({ car, onSuccess, onCancel }: VehicleFormProps) {
  const { showSuccessToast, showErrorToast } = useCustomToast()
  const isEditing = Boolean(car)

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    mode: "onBlur",
    defaultValues: {
      title: car?.title ?? "",
      make: car?.make ?? "",
      model: car?.model ?? "",
      year: car?.year ?? currentYear,
      price: car?.price ?? 0,
      mileage: car?.mileage ?? 0,
      engine: car?.engine ?? "",
      transmission: car?.transmission ?? "",
      exterior_color: car?.exterior_color ?? "",
      interior_color: car?.interior_color ?? "",
      vin: car?.vin ?? "",
      description: car?.description ?? "",
      is_featured: car?.is_featured ?? false,
    },
  })

  const mutation = useMutation({
    mutationFn: (values: FormValues) => {
      const payload: CarCreate = {
        ...values,
        engine: values.engine || null,
        transmission: values.transmission || null,
        exterior_color: values.exterior_color || null,
        interior_color: values.interior_color || null,
        vin: values.vin || null,
        description: values.description || null,
      }

      if (car) {
        const update: CarUpdate = { ...payload, is_sold: car.is_sold }
        return CarsService.updateCar({ path: { car_id: car.id }, body: update })
      }
      return CarsService.createCar({ body: payload })
    },
    onSuccess: (response) => {
      showSuccessToast(
        isEditing ? "Listing updated" : "Listing published to your showroom",
      )
      form.reset()
      onSuccess?.(response.data)
    },
    onError: handleError.bind(showErrorToast),
  })

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit((values) => mutation.mutate(values))}
        className="space-y-6"
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="title"
            render={({ field }) => (
              <FormItem className="sm:col-span-2">
                <FormLabel>Listing title</FormLabel>
                <FormControl>
                  <Input
                    placeholder="2021 Ferrari 812 Superfast"
                    {...field}
                    required
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="make"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Make</FormLabel>
                <FormControl>
                  <Input placeholder="Ferrari" {...field} required />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="model"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Model</FormLabel>
                <FormControl>
                  <Input placeholder="812 Superfast" {...field} required />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="year"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Year</FormLabel>
                <Select
                  value={String(field.value ?? "")}
                  onValueChange={(value) =>
                    field.onChange(Number.parseInt(value, 10))
                  }
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a year" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {YEAR_OPTIONS.map((year) => (
                      <SelectItem key={year} value={String(year)}>
                        {year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="price"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Price (USD)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min={0}
                    step={100}
                    value={
                      Number.isFinite(field.value) ? String(field.value) : ""
                    }
                    onChange={(event) =>
                      field.onChange(asNumber(event.target.value))
                    }
                    onBlur={field.onBlur}
                    name={field.name}
                    ref={field.ref}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="mileage"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Mileage</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min={0}
                    value={
                      Number.isFinite(field.value) ? String(field.value) : ""
                    }
                    onChange={(event) =>
                      field.onChange(asNumber(event.target.value))
                    }
                    onBlur={field.onBlur}
                    name={field.name}
                    ref={field.ref}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="transmission"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Transmission</FormLabel>
                <Select
                  value={field.value || undefined}
                  onValueChange={field.onChange}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select gearbox" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {TRANSMISSIONS.map((option) => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="engine"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Engine</FormLabel>
                <FormControl>
                  <Input placeholder="6.5L V12" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="exterior_color"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Exterior colour</FormLabel>
                <FormControl>
                  <Input placeholder="Rosso Corsa" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="interior_color"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Interior colour</FormLabel>
                <FormControl>
                  <Input placeholder="Nero" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="vin"
            render={({ field }) => (
              <FormItem className="sm:col-span-2">
                <FormLabel>VIN</FormLabel>
                <FormControl>
                  <Input placeholder="ZFF98RHA9N0271234" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem className="sm:col-span-2">
                <FormLabel>Presentation</FormLabel>
                <FormControl>
                  <Textarea
                    rows={5}
                    placeholder="Provenance, service history, condition notes"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="flex items-start justify-between gap-4 rounded-lg border p-4">
          <div className="space-y-1">
            <p className="text-sm font-medium">
              Feature on the showroom home page
            </p>
            <p className="text-xs text-muted-foreground">
              Featured vehicles appear first on the public showroom.
            </p>
          </div>
          <FormField
            control={form.control}
            name="is_featured"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center gap-3">
                <FormControl>
                  <Checkbox
                    id="is_featured"
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
                <FormLabel
                  htmlFor="is_featured"
                  className="text-sm font-medium"
                >
                  Feature on the showroom home page
                </FormLabel>
              </FormItem>
            )}
          />
        </div>

        <div className="flex items-center gap-3">
          <LoadingButton
            type="submit"
            loading={mutation.isPending}
            className="bg-gold text-xs uppercase tracking-widest text-obsidian hover:bg-gold-light"
          >
            {isEditing ? "Save changes" : "Publish listing"}
          </LoadingButton>
          {onCancel && (
            <Button type="button" variant="ghost" onClick={onCancel}>
              Cancel
            </Button>
          )}
        </div>
      </form>
    </Form>
  )
}

export default VehicleForm
