"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

export function useActionFeedback() {
  const [state, setState] = useState("idle");
  const timerRef = useRef(null);

  const update = useCallback((nextState, duration = 1800) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setState(nextState);

    if (nextState !== "loading" && nextState !== "idle") {
      timerRef.current = setTimeout(() => {
        timerRef.current = null;
        setState("idle");
      }, duration);
    }
  }, []);

  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  return [state, update];
}

export function ActionButton({
  children,
  state = "idle",
  loadingLabel = "Cargando…",
  successLabel = "Listo",
  errorLabel = "No se pudo completar",
  className = "btn",
  type = "button",
  disabled = false,
  ...props
}) {
  const isBusy = state === "loading";
  const label = isBusy
    ? loadingLabel
    : state === "success"
      ? successLabel
      : state === "error"
        ? errorLabel
        : children;

  return (
    <button
      {...props}
      type={type}
      className={`${className} action-button${state !== "idle" ? ` is-${state}` : ""}`}
      aria-busy={isBusy || undefined}
      disabled={disabled || isBusy}
    >
      {state !== "idle" && (
        <span className={`action-mark action-mark-${state}`} aria-hidden="true">
          {isBusy ? <span className="button-spinner" /> : state === "success" ? "✓" : "!"}
        </span>
      )}
      <span>{label}</span>
    </button>
  );
}

export function ScrollRail({
  label,
  children,
  className = "",
  selectedKey,
  role = "group",
  ...attributes
}) {
  const railRef = useRef(null);
  const pointerStartRef = useRef(null);
  const suppressClickRef = useRef(false);
  const suppressTimerRef = useRef(null);
  const [overflow, setOverflow] = useState({ left: false, right: false });
  const canFocusRail = role === "region";

  const measureOverflow = useCallback(() => {
    const rail = railRef.current;
    if (!rail) return;

    const maxScroll = Math.max(0, rail.scrollWidth - rail.clientWidth);
    const next = {
      left: rail.scrollLeft > 1,
      right: maxScroll - rail.scrollLeft > 1,
    };
    setOverflow((current) => (
      current.left === next.left && current.right === next.right ? current : next
    ));
  }, []);

  useEffect(() => {
    const rail = railRef.current;
    if (!rail) return undefined;

    measureOverflow();
    rail.addEventListener("scroll", measureOverflow, { passive: true });
    window.addEventListener("resize", measureOverflow);

    let resizeObserver;
    if ("ResizeObserver" in window) {
      resizeObserver = new ResizeObserver(measureOverflow);
      resizeObserver.observe(rail);
      Array.from(rail.children).forEach((child) => resizeObserver.observe(child));
    }

    const mutationObserver = new MutationObserver(() => {
      measureOverflow();
      if (resizeObserver) {
        Array.from(rail.children).forEach((child) => resizeObserver.observe(child));
      }
    });
    mutationObserver.observe(rail, { childList: true, subtree: true, characterData: true });

    return () => {
      rail.removeEventListener("scroll", measureOverflow);
      window.removeEventListener("resize", measureOverflow);
      resizeObserver?.disconnect();
      mutationObserver.disconnect();
      if (suppressTimerRef.current) clearTimeout(suppressTimerRef.current);
    };
  }, [measureOverflow]);

  useEffect(() => {
    const rail = railRef.current;
    if (selectedKey == null || !rail) return;

    const selected = rail.querySelector(
      '[data-rail-selected="true"], [aria-selected="true"], [aria-pressed="true"]',
    );
    if (!selected) return;

    const nextLeft = selected.offsetLeft + selected.offsetWidth / 2 - rail.clientWidth / 2;
    const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    rail.scrollTo({ left: Math.max(0, nextLeft), behavior: reduceMotion ? "auto" : "smooth" });
  }, [selectedKey]);

  function onPointerDownCapture(event) {
    if (suppressClickRef.current) {
      suppressClickRef.current = false;
      if (suppressTimerRef.current) clearTimeout(suppressTimerRef.current);
      suppressTimerRef.current = null;
    }
    pointerStartRef.current = { x: event.clientX, y: event.clientY };
  }

  function onPointerUpCapture(event) {
    const start = pointerStartRef.current;
    pointerStartRef.current = null;
    if (!start || Math.hypot(event.clientX - start.x, event.clientY - start.y) < 8) return;

    suppressClickRef.current = true;
    if (suppressTimerRef.current) clearTimeout(suppressTimerRef.current);
    suppressTimerRef.current = setTimeout(() => {
      suppressClickRef.current = false;
      suppressTimerRef.current = null;
    }, 180);
  }

  function onClickCapture(event) {
    if (!suppressClickRef.current || event.detail === 0) return;
    event.preventDefault();
    event.stopPropagation();
    suppressClickRef.current = false;
    if (suppressTimerRef.current) clearTimeout(suppressTimerRef.current);
    suppressTimerRef.current = null;
  }

  return (
    <div
      className="rail-frame"
      data-overflow-left={overflow.left ? "true" : undefined}
      data-overflow-right={overflow.right ? "true" : undefined}
    >
      <div
        {...attributes}
        ref={railRef}
        className={`scroll-rail ${className}`.trim()}
        role={role}
        aria-label={label}
        tabIndex={canFocusRail && (overflow.left || overflow.right) ? 0 : undefined}
        data-native-scroll=""
        onPointerDownCapture={onPointerDownCapture}
        onPointerUpCapture={onPointerUpCapture}
        onPointerCancelCapture={() => { pointerStartRef.current = null; }}
        onClickCapture={onClickCapture}
      >
        {children}
      </div>
    </div>
  );
}

function normalizeForSearch(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("es-MX");
}

export function SearchableCombobox({
  id,
  label,
  options,
  value,
  onChange,
  placeholder = "Escribe para filtrar",
}) {
  const rootRef = useRef(null);
  const inputRef = useRef(null);
  const optionRefs = useRef([]);
  const selectedOption = options.find((option) => option.value === value);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [hasTyped, setHasTyped] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const listId = `${id}-options`;

  const filteredOptions = useMemo(() => {
    if (!hasTyped || !query.trim()) return options;
    const normalizedQuery = normalizeForSearch(query.trim());
    return options.filter((option) => normalizeForSearch(option.label).includes(normalizedQuery));
  }, [hasTyped, options, query]);

  const inputValue = open ? query : selectedOption?.label ?? "";
  const activeOption = open && activeIndex >= 0 ? filteredOptions[activeIndex] : null;

  function showMenu() {
    if (open) return;
    const selectedIndex = options.findIndex((option) => option.value === value);
    setQuery(selectedOption?.label ?? "");
    setHasTyped(false);
    setActiveIndex(selectedIndex >= 0 ? selectedIndex : 0);
    setOpen(true);
    requestAnimationFrame(() => inputRef.current?.select());
  }

  function closeMenu() {
    setOpen(false);
    setQuery("");
    setHasTyped(false);
    setActiveIndex(-1);
  }

  function chooseOption(option) {
    onChange(option.value);
    closeMenu();
    inputRef.current?.focus();
  }

  useEffect(() => {
    if (!open) return undefined;

    function handleOutsidePointerDown(event) {
      if (!rootRef.current?.contains(event.target)) closeMenu();
    }

    document.addEventListener("pointerdown", handleOutsidePointerDown);
    return () => document.removeEventListener("pointerdown", handleOutsidePointerDown);
  }, [open]);

  useEffect(() => {
    if (!open || activeIndex < 0) return;
    optionRefs.current[activeIndex]?.scrollIntoView({ block: "nearest" });
  }, [activeIndex, open]);

  function moveActive(direction) {
    if (!open) {
      const selectedIndex = options.findIndex((option) => option.value === value);
      setQuery(selectedOption?.label ?? "");
      setHasTyped(false);
      setOpen(true);
      setActiveIndex(selectedIndex >= 0 ? selectedIndex : direction > 0 ? 0 : options.length - 1);
      return;
    }

    if (filteredOptions.length === 0) return;
    setActiveIndex((current) => {
      if (current < 0) return direction > 0 ? 0 : filteredOptions.length - 1;
      return (current + direction + filteredOptions.length) % filteredOptions.length;
    });
  }

  function handleKeyDown(event) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      moveActive(1);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      moveActive(-1);
    } else if (event.key === "Home" && open) {
      event.preventDefault();
      setActiveIndex(0);
    } else if (event.key === "End" && open) {
      event.preventDefault();
      setActiveIndex(filteredOptions.length - 1);
    } else if (event.key === "Enter" && open) {
      event.preventDefault();
      if (activeOption) chooseOption(activeOption);
      else if (filteredOptions.length === 1) chooseOption(filteredOptions[0]);
    } else if (event.key === "Escape" && open) {
      event.preventDefault();
      closeMenu();
    } else if (event.key === "Tab" && open) {
      closeMenu();
    }
  }

  return (
    <div className="field combobox-field" ref={rootRef}>
      <label className="field-label" id={`${id}-label`} htmlFor={id}>{label}</label>
      <div className={`combobox${open ? " is-open" : ""}`}>
        <input
          ref={inputRef}
          id={id}
          type="text"
          role="combobox"
          aria-autocomplete="list"
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-controls={listId}
          aria-activedescendant={activeOption ? `${id}-option-${activeIndex}` : undefined}
          aria-labelledby={`${id}-label`}
          autoComplete="off"
          placeholder={placeholder}
          value={inputValue}
          onFocus={showMenu}
          onClick={showMenu}
          onChange={(event) => {
            setQuery(event.target.value);
            setHasTyped(true);
            setActiveIndex(0);
            setOpen(true);
          }}
          onKeyDown={handleKeyDown}
        />
        <button
          type="button"
          className="combobox-toggle"
          aria-label={open ? `Cerrar opciones de ${label.toLocaleLowerCase("es-MX")}` : `Mostrar opciones de ${label.toLocaleLowerCase("es-MX")}`}
          aria-expanded={open}
          aria-controls={listId}
          onPointerDown={(event) => {
            if (event.pointerType === "mouse") event.preventDefault();
          }}
          onClick={() => {
            if (open) closeMenu();
            else {
              inputRef.current?.focus();
              showMenu();
            }
          }}
        >
          <span aria-hidden="true">{open ? "⌃" : "⌄"}</span>
        </button>
        <ul
          id={listId}
          className="combobox-list"
          role="listbox"
          aria-labelledby={`${id}-label`}
          hidden={!open}
        >
          {filteredOptions.length > 0 ? filteredOptions.map((option, index) => (
            <li
              key={option.value}
              id={`${id}-option-${index}`}
              ref={(node) => { optionRefs.current[index] = node; }}
              className="combobox-option"
              role="option"
              aria-selected={option.value === value}
              data-active={index === activeIndex ? "true" : undefined}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => chooseOption(option)}
            >
              {option.label}
            </li>
          )) : (
            <li className="combobox-empty" role="presentation">No hay coincidencias.</li>
          )}
        </ul>
      </div>
      <span className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {open ? filteredOptions.length === 0 ? "No hay coincidencias." : `${filteredOptions.length} ${filteredOptions.length === 1 ? "opción disponible" : "opciones disponibles"}.` : ""}
      </span>
    </div>
  );
}

export function SearchableMultiCombobox({
  id,
  label,
  options,
  values = [],
  onChange,
  onCommit,
  placeholder = "Escribe para filtrar",
  description,
}) {
  const rootRef = useRef(null);
  const inputRef = useRef(null);
  const optionRefs = useRef([]);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [hasTyped, setHasTyped] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const listId = `${id}-options`;
  const labelId = `${id}-label`;
  const onCommitRef = useRef(onCommit);
  const valuesRef = useRef(Array.isArray(values) ? values : []);
  const valuesAtOpenRef = useRef(valuesRef.current);
  onCommitRef.current = onCommit;
  valuesRef.current = Array.isArray(values) ? values : [];
  const safeValues = valuesRef.current;
  const selectedValues = useMemo(() => new Set(safeValues), [safeValues]);
  const selectedOptions = options.filter((option) => selectedValues.has(option.value));

  const filteredOptions = useMemo(() => {
    if (!hasTyped || !query.trim()) return options;
    const normalizedQuery = normalizeForSearch(query.trim());
    return options.filter((option) => normalizeForSearch(option.label).includes(normalizedQuery));
  }, [hasTyped, options, query]);

  const activeOption = open && activeIndex >= 0 ? filteredOptions[activeIndex] : null;

  function showMenu() {
    if (open) return;
    valuesAtOpenRef.current = [...valuesRef.current];
    setQuery("");
    setHasTyped(false);
    setActiveIndex(options.length ? 0 : -1);
    setOpen(true);
  }

  function closeMenu() {
    setOpen(false);
    setQuery("");
    setHasTyped(false);
    setActiveIndex(-1);
    const valuesAtOpen = valuesAtOpenRef.current;
    const currentValues = valuesRef.current;
    const changed = valuesAtOpen.length !== currentValues.length
      || valuesAtOpen.some((value, index) => value !== currentValues[index]);
    if (changed) onCommitRef.current?.();
  }

  function toggleOption(option) {
    const nextValues = selectedValues.has(option.value)
      ? safeValues.filter((value) => value !== option.value)
      : [...safeValues, option.value];
    onChange(nextValues);
  }

  useEffect(() => {
    if (!open) return undefined;

    function handleOutsidePointerDown(event) {
      if (!rootRef.current?.contains(event.target)) closeMenu();
    }

    document.addEventListener("pointerdown", handleOutsidePointerDown);
    return () => document.removeEventListener("pointerdown", handleOutsidePointerDown);
  }, [open]);

  useEffect(() => {
    if (!open || activeIndex < 0) return;
    optionRefs.current[activeIndex]?.scrollIntoView({ block: "nearest" });
  }, [activeIndex, open]);

  function moveActive(direction) {
    if (!open) {
      setQuery("");
      setHasTyped(false);
      setOpen(true);
      setActiveIndex(options.length ? (direction > 0 ? 0 : options.length - 1) : -1);
      return;
    }

    if (filteredOptions.length === 0) return;
    setActiveIndex((current) => {
      if (current < 0) return direction > 0 ? 0 : filteredOptions.length - 1;
      return (current + direction + filteredOptions.length) % filteredOptions.length;
    });
  }

  function handleKeyDown(event) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      moveActive(1);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      moveActive(-1);
    } else if (event.key === "Home" && open) {
      event.preventDefault();
      setActiveIndex(filteredOptions.length ? 0 : -1);
    } else if (event.key === "End" && open) {
      event.preventDefault();
      setActiveIndex(filteredOptions.length - 1);
    } else if (event.key === "Enter" && open) {
      event.preventDefault();
      if (activeOption) toggleOption(activeOption);
      else if (filteredOptions.length === 1) toggleOption(filteredOptions[0]);
    } else if (event.key === "Escape" && open) {
      event.preventDefault();
      closeMenu();
    } else if (event.key === "Tab" && open) {
      closeMenu();
    } else if (event.key === "Backspace" && !query && safeValues.length > 0) {
      onChange(safeValues.slice(0, -1));
    }
  }

  return (
    <div className="field combobox-field multi-combobox-field" ref={rootRef}>
      <div className="combobox-label-row">
        <label className="field-label" id={labelId} htmlFor={id}>{label}</label>
        {safeValues.length > 0 && (
          <button type="button" className="combobox-clear" onClick={() => onChange([])}>
            Limpiar
          </button>
        )}
      </div>
      <div className={`combobox combobox-multiple${open ? " is-open" : ""}`}>
        <div className="combobox-control">
          <input
            ref={inputRef}
            id={id}
            type="text"
            role="combobox"
            aria-autocomplete="list"
            aria-haspopup="listbox"
            aria-expanded={open}
            aria-controls={listId}
            aria-activedescendant={activeOption ? `${id}-option-${activeIndex}` : undefined}
            aria-labelledby={labelId}
            aria-describedby={description ? `${id}-description` : undefined}
            autoComplete="off"
            placeholder={placeholder}
            value={query}
            onFocus={showMenu}
            onClick={showMenu}
            onChange={(event) => {
              setQuery(event.target.value);
              setHasTyped(true);
              setActiveIndex(event.target.value.trim() ? 0 : options.length ? 0 : -1);
              setOpen(true);
            }}
            onKeyDown={handleKeyDown}
          />
          <button
            type="button"
            className="combobox-toggle"
            aria-label={open ? `Cerrar opciones de ${label.toLocaleLowerCase("es-MX")}` : `Mostrar opciones de ${label.toLocaleLowerCase("es-MX")}`}
            aria-expanded={open}
            aria-controls={listId}
            onPointerDown={(event) => {
              if (event.pointerType === "mouse") event.preventDefault();
            }}
            onClick={() => {
              if (open) closeMenu();
              else {
                inputRef.current?.focus();
                showMenu();
              }
            }}
          >
            <span aria-hidden="true">{open ? "⌃" : "⌄"}</span>
          </button>
          <ul
            id={listId}
            className="combobox-list"
            role="listbox"
            aria-labelledby={labelId}
            aria-multiselectable="true"
            hidden={!open}
          >
            {filteredOptions.length > 0 ? filteredOptions.map((option, index) => {
              const selected = selectedValues.has(option.value);
              return (
                <li
                  key={option.value}
                  id={`${id}-option-${index}`}
                  ref={(node) => { optionRefs.current[index] = node; }}
                  className="combobox-option combobox-multiple-option"
                  role="option"
                  aria-selected={selected}
                  data-active={index === activeIndex ? "true" : undefined}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => toggleOption(option)}
                >
                  <span>{option.label}</span>
                  <span className="combobox-option-indicator" aria-hidden="true">{selected ? "✓" : "+"}</span>
                </li>
              );
            }) : (
              <li className="combobox-empty" role="presentation">No hay coincidencias.</li>
            )}
          </ul>
        </div>
        {selectedOptions.length > 0 && (
          <div className="combobox-selected" role="group" aria-label={`Opciones seleccionadas de ${label}`}>
            {selectedOptions.map((option) => (
              <span className="combobox-selection" key={option.value}>
                <span>{option.label}</span>
                <button
                  type="button"
                  aria-label={`Quitar ${option.label}`}
                  onClick={() => onChange(safeValues.filter((value) => value !== option.value))}
                >
                  <span aria-hidden="true">×</span>
                </button>
              </span>
            ))}
          </div>
        )}
      </div>
      {description && <span className="field-hint" id={`${id}-description`}>{description}</span>}
      <span className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {open
          ? filteredOptions.length === 0
            ? "No hay coincidencias."
            : `${filteredOptions.length} ${filteredOptions.length === 1 ? "opción disponible" : "opciones disponibles"}. ${safeValues.length} ${safeValues.length === 1 ? "seleccionada" : "seleccionadas"}.`
          : `${safeValues.length} ${safeValues.length === 1 ? "opción seleccionada" : "opciones seleccionadas"}.`}
      </span>
    </div>
  );
}
