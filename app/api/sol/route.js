export const dynamic = "force-dynamic";

function esCoordenadaValida(v) {
  const n = Number(v);
  return Number.isFinite(n) && n >= -180 && n <= 180;
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const lat = Number(searchParams.get("lat"));
  const lon = Number(searchParams.get("lon"));
  if (!esCoordenadaValida(lat) || !esCoordenadaValida(lon)) {
    return Response.json({ ok: false }, { status: 400 });
  }
  try {
    const r = await fetch(
      `https://api.sunrise-sunset.org/json?lat=${lat}&lng=${lon}&formatted=0`
    );
    const j = await r.json();
    const sunset = j.results?.sunset;
    if (!sunset) return Response.json({ ok: false });
    const fin = new Date(sunset);
    const ahora = new Date();
    const anochecio = ahora >= fin;
    const hh = fin.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" });
    return Response.json({
      ok: true,
      sunset: hh,
      anochecio,
      texto: anochecio ? `Ya anocheció (atardecer ${hh}).` : `Aún es de día. Anochece a las ${hh}.`,
    });
  } catch {
    return Response.json({ ok: false });
  }
}
