"use client";

import * as React from "react";
import { Check, ChevronsUpDown, Loader2 } from "lucide-react";
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
import { searchDrugsAction } from "../server/actions";

type DrugAutocompleteProps = {
  value?: string;
  onChange: (value: string) => void;
  onSelect?: (rxcui: string, name: string) => void;
};

export function DrugAutocomplete({ value, onChange, onSelect }: DrugAutocompleteProps) {
  const [open, setOpen] = React.useState(false);
  const [inputValue, setInputValue] = React.useState("");
  const [options, setOptions] = React.useState<Array<{ name: string; rxcui: string }>>([]);
  const [loading, setLoading] = React.useState(false);

  // Debounce search
  React.useEffect(() => {
    const timer = setTimeout(() => {
      void (async () => {
        if (!inputValue || inputValue.length < 3) {
          setOptions([]);
          return;
        }

        setLoading(true);
        try {
          const results = await searchDrugsAction(inputValue);
          setOptions(results);
        } catch (error) {
          console.error("Search failed", error);
        } finally {
          setLoading(false);
        }
      })();
    }, 300);

    return () => clearTimeout(timer);
  }, [inputValue]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between font-normal"
        >
          {value ?? <span className="text-muted-foreground">Search for medication (e.g. Lisinopril)</span>}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput 
            placeholder="Type 3+ characters..." 
            value={inputValue}
            onValueChange={setInputValue}
          />
          <CommandList>
            {loading && (
              <div className="py-6 text-center text-sm text-muted-foreground">
                <Loader2 className="mr-2 h-4 w-4 animate-spin inline" />
                Searching RxNorm...
              </div>
            )}
            {!loading && inputValue.length >= 3 && options.length === 0 && (
               <CommandEmpty>No medication found.</CommandEmpty>
            )}
            {!loading && inputValue.length < 3 && (
                <div className="py-6 text-center text-sm text-muted-foreground">
                    Type at least 3 characters to search
                </div>
            )}
            <CommandGroup>
              {options.map((option) => (
                <CommandItem
                  key={option.rxcui}
                  value={option.name}
                  onSelect={(_currentValue) => {
                    // currentValue is the lowercased value from command item, but we want the real name
                    // However, we are setting the value to option.name in value prop.
                    // CommandItem value prop is used for filtering usually.
                    onChange(option.name);
                    onSelect?.(option.rxcui, option.name);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === option.name ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {option.name}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

