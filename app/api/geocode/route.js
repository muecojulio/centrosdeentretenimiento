import { cacheGet, cacheSet, cacheKey } from "../../../lib/cache";

export const dynamic = "force-dynamic";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") || "";
  if (q.trim().length < 3) {
    return Response.json({ error: "Escribe al menos 3 letras" }, { status: 400 });
  }
  const gkey = cacheKey(["geo", q.toLowerCase().trim()]);
  const ghit = cacheGet(gkey);
  if (ghit) return Response.json(ghit);

  const url =
    "https://nominatim.openstreetmap.org/search?format=jsonv2&limit=5&countrycodes=mx&q=" +
    encodeURIComponent(q);

  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "NocheCerca/1.0 (app personal)" },
    });
    const data = await res.json();
    let resultados = (data || []).map((r) => ({
      nombre: r.display_name,
      lat: Number(r.lat),
      lon: Number(r.lon),
    }));
    if (!resultados.length) {
      const ph = await fetch(
        "https://photon.komoot.io/api/?limit=5&lang=es&q=" + encodeURIComponent(q + ", México")
      );
      const pj = await ph.json();
      resultados = (pj.features || []).map((f) => ({
        nombre: (f.properties?.name || "") + (f.properties?.city ? ", " + f.properties.city : ""),
        lat: f.geometry.coordinates[1],
        lon: f.geometry.coordinates[0],
      }));
    }
    const out = { resultados };
    cacheSet(gkey, out, 30 * 60 * 1000);
    return Response.json(out);
  } catch {
    return Response.json({ error: "No pude encontrar esa dirección", resultados: [] });
  }
}
