"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ATAJOS, CIUDADES, FILTROS } from "../lib/ciudades";
import { estaAbierto, esAfter } from "../lib/enriquecer";
import { ActionButton, ScrollRail, SearchableCombobox, useActionFeedback } from "./ui-interactions";
import { Tarjeta, Detalle } from "./ui-cards";

const SECCIONES = [
  ["explorar", "Explorar"],
  ["mapa", "Mapa"],
  ["favoritos", "Favoritos"],
  ["llegar", "Llegar"],
  ["instalar", "Instalar"],
];

const OPCIONES_CIUDAD = CIUDADES.map((ciudad) => ({ value: ciudad.id, label: ciudad.nombre }));
const CONTROLES_INTERACTIVOS = [
  "button",
  "a[href]",
  "label",
  "input",
  "select",
  "textarea",
  "iframe",
  "summary",
  "[aria-haspopup]",
  "[role='combobox']",
  "[role='listbox']",
  "[role='option']",
  "[role='tab']",
  "[role='button']",
  "[contenteditable='true']",
  "[data-native-scroll]",
  "[data-no-panel-swipe]",
  ".map",
  ".leaflet-container",
].join(",");

export default function Page() {
  const [tab, setTab] = useState("explorar");
  const activeTab = tab === "detalle" ? "explorar" : tab;
  const [ciudad, setCiudad] = useState(CIUDADES[0]);
  const [filtro, setFiltro] = useState("todo");
  const [q, setQ] = useState("");
  const [origen, setOrigen] = useState({ lat: CIUDADES[0].lat, lon: CIUDADES[0].lon, etiqueta: "CDMX centro" });
  const [lugares, setLugares] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");
  const [sel, setSel] = useState(null);
  const [favs, setFavs] = useState([]);
  const [ruta, setRuta] = useState(null);
  const [rutaError, setRutaError] = useState("");
  const [rutaCargando, setRutaCargando] = useState(false);
  const [soloAbiertos, setSoloAbiertos] = useState(false);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [radio, setRadio] = useState(3000);
  const [listoPrefs, setListoPrefs] = useState(false);
  const [textoGrande, setTextoGrande] = useState(false);
  const [sol, setSol] = useState(null);
  const [feriado, setFeriado] = useState(null);
  const [perfilRuta, setPerfilRuta] = useState("driving");
  const [salidaPanel, setSalidaPanel] = useState(null);
  const [buscarEstado, setBuscarEstado] = useActionFeedback();
  const [gpsEstado, setGpsEstado] = useActionFeedback();
  const panelTouchRef = useRef(null);
  const exitPanelTimerRef = useRef(null);
  const tabRefs = useRef({});
  const searchRequestRef = useRef(null);
  const routeRequestRef = useRef(null);
  const mapBox = useRef(null);
  const mapRef = useRef(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("nochecerca-favs");
      if (raw) setFavs(JSON.parse(raw));
    } catch {}
    setListoPrefs(true);
    if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(() => {});
  }, []);

  useEffect(() => {
    if (!listoPrefs) return;
    buscar(origen.lat, origen.lon, radio, q);
  }, [listoPrefs, ciudad.id, radio]);

  useEffect(() => {
    fetch(`/api/sol?lat=${origen.lat}&lon=${origen.lon}`)
      .then((response) => response.json())
      .then((data) => setSol(data.ok ? data : null))
      .catch(() => {});
    fetch("/api/calendario")
      .then((response) => response.json())
      .then((data) => setFeriado(data.ok ? data : null))
      .catch(() => {});
  }, [ciudad.id, origen.lat, origen.lon]);

  useEffect(() => () => {
    searchRequestRef.current?.controller.abort();
    routeRequestRef.current?.controller.abort();
    if (exitPanelTimerRef.current) clearTimeout(exitPanelTimerRef.current);
  }, []);

  const lista = useMemo(() => lugares.filter((lugar) => {
    if (filtro !== "todo" && filtro !== "playa" && filtro !== "tarde" && filtro !== "afters" && lugar.tipo !== filtro) return false;
    if (filtro === "table" && !(lugar.tableDance || lugar.tipo === "table")) return false;
    if (filtro === "afters" && !(lugar.after || esAfter(lugar.horario, lugar.tipo, lugar.nombre) || lugar.tipo === "antro")) return false;
    if (soloAbiertos && estaAbierto(lugar.horario) !== true) return false;
    return true;
  }).sort((a, b) => (a.metros || 0) - (b.metros || 0)), [lugares, filtro, soloAbiertos]);

  async function buscar(lat, lon, r, texto) {
    const query = texto || "";
    const requestKey = `${lat}|${lon}|${r}|${query}`;
    if (searchRequestRef.current?.key === requestKey) return;

    searchRequestRef.current?.controller.abort();
    const controller = new AbortController();
    const request = { key: requestKey, controller };
    searchRequestRef.current = request;
    setCargando(true);
    setError("");
    setBuscarEstado("loading");

    try {
      const response = await fetch(
        `/api/places?lat=${lat}&lon=${lon}&radio=${r}&q=${encodeURIComponent(query)}`,
        { signal: controller.signal },
      );
      const data = await response.json();
      if (!response.ok || data.error) throw new Error(data.error || "No pude cargar lugares.");
      if (searchRequestRef.current !== request) return;
      setLugares(data.lugares || []);
      setBuscarEstado("success");
    } catch (requestError) {
      if (requestError.name === "AbortError" || searchRequestRef.current !== request) return;
      setError(requestError.message || "No pude cargar lugares.");
      setBuscarEstado("error");
    } finally {
      if (searchRequestRef.current === request) {
        searchRequestRef.current = null;
        setCargando(false);
      }
    }
  }

  function elegirCiudad(nextCity) {
    if (!nextCity) return;
    setCiudad(nextCity);
    const nextOrigin = { lat: nextCity.lat, lon: nextCity.lon, etiqueta: nextCity.nombre };
    setOrigen(nextOrigin);
    buscar(nextOrigin.lat, nextOrigin.lon, radio, q);
  }

  function usarGPS() {
    if (!navigator.geolocation) {
      setError("Este dispositivo no permite compartir su ubicación.");
      setGpsEstado("error");
      return;
    }

    setError("");
    setGpsEstado("loading");
    navigator.geolocation.getCurrentPosition((position) => {
      const nextOrigin = {
        lat: position.coords.latitude,
        lon: position.coords.longitude,
        etiqueta: "Mi ubicación",
      };
      setOrigen(nextOrigin);
      setGpsEstado("success");
      buscar(nextOrigin.lat, nextOrigin.lon, radio, q);
    }, (gpsError) => {
      const message = gpsError.code === 1
        ? "No se concedió el permiso de ubicación. Puedes elegir una ciudad manualmente."
        : gpsError.code === 3
          ? "La ubicación tardó demasiado. Intenta de nuevo o elige una ciudad."
          : "No se pudo obtener la ubicación. Elige una ciudad o inténtalo de nuevo.";
      setError(message);
      setGpsEstado("error");
    }, { enableHighAccuracy: true, maximumAge: 120000, timeout: 15000 });
  }

  function toggleFav(lugar) {
    setFavs((prev) => {
      const next = prev.some((item) => item.id === lugar.id)
        ? prev.filter((item) => item.id !== lugar.id)
        : [lugar, ...prev].slice(0, 40);
      try {
        localStorage.setItem("nochecerca-favs", JSON.stringify(next));
      } catch {}
      return next;
    });
  }

  async function comoLlegar(lugar) {
    if (!lugar) return;
    const requestKey = `${origen.lat}|${origen.lon}|${lugar.lat}|${lugar.lon}|${perfilRuta}`;
    if (routeRequestRef.current?.key === requestKey) return;

    routeRequestRef.current?.controller.abort();
    const controller = new AbortController();
    const request = { key: requestKey, controller };
    routeRequestRef.current = request;
    setSel(lugar);
    cambiarSeccion("llegar", true);
    setRuta(null);
    setRutaError("");
    setRutaCargando(true);

    try {
      const response = await fetch(
        `/api/ruta?perfil=${perfilRuta}&fromLat=${origen.lat}&fromLon=${origen.lon}&toLat=${lugar.lat}&toLon=${lugar.lon}`,
        { signal: controller.signal },
      );
      const data = await response.json();
      if (!response.ok || data.error) throw new Error(data.error || "No se pudo calcular la ruta.");
      if (routeRequestRef.current !== request) return;
      setRuta(data);
    } catch (routeRequestError) {
      if (routeRequestError.name === "AbortError" || routeRequestRef.current !== request) return;
      setRutaError(routeRequestError.message || "No se pudo calcular la ruta.");
    } finally {
      if (routeRequestRef.current === request) {
        routeRequestRef.current = null;
        setRutaCargando(false);
      }
    }
  }

  useEffect(() => {
    if (tab !== "mapa" && tab !== "llegar") return undefined;
    let cancelled = false;
    (async () => {
      if (!window.L) {
        await new Promise((resolve) => {
          const script = document.createElement("script");
          script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
          script.onload = resolve;
          script.onerror = resolve;
          document.body.appendChild(script);
        });
      }
      if (cancelled || !window.L || !mapBox.current) return;
      if (mapRef.current) {
        try { mapRef.current.remove(); } catch {}
      }
      const map = window.L.map(mapBox.current).setView([origen.lat, origen.lon], 14);
      mapRef.current = map;
      window.L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "&copy; OpenStreetMap",
      }).addTo(map);
      window.L.marker([origen.lat, origen.lon]).addTo(map).bindPopup("Partida");
      lista.slice(0, 40).forEach((lugar) => {
        window.L.marker([lugar.lat, lugar.lon]).addTo(map).bindPopup(lugar.nombre);
      });
    })();
    return () => { cancelled = true; };
  }, [tab, lista, origen]);

  function cambiarSeccion(nextTab, focusTab = false) {
    const nextPanel = nextTab === "detalle" ? "explorar" : nextTab;
    const mapConflict = (activeTab === "mapa" && nextPanel === "llegar")
      || (activeTab === "llegar" && nextPanel === "mapa");
    const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

    if (nextPanel !== activeTab && !mapConflict && !reduceMotion) {
      setSalidaPanel({ id: activeTab, tab });
      if (exitPanelTimerRef.current) clearTimeout(exitPanelTimerRef.current);
      exitPanelTimerRef.current = setTimeout(() => {
        exitPanelTimerRef.current = null;
        setSalidaPanel(null);
      }, 210);
    } else {
      setSalidaPanel(null);
      if (exitPanelTimerRef.current) clearTimeout(exitPanelTimerRef.current);
      exitPanelTimerRef.current = null;
    }

    setTab(nextTab);
    if (focusTab) requestAnimationFrame(() => tabRefs.current[nextTab]?.focus());
  }

  function manejarTeclasPestana(event, index) {
    let nextIndex;
    if (event.key === "ArrowRight") nextIndex = (index + 1) % SECCIONES.length;
    else if (event.key === "ArrowLeft") nextIndex = (index - 1 + SECCIONES.length) % SECCIONES.length;
    else if (event.key === "Home") nextIndex = 0;
    else if (event.key === "End") nextIndex = SECCIONES.length - 1;
    else return;

    event.preventDefault();
    cambiarSeccion(SECCIONES[nextIndex][0], true);
  }

  function iniciarSwipePanel(event) {
    panelTouchRef.current = null;
    if (event.touches.length !== 1) return;
    const target = event.target;
    if (target instanceof Element && target.closest(CONTROLES_INTERACTIVOS)) return;

    const touch = event.touches[0];
    panelTouchRef.current = { x: touch.clientX, y: touch.clientY, time: Date.now() };
  }

  function terminarSwipePanel(event) {
    const start = panelTouchRef.current;
    panelTouchRef.current = null;
    if (!start || event.changedTouches.length !== 1) return;

    const touch = event.changedTouches[0];
    const dx = touch.clientX - start.x;
    const dy = touch.clientY - start.y;
    const distance = Math.abs(dx);
    const duration = Math.max(1, Date.now() - start.time);
    const velocity = distance / duration;
    const clearHorizontalGesture = distance > Math.abs(dy) * 1.2;
    const enoughDistance = distance >= 64 || (duration <= 260 && distance >= 36 && velocity >= 0.35);
    if (!clearHorizontalGesture || !enoughDistance) return;

    const currentIndex = SECCIONES.findIndex(([id]) => id === activeTab);
    const direction = dx < 0 ? 1 : -1;
    const nextIndex = Math.max(0, Math.min(SECCIONES.length - 1, currentIndex + direction));
    if (nextIndex !== currentIndex) cambiarSeccion(SECCIONES[nextIndex][0], true);
  }

  function abrirDetalle(lugar) {
    setSel(lugar);
    cambiarSeccion("detalle");
    requestAnimationFrame(() => document.getElementById("detail-title")?.focus());
  }

  function renderLugarCards(lugaresParaMostrar, label) {
    return (
      <ScrollRail label={label} className="place-list" role="region" aria-busy={cargando}>
        {lugaresParaMostrar.map((lugar) => (
          <Tarjeta
            key={lugar.id}
            l={lugar}
            fav={favs.some((favorite) => favorite.id === lugar.id)}
            onFav={() => toggleFav(lugar)}
            onGo={() => comoLlegar(lugar)}
            onOpen={() => abrirDetalle(lugar)}
          />
        ))}
      </ScrollRail>
    );
  }

  return (
    <main className={textoGrande ? "app grande" : "app"}>
      <a className="skip-link" href={`#panel-${activeTab}`}>Saltar al contenido principal</a>
      <header className="top">
        <div className="logo">
          <b>NocheCerca</b>
          <span>¿A dónde salimos hoy?</span>
        </div>
        <button
          type="button"
          className={textoGrande ? "switch on" : "switch"}
          role="switch"
          aria-checked={textoGrande}
          onClick={() => setTextoGrande((value) => !value)}
        >
          <span className="track" aria-hidden="true"><span className="thumb" /></span>
          <span>Texto grande</span>
        </button>
      </header>

      {sol?.texto && <div className="banner">{sol.texto}</div>}
      {feriado?.hoyEsFeriado && <div className="banner">Feriado en México.</div>}

      <div className="panels">
        {SECCIONES.map(([id]) => {
          const isActive = activeTab === id;
          const isExiting = !isActive && salidaPanel?.id === id;
          const panelTab = isActive ? tab : isExiting ? salidaPanel.tab : null;
          return (
            <div
              key={`${id}-${panelTab || "inactive"}`}
              id={`panel-${id}`}
              className={`tab-panel${isExiting ? " is-exiting" : ""}`}
              role="tabpanel"
              aria-labelledby={`tab-${id}`}
              aria-hidden={!isActive || undefined}
              inert={!isActive}
              hidden={!isActive && !isExiting}
              tabIndex={isActive ? 0 : -1}
              onTouchStart={isActive ? iniciarSwipePanel : undefined}
              onTouchEnd={isActive ? terminarSwipePanel : undefined}
              onTouchCancel={isActive ? () => { panelTouchRef.current = null; } : undefined}
            >
            {panelTab === "detalle" && id === "explorar" && sel && (
              <Detalle
                l={sel}
                ciudad={ciudad.nombre}
                onBack={() => cambiarSeccion("explorar", true)}
                onGo={() => comoLlegar(sel)}
                onFav={() => toggleFav(sel)}
                fav={favs.some((favorite) => favorite.id === sel.id)}
              />
            )}

            {panelTab === "explorar" && id === "explorar" && (
              <section aria-label="Explorar lugares">
                <form className="search" onSubmit={(event) => {
                  event.preventDefault();
                  buscar(origen.lat, origen.lon, radio, q);
                }}>
                  <SearchableCombobox
                    id="city-picker"
                    label="Ciudad"
                    options={OPCIONES_CIUDAD}
                    value={ciudad.id}
                    onChange={(value) => elegirCiudad(CIUDADES.find((item) => item.id === value))}
                  />

                  <ScrollRail label="Atajos de ciudad" className="chip-row" selectedKey={ciudad.id}>
                    {ATAJOS.map((idCiudad) => {
                      const shortcutCity = CIUDADES.find((item) => item.id === idCiudad);
                      if (!shortcutCity) return null;
                      const selected = ciudad.id === idCiudad;
                      return (
                        <button
                          key={idCiudad}
                          type="button"
                          className={selected ? "chip on" : "chip"}
                          aria-pressed={selected}
                          data-rail-selected={selected ? "true" : undefined}
                          onClick={() => elegirCiudad(shortcutCity)}
                        >
                          {shortcutCity.nombre}
                        </button>
                      );
                    })}
                  </ScrollRail>

                  <div className="field">
                    <label className="field-label" htmlFor="place-query">Nombre o tipo de lugar</label>
                    <input
                      id="place-query"
                      className="text-field"
                      type="search"
                      placeholder="Ej. música en vivo"
                      value={q}
                      onChange={(event) => setQ(event.target.value)}
                    />
                  </div>

                  <div className="row-btns search-actions">
                    <ActionButton
                      className="btn primary"
                      state={gpsEstado}
                      loadingLabel="Localizando…"
                      successLabel="Ubicación lista"
                      errorLabel="Sin ubicación"
                      onClick={usarGPS}
                    >
                      Mi ubicación
                    </ActionButton>
                    <ActionButton
                      className="btn"
                      type="submit"
                      state={buscarEstado}
                      loadingLabel="Buscando…"
                      successLabel="Búsqueda lista"
                      errorLabel="No se pudo buscar"
                    >
                      Buscar
                    </ActionButton>
                  </div>

                  <button
                    type="button"
                    className="btn btn-ghost filter-toggle"
                    aria-expanded={showAdvancedFilters}
                    aria-controls="advanced-filters-panel"
                    onClick={() => setShowAdvancedFilters((v) => !v)}
                  >
                    {showAdvancedFilters ? "▲ Ocultar filtros avanzados" : "▼ Filtros avanzados"}
                  </button>
                  <div id="advanced-filters-panel" className={showAdvancedFilters ? "filter-controls open" : "filter-controls collapsed"}>
                    <ScrollRail label="Categorías de lugares" className="chip-row" selectedKey={filtro}>
                      {FILTROS.map((item) => {
                        const selected = filtro === item.id;
                        return (
                          <button
                            key={item.id}
                            type="button"
                            className={selected ? "chip on" : "chip"}
                            aria-pressed={selected}
                            data-rail-selected={selected ? "true" : undefined}
                            onClick={() => setFiltro(item.id)}
                          >
                            {item.etiqueta}
                          </button>
                        );
                      })}
                    </ScrollRail>
                    <div className="filter-bottom-row">
                      <div className="field radius-field">
                        <label className="field-label" htmlFor="search-radius">Radio de búsqueda</label>
                        <select
                          id="search-radius"
                          className="text-field"
                          value={radio}
                          onChange={(event) => setRadio(Number(event.target.value))}
                        >
                          <option value="1000">1 km</option>
                          <option value="3000">3 km</option>
                          <option value="8000">8 km</option>
                        </select>
                      </div>
                      <button
                        type="button"
                        className={soloAbiertos ? "chip on" : "chip"}
                        aria-pressed={soloAbiertos}
                        onClick={() => setSoloAbiertos((value) => !value)}
                      >
                        Abiertos ahora
                      </button>
                    </div>
                  </div>
                </form>

                <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
                  {gpsEstado === "success"
                    ? "Ubicación obtenida. Buscando lugares cercanos."
                    : buscarEstado === "success"
                      ? `Búsqueda lista. ${lugares.length} ${lugares.length === 1 ? "lugar encontrado" : "lugares encontrados"}.`
                      : ""}
                </div>
                {cargando && <p className="empty loading-message" role="status">Buscando lugares cercanos…</p>}
                {error && <p className="aviso error-message" role="alert">{error}</p>}
                <p className="meta result-count" aria-live="polite" aria-atomic="true">
                  {lista.length} {lista.length === 1 ? "lugar" : "lugares"}
                </p>
                {lista.length > 0
                  ? renderLugarCards(lista.slice(0, 40), "Lugares encontrados, lista desplazable")
                  : !cargando && !error && <p className="empty">No encontramos lugares con estos filtros. Prueba otra categoría o amplía el radio.</p>}
              </section>
            )}

            {panelTab === "mapa" && id === "mapa" && (
              <section aria-label="Mapa de lugares cercanos">
                <div
                  className="map"
                  ref={mapBox}
                  role="region"
                  aria-label="Mapa interactivo con tu ubicación y lugares cercanos"
                />
              </section>
            )}

            {panelTab === "favoritos" && id === "favoritos" && (
              <section aria-label="Lugares guardados">
                <h2 className="section-title">Tus favoritos</h2>
                {favs.length === 0
                  ? <p className="empty">Aún no guardas lugares.</p>
                  : renderLugarCards(favs, "Favoritos guardados, lista desplazable")}
              </section>
            )}

            {panelTab === "llegar" && id === "llegar" && (
              <section className="sheet route-sheet" aria-labelledby="route-title" aria-busy={rutaCargando}>
                <h2 id="route-title">Cómo llegar</h2>
                <p className="meta">{origen.etiqueta} → {sel?.nombre || "elige un lugar"}</p>
                <div
                  className="map"
                  ref={mapBox}
                  role="region"
                  aria-label="Mapa de la ruta"
                />
                {rutaCargando && <p className="route-loading" role="status" aria-live="polite">Calculando la ruta…</p>}
                {rutaError && <p className="aviso error-message" role="alert">{rutaError}</p>}
                {ruta && !rutaError && (
                  <>
                    <p className="meta route-summary">
                      {ruta.metros ? `${(ruta.metros / 1000).toFixed(1)} km` : ""}
                      {ruta.minutos ? ` · ${ruta.minutos} min aprox.` : ""}
                    </p>
                    {ruta.pasos?.map((paso, index) => (
                      <article className="card route-step" key={`${index}-${paso.texto}`}>
                        <b>{index + 1}. {paso.texto}</b>
                      </article>
                    ))}
                  </>
                )}
                {rutaError && sel && (
                  <ActionButton className="btn" onClick={() => comoLlegar(sel)}>
                    Intentar de nuevo
                  </ActionButton>
                )}
              </section>
            )}

            {panelTab === "instalar" && id === "instalar" && (
              <section className="sheet" aria-labelledby="install-title">
                <h2 id="install-title">Instalar</h2>
                <p className="meta">
                  <a href="/privacidad">Política de privacidad</a>
                </p>
              </section>
            )}
            </div>
          );
        })}
      </div>

      <nav className="nav-shell" aria-label="Secciones principales">
        <ScrollRail
          label="Secciones principales"
          className="nav-tabs"
          role="tablist"
          selectedKey={activeTab}
          aria-orientation="horizontal"
          style={{ "--active-tab": SECCIONES.findIndex(([id]) => id === activeTab), "--tab-count": SECCIONES.length }}
        >
          {SECCIONES.map(([id, label], index) => (
            <button
              key={id}
              ref={(node) => { tabRefs.current[id] = node; }}
              id={`tab-${id}`}
              type="button"
              role="tab"
              className={activeTab === id ? "nav-tab on" : "nav-tab"}
              aria-selected={activeTab === id}
              aria-controls={`panel-${id}`}
              tabIndex={activeTab === id ? 0 : -1}
              onClick={() => cambiarSeccion(id)}
              onKeyDown={(event) => manejarTeclasPestana(event, index)}
            >
              {label}
            </button>
          ))}
        </ScrollRail>
      </nav>
    </main>
  );
}
