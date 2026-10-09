import { useEffect, useId, useRef, useState } from "react";
import { Loader2, Search } from "lucide-react";
import { searchAddress, type GeocodeResult } from "@/lib/geocoding";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface AddressAutocompleteProps {
  /** Currently selected label, displayed as the input value. */
  value: string;
  /** Fired when the user picks a suggestion. */
  onPick: (result: GeocodeResult) => void;
  /** Clear the selected coordinates when the user edits the text. */
  onEdit?: () => void;
  placeholder?: string;
}

export function AddressAutocomplete({
  value,
  onPick,
  onEdit,
  placeholder = "Search by address…",
}: AddressAutocompleteProps) {
  const [text, setText] = useState(value);
  const [results, setResults] = useState<GeocodeResult[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [highlighted, setHighlighted] = useState(0);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const editedRef = useRef(false);
  const listId = useId();

  // Reflect external value changes (e.g. preset chip clicked) into the input.
  useEffect(() => {
    if (editedRef.current && !value) {
      editedRef.current = false;
      return;
    }
    setText(value);
  }, [value]);

  // Close dropdown on outside click.
  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  // Debounced search.
  useEffect(() => {
    const q = text.trim();
    if (q.length < 3 || q === value) {
      setResults([]);
      setLoading(false);
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const r = await searchAddress(q, controller.signal);
        if (!controller.signal.aborted) {
          setResults(r);
          setOpen(true);
          setHighlighted(0);
        }
      } catch (err) {
        if ((err as Error).name !== "AbortError") setResults([]);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 350);

    return () => {
      clearTimeout(t);
      controller.abort();
    };
  }, [text, value]);

  function pick(r: GeocodeResult) {
    editedRef.current = false;
    setText(r.label);
    setOpen(false);
    setResults([]);
    onPick(r);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open || results.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlighted((h) => Math.min(h + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlighted((h) => Math.max(h - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const r = results[highlighted];
      if (r) pick(r);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div ref={wrapperRef} className="relative">
      <div className="relative">
        <Search
          size={16}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
        />
        <Input
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            setOpen(true);
            if (value && e.target.value !== value) {
              editedRef.current = true;
              onEdit?.();
            }
          }}
          onFocus={() => results.length > 0 && setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          autoComplete="off"
          spellCheck={false}
          role="combobox"
          aria-label="Search for a location"
          aria-autocomplete="list"
          aria-expanded={open && results.length > 0}
          aria-controls={listId}
          aria-activedescendant={open && results.length > 0 ? `${listId}-${highlighted}` : undefined}
          className="pl-9 pr-9"
        />
        {loading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <Loader2 size={16} className="animate-spin text-muted-foreground" />
          </div>
        )}
      </div>

      {open && results.length > 0 && (
        <div
          id={listId}
          className="absolute left-0 right-0 top-[calc(100%+4px)] z-30 max-h-72 overflow-y-auto rounded-xl border border-border bg-surface shadow-card"
          role="listbox"
        >
          {results.map((r, i) => (
            <button
              key={`${r.lat}-${r.lng}-${i}`}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={i === highlighted}
              type="button"
              onMouseEnter={() => setHighlighted(i)}
              onClick={() => pick(r)}
              className={cn(
                "block w-full px-3 py-2.5 text-left text-sm leading-snug transition-colors",
                i === highlighted
                  ? "bg-overlay text-foreground"
                  : "text-foreground/80 hover:bg-overlay/70",
              )}
            >
              {r.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
