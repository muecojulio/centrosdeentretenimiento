"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ATAJOS, CIUDADES, FILTROS } from "../lib/ciudades";
import { estaAbierto, esAfter } from "../lib/enriquecer";
import { Tarjeta, Detalle } from "./ui-cards";

export default function Page() {
  const [tab, setTab] = useState("explorar");
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
  const [soloAbiertos, setSoloAbiertos] = useState(false);
  const [radio, setRadio] = useState(3000);
  const [listoPrefs, setListoPrefs] = useState(false);
  const [textoGrande, setTextoGrande] = useState(false);
  const [sol, setSol] = useState(null);
  const [feriado, setFeriado] = useState(null);
  const [perfilRuta, setPerfilRuta] = useState("driving");
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
    fetch(`/api/sol?lat=${origen.lat}&lon=${origen.lon}`).then((r) => r.json()).then((j) => setSol(j.ok ? j : null)).catch(() => {});
    fetch("/api/calendario").then((r) => r.json()).then((j) => setFeriado(j.ok ? j : null)).catch(() => {});
  }, [ciudad.id, origen.lat, origen.lon]);

  const lista = useMemo(() => lugares.filter((l) => {
    if (filtro !== "todo" && filtro !== "playa" && filtro !== "tarde" && filtro !== "afters" && l.tipo !== filtro) return false;
    if (filtro === "table" && !(l.tableDance || l.tipo === "table")) return false;
    if (filtro === "afters" && !(l.after || esAfter(l.horario, l.tipo, l.nombre) || l.tipo === "antro")) return false;
    if (soloAbiertos && estaAbierto(l.horario) !== true) return false;
    return true;
  }).sort((a, b) => (a.metros || 0) - (b.metros || 0)), [lugares, filtro, soloAbiertos]);

  async function buscar(lat, lon, r, texto) {
    setCargando(true); setError("");
    try {
      const res = await fetch(`/api/places?lat=${lat}&lon=${lon}&radio=${r}&q=${encodeURIComponent(texto || "")}`);
      const data = await res.json();
      if (data.error) setError(data.error);
      setLugares(data.lugares || []);
    } catch { setError("No pude cargar lugares."); }
    finally { setCargando(false); }
  }

  function usarGPS() {
    if (!navigator.geolocation) return setError("Este dispositivo no da ubicacion.");
    navigator.geolocation.getCurrentPosition((pos) => {
      const next = { lat: pos.coords.latitude, lon: pos.coords.longitude, etiqueta: "Mi ubicacion" };
      setOrigen(next); buscar(next.lat, next.lon, radio, q);
    });
  }

  function toggleFav(lugar) {
    setFavs((prev) => {
      const next = prev.some((x) => x.id === lugar.id) ? prev.filter((x) => x.id !== lugar.id) : [lugar, ...prev].slice(0, 40);
      localStorage.setItem("nochecerca-favs", JSON.stringify(next));
      return next;
    });
  }

  async function comoLlegar(lugar) {
    setSel(lugar); setTab("llegar");
    const r = await fetch(`/api/ruta?perfil=${perfilRuta}&fromLat=${origen.lat}&fromLon=${origen.lon}&toLat=${lugar.lat}&toLon=${lugar.lon}`);
    setRuta(await r.json());
  }

  useEffect(() => {
    if (tab !== "mapa" && tab !== "llegar") return;
    let cancelled = false;
    (async () => {
      if (!window.L) {
        await new Promise((resolve) => { const s = document.createElement("script"); s.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"; s.onload = resolve; document.body.appendChild(s); });
      }
      if (cancelled || !window.L || !mapBox.current) return;
      if (mapRef.current) { try { mapRef.current.remove(); } catch {} }
      const map = window.L.map(mapBox.current).setView([origen.lat, origen.lon], 14);
      mapRef.current = map;
      window.L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { attribution: "&copy; OpenStreetMap" }).addTo(map);
      window.L.marker([origen.lat, origen.lon]).addTo(map).bindPopup("Partida");
      lista.slice(0, 40).forEach((l) => window.L.marker([l.lat, l.lon]).addTo(map).bindPopup(l.nombre));
    })();
    return () => { cancelled = true; };
  }, [tab, lista, origen]);

  return (
    <main className={textoGrande ? "app grande" : "app"}>
      <header className="top">
        <div className="logo"><b>NocheCerca</b><span>A donde salimos hoy?</span></div>
        <button type="button" className={textoGrande ? "switch on" : "switch"} aria-pressed={textoGrande} onClick={() => setTextoGrande((v) => !v)}>
          <span className="track" aria-hidden="true"><span className="thumb" /></span>Texto grande
        </button>
      </header>
      {sol?.texto && <div className="banner">{sol.texto}</div>}
      {feriado?.hoyEsFeriado && <div className="banner">Feriado en Mexico.</div>}
      {tab === "explorar" && (
        <section>
          <div className="search">
            <select value={ciudad.id} onChange={(e) => setCiudad(CIUDADES.find((c) => c.id === e.target.value))}>{CIUDADES.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}</select>
            <input placeholder="Buscar" value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === "Enter" && buscar(origen.lat, origen.lon, radio, q)} />
            <div className="chip-row">{ATAJOS.map((id) => { const c = CIUDADES.find((x) => x.id === id); return <button key={id} className={ciudad.id === id ? "chip on" : "chip"} onClick={() => { setCiudad(c); setOrigen({ lat: c.lat, lon: c.lon, etiqueta: c.nombre }); }}>{c.nombre}</button>; })}</div>
            <div className="row-btns"><button className="btn primary" onClick={usarGPS}>GPS</button><button className="btn" onClick={() => buscar(origen.lat, origen.lon, radio, q)}>Buscar</button></div>
            <div className="chip-row">{FILTROS.map((f) => <button key={f.id} className={filtro === f.id ? "chip on" : "chip"} onClick={() => setFiltro(f.id)}>{f.etiqueta}</button>)}<button className={soloAbiertos ? "chip on" : "chip"} onClick={() => setSoloAbiertos((v) => !v)}>Abiertos</button></div>
            <select value={radio} onChange={(e) => setRadio(Number(e.target.value))}><option value="1000">1 km</option><option value="3000">3 km</option><option value="8000">8 km</option></select>
          </div>
          {cargando && <p className="empty">Buscando...</p>}
          {error && <p className="aviso">{error}</p>}
          <p className="meta">{lista.length} lugares</p>
          {lista.slice(0, 40).map((l) => <Tarjeta key={l.id} l={l} fav={favs.some((x) => x.id === l.id)} onFav={() => toggleFav(l)} onGo={() => comoLlegar(l)} onOpen={() => { setSel(l); setTab("detalle"); }} />)}
        </section>
      )}
      {tab === "mapa" && <section><div className="map" ref={mapBox} /></section>}
      {tab === "favoritos" && <section>{favs.length === 0 ? <p className="empty">Aun no guardas lugares.</p> : favs.map((l) => <Tarjeta key={l.id} l={l} fav onFav={() => toggleFav(l)} onGo={() => comoLlegar(l)} onOpen={() => { setSel(l); setTab("detalle"); }} />)}</section>}
      {tab === "detalle" && sel && <Detalle l={sel} ciudad={ciudad.nombre} onBack={() => setTab("explorar")} onGo={() => comoLlegar(sel)} onFav={() => toggleFav(sel)} fav={favs.some((x) => x.id === sel.id)} />}
      {tab === "llegar" && (
        <section className="sheet">
          <h2>Como llegar</h2>
          <p className="meta">{origen.etiqueta} → {sel?.nombre || "elige un lugar"}</p>
          <div className="map" ref={mapBox} />
          {ruta?.pasos?.map((p, i) => <div className="card" key={i}><b>{i + 1}. {p.texto}</b></div>)}
        </section>
      )}
      {tab === "instalar" && <section className="sheet"><h2>Instalar</h2><p className="meta"><a href="/privacidad" style={{ color: "#c8ff4d" }}>Politica de privacidad</a></p></section>}
      <nav className="nav">{[["explorar", "Explorar"], ["mapa", "Mapa"], ["favoritos", "Favoritos"], ["llegar", "Llegar"], ["instalar", "Instalar"]].map(([id, label]) => <button key={id} className={tab === id || (tab === "detalle" && id === "explorar") ? "on" : ""} onClick={() => setTab(id)}>{label}</button>)}</nav>
    </main>
  );
}
