import { distanciaMetros, etiquetaTipo } from "./enriquecer";

const NOCHE =
  /bar|cantina|nocturn|discotec|antro|club noct|table.?dance|strip|pub|cervecer|mezcal|wine bar|centro noct/i;
const NO =
  /abarrote|barata|barber[ií]|barriler[íi]a|barra de pan|cafeter[íi]a escolar|consultorio/i;

export function tipoDenue(clase = "", nombre = "") {
  const t = `${clase} ${nombre}`.toLowerCase();
  if (/strip|table.?dance|teibol/.test(t)) return "table";
  if (/nocturn|discotec|antro|dance hall/.test(t)) return "antro";
  if (/m[uú]sica en vivo|live/.test(t)) return "vivo";
  if (/restaurante/.test(t) && /bar|cantina/.test(t)) return "restaurant-bar";
  return "bar";
}

export function parseDenueItem(item) {
  if (!item) return null;
  if (Array.isArray(item)) {
    return {
      id: item[1] || item[0],
      nombre: item[2] || item[1],
      clase: item[4] || item[3],
      calle: item[7],
      num: item[8],
      colonia: item[10],
      tel: item[13],
      email: item[14],
      web: item[15],
      lon: Number(item[17]),
      lat: Number(item[18]),
    };
  }
  return {
    id: item.Id || item.id || item.CLEE,
    nombre: item.Nombre || item.nombre,
    clase: item.Clase_actividad || item.clase_actividad || item.ClaseActividad,
    calle: item.Calle || item.calle,
    num: item.Numero_Exterior || item.Num_Exterior || item.numero_exterior,
    colonia: item.Colonia || item.colonia,
    tel: item.Telefono || item.telefono,
    email: item.Correo_e || item.correo_e,
    web: item.Sitio_internet || item.sitio_internet,
    lat: Number(item.Latitud ?? item.latitud ?? item.LATITUD),
    lon: Number(item.Longitud ?? item.longitud ?? item.LONGITUD),
  };
}

export function aLugarDenue(raw, origen) {
  const p = parseDenueItem(raw);
  if (!p?.nombre || !Number.isFinite(p.lat) || !Number.isFinite(p.lon)) return null;
  const blob = `${p.nombre} ${p.clase || ""}`;
  if (NO.test(blob)) return null;
  if (!NOCHE.test(blob)) return null;
  const tipo = tipoDenue(p.clase, p.nombre);
  const metros = origen ? distanciaMetros(origen.lat, origen.lon, p.lat, p.lon) : null;
  const direccion = [p.calle, p.num, p.colonia].filter(Boolean).join(" ") || null;
  return {
    id: "denue-" + String(p.id || p.nombre),
    nombre: String(p.nombre).trim(),
    tipo,
    tipoEtiqueta: etiquetaTipo(tipo),
    lat: p.lat,
    lon: p.lon,
    direccion,
    telefono: p.tel || null,
    email: p.email || null,
    web: p.web || null,
    horario: null,
    musica: null,
    live: false,
    coverTexto: null,
    deQueTrata: p.clase ? `Giro INEGI: ${p.clase}` : "Registro DENUE (INEGI)",
    terraza: null,
    tableDance: tipo === "table",
    after: tipo === "antro" || tipo === "table",
    metros,
    minPie: metros == null ? null : Math.max(1, Math.round(metros / 80)),
    minAuto: metros == null ? null : Math.max(1, Math.round(metros / 400)),
    fuente: "INEGI DENUE",
  };
}

export async function buscarDenue(lat, lon, radio) {
  const token = process.env.INEGI_DENUE_TOKEN;
  if (!token) return { lugares: [], activo: false };
  const metros = Math.min(Math.max(radio, 500), 5000);
  const palabras = ["Bares", "cantinas", "nocturnos"];
  const vistos = new Set();
  const out = [];
  await Promise.all(
    palabras.map(async (cond) => {
      const url = `https://www.inegi.org.mx/app/api/denue/v1/consulta/Buscar/${encodeURIComponent(cond)}/${lat},${lon}/${metros}/${token}`;
      try {
        const res = await fetch(url, { headers: { "User-Agent": "NocheCerca/1.0" } });
        if (!res.ok) return;
        const data = await res.json();
        const arr = Array.isArray(data) ? data : [];
        for (const item of arr) {
          const l = aLugarDenue(item, { lat, lon });
          if (!l) continue;
          const k = l.nombre.toLowerCase() + "|" + l.lat.toFixed(4);
          if (vistos.has(k)) continue;
          vistos.add(k);
          out.push(l);
        }
      } catch {}
    })
  );
  return { lugares: out, activo: true };
}
