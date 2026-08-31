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
  // Do not display a range the parent has not actually applied. The previous
  // Jan-20 default was cosmetic, so the UI claimed a filter while sending no
  // start_date/end_date parameters to the API.
  const [internalDate, setInternalDate] = React.useState<DateRange | undefined>(value)

  // Keep picker usable when controlled from a parent.
  const selected = value ?? internalDate

  const onSelect = (next: DateRange | undefined) => {
    if (onChange) onChange(next)
    setInternalDate(next ?? undefined)
  }

  return (
    <Field className={cn("mx-auto w-full", className)}>
      <FieldLabel htmlFor="date-picker-range">{label}</FieldLabel>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            id="date-picker-range"
            className="justify-start px-2.5 font-normal"
          >
            <CalendarIcon />
            {selected?.from ? (
              selected.to ? (
                <>
                  {format(selected.from, "LLL dd, y")} -{" "}
                  {format(selected.to, "LLL dd, y")}
                </>
              ) : (
                format(selected.from, "LLL dd, y")
              )
            ) : (
              <span>{placeholder}</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="range"
            defaultMonth={selected?.from}
            selected={selected}
            onSelect={onSelect}
            numberOfMonths={2}
          />
        </PopoverContent>
      </Popover>
      {showClear && onClear && (
        <button
          type="button"
          onClick={() => {
            setInternalDate(undefined)
            onChange?.(undefined)
            onClear()
          }}
          className="ml-2 text-xs font-bold text-red-500 hover:text-red-600"
        >
          Clear
        </button>
      )}
    </Field>
  )
}
