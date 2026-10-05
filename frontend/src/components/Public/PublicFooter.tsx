import { Wordmark } from "@/components/Common/Wordmark"

export function PublicFooter() {
  return (
    <footer className="mt-24 border-t border-amber-500/15 bg-black/40">
      <div className="mx-auto grid max-w-7xl gap-10 px-6 py-14 md:grid-cols-3">
        <div>
          <Wordmark />
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-white/50">
            A curated collection of the world's most extraordinary motor cars,
            delivered with discretion.
          </p>
        </div>

        <div>
          <h3 className="text-[0.65rem] uppercase tracking-luxe text-gold">
            Showroom
          </h3>
          <ul className="mt-4 space-y-2 text-sm text-white/50">
            <li>Private viewings by appointment</li>
            <li>Global enclosed transport</li>
            <li>Ownership concierge</li>
          </ul>
        </div>

        <div>
          <h3 className="text-[0.65rem] uppercase tracking-luxe text-gold">
            Concierge
          </h3>
          <ul className="mt-4 space-y-2 text-sm text-white/50">
            <li>+1 (000) 000-0000</li>
            <li>concierge@aureliamotorworks.com</li>
            <li>By appointment only</li>
          </ul>
        </div>
      </div>

      <div className="hairline-gold">
        <div className="mx-auto max-w-7xl px-6 py-5 text-[0.65rem] uppercase tracking-luxe text-white/35">
          © {new Date().getFullYear()} Aurelia Motorworks
        </div>
      </div>
    </footer>
  )
}

export default PublicFooter
