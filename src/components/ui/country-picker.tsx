"use client"

import * as React from "react"
import { Check, ChevronsUpDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { COUNTRIES, getCountryByCode } from "@/lib/countries"

interface CountryPickerProps {
  value: string
  onChange: (code: string) => void
  id?: string
}

export function CountryPicker({ value, onChange, id }: CountryPickerProps) {
  const [open, setOpen] = React.useState(false)
  const selected = getCountryByCode(value)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between border border-gray-300 bg-white font-normal hover:bg-white focus:ring-2 focus:ring-brand-lavender-darker focus:border-brand-lavender-darker"
        >
          <span className="flex items-center gap-2 truncate">
            <span className="text-lg leading-none">{selected.flag}</span>
            <span className="truncate text-gray-900">{selected.name}</span>
            <span className="text-xs text-gray-500">+{selected.dialCode}</span>
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0">
        <Command
          filter={(itemValue, search) => {
            const q = search.toLowerCase()
            return itemValue.toLowerCase().includes(q) ? 1 : 0
          }}
        >
          <CommandInput placeholder="Search country or dial code..." />
          <CommandList>
            <CommandEmpty>No country found.</CommandEmpty>
            <CommandGroup>
              {COUNTRIES.map((country) => (
                <CommandItem
                  key={country.code}
                  value={`${country.name} ${country.code} +${country.dialCode}`}
                  onSelect={() => {
                    onChange(country.code)
                    setOpen(false)
                  }}
                >
                  <span className="text-lg leading-none">{country.flag}</span>
                  <span className="flex-1 truncate">{country.name}</span>
                  <span className="text-xs text-gray-500">+{country.dialCode}</span>
                  <Check
                    className={cn(
                      "ml-2 h-4 w-4",
                      value.toUpperCase() === country.code ? "opacity-100 text-brand-sage-darker" : "opacity-0"
                    )}
                  />
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
