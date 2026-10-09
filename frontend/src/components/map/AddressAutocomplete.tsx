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
  const [status, setStatus] = useState<string | null>(null);
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
    abortRef.current?.abort();
    setResults([]);
    setOpen(false);
    setLoading(false);
    setStatus(null);
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

  useEffect(() => () => abortRef.current?.abort(), []);

  // Public Nominatim does not permit client-side autocomplete requests. Look
  // up an address only after an explicit button press or Enter key.
  async function findAddress() {
    const q = text.trim();
    if (q.length < 3 || q === value) return;

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setLoading(true);
    setStatus(null);
    setResults([]);
    setOpen(false);
    try {
      const matches = await searchAddress(q, controller.signal);
      if (!controller.signal.aborted) {
        setResults(matches);
        setOpen(matches.length > 0);
        setHighlighted(0);
        if (matches.length === 0) setStatus("No matching addresses. Try a broader location.");
      }
    } catch (error) {
      if ((error as Error).name !== "AbortError") setStatus("Address lookup is unavailable. Try again or choose a location on the map.");
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }

  function pick(r: GeocodeResult) {
    editedRef.current = false;
    setText(r.label);
    setOpen(false);
    setResults([]);
    onPick(r);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      const selected = open ? results[highlighted] : undefined;
      if (selected) pick(selected);
      else void findAddress();
    } else if (!open || results.length === 0) return;
    else if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlighted((h) => Math.min(h + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlighted((h) => Math.max(h - 1, 0));
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div ref={wrapperRef} className="relative">
      <div className="flex items-center gap-2">
        <div className="relative min-w-0 flex-1">
          <Search size={16} aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={text}
            onChange={(e) => {
              abortRef.current?.abort();
              setText(e.target.value);
              setResults([]);
              setOpen(false);
              setLoading(false);
              setStatus(null);
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
            className="pl-9"
          />
        </div>
        <button
          type="button"
          onClick={() => void findAddress()}
          disabled={loading || text.trim().length < 3 || text.trim() === value}
          className="inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-lg border border-border bg-surface px-3 text-sm font-semibold text-primary hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {loading && <Loader2 size={15} aria-hidden="true" className="animate-spin" />}
          Find
        </button>
      </div>
      {status && <p role="status" className="mt-2 text-xs text-muted-foreground">{status}</p>}
      <p className="mt-1 text-[11px] text-muted-foreground">Address lookup by <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-primary">OpenStreetMap</a>.</p>

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
