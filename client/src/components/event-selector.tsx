import { useQuery } from "@tanstack/react-query";
import { Check, ChevronsUpDown, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useState } from "react";
import { formatLocalDate } from "@/lib/date-utils";
import type { DerbyEvent } from "@shared/schema";

interface EventSelectorProps {
  selectedEventId: string | null;
  onSelectEvent: (eventId: string) => void;
}

export function EventSelector({ selectedEventId, onSelectEvent }: EventSelectorProps) {
  const [open, setOpen] = useState(false);

  const { data: events = [], isLoading } = useQuery<DerbyEvent[]>({
    queryKey: ["/api/events"],
  });

  const selectedEvent = events.find((e) => e.id === selectedEventId);

  if (isLoading) {
    return (
      <Button variant="outline" className="w-full justify-between" disabled>
        <span className="flex items-center gap-2">
          <Trophy className="h-4 w-4" />
          Loading events...
        </span>
      </Button>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
          data-testid="button-event-selector"
        >
          <span className="flex items-center gap-2 truncate">
            <Trophy className="h-4 w-4 shrink-0" />
            {selectedEvent ? selectedEvent.name : "Select an event..."}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0">
        <Command>
          <CommandInput placeholder="Search events..." />
          <CommandList>
            <CommandEmpty>No events found.</CommandEmpty>
            <CommandGroup>
              {events.map((event) => (
                <CommandItem
                  key={event.id}
                  value={event.name}
                  onSelect={() => {
                    onSelectEvent(event.id);
                    setOpen(false);
                  }}
                  data-testid={`option-event-${event.id}`}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      selectedEventId === event.id ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <div className="flex flex-col">
                    <span>{event.name}</span>
                    {event.eventDate && (
                      <span className="text-xs text-muted-foreground">
                        {formatLocalDate(event.eventDate)}
                      </span>
                    )}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
