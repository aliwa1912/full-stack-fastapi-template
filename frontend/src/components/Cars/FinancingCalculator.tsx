import { useMemo, useState } from "react"

import { Input } from "@/components/ui/input"
import { formatPrice } from "@/utils"

interface FinancingCalculatorProps {
  price: number
}

const DOWN_PAYMENT_OPTIONS = [0.1, 0.15, 0.2, 0.25, 0.3]
const TERM_OPTIONS = [24, 36, 48, 60, 72]

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
})

export function FinancingCalculator({ price }: FinancingCalculatorProps) {
  const [downPaymentPercent, setDownPaymentPercent] = useState(20)
  const [termMonths, setTermMonths] = useState(60)
  const [annualRate, setAnnualRate] = useState("6.5")

  const { monthly, downPayment } = useMemo(() => {
    const down = Math.round(price * (downPaymentPercent / 100))
    const principal = price - down
    const monthlyRate = Number.parseFloat(annualRate) / 100 / 12

    if (!Number.isFinite(monthlyRate) || monthlyRate <= 0) {
      return { monthly: principal / termMonths, downPayment: down }
    }
    // Standard amortised loan payment.
    const factor =
      (monthlyRate * (1 + monthlyRate) ** termMonths) /
      ((1 + monthlyRate) ** termMonths - 1)

    return { monthly: principal * factor, downPayment: down }
  }, [price, downPaymentPercent, termMonths, annualRate])

  return (
    <div className="glass-panel rounded-xl p-6">
      <h3 className="text-[0.65rem] uppercase tracking-luxe text-gold">
        Financing estimate
      </h3>
      <p className="mt-4 font-display text-3xl text-white">
        {currency.format(Math.round(monthly))}
        <span className="ml-2 text-sm font-sans text-white/40">/ month</span>
      </p>
      <p className="mt-1 text-xs text-white/35">
        {currency.format(downPayment)} down · {termMonths} months ·{" "}
        {annualRate || "0"}% APR
      </p>

      <div className="mt-6 space-y-5">
        <div className="space-y-2">
          <label
            htmlFor="down-payment"
            className="text-[0.6rem] uppercase tracking-luxe text-white/40"
          >
            Down payment
          </label>
          <div className="flex flex-wrap gap-2">
            {DOWN_PAYMENT_OPTIONS.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setDownPaymentPercent(option * 100)}
                className={`border px-3 py-1.5 text-[0.65rem] transition-colors ${
                  downPaymentPercent === option * 100
                    ? "border-gold bg-gold/10 text-gold"
                    : "border-white/10 text-white/50 hover:border-amber-500/40"
                }`}
              >
                {option * 100}%
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <label
            htmlFor="term"
            className="text-[0.6rem] uppercase tracking-luxe text-white/40"
          >
            Term
          </label>
          <div className="flex flex-wrap gap-2">
            {TERM_OPTIONS.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setTermMonths(option)}
                className={`border px-3 py-1.5 text-[0.65rem] transition-colors ${
                  termMonths === option
                    ? "border-gold bg-gold/10 text-gold"
                    : "border-white/10 text-white/50 hover:border-amber-500/40"
                }`}
              >
                {option} mo
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <label
            htmlFor="apr"
            className="text-[0.6rem] uppercase tracking-luxe text-white/40"
          >
            Annual rate
          </label>
          <Input
            id="apr"
            type="number"
            min={0}
            step="0.1"
            value={annualRate}
            onChange={(event) => setAnnualRate(event.target.value)}
            className="h-9 border-amber-500/20 bg-black/40 text-white"
          />
        </div>
      </div>

      <p className="mt-6 text-[0.6rem] leading-relaxed text-white/30">
        Indicative only, based on {formatPrice(price)}. Final terms are subject
        to approval by our finance partners.
      </p>
    </div>
  )
}

export default FinancingCalculator
