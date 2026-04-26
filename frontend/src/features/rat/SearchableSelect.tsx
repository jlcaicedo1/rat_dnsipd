import { useEffect, useRef, useState } from "react";

export type SearchableSelectOption = {
  value: string;
  label: string;
  tag?: string | null;
  meta?: string | null;
  searchText?: string | null;
};

type SearchableSelectProps = {
  value: string;
  options: SearchableSelectOption[];
  placeholder: string;
  searchPlaceholder: string;
  emptyMessage: string;
  disabled?: boolean;
  onChange: (value: string) => void;
};

export function SearchableSelect({
  value,
  options,
  placeholder,
  searchPlaceholder,
  emptyMessage,
  disabled = false,
  onChange,
}: SearchableSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const selectedOption = options.find((item) => item.value === value) ?? null;
  const filteredOptions = options.filter((item) =>
    buildSearchableText(item).includes(normalizeForSearch(query)),
  );

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!wrapperRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <div
      ref={wrapperRef}
      className={disabled ? "searchable-select searchable-select-disabled" : "searchable-select"}
    >
      <button
        type="button"
        className="searchable-select-trigger"
        disabled={disabled}
        aria-expanded={isOpen}
        onClick={() => {
          setIsOpen((current) => !current);
          setQuery("");
        }}
      >
        <span className="searchable-select-trigger-text">
          {selectedOption ? formatOptionLabel(selectedOption) : placeholder}
        </span>
        <span className="searchable-select-trigger-icon">{isOpen ? "▴" : "▾"}</span>
      </button>

      {isOpen ? (
        <div className="searchable-select-panel" role="combobox" aria-expanded={isOpen}>
          <input
            autoFocus
            className="input searchable-select-search"
            placeholder={searchPlaceholder}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                setIsOpen(false);
              }
            }}
          />

          <div className="searchable-select-options" role="listbox">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((item) => {
                const isSelected = item.value === value;

                return (
                  <button
                    key={item.value}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    className={
                      isSelected
                        ? "searchable-select-option searchable-select-option-selected"
                        : "searchable-select-option"
                    }
                    onClick={() => {
                      onChange(item.value);
                      setQuery("");
                      setIsOpen(false);
                    }}
                  >
                    <div>
                      <strong>{item.label}</strong>
                      {item.meta ? <small>{item.meta}</small> : null}
                    </div>
                    {item.tag ? <span className="pill">{item.tag}</span> : null}
                  </button>
                );
              })
            ) : (
              <div className="searchable-select-empty">{emptyMessage}</div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function formatOptionLabel(option: SearchableSelectOption) {
  if (!option.tag) {
    return option.label;
  }

  return `${option.label} (${option.tag})`;
}

function buildSearchableText(option: SearchableSelectOption) {
  return normalizeForSearch(
    [option.label, option.tag, option.meta, option.searchText].filter(Boolean).join(" "),
  );
}

function normalizeForSearch(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}
