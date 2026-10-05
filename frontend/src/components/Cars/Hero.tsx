import { useQuery } from "@tanstack/react-query"
import { Link } from "@tanstack/react-router"
import { ArrowRight, CalendarClock } from "lucide-react"

import { AdminService, type SiteSettingsPublic } from "@/client"
import { Button } from "@/components/ui/button"
import { resolveImageUrl } from "@/utils"

const FALLBACK_SETTINGS: SiteSettingsPublic = {
  id: "00000000-0000-0000-0000-000000000000",
  dealership_name: "Aurelia Motorworks",
  hero_headline: "Extraordinary Machines",
  hero_subheadline: "A curated collection of the world's finest motor cars.",
  hero_image_url: null,
  hero_video_url: null,
  contact_email: null,
  contact_phone: null,
  address: null,
  updated_at: null,
}

export function useSiteSettings() {
  return useQuery({
    queryKey: ["site-settings"],
    queryFn: async () => (await AdminService.readSiteSettings()).data,
    staleTime: 60_000,
  })
}

export function Hero() {
  const { data } = useSiteSettings()
  const settings = data ?? FALLBACK_SETTINGS
  const heroImage = resolveImageUrl(settings.hero_image_url)
  const heroVideo = resolveImageUrl(settings.hero_video_url)

  return (
    <section className="noise-overlay cinematic-surface relative isolate flex min-h-[80vh] items-center overflow-hidden">
      {heroVideo ? (
        <video
          className="absolute inset-0 -z-10 size-full object-cover"
          src={heroVideo}
          autoPlay
          muted
          loop
          playsInline
          poster={heroImage}
        />
      ) : heroImage ? (
        <img
          src={heroImage}
          alt=""
          className="absolute inset-0 -z-10 size-full object-cover opacity-45"
        />
      ) : null}

      {/* Cinematic vignette over the media. */}
      <div className="absolute inset-0 -z-10 bg-linear-to-b from-black/70 via-black/55 to-background" />
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_center,transparent_10%,#0a0a0b_95%)]" />

      <div className="mx-auto w-full max-w-7xl px-6 py-24">
        <div className="max-w-3xl animate-fade-up">
          <p className="text-[0.65rem] uppercase tracking-luxe text-gold">
            {settings.dealership_name ?? "Aurelia Motorworks"}
          </p>

          <h1 className="mt-6 font-display text-5xl leading-[1.05] text-white md:text-7xl">
            {settings.hero_headline ?? "Extraordinary Machines"}
          </h1>

          <div className="mt-6 h-px w-24 bg-linear-to-r from-gold to-transparent" />

          <p className="mt-6 max-w-xl text-base leading-relaxed text-white/60">
            {settings.hero_subheadline ??
              "A curated collection of the world's finest motor cars, delivered with discretion."}
          </p>

          <div className="mt-10 flex flex-wrap items-center gap-4">
            <Button
              asChild
              size="lg"
              className="h-12 bg-gold px-8 text-xs uppercase tracking-luxe text-obsidian hover:bg-gold-light"
            >
              <Link to="/inventory">
                Explore Inventory
                <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="glass-panel h-12 border-amber-500/30 px-8 text-xs uppercase tracking-luxe text-white hover:bg-white/5"
            >
              <a href="#private-viewing">
                <CalendarClock className="size-4" />
                Book Private Viewing
              </a>
            </Button>
          </div>
        </div>
      </div>
    </section>
  )
}

export default Hero
