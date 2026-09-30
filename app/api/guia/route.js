export const dynamic = "force-dynamic";

const UA = { "User-Agent": "NocheCerca/1.0 (app personal)" };

export async function GET(request) {
  const page = request.nextUrl.searchParams.get("page") || "Ciudad_de_México";
  try {
    const sum = await fetch(
      "https://es.wikivoyage.org/api/rest_v1/page/summary/" + encodeURIComponent(page),
      { headers: UA }
    );
    const j = sum.ok ? await sum.json() : {};
    const parseUrl =
      "https://es.wikivoyage.org/w/api.php?action=parse&format=json&prop=wikitext&page=" +
      encodeURIComponent(page);
    const pres = await fetch(parseUrl, { headers: UA });
    const pdata = pres.ok ? await pres.json() : {};
    const wt = String(pdata.parse?.wikitext?.["*"] || "");
    const noche = recortar(wt, ["Beber", "Salir de marcha", "Vida nocturna", "Diversión", "Ocio"]);
    return Response.json({
      titulo: j.title || page.replace(/_/g, " "),
      texto: (noche || j.extract || "").slice(0, 700),
      url: j.content_urls?.desktop?.page || `https://es.wikivoyage.org/wiki/${page}`,
      fuente: "Wikivoyage",
    });
  } catch {
    return Response.json({ texto: null });
  }
}

function recortar(wiki, titulos) {
  const lower = wiki.toLowerCase();
  for (const t of titulos) {
    const i = lower.indexOf("== " + t.toLowerCase());
    if (i < 0) continue;
    let chunk = wiki.slice(i, i + 1800);
    chunk = chunk.replace(/==+[^=]+==+/g, " ").replace(/\[\[([^\]|]+\|)?([^\]]+)\]\]/g, "$2");
    chunk = chunk.replace(/\{\{[^}]+\}\}/g, " ").replace(/'''?/g, "").replace(/\s+/g, " ").trim();
    if (chunk.length > 80) return chunk.slice(0, 650);
  }
  return null;
}
