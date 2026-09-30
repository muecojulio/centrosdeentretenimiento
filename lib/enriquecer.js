export function clasificar(tags = {}) {
  const a = tags.amenity || "";
  const leisure = tags.leisure || "";
  const live = tags.live_music === "yes";
  if (a === "stripclub") return "table";
  if (a === "nightclub" || leisure === "dance") return "antro";
  if (live && (a === "pub" || a === "bar")) return "vivo";
  if (a === "biergarten" || a === "pub" || a === "bar") return "bar";
  if (a === "cafe" || a === "restaurant" || tags.bar === "yes") return "restaurant-bar";
  if (live) return "vivo";
  return "bar";
}

export function etiquetaTipo(tipo) {
  return ({ bar: "Bar", antro: "Antro / club nocturno", table: "Table dance / strip club", "restaurant-bar": "Restaurant bar / terraza", vivo: "Música en vivo" }[tipo] || "Lugar nocturno");
}

export function distanciaMetros(aLat, aLon, bLat, bLon) {
  const R = 6371000;
  const dLat = ((bLat - aLat) * Math.PI) / 180;
  const dLon = ((bLon - aLon) * Math.PI) / 180;
  const x = Math.sin(dLat / 2) ** 2 + Math.cos((aLat * Math.PI) / 180) * Math.cos((bLat * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.sqrt(x)));
}

function siNo(v) {
  if (v === "yes") return "Sí";
  if (v === "no") return "No";
  return v || null;
}

export function enriquecer(lugar, origen) {
  const tags = lugar.tags || {};
  const tipo = clasificar(tags);
  const direccion = [tags["addr:street"], tags["addr:housenumber"], tags["addr:suburb"] || tags["addr:neighbourhood"], tags["addr:city"]].filter(Boolean).join(" ") || tags["addr:full"] || null;
  const musicaReal = tags.music || (tags.live_music === "yes" ? "Música en vivo (dato del mapa)" : null);
  const coverReal = tags.fee === "no" ? "Sin cover (dato del mapa)" : tags.charge || tags.fee || null;
  const metros = origen ? distanciaMetros(origen.lat, origen.lon, lugar.lat, lugar.lon) : null;
  return {
    id: String(lugar.id),
    nombre: tags.name || "Lugar sin nombre publicado",
    tipo,
    tipoEtiqueta: etiquetaTipo(tipo),
    lat: lugar.lat,
    lon: lugar.lon,
    direccion,
    telefono: tags.phone || tags["contact:phone"] || tags["contact:whatsapp"] || null,
    whatsapp: tags["contact:whatsapp"] || null,
    web: tags.website || tags["contact:website"] || tags.facebook || null,
    instagram: tags["contact:instagram"] || null,
    facebook: tags["contact:facebook"] || tags.facebook || null,
    email: tags.email || tags["contact:email"] || null,
    wikidata: tags.wikidata || null,
    wikipedia: tags.wikipedia || null,
    horario: tags.opening_hours || null,
    musica: musicaReal,
    live: tags.live_music === "yes",
    coverTexto: coverReal,
    reservaTexto: tags.reservation ? "Reservación: " + tags.reservation : null,
    precioTexto: tags["charge:drink"] || tags.price || null,
    deQueTrata: tags.description || tags.note || null,
    terraza: siNo(tags.outdoor_seating),
    sillaRuedas: siNo(tags.wheelchair),
    fumar: tags.smoking || null,
    cocina: tags.cuisine || null,
    cerveza: tags.brewery || tags.microbrewery === "yes" ? tags.brewery || "Cervecería" : null,
    happyHour: tags.happy_hour || null,
    pago: tags.payment || tags["payment:credit_cards"] || null,
    metros,
    minPie: metros == null ? null : Math.max(1, Math.round(metros / 80)),
    minAuto: metros == null ? null : Math.max(1, Math.round(metros / 400)),
    after: esAfter(tags.opening_hours, tipo, tags.name),
    tableDance: tipo === "table" || tags.amenity === "stripclub" || /strip|table.?dance|mens club|men.?s club|clóset|closet|queens/i.test(String(tags.name || "") + " " + String(tags.description || "")),
    fuente: "OpenStreetMap",
  };
}

export function esAfter(horario, tipo, nombre) {
  const n = String(nombre || "").toLowerCase();
  if (/\bafter\b|afters|after hours|after-hours|warehouse/.test(n)) return true;
  const h = String(horario || "").toLowerCase();
  if (h.includes("24/7") && tipo === "antro") return true;
  const cierres = [...String(horario || "").matchAll(/(\d{1,2}):(\d{2})-(\d{1,2}):(\d{2})/g)];
  for (const m of cierres) {
    const start = Number(m[1]) * 60 + Number(m[2]);
    const end = Number(m[3]) * 60 + Number(m[4]);
    if (end <= start && end >= 3 * 60) return true;
    if (end <= start && tipo === "antro") return true;
  }
  return false;
}

export function textoTiempo(l) {
  const metros = l?.metros;
  if (metros == null) return null;
  const pie = l.minPie ?? Math.max(1, Math.round(metros / 80));
  const auto = l.minAuto ?? Math.max(1, Math.round(metros / 400));
  return `${pie} min a pie · ${auto} min en auto`;
}

export function estaAbierto(horario, now = new Date()) {
  if (!horario) return null;
  const h = String(horario).toLowerCase();
  if (h.includes("24/7")) return true;
  const days = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
  const mins = now.getHours() * 60 + now.getMinutes();
  const parts = horario.split(";").map((p) => p.trim());
  let vioPatron = false;
  for (const part of parts) {
    const m = part.match(/^([A-Za-z]{2}(?:-[A-Za-z]{2})?(?:,[A-Za-z]{2})*)\s+(\d{1,2}):(\d{2})-(\d{1,2}):(\d{2})/);
    if (!m) continue;
    vioPatron = true;
    const [, rango, h1, m1, h2, m2] = m;
    const grupos = rango.split(",");
    let diaOk = false;
    for (const g of grupos) {
      const [a, b] = g.split("-");
      const ia = days.indexOf(a);
      const ib = b ? days.indexOf(b) : ia;
      if (ia < 0) continue;
      if (ia <= ib) diaOk = now.getDay() >= ia && now.getDay() <= ib;
      else diaOk = now.getDay() >= ia || now.getDay() <= ib;
      if (diaOk) break;
    }
    if (!diaOk) continue;
    const start = Number(h1) * 60 + Number(m1);
    const end = Number(h2) * 60 + Number(m2);
    if (end <= start) {
      if (mins >= start || mins <= end) return true;
    } else if (mins >= start && mins <= end) return true;
  }
  if (!vioPatron && /^\d{1,2}:\d{2}-\d{1,2}:\d{2}$/.test(horario)) {
    const [, h1, m1, h2, m2] = horario.match(/(\d{1,2}):(\d{2})-(\d{1,2}):(\d{2})/);
    const start = Number(h1) * 60 + Number(m1);
    const end = Number(h2) * 60 + Number(m2);
    if (end <= start) return mins >= start || mins <= end;
    return mins >= start && mins <= end;
  }
  return vioPatron ? false : null;
}

export function textoDistancia(m) {
  if (m == null) return null;
  if (m < 1000) return `${m} m`;
  return `${(m / 1000).toFixed(1)} km`;
}
