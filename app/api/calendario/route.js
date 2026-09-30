import { cacheGet, cacheSet, cacheKey } from "../../../lib/cache";

export const dynamic = "force-dynamic";

export async function GET() {
  const year = new Date().getFullYear();
  const key = cacheKey(["holidays-mx", year]);
  const hit = cacheGet(key);
  if (hit) return Response.json(hit);

  try {
    const res = await fetch(`https://date.nager.at/api/v3/PublicHolidays/${year}/MX`, {
      headers: { "User-Agent": "NocheCerca/1.0 (app personal; API publica)" },
    });
    if (!res.ok) return Response.json({ ok: false, feriados: [] });
    const raw = await res.json();
    const feriados = (Array.isArray(raw) ? raw : []).map((d) => ({
      fecha: d.date || null,
      nombre: d.localName || d.name || null,
    }));
    const today = new Date().toISOString().slice(0, 10);
    const payload = {
      ok: true,
      feriados,
      hoyEsFeriado: feriados.some((f) => f.fecha === today),
      fuente: "Nager.Date",
    };
    cacheSet(key, payload, 12 * 60 * 60 * 1000);
    return Response.json(payload);
  } catch {
    return Response.json({ ok: false, feriados: [] });
  }
}
