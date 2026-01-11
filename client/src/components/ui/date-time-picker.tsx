import * as React from "react"
import { format, parse } from "date-fns"
import { Calendar as CalendarIcon, Clock } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Input } from "@/components/ui/input"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { parseDateTime, formatDateForInput, formatTimeForInput, combineDateAndTime } from "@/lib/date-utils"

interface DateTimePickerProps {
  value?: string | Date | null
  onChange?: (value: string | null) => void
  placeholder?: string
  className?: string
  "data-testid"?: string
}

export function DateTimePicker({
  value,
  onChange,
  placeholder = "Pick a date and time",
  className,
  "data-testid": testId,
}: DateTimePickerProps) {
  const [open, setOpen] = React.useState(false)
  
  const parsedDate = parseDateTime(value)
  const dateStr = formatDateForInput(parsedDate)
  const timeStr = formatTimeForInput(parsedDate) || "12:00"

  const handleDateSelect = (selectedDate: Date | undefined) => {
    if (selectedDate) {
      const newDateStr = format(selectedDate, "yyyy-MM-dd")
      const combined = combineDateAndTime(newDateStr, timeStr)
      onChange?.(combined?.toISOString() || null)
    } else {
      onChange?.(null)
    }
  }

  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = e.target.value
    if (dateStr) {
      const combined = combineDateAndTime(dateStr, newTime)
      onChange?.(combined?.toISOString() || null)
    }
  }

  const formatDisplayValue = () => {
    if (!parsedDate) return null
    return format(parsedDate, "PPP 'at' h:mm a")
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "w-full justify-start text-left font-normal",
            !value && "text-muted-foreground",
            className
          )}
          data-testid={testId}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {formatDisplayValue() || <span>{placeholder}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={parsedDate || undefined}
          onSelect={handleDateSelect}
          initialFocus
        />
        <div className="border-t p-3">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <Input
              type="time"
              value={timeStr}
              onChange={handleTimeChange}
              className="w-auto"
              data-testid={testId ? `${testId}-time` : undefined}
            />
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
