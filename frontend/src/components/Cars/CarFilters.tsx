import { useQuery } from "@tanstack/react-query"
import { RotateCcw, SlidersHorizontal } from "lucide-react"

import { CarsService } from "@/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export type CarSortOption =
  | "newest"
  | "oldest"
  | "price_asc"
  | "price_desc"
  | "year_desc"
  | "year_asc"
  | "mileage_asc"

export interface CarFilterState {
  make: string
  year: string
  minPrice: string
  maxPrice: string
  sort: CarSortOption
}

export const DEFAULT_FILTERS: CarFilterState = {
  make: "all",
  year: "all",
  minPrice: "",
  maxPrice: "",
  sort: "newest",
}

const SORT_LABELS: Record<CarSortOption, string> = {
  newest: "Newest arrivals",
  oldest: "Oldest arrivals",
  price_asc: "Price, low to high",
  price_desc: "Price, high to low",
  year_desc: "Year, newest",
  year_asc: "Year, oldest",
  mileage_asc: "Lowest mileage",
}

const currentYear = new Date().getFullYear()
const YEARS = Array.from({ length: 30 }, (_, index) => currentYear + 1 - index)

interface CarFiltersProps {
  value: CarFilterState
  onChange: (value: CarFilterState) => void
}

export function CarFilters({ value, onChange }: CarFiltersProps) {
  const { data: makes } = useQuery({
    queryKey: ["car-makes"],
    queryFn: async () => (await CarsService.readMakes()).data,
    staleTime: 300_000,
  })

  const update = (patch: Partial<CarFilterState>) =>
    onChange({ ...value, ...patch })

  const isDirty =
    value.make !== DEFAULT_FILTERS.make ||
    value.year !== DEFAULT_FILTERS.year ||
    value.minPrice !== DEFAULT_FILTERS.minPrice ||
    value.maxPrice !== DEFAULT_FILTERS.maxPrice ||
    value.sort !== DEFAULT_FILTERS.sort

  return (
    <div className="glass-panel rounded-xl p-5">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-[0.65rem] uppercase tracking-luxe text-gold">
          <SlidersHorizontal className="size-3.5" />
          Refine
        </h2>
        {isDirty && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onChange(DEFAULT_FILTERS)}
            className="h-7 text-[0.6rem] uppercase tracking-luxe text-white/40 hover:text-gold"
          >
            <RotateCcw className="size-3" />
            Reset
          </Button>
        )}
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <div className="space-y-2">
          <Label className="text-[0.6rem] uppercase tracking-luxe text-white/40">
            Make
          </Label>
          <Select value={value.make} onValueChange={(make) => update({ make })}>
            <SelectTrigger className="border-amber-500/20 bg-black/40 text-white">
              <SelectValue placeholder="All makes" />
            </SelectTrigger>
            <SelectContent className="bg-surface text-white">
              <SelectItem value="all">All makes</SelectItem>
              {(makes ?? []).map((make) => (
                <SelectItem key={make} value={make}>
                  {make}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label className="text-[0.6rem] uppercase tracking-luxe text-white/40">
            Year
          </Label>
          <Select value={value.year} onValueChange={(year) => update({ year })}>
            <SelectTrigger className="border-amber-500/20 bg-black/40 text-white">
              <SelectValue placeholder="Any year" />
            </SelectTrigger>
            <SelectContent className="bg-surface text-white">
              <SelectItem value="all">Any year</SelectItem>
              {YEARS.map((year) => (
                <SelectItem key={year} value={String(year)}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label className="text-[0.6rem] uppercase tracking-luxe text-white/40">
            Min price
          </Label>
          <Input
            type="number"
            min={0}
            inputMode="numeric"
            placeholder="$0"
            value={value.minPrice}
            onChange={(event) => update({ minPrice: event.target.value })}
            className="border-amber-500/20 bg-black/40 text-white placeholder:text-white/25"
          />
        </div>

        <div className="space-y-2">
          <Label className="text-[0.6rem] uppercase tracking-luxe text-white/40">
            Max price
          </Label>
          <Input
            type="number"
            min={0}
            inputMode="numeric"
            placeholder="$500,000"
            value={value.maxPrice}
            onChange={(event) => update({ maxPrice: event.target.value })}
            className="border-amber-500/20 bg-black/40 text-white placeholder:text-white/25"
          />
        </div>

        <div className="space-y-2">
          <Label className="text-[0.6rem] uppercase tracking-luxe text-white/40">
            Sort by
          </Label>
          <Select
            value={value.sort}
            onValueChange={(sort) => update({ sort: sort as CarSortOption })}
          >
            <SelectTrigger className="border-amber-500/20 bg-black/40 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-surface text-white">
              {Object.entries(SORT_LABELS).map(([key, label]) => (
                <SelectItem key={key} value={key}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  )
}

export default CarFilters
