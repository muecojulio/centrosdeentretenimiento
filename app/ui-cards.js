"use client";

import { useEffect, useState } from "react";
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

export function Tarjeta({ l, fav, enComparar, onFav, onGo, onOpen, onComp }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const abierto = estaAbierto(l.horario);
  return (
    <article className="card venue-card">
      <h3>{l.nombre}</h3>
      <div className="badges">
        <span className="badge">{l.tipoEtiqueta}</span>
        {abierto === true && <span className="badge ok">Abierto ahora</span>}
        {abierto === false && <span className="badge no">Cerrado ahora</span>}
        {l.live && <span className="badge ok">En vivo (mapa)</span>}
        {(l.after || esAfter(l.horario, l.tipo, l.nombre)) && <span className="badge warn">After / madrugada</span>}
        {(l.tableDance || l.tipo === "table") && <span className="badge warn">Table dance</span>}
        {l.fuente === "INEGI DENUE" && <span className="badge ok">INEGI</span>}
        {enComparar && <span className="badge ok">En comparación</span>}
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
        <button type="button" className="btn" onClick={onGo}>Cómo llegar</button>
        {(onComp || onFav) && (
          <button
            type="button"
            className="btn btn-ghost"
            aria-expanded={menuOpen}
            aria-label={menuOpen ? "Ocultar más acciones" : "Más acciones"}
            onClick={() => setMenuOpen((v) => !v)}
          >
            {menuOpen ? "▲ Menos" : "▼ Más"}
          </button>
        )}
        {menuOpen && (
          <div className="card-submenu" role="menu" aria-label="Acciones adicionales">
            {onComp && (
              <button
                type="button"
                className={enComparar ? "btn primary" : "btn"}
                aria-pressed={Boolean(enComparar)}
                onClick={onComp}
                role="menuitem"
              >
                {enComparar ? "Quitar de comparar" : "Comparar"}
              </button>
            )}
            <button
              type="button"
              className="btn-ghost favorite-button"
              aria-pressed={Boolean(fav)}
              aria-label={fav ? `Quitar ${l.nombre} de favoritos` : `Guardar ${l.nombre} en favoritos`}
              onClick={onFav}
              role="menuitem"
            >
              {fav ? "Guardado" : "Guardar"}
            </button>
          </div>
        )}
      </div>
    </article>
  );
}

export function Detalle({ l, ciudad, onBack, onGo, onFav, fav }) {
  const abierto = estaAbierto(l.horario);
  const [extra, setExtra] = useState(null);
  const [shareState, setShareState] = useActionFeedback();
  const [shareSuccessLabel, setShareSuccessLabel] = useState("Compartido");
  const [shareError, setShareError] = useState("");

  useEffect(() => {
    let vivo = true;
    fetch(`/api/ficha?nombre=${encodeURIComponent(l.nombre)}&lat=${l.lat}&lon=${l.lon}&ciudad=${encodeURIComponent(ciudad || "")}&web=${encodeURIComponent(l.web || "")}&wikidata=${encodeURIComponent(l.wikidata || "")}&wikipedia=${encodeURIComponent(l.wikipedia || "")}`)
      .then((response) => response.json())
      .then((data) => { if (vivo) setExtra(data); })
      .catch(() => {});
    return () => { vivo = false; };
  }, [l.id, l.nombre, l.lat, l.lon, l.web, l.wikidata, l.wikipedia, ciudad]);

  const maps = `https://www.google.com/maps/dir/?api=1&destination=${l.lat},${l.lon}`;
  const apple = `https://maps.apple.com/?daddr=${l.lat},${l.lon}`;
  const uber = `https://m.uber.com/ul/?action=setPickup&dropoff[latitude]=${l.lat}&dropoff[longitude]=${l.lon}&dropoff[nickname]=${encodeURIComponent(l.nombre)}`;
  const tel = l.telefono ? "tel:" + String(l.telefono).replace(/\s/g, "") : null;

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
        <button type="button" className="btn primary" onClick={onGo}>Cómo llegar</button>
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
        <a className="btn-ghost" href={apple} target="_blank" rel="noreferrer">Maps del iPhone</a>
        <a className="btn-ghost" href={uber} target="_blank" rel="noreferrer">Uber</a>
      </div>
      <span className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {shareState === "success" ? shareSuccessLabel : ""}
      </span>
      {shareError && <p className="aviso error-message" role="alert">{shareError}</p>}
      <p className="aviso">No inventamos reseñas ni estrellas. Si el local no las publicó en el mapa o Wikipedia, queda vacío a propósito.</p>
    </section>
  );
}
