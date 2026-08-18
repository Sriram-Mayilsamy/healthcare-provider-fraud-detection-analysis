"use client"

import { format } from "date-fns"
import { CalendarIcon } from "lucide-react"
import type { DateRange } from "react-day-picker"

import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

export function DateRangePicker({
  range,
  onChange,
  min,
  max,
}: {
  range: DateRange | undefined
  onChange: (range: DateRange | undefined) => void
  min?: Date
  max?: Date
}) {
  const label =
    range?.from && range?.to
      ? `${format(range.from, "MMM d")} – ${format(range.to, "MMM d, yyyy")}`
      : range?.from
        ? format(range.from, "MMM d, yyyy")
        : "Claim period"

  return (
    <Popover>
      <PopoverTrigger render={<Button variant="outline" size="sm" className="justify-start" />}>
        <CalendarIcon />
        {label}
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto p-2">
        <Calendar
          mode="range"
          selected={range}
          onSelect={onChange}
          defaultMonth={range?.from}
          numberOfMonths={2}
          startMonth={min}
          endMonth={max}
        />
      </PopoverContent>
    </Popover>
  )
}
