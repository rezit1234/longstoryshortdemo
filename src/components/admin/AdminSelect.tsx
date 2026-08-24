"use client";

import { useEffect, useId, useRef, useState } from "react";

type AdminSelectOption = {
  value: string;
  label: string;
};

export function AdminSelect({
  value,
  options,
  onChange,
  ariaLabel,
}: {
  value: string;
  options: AdminSelectOption[];
  onChange: (value: string) => void;
  ariaLabel: string;
}) {
  const listboxId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);

  const selected =
    options.find((option) => option.value === value) ?? options[0];

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <div className={open ? "admin-select is-open" : "admin-select"} ref={rootRef}>
      <button
        type="button"
        className="admin-select-trigger"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listboxId}
        onClick={() => setOpen((current) => !current)}
      >
        <span>{selected?.label}</span>
        <span className="admin-select-chevron-wrap" aria-hidden>
          <span className="admin-select-chevron" />
        </span>
      </button>

      {open ? (
        <ul className="admin-select-menu" id={listboxId} role="listbox">
          {options.map((option) => (
            <li key={option.value}>
              <button
                type="button"
                role="option"
                aria-selected={option.value === value}
                className={
                  option.value === value
                    ? "admin-select-option is-selected"
                    : "admin-select-option"
                }
                onClick={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
              >
                {option.label}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
