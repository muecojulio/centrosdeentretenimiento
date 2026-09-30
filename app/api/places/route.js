import { enriquecer } from "../../../lib/enriquecer";
import { destacarCerca } from "../../../lib/destacados";
import { buscarDenue } from "../../../lib/denue";
import { cacheGet, cacheSet, cacheKey } from "../../../lib/cache";
import { indexarLugares } from "../../../lib/indices";

export const dynamic = "force-dynamic";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const lat = Number(searchParams.get("lat"));
  const lon = Number(searchParams.get("lon"));
  const radio = Number(searchParams.get("radio") || 3000);
  const q = (searchParams.get("q") || "").toLowerCase().trim();

  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    return Response.json({ error: "Falta ubicación" }, { status: 400 });
  }

  const r = Math.min(Math.max(radio, 800), 12000);
  const ckey = cacheKey(["places", lat.toFixed(3), lon.toFixed(3), r, q]);
  const cached = cacheGet(ckey);
  if (cached) return Response.json(cached);
  const query = `
[out:json][timeout:25];
(
  node["amenity"~"^(bar|pub|nightclub|biergarten|stripclub)$"](around:${r},${lat},${lon});
  way["amenity"~"^(bar|pub|nightclub|biergarten|stripclub)$"](around:${r},${lat},${lon});
  node["amenity"="restaurant"]["bar"="yes"](around:${r},${lat},${lon});
  way["amenity"="restaurant"]["bar"="yes"](around:${r},${lat},${lon});
  node["live_music"="yes"]["amenity"~"^(bar|pub|restaurant|nightclub|cafe)$"](around:${r},${lat},${lon});
  way["live_music"="yes"]["amenity"~"^(bar|pub|restaurant|nightclub|cafe)$"](around:${r},${lat},${lon});
  node["leisure"="dance"](around:${r},${lat},${lon});
  node["amenity"="cafe"]["alcohol"="yes"](around:${r},${lat},${lon});
  way["amenity"="cafe"]["alcohol"="yes"](around:${r},${lat},${lon});
  node["amenity"="restaurant"]["outdoor_seating"="yes"](around:${r},${lat},${lon});
  way["amenity"="restaurant"]["outdoor_seating"="yes"](around:${r},${lat},${lon});
);
out center 80;
`.trim();

  const servidores = [
    "https://overpass-api.de/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter",
    "https://overpass.private.coffee/api/interpreter",
  ];

  try {
    const denueProm = buscarDenue(lat, lon, r);
    let data = null;
    for (const url of servidores) {
      try {
        const res = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
            "User-Agent": "NocheCerca/1.0 (app personal Vercel)",
          },
          body: "data=" + encodeURIComponent(query),
        });
        if (!res.ok) continue;
        data = await res.json();
        break;
      } catch {}
    }

    const denue = await denueProm;
    if (!data && !denue.lugares.length) {
      return Response.json({ error: "El mapa está ocupado. Reintenté en 3 servidores. Espera un minuto o reduce el radio.", lugares: [], saturado: true, denue: denue.activo }, { status: 200 });
    }
    const vistos = new Set();
    let lugares = (data?.elements || [])
      .map((el) => {
        const plat = el.lat || el.center?.lat;
        const plon = el.lon || el.center?.lon;
        if (!plat || !plon) return null;
        return enriquecer({ id: el.id, lat: plat, lon: plon, tags: el.tags || {} }, { lat, lon });
      })
      .filter(Boolean)
      .filter((l) => {
        const k = l.nombre + "|" + l.lat.toFixed(5) + "|" + l.lon.toFixed(5);
        if (vistos.has(k)) return false;
        vistos.add(k);
        return l.nombre !== "Lugar sin nombre publicado";
      });

    for (const extra of destacarCerca({ lat, lon }, r)) {
      const k = extra.nombre + "|" + extra.lat.toFixed(5);
      if (!vistos.has(k)) {
        vistos.add(k);
        lugares.push(extra);
      }
    }

    for (const extra of denue.lugares) {
      const k = extra.nombre.toLowerCase() + "|" + extra.lat.toFixed(4);
      const dup = lugares.some((l) => l.nombre.toLowerCase() === extra.nombre.toLowerCase() && Math.abs(l.lat - extra.lat) < 0.001);
      if (!dup && !vistos.has(k)) {
        vistos.add(k);
        lugares.push(extra);
      } else if (dup) {
        const dest = lugares.find((l) => l.nombre.toLowerCase() === extra.nombre.toLowerCase() && Math.abs(l.lat - extra.lat) < 0.001);
        if (dest && extra.telefono && !dest.telefono) dest.telefono = extra.telefono;
        if (dest && extra.direccion && !dest.direccion) dest.direccion = extra.direccion;
        if (dest && extra.web && !dest.web) dest.web = extra.web;
      }
    }

    if (q) {
      lugares = lugares.filter((l) => l.nombre.toLowerCase().includes(q) || l.tipoEtiqueta.toLowerCase().includes(q) || (l.musica && l.musica.toLowerCase().includes(q)) || (l.cocina && l.cocina.toLowerCase().includes(q)));
    }

    lugares.sort((a, b) => (a.metros || 999999) - (b.metros || 999999));
    const idx = indexarLugares(lugares);
    const payload = {
      lugares,
      denue: denue.activo,
      indices: { total: idx.total, tipos: [...idx.byTipo.keys()], fuentes: [...idx.byFuente.keys()] },
      fuente: denue.activo ? "OpenStreetMap + INEGI DENUE" : "OpenStreetMap / Overpass (sin token INEGI)",
    };
    cacheSet(ckey, payload, 8 * 60 * 1000);
    return Response.json(payload);
  } catch {
    return Response.json({ error: "No se pudo consultar el mapa. Revisa tu internet.", lugares: [] }, { status: 200 });
  }
}
