"use client";

import { useEffect, useRef, useState } from "react";
import { estaAbierto, esAfter, textoDistancia, textoTiempo } from "../lib/enriquecer";
import { ActionButton, useActionFeedback } from "./ui-interactions";

export function dato(valor, etiqueta) {
  if (valor == null || valor === "") return null;
  return (
    <p className="meta">
      <b>{etiqueta}:</b> {valor}
    </p>
  );
}

export function Tarjeta({ l, onOpen }) {
  const abierto = estaAbierto(l.horario);
  return (
    <article className="card venue-card">
      <h3>{l.nombre}</h3>
      <div className="badges">
        <span className="badge">{l.tipoEtiqueta}</span>
        {l.ciudadNombre && <span className="badge">{l.ciudadNombre}</span>}
        {abierto === true && <span className="badge ok">Abierto ahora</span>}
        {abierto === false && <span className="badge no">Cerrado ahora</span>}
        {l.live && <span className="badge ok">En vivo (mapa)</span>}
        {(l.after || esAfter(l.horario, l.tipo, l.nombre)) && <span className="badge warn">After / madrugada</span>}
        {(l.tableDance || l.tipo === "table") && <span className="badge warn">Table dance</span>}
        {l.fuente === "INEGI DENUE" && <span className="badge ok">INEGI</span>}
      </div>
      <p className="meta">
        {textoDistancia(l.metros) ? `${textoDistancia(l.metros)} · ` : ""}
        {textoTiempo(l) ? `${textoTiempo(l)} · ` : ""}
        {l.direccion || ""}
      </p>
      {dato(l.coverTexto, "Cover")}
      {dato(l.musica, "Música")}
      <div className="row-btns card-actions">
        <button type="button" className="btn primary" onClick={onOpen}>Ver ficha</button>
      </div>
    </article>
  );
}

export function IndicacionesVoz({ ruta }) {
  const [hablando, setHablando] = useState(false);
  const [error, setError] = useState("");
  const utteranceRef = useRef(null);
  const mountedRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
      utteranceRef.current = null;
    };
  }, []);

  function detener() {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    utteranceRef.current = null;
    setHablando(false);
  }

  function escuchar() {
    if (typeof window === "undefined" || !window.speechSynthesis || !window.SpeechSynthesisUtterance) {
      setError("Este navegador no permite reproducir indicaciones por voz.");
      return;
    }

    const pasos = (ruta?.pasos || []).filter((paso) => paso?.texto);
    if (pasos.length === 0) {
      setError("Esta ruta no tiene indicaciones de voz disponibles.");
      return;
    }

    setError("");
    const distancia = ruta.metros ? `${(ruta.metros / 1000).toFixed(1)} kilómetros. ` : "";
    const duracion = ruta.minutos ? `Tiempo estimado: ${ruta.minutos} minutos. ` : "";
    const instrucciones = pasos.map((paso, index) => `Paso ${index + 1}. ${paso.texto}`);
    const utterance = new window.SpeechSynthesisUtterance(
      `Indicaciones de la ruta. ${distancia}${duracion}${instrucciones.join(". ")}`,
    );
    utterance.lang = "es-MX";
    utterance.rate = 0.95;
    utterance.onend = () => {
      if (!mountedRef.current || utteranceRef.current !== utterance) return;
      utteranceRef.current = null;
      setHablando(false);
    };
    utterance.onerror = (event) => {
      if (!mountedRef.current || utteranceRef.current !== utterance) return;
      utteranceRef.current = null;
      setHablando(false);
      if (event.error !== "canceled" && event.error !== "interrupted") {
        setError("No se pudieron reproducir las indicaciones. Inténtalo de nuevo.");
      }
    };

    window.speechSynthesis.cancel();
    utteranceRef.current = utterance;
    setHablando(true);
    window.speechSynthesis.speak(utterance);
  }

  return (
    <div className="voice-guidance">
      <button
        type="button"
        className={hablando ? "btn voice-button is-speaking" : "btn voice-button"}
        aria-pressed={hablando}
        onClick={hablando ? detener : escuchar}
      >
        <span aria-hidden="true">{hablando ? "■" : "🔊"}</span>
        {hablando ? "Detener indicaciones" : "Escuchar indicaciones"}
      </button>
      <p className="meta">La voz leerá los pasos de la ruta en español.</p>
      {error && <p className="aviso error-message" role="alert">{error}</p>}
      <span className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {hablando ? "Reproduciendo las indicaciones de la ruta." : ""}
      </span>
    </div>
  );
}

export function Detalle({ l, ciudad, onBack, onGoGPS, onFav, fav }) {
  const abierto = estaAbierto(l.horario);
  const [extra, setExtra] = useState(null);
  const [shareState, setShareState] = useActionFeedback();
  const [shareSuccessLabel, setShareSuccessLabel] = useState("Compartido");
  const [shareError, setShareError] = useState("");
  const [gpsRouteState, setGpsRouteState] = useActionFeedback();
  const [gpsRouteError, setGpsRouteError] = useState("");

  useEffect(() => {
    let vivo = true;
    fetch(`/api/ficha?nombre=${encodeURIComponent(l.nombre)}&lat=${l.lat}&lon=${l.lon}&ciudad=${encodeURIComponent(ciudad || "")}&web=${encodeURIComponent(l.web || "")}&wikidata=${encodeURIComponent(l.wikidata || "")}&wikipedia=${encodeURIComponent(l.wikipedia || "")}`)
      .then((response) => response.json())
      .then((data) => { if (vivo) setExtra(data); })
      .catch(() => {});
    return () => { vivo = false; };
  }, [l.id, l.nombre, l.lat, l.lon, l.web, l.wikidata, l.wikipedia, ciudad]);

  const maps = `https://www.google.com/maps/dir/?api=1&destination=${l.lat},${l.lon}`;
  const uber = `https://m.uber.com/ul/?action=setPickup&dropoff[latitude]=${l.lat}&dropoff[longitude]=${l.lon}&dropoff[nickname]=${encodeURIComponent(l.nombre)}`;
  const tel = l.telefono ? "tel:" + String(l.telefono).replace(/\s/g, "") : null;

  function comoLlegarDesdeGPS() {
    setGpsRouteError("");
    if (!navigator.geolocation) {
      setGpsRouteError("Este dispositivo no permite compartir su ubicación.");
      setGpsRouteState("error");
      return;
    }

    setGpsRouteState("loading");
    navigator.geolocation.getCurrentPosition((position) => {
      setGpsRouteState("success");
      onGoGPS({
        lat: position.coords.latitude,
        lon: position.coords.longitude,
        etiqueta: "Mi ubicación",
      });
    }, (gpsError) => {
      const message = gpsError.code === 1
        ? "No se concedió el permiso de ubicación. Actívalo en el navegador e inténtalo de nuevo."
        : gpsError.code === 3
          ? "La ubicación tardó demasiado. Inténtalo de nuevo."
          : "No se pudo obtener tu ubicación. Revisa el permiso o inténtalo de nuevo.";
      setGpsRouteError(message);
      setGpsRouteState("error");
    }, { enableHighAccuracy: true, maximumAge: 120000, timeout: 15000 });
  }

  async function compartir() {
    const text = `${l.nombre} — ${l.direccion || extra?.direccion || ""}`;
    setShareError("");
    setShareState("loading");
    try {
      if (navigator.share) {
        await navigator.share({ title: l.nombre, text });
        setShareSuccessLabel("Compartido");
      } else if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        setShareSuccessLabel("Copiado");
      } else {
        throw new Error("Este navegador no permite compartir ni copiar el enlace.");
      }
      setShareState("success");
    } catch (error) {
      if (error?.name === "AbortError") {
        setShareState("idle");
        return;
      }
      setShareError(error?.message || "No se pudo compartir este lugar.");
      setShareState("error");
    }
  }

  return (
    <section className="sheet detail-sheet" aria-labelledby="detail-title">
      <button type="button" className="btn-ghost back-button" onClick={onBack}>← Volver</button>
      <h2 id="detail-title" tabIndex={-1}>{l.nombre}</h2>
      <p>{abierto === true ? "Abierto en este momento (según el horario del mapa)." : abierto === false ? "Cerrado en este momento (según el horario del mapa)." : "Horario no publicado en el mapa."}</p>
      {dato(l.tipoEtiqueta, "Tipo")}
      {dato(l.direccion || extra?.direccion, "Ubicación")}
      {dato(textoDistancia(l.metros), "Distancia")}
      {dato(l.horario, "Horario")}
      {dato(l.telefono || extra?.wikidata?.tel, "Teléfono")}
      {extra?.clima && <p className="aviso">{extra.clima.temp}°C. {extra.clima.texto}</p>}
      <div className="row-btns detail-actions">
        <ActionButton
          className="btn primary"
          state={gpsRouteState}
          loadingLabel="Obteniendo ubicación…"
          successLabel="Calculando ruta…"
          errorLabel="No se obtuvo ubicación"
          onClick={comoLlegarDesdeGPS}
        >
          Calcular ruta desde mi ubicación
        </ActionButton>
        <button
          type="button"
          className="btn"
          aria-pressed={Boolean(fav)}
          aria-label={fav ? `Quitar ${l.nombre} de favoritos` : `Guardar ${l.nombre} en favoritos`}
          onClick={onFav}
        >
          {fav ? "Quitar de favoritos" : "Guardar"}
        </button>
        <ActionButton
          className="btn"
          state={shareState}
          loadingLabel="Compartiendo…"
          successLabel={shareSuccessLabel}
          errorLabel="No se compartió"
          onClick={compartir}
        >
          Compartir
        </ActionButton>
        {tel && <a className="btn" href={tel}>Llamar</a>}
        <a className="btn-ghost" href={maps} target="_blank" rel="noreferrer">Google Maps</a>
        <a className="btn-ghost" href={uber} target="_blank" rel="noreferrer">Uber</a>
      </div>
      {gpsRouteError && <p className="aviso error-message" role="alert">{gpsRouteError}</p>}
      <span className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {shareState === "success" ? shareSuccessLabel : gpsRouteState === "success" ? "Ubicación lista. Calculando la ruta." : ""}
      </span>
      {shareError && <p className="aviso error-message" role="alert">{shareError}</p>}
      <p className="aviso">No inventamos reseñas ni estrellas. Si el local no las publicó en el mapa o Wikipedia, queda vacío a propósito.</p>
    </section>
  );
}
