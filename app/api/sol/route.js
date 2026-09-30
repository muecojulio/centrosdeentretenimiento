export const dynamic = "force-dynamic";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const lat = searchParams.get("lat");
  const lon = searchParams.get("lon");
  if (!lat || !lon) return Response.json({ ok: false });
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
