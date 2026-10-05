import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation } from "@tanstack/react-query"
import { Send } from "lucide-react"
import { useForm } from "react-hook-form"
import { z } from "zod"

import { CarsService } from "@/client"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { LoadingButton } from "@/components/ui/loading-button"
import { Textarea } from "@/components/ui/textarea"
import useCustomToast from "@/hooks/useCustomToast"
import { handleError } from "@/utils"

const formSchema = z.object({
  name: z.string().min(1, "Your name is required"),
  email: z.email("A valid email is required"),
  phone: z.string().optional(),
  message: z.string().optional(),
})

type FormValues = z.infer<typeof formSchema>

interface InquiryFormProps {
  carId: string
  carTitle: string
}

export function InquiryForm({ carId, carTitle }: InquiryFormProps) {
  const { showSuccessToast, showErrorToast } = useCustomToast()

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    mode: "onBlur",
    defaultValues: { name: "", email: "", phone: "", message: "" },
  })

  const mutation = useMutation({
    mutationFn: (values: FormValues) =>
      CarsService.createInquiry({
        path: { car_id: carId },
        body: { ...values },
      }),
    onSuccess: () => {
      showSuccessToast("Our concierge will be in touch shortly")
      form.reset()
    },
    onError: handleError.bind(showErrorToast),
  })

  return (
    <div className="glass-panel rounded-xl p-6">
      <h3 className="text-[0.65rem] uppercase tracking-luxe text-gold">
        Private viewing request
      </h3>
      <p className="mt-2 text-sm text-white/50">
        Register your interest in the {carTitle}.
      </p>

      <form
        onSubmit={form.handleSubmit((values) => mutation.mutate(values))}
        className="mt-6 space-y-4"
      >
        <div className="space-y-2">
          <Label
            htmlFor="inquiry-name"
            className="text-[0.6rem] uppercase tracking-luxe text-white/40"
          >
            Name
          </Label>
          <Input
            id="inquiry-name"
            placeholder="Your name"
            className="border-amber-500/20 bg-black/40 text-white placeholder:text-white/25"
            {...form.register("name")}
          />
          {form.formState.errors.name && (
            <p className="text-xs text-destructive">
              {form.formState.errors.name.message}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label
            htmlFor="inquiry-email"
            className="text-[0.6rem] uppercase tracking-luxe text-white/40"
          >
            Email
          </Label>
          <Input
            id="inquiry-email"
            type="email"
            placeholder="you@example.com"
            className="border-amber-500/20 bg-black/40 text-white placeholder:text-white/25"
            {...form.register("email")}
          />
          {form.formState.errors.email && (
            <p className="text-xs text-destructive">
              {form.formState.errors.email.message}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label
            htmlFor="inquiry-phone"
            className="text-[0.6rem] uppercase tracking-luxe text-white/40"
          >
            Phone <span className="normal-case">(optional)</span>
          </Label>
          <Input
            id="inquiry-phone"
            placeholder="+1 000 000 0000"
            className="border-amber-500/20 bg-black/40 text-white placeholder:text-white/25"
            {...form.register("phone")}
          />
        </div>

        <div className="space-y-2">
          <Label
            htmlFor="inquiry-message"
            className="text-[0.6rem] uppercase tracking-luxe text-white/40"
          >
            Message <span className="normal-case">(optional)</span>
          </Label>
          <Textarea
            id="inquiry-message"
            rows={4}
            placeholder="Tell us how we can help"
            className="border-amber-500/20 bg-black/40 text-white placeholder:text-white/25"
            {...form.register("message")}
          />
        </div>

        <LoadingButton
          type="submit"
          loading={mutation.isPending}
          className="w-full bg-gold text-xs uppercase tracking-luxe text-obsidian hover:bg-gold-light"
        >
          <Send className="size-4" />
          Send request
        </LoadingButton>
      </form>
    </div>
  )
}

export default InquiryForm
