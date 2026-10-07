"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { CIUDADES, FILTROS } from "../lib/ciudades";
import { estaAbierto, esAfter } from "../lib/enriquecer";
import { ActionButton, ScrollRail, SearchableMultiCombobox, useActionFeedback } from "./ui-interactions";
import { Tarjeta, Detalle, IndicacionesVoz } from "./ui-cards";
import ContenidoPrivacidad from "./privacidad/contenido";

const SECCIONES = [
  ["explorar", "Explorar"],
  ["favoritos", "Favoritos"],
  ["llegar", "Llegar"],
  ["instalar", "Instalar"],
  ["privacidad", "Privacidad"],
];

const OPCIONES_CIUDAD = CIUDADES.map((ciudad) => ({ value: ciudad.id, label: ciudad.nombre }));
const OPCIONES_CATEGORIA = FILTROS.filter((filtro) => filtro.id !== "todo")
  .map((filtro) => ({ value: filtro.id, label: filtro.etiqueta }));
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
  const [ciudadesSeleccionadas, setCiudadesSeleccionadas] = useState([CIUDADES[0].id]);
  const ciudad = CIUDADES.find((item) => item.id === ciudadesSeleccionadas[0]) || CIUDADES[0];
  const [filtros, setFiltros] = useState([]);
  const [q, setQ] = useState("");
  const [origen, setOrigen] = useState({ lat: CIUDADES[0].lat, lon: CIUDADES[0].lon, etiqueta: CIUDADES[0].nombre });
  const [ubicacionPersonal, setUbicacionPersonal] = useState(false);
  const [lugares, setLugares] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");
  const [sel, setSel] = useState(null);
  const [favs, setFavs] = useState([]);
  const [ruta, setRuta] = useState(null);
  const [rutaOrigen, setRutaOrigen] = useState(null);
  const [rutaError, setRutaError] = useState("");
  const [rutaCargando, setRutaCargando] = useState(false);
  const [soloAbiertos, setSoloAbiertos] = useState(false);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [radio, setRadio] = useState(3000);
  const [listoPrefs, setListoPrefs] = useState(false);
  const [urlInstalacion, setUrlInstalacion] = useState("");
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
    setUrlInstalacion(new URL("/", window.location.href).toString());
    try {
      const raw = localStorage.getItem("nochecerca-favs");
      if (raw) setFavs(JSON.parse(raw));
    } catch {}
    setListoPrefs(true);
    if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(() => {});
  }, []);

  // La selección múltiple de ciudades se confirma al cerrar el combo o al pulsar Buscar.
  useEffect(() => {
    if (!listoPrefs) return;
    if (ubicacionPersonal) {
      buscar(origen.lat, origen.lon, radio, q, origen.etiqueta);
      return;
    }
    const ciudades = ciudadesSeleccionadas
      .map((id) => CIUDADES.find((item) => item.id === id))
      .filter(Boolean);
    if (ciudades.length) buscarEnCiudades(ciudades, radio, q);
  }, [listoPrefs, radio, ubicacionPersonal]);

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
    const filtrosAplicables = filtros.filter((id) => id !== "playa" && id !== "tarde");
    if (filtrosAplicables.length > 0) {
      const coincideCategoria = filtrosAplicables.some((id) => {
        if (id === "table") return lugar.tableDance || lugar.tipo === "table";
        if (id === "afters") return lugar.after || esAfter(lugar.horario, lugar.tipo, lugar.nombre) || lugar.tipo === "antro";
        return lugar.tipo === id;
      });
      if (!coincideCategoria) return false;
    }
    if (soloAbiertos && estaAbierto(lugar.horario) !== true) return false;
    return true;
  }).sort((a, b) => (a.metros || 0) - (b.metros || 0)), [lugares, filtros, soloAbiertos]);

  async function buscarEnPuntos(puntos, r, texto) {
    const query = (texto || "").trim();
    if (!puntos.length) return;
    const requestKey = `${puntos.map((punto) => `${punto.key}:${punto.lat}:${punto.lon}`).join(",")}|${r}|${query}`;
    if (searchRequestRef.current?.key === requestKey) return;

    searchRequestRef.current?.controller.abort();
    const controller = new AbortController();
    const request = { key: requestKey, controller };
    searchRequestRef.current = request;
    setCargando(true);
    setError("");
    setBuscarEstado("loading");

    try {
      const resultados = [];
      const fallos = [];
      let siguiente = 0;
      const worker = async () => {
        while (siguiente < puntos.length && !controller.signal.aborted) {
          const punto = puntos[siguiente];
          siguiente += 1;
          try {
            const response = await fetch(
              `/api/places?lat=${punto.lat}&lon=${punto.lon}&radio=${r}&q=${encodeURIComponent(query)}`,
              { signal: controller.signal },
            );
            const data = await response.json();
            if (!response.ok || data.error) throw new Error(data.error || "No pude cargar lugares.");
            resultados.push({ punto, lugares: data.lugares || [] });
          } catch (requestError) {
            if (requestError.name === "AbortError") return;
            fallos.push({ punto, error: requestError });
          }
        }
      };

      await Promise.all(Array.from({ length: Math.min(3, puntos.length) }, () => worker()));
      if (controller.signal.aborted || searchRequestRef.current !== request) return;
      if (resultados.length === 0) {
        setLugares([]);
        throw new Error(fallos[0]?.error.message || "No pude cargar lugares.");
      }

      const combinados = new Map();
      for (const { punto, lugares: lugaresDePunto } of resultados) {
        for (const lugar of lugaresDePunto) {
          const coordenadas = `${Number(lugar.lat).toFixed(5)}|${Number(lugar.lon).toFixed(5)}`;
          const clave = `${String(lugar.nombre || "").trim().toLocaleLowerCase("es-MX")}|${coordenadas}`;
          const candidato = {
            ...lugar,
            ...(punto.ciudadNombre ? { ciudadNombre: punto.ciudadNombre } : {}),
            origenBusqueda: { lat: punto.lat, lon: punto.lon, etiqueta: punto.etiqueta },
          };
          const existente = combinados.get(clave);
          if (!existente) {
            combinados.set(clave, candidato);
          } else {
            const candidatoMasCerca = (candidato.metros ?? Infinity) < (existente.metros ?? Infinity);
            const principal = candidatoMasCerca ? candidato : existente;
            const secundario = candidatoMasCerca ? existente : candidato;
            combinados.set(clave, {
              ...secundario,
              ...principal,
              telefono: principal.telefono || secundario.telefono,
              direccion: principal.direccion || secundario.direccion,
              web: principal.web || secundario.web,
            });
          }
        }
      }

      setLugares([...combinados.values()].sort((a, b) => (a.metros ?? Infinity) - (b.metros ?? Infinity)));
      if (fallos.length > 0) {
        const ciudadesConFallo = fallos.map(({ punto }) => punto.etiqueta).join(", ");
        setError(`No se pudieron cargar resultados de: ${ciudadesConFallo}.`);
        setBuscarEstado("error");
      } else {
        setError("");
        setBuscarEstado("success");
      }
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

  function buscar(lat, lon, r, texto, etiqueta = origen.etiqueta) {
    return buscarEnPuntos([{ key: `punto:${lat}:${lon}`, lat, lon, etiqueta }], r, texto);
  }

  function buscarEnCiudades(ciudades, r, texto) {
    return buscarEnPuntos(ciudades.map((item) => ({
      key: item.id,
      lat: item.lat,
      lon: item.lon,
      etiqueta: item.nombre,
      ciudadNombre: item.nombre,
    })), r, texto);
  }

  function buscarSeleccionActual(texto = q) {
    if (ubicacionPersonal) return buscar(origen.lat, origen.lon, radio, texto, origen.etiqueta);
    const ciudades = ciudadesSeleccionadas
      .map((id) => CIUDADES.find((item) => item.id === id))
      .filter(Boolean);
    if (ciudades.length) return buscarEnCiudades(ciudades, radio, texto);

    searchRequestRef.current?.controller.abort();
    searchRequestRef.current = null;
    setCargando(false);
    setLugares([]);
    setError("Selecciona al menos una ciudad o usa Mi ubicación para buscar.");
    setBuscarEstado("error");
  }

  function elegirCiudades(nextIds) {
    const siguientes = [...new Set(nextIds)]
      .map((id) => CIUDADES.find((item) => item.id === id))
      .filter(Boolean);
    const ciudadPrincipal = siguientes[0];
    setCiudadesSeleccionadas(siguientes.map((item) => item.id));
    setUbicacionPersonal(false);
    if (ciudadPrincipal) {
      setOrigen({ lat: ciudadPrincipal.lat, lon: ciudadPrincipal.lon, etiqueta: ciudadPrincipal.nombre });
    }
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
      setCiudadesSeleccionadas([]);
      setUbicacionPersonal(true);
      setGpsEstado("success");
      buscar(nextOrigin.lat, nextOrigin.lon, radio, q, nextOrigin.etiqueta);
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

  async function comoLlegar(lugar, origenForzado = null) {
    if (!lugar) return;
    const puntoSalida = origenForzado || lugar.origenBusqueda || origen;
    const requestKey = `${puntoSalida.lat}|${puntoSalida.lon}|${lugar.lat}|${lugar.lon}|${perfilRuta}`;
    if (routeRequestRef.current?.key === requestKey) return;

    routeRequestRef.current?.controller.abort();
    const controller = new AbortController();
    const request = { key: requestKey, controller };
    routeRequestRef.current = request;
    setSel(lugar);
    setRutaOrigen(puntoSalida);
    cambiarSeccion("llegar", true);
    setRuta(null);
    setRutaError("");
    setRutaCargando(true);

    try {
      const response = await fetch(
        `/api/ruta?perfil=${perfilRuta}&fromLat=${puntoSalida.lat}&fromLon=${puntoSalida.lon}&toLat=${lugar.lat}&toLon=${lugar.lon}`,
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
    if (tab !== "llegar") return undefined;
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
      const map = window.L.map(mapBox.current);
      mapRef.current = map;
      window.L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "&copy; OpenStreetMap",
      }).addTo(map);

      const puntoSalida = rutaOrigen || origen;
      const posiciones = [[puntoSalida.lat, puntoSalida.lon]];
      if (sel) posiciones.push([sel.lat, sel.lon]);
      const bounds = window.L.latLngBounds(posiciones);
      if (posiciones.length > 1 && bounds.isValid()) {
        map.fitBounds(bounds, { padding: [24, 24], maxZoom: 14 });
      } else {
        map.setView(posiciones[0] || [origen.lat, origen.lon], 14);
      }

      window.L.marker([puntoSalida.lat, puntoSalida.lon])
        .addTo(map)
        .bindPopup(`Partida: ${puntoSalida.nombre || puntoSalida.etiqueta}`);
      if (sel) {
        window.L.marker([sel.lat, sel.lon]).addTo(map).bindPopup(sel.nombre);
        const coordenadasRuta = ruta?.geometria?.coordinates;
        if (Array.isArray(coordenadasRuta)) {
          window.L.polyline(coordenadasRuta.map(([lon, lat]) => [lat, lon]), { color: "#c8ff4d", weight: 5 }).addTo(map);
        }
      }
    })();
    return () => { cancelled = true; };
  }, [tab, origen, rutaOrigen, sel, ruta]);

  function cambiarSeccion(nextTab, focusTab = false) {
    const nextPanel = nextTab === "detalle" ? "explorar" : nextTab;
    const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

    if (nextPanel !== activeTab && !reduceMotion) {
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
                ciudad={sel.ciudadNombre || (ubicacionPersonal || ciudadesSeleccionadas.length === 0 ? origen.etiqueta : ciudad.nombre)}
                onBack={() => cambiarSeccion("explorar", true)}
                onGoGPS={(puntoSalida) => comoLlegar(sel, puntoSalida)}
                onFav={() => toggleFav(sel)}
                fav={favs.some((favorite) => favorite.id === sel.id)}
              />
            )}

            {panelTab === "explorar" && id === "explorar" && (
              <section aria-label="Explorar lugares">
                <form className="search" onSubmit={(event) => {
                  event.preventDefault();
                  buscarSeleccionActual(q);
                }}>
                  <SearchableMultiCombobox
                    id="city-picker"
                    label="Ciudad"
                    options={OPCIONES_CIUDAD}
                    values={ciudadesSeleccionadas}
                    onChange={elegirCiudades}
                    onCommit={buscarSeleccionActual}
                    placeholder="Busca y selecciona ciudades"
                    description="Selecciona una o varias ciudades; usa Buscar para combinarlas."
                  />

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
                    <SearchableMultiCombobox
                      id="category-picker"
                      label="Categorías"
                      options={OPCIONES_CATEGORIA}
                      values={filtros}
                      onChange={setFiltros}
                      placeholder="Busca una o varias categorías"
                      description="Sin categorías seleccionadas se muestran todas."
                    />
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
                <p className="meta">{rutaOrigen?.etiqueta || origen.etiqueta} → {sel?.nombre || "elige un lugar"}</p>
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
                    {ruta.pasos?.some((paso) => paso?.texto) && <IndicacionesVoz ruta={ruta} />}
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
              <section className="sheet install-sheet" aria-labelledby="install-title">
                <h2 id="install-title">Instalar NocheCerca</h2>
                <p className="install-intro">
                  Escanea este código con la cámara de tu celular para abrir NocheCerca en ese dispositivo.
                </p>
                <div className="qr" aria-live="polite">
                  {urlInstalacion
                    ? <QRCodeSVG
                        value={urlInstalacion}
                        size={232}
                        level="M"
                        includeMargin
                        title="Código QR para abrir NocheCerca"
                        bgColor="#ffffff"
                        fgColor="#0b0714"
                      />
                    : <p className="meta" role="status">Preparando el código QR…</p>}
                </div>
                <p className="meta install-help">
                  Después de abrirla, usa el menú del navegador y elige «Instalar app» en Android o
                  «Agregar a pantalla de inicio» en iPhone.
                </p>
                {urlInstalacion && (
                  <p className="install-link">
                    <a href={urlInstalacion}>{urlInstalacion}</a>
                  </p>
                )}
              </section>
            )}

            {panelTab === "privacidad" && id === "privacidad" && (
              <section className="sheet privacy-sheet" aria-labelledby="privacy-title">
                <h2 id="privacy-title">Política de privacidad</h2>
                <ContenidoPrivacidad headingLevel={3} />
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
