export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const res = await fetch("https://api.rainviewer.com/public/weather-maps.json", {
      headers: { "User-Agent": "NocheCerca/1.0" },
      next: { revalidate: 300 },
    });
    if (!res.ok) return Response.json({ frames: [] }, { status: 200 });
    const j = await res.json();
    return Response.json({ host: j.host, frames: j.radar?.past || [] });
  } catch {
    return Response.json({ frames: [] }, { status: 200 });
  }
}
