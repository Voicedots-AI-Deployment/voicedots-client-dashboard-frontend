"use client"

import * as React from "react"
import { format } from "date-fns"
import { CalendarIcon } from "lucide-react"
import { type DateRange } from "react-day-picker"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Field, FieldLabel } from "@/components/ui/field"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

export interface DatePickerWithRangeProps {
  value?: DateRange
  onChange?: (range: DateRange | undefined) => void
  onClear?: () => void
  showClear?: boolean
  placeholder?: string
  label?: string
  className?: string
}

export function DatePickerWithRange({
  value,
  onChange,
  onClear,
  showClear,
  placeholder = "Pick a date range",
  label = "Date Range",
  className,
}: DatePickerWithRangeProps) {
  const pickerId = React.useId()
  const [compact, setCompact] = React.useState(() =>
    typeof window !== "undefined" ? window.matchMedia("(max-width: 767px)").matches : false
  )
  // Do not display a range the parent has not actually applied. The previous
  // Jan-20 default was cosmetic, so the UI claimed a filter while sending no
  // start_date/end_date parameters to the API.
  const [internalDate, setInternalDate] = React.useState<DateRange | undefined>(value)

  React.useEffect(() => setInternalDate(value), [value])
  React.useEffect(() => {
    const media = window.matchMedia("(max-width: 767px)")
    const update = () => setCompact(media.matches)
    update()
    media.addEventListener("change", update)
    return () => media.removeEventListener("change", update)
  }, [])

  // Keep picker usable when controlled from a parent.
  const selected = value ?? internalDate

  const onSelect = (next: DateRange | undefined) => {
    if (onChange) onChange(next)
    setInternalDate(next ?? undefined)
  }

  return (
    <Field className={cn("mx-auto w-full", className)}>
      <FieldLabel htmlFor={pickerId}>{label}</FieldLabel>
      <div className="flex min-w-0 items-center gap-2">
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" id={pickerId} className="min-w-0 flex-1 justify-start px-3 font-normal md:flex-none">
              <CalendarIcon className="shrink-0" />
              <span className="truncate">
                {selected?.from
                  ? selected.to
                    ? `${format(selected.from, "LLL dd, y")} – ${format(selected.to, "LLL dd, y")}`
                    : format(selected.from, "LLL dd, y")
                  : placeholder}
              </span>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="max-h-[calc(100vh-6rem)] max-w-[calc(100vw-1rem)] overflow-auto p-0" align="start" collisionPadding={8}>
            <Calendar mode="range" defaultMonth={selected?.from} selected={selected} onSelect={onSelect} numberOfMonths={compact ? 1 : 2} />
          </PopoverContent>
        </Popover>
        {showClear && onClear && (
          <button
            type="button"
            onClick={() => { setInternalDate(undefined); onChange?.(undefined); onClear() }}
            className="shrink-0 rounded-lg px-2 py-1 text-xs font-semibold text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
          >
            Clear
          </button>
        )}
      </div>
    </Field>
  )
}
