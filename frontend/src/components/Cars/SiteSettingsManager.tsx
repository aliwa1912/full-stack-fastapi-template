import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { ImageOff } from "lucide-react"
import { useEffect } from "react"
import { useForm } from "react-hook-form"

import { AdminService } from "@/client"
import { Button } from "@/components/ui/button"
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
import { Textarea } from "@/components/ui/textarea"
import useCustomToast from "@/hooks/useCustomToast"
import { handleError, resolveImageUrl } from "@/utils"

/**
 * Every API field is nullable, so the form uses plain strings and the
 * mutation maps empty strings back to null.
 */
interface SettingsFormValues {
  dealership_name: string
  hero_headline: string
  hero_subheadline: string
  hero_image_url: string
  contact_email: string
  contact_phone: string
  address: string
}

const EMPTY: SettingsFormValues = {
  dealership_name: "",
  hero_headline: "",
  hero_subheadline: "",
  hero_image_url: "",
  contact_email: "",
  contact_phone: "",
  address: "",
}

const nullable = (value: string) => (value.trim() === "" ? null : value.trim())

export function SiteSettingsManager() {
  const queryClient = useQueryClient()
  const { showSuccessToast, showErrorToast } = useCustomToast()

  const { data, isPending } = useQuery({
    queryKey: ["siteSettings"],
    queryFn: async () => (await AdminService.readSiteSettings()).data,
  })

  const form = useForm<SettingsFormValues>({ defaultValues: EMPTY })

  // The query resolves after the first render, so sync once loaded.
  useEffect(() => {
    if (!data) return
    form.reset({
      dealership_name: data.dealership_name ?? "",
      hero_headline: data.hero_headline ?? "",
      hero_subheadline: data.hero_subheadline ?? "",
      hero_image_url: data.hero_image_url ?? "",
      contact_email: data.contact_email ?? "",
      contact_phone: data.contact_phone ?? "",
      address: data.address ?? "",
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, form.reset])

  const saveMutation = useMutation({
    mutationFn: (values: SettingsFormValues) =>
      AdminService.updateSiteSettings({
        body: {
          dealership_name: nullable(values.dealership_name),
          hero_headline: nullable(values.hero_headline),
          hero_subheadline: nullable(values.hero_subheadline),
          hero_image_url: nullable(values.hero_image_url),
          contact_email: nullable(values.contact_email),
          contact_phone: nullable(values.contact_phone),
          address: nullable(values.address),
        },
      }),
    onSuccess: () => {
      showSuccessToast("Showroom branding saved")
      queryClient.invalidateQueries({ queryKey: ["siteSettings"] })
    },
    onError: handleError.bind(showErrorToast),
  })

  const bannerUrl = form.watch("hero_image_url")

  if (isPending) {
    return <div className="h-96 animate-pulse rounded-xl border bg-card" />
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit((values) => saveMutation.mutate(values))}
        className="space-y-6"
      >
        <div className="space-y-2">
          <FormLabel>Hero banner</FormLabel>
          {bannerUrl ? (
            <div className="overflow-hidden rounded-xl border">
              <img
                src={resolveImageUrl(bannerUrl)}
                alt="Hero banner"
                className="aspect-21/9 w-full object-cover"
              />
            </div>
          ) : (
            <div className="flex aspect-21/9 w-full flex-col items-center justify-center rounded-xl border-2 border-dashed text-muted-foreground">
              <ImageOff className="size-6 text-gold" />
              <span className="mt-2 text-sm">
                No banner — a cinematic fallback is shown
              </span>
            </div>
          )}
          <FormField
            control={form.control}
            name="hero_image_url"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <Input
                    placeholder="/uploads/<file>.jpg or https://…"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="dealership_name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Dealership name</FormLabel>
                <FormControl>
                  <Input {...field} required />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="contact_phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Contact phone</FormLabel>
                <FormControl>
                  <Input placeholder="+1 555 010 1990" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="hero_headline"
            render={({ field }) => (
              <FormItem className="sm:col-span-2">
                <FormLabel>Hero headline</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="hero_subheadline"
            render={({ field }) => (
              <FormItem className="sm:col-span-2">
                <FormLabel>Hero subheadline</FormLabel>
                <FormControl>
                  <Textarea rows={3} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="contact_email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Contact email</FormLabel>
                <FormControl>
                  <Input type="email" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="address"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Address</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="flex gap-3">
          <LoadingButton
            type="submit"
            loading={saveMutation.isPending}
            className="bg-gold text-obsidian hover:bg-gold-light"
          >
            Save branding
          </LoadingButton>
          <Button
            type="button"
            variant="ghost"
            onClick={() => form.reset()}
            disabled={saveMutation.isPending}
          >
            Reset
          </Button>
        </div>
      </form>
    </Form>
  )
}

export default SiteSettingsManager
