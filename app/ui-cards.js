"use client";

import { useEffect, useState } from "react";
import { estaAbierto, esAfter, textoDistancia, textoTiempo } from "../lib/enriquecer";

export function dato(valor, etiqueta) {
  if (valor == null || valor === "") return null;
  return (
    <p className="meta">
      <b>{etiqueta}:</b> {valor}
    </p>
  );
}

export function Tarjeta({ l, fav, enComparar, onFav, onGo, onOpen, onComp }) {
  const abierto = estaAbierto(l.horario);
  return (
    <article className="card">
      <h3>{l.nombre}</h3>
      <div>
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
      <div className="row-btns">
        <button className="btn primary" onClick={onOpen}>Ver ficha</button>
        <button className="btn" onClick={onGo}>Cómo llegar</button>
        {onComp && (
          <button className={enComparar ? "btn primary" : "btn"} onClick={onComp}>
            {enComparar ? "Quitar de comparar" : "Comparar"}
          </button>
        )}
        <button className="btn-ghost" onClick={onFav}>{fav ? "Quitar" : "Guardar"}</button>
      </div>
    </article>
  );
}

export function Detalle({ l, ciudad, onBack, onGo, onFav, fav }) {
  const abierto = estaAbierto(l.horario);
  const [extra, setExtra] = useState(null);
  useEffect(() => {
    let vivo = true;
    fetch(`/api/ficha?nombre=${encodeURIComponent(l.nombre)}&lat=${l.lat}&lon=${l.lon}&ciudad=${encodeURIComponent(ciudad || "")}&web=${encodeURIComponent(l.web || "")}&wikidata=${encodeURIComponent(l.wikidata || "")}&wikipedia=${encodeURIComponent(l.wikipedia || "")}`)
      .then((r) => r.json())
      .then((j) => { if (vivo) setExtra(j); })
      .catch(() => {});
    return () => { vivo = false; };
  }, [l.id, l.nombre, l.lat, l.lon, ciudad]);
  const maps = `https://www.google.com/maps/dir/?api=1&destination=${l.lat},${l.lon}`;
  const apple = `https://maps.apple.com/?daddr=${l.lat},${l.lon}`;
  const uber = `https://m.uber.com/ul/?action=setPickup&dropoff[latitude]=${l.lat}&dropoff[longitude]=${l.lon}&dropoff[nickname]=${encodeURIComponent(l.nombre)}`;
  const tel = l.telefono ? "tel:" + String(l.telefono).replace(/\s/g, "") : null;
  function compartir() {
    const txt = `${l.nombre} — ${l.direccion || extra?.direccion || ""}`;
    if (navigator.share) navigator.share({ title: l.nombre, text: txt });
    else navigator.clipboard?.writeText(txt);
  }
  return (
    <section className="sheet">
      <button className="btn-ghost" onClick={onBack}>← Volver</button>
      <h2>{l.nombre}</h2>
      <p>{abierto === true ? "Abierto en este momento (según horario del mapa)." : abierto === false ? "Cerrado en este momento (según horario del mapa)." : "Horario no publicado en el mapa."}</p>
      {dato(l.tipoEtiqueta, "Tipo")}
      {dato(l.direccion || extra?.direccion, "Ubicación")}
      {dato(textoDistancia(l.metros), "Distancia")}
      {dato(l.horario, "Horario")}
      {dato(l.telefono || extra?.wikidata?.tel, "Teléfono")}
      {extra?.clima && <p className="aviso">{extra.clima.temp}°C. {extra.clima.texto}</p>}
      <div className="row-btns">
        <button className="btn primary" onClick={onGo}>Cómo llegar</button>
        <button className="btn" onClick={onFav}>{fav ? "Quitar de favoritos" : "Guardar"}</button>
        <button className="btn" onClick={compartir}>Compartir</button>
        {tel && <a className="btn" href={tel}>Llamar</a>}
        <a className="btn-ghost" href={maps} target="_blank" rel="noreferrer">Google Maps</a>
        <a className="btn-ghost" href={apple} target="_blank" rel="noreferrer">Maps del iPhone</a>
        <a className="btn-ghost" href={uber} target="_blank" rel="noreferrer">Uber</a>
      </div>
      <p className="aviso">No inventamos reseñas ni estrellas. Si el local no las publicó en el mapa o Wikipedia, queda vacío a propósito.</p>
    </section>
  );
}
