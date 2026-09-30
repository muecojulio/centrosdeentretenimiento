export const dynamic = "force-dynamic";

const UA = { "User-Agent": "NocheCerca/1.0 (app personal; datos publicos)" };

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const nombre = searchParams.get("nombre") || "";
  const lat = searchParams.get("lat");
  const lon = searchParams.get("lon");
  const ciudad = searchParams.get("ciudad") || "México";
  const web = searchParams.get("web") || "";
  const wikidata = searchParams.get("wikidata") || "";
  const wikipedia = searchParams.get("wikipedia") || "";
  const out = { wiki: null, wikidata: null, sitio: null, direccion: null, clima: null, aire: null, fuentes: [] };

  if (wikidata) {
    try {
      const wd = await leerWikidata(wikidata);
      if (wd) {
        out.wikidata = wd;
        out.fuentes.push("Wikidata");
        if (wd.wikiTitle && !out.wiki) {
          out.wiki = await resumenWiki(wd.wikiTitle);
          if (out.wiki) out.fuentes.push("Wikipedia");
        }
      }
    } catch {}
  }

  if (!out.wiki && wikipedia) {
    try {
      const title = wikipedia.includes(":") ? wikipedia.split(":").slice(1).join(":") : wikipedia;
      out.wiki = await resumenWiki(title);
      if (out.wiki) out.fuentes.push("Wikipedia (enlace del mapa)");
    } catch {}
  }

  if (!out.wiki && nombre && nombre !== "Lugar sin nombre publicado") {
    try {
      const q = `"${nombre}" ${ciudad}`;
      const searchUrl = "https://es.wikipedia.org/w/api.php?action=query&list=search&format=json&srlimit=5&srsearch=" + encodeURIComponent(q);
      const sres = await fetch(searchUrl, { headers: UA });
      const sdata = await sres.json();
      const nom = nombre.toLowerCase();
      const hit = (sdata.query?.search || []).find((x) => {
        const t = x.title.toLowerCase();
        return t === nom || t.includes(nom) || nom.includes(t);
      });
      if (hit) {
        out.wiki = await resumenWiki(hit.title);
        if (out.wiki) out.fuentes.push("Wikipedia (búsqueda por nombre)");
      }
    } catch {}
  }

  if (web && /^https?:\/\//i.test(web)) {
    try {
      out.sitio = await leerSitio(web);
      if (out.sitio?.texto || out.sitio?.titulo) out.fuentes.push("Sitio oficial");
    } catch {}
  }

  try {
    if (lat && lon) {
      const rev = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1`;
      const r = await fetch(rev, { headers: UA });
      const j = await r.json();
      out.direccion = j.display_name || null;
      if (out.direccion) out.fuentes.push("Nominatim");
    }
  } catch {}

  try {
    if (lat && lon) {
      const c = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,precipitation,weather_code,wind_speed_10m&timezone=auto`);
      const j = await c.json();
      const cur = j.current || {};
      out.clima = { temp: cur.temperature_2m, lluvia: cur.precipitation, viento: cur.wind_speed_10m, texto: textoClima(cur.weather_code, cur.precipitation) };
      out.fuentes.push("Open-Meteo");
      const aq = await fetch(`https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}&current=us_aqi,pm2_5,pm10&timezone=auto`);
      if (aq.ok) {
        const aj = await aq.json();
        const ac = aj.current || {};
        if (ac.us_aqi != null) {
          out.aire = { aqi: Math.round(ac.us_aqi), pm25: ac.pm2_5, pm10: ac.pm10, texto: textoAire(ac.us_aqi) };
          out.fuentes.push("Open-Meteo Air Quality");
        }
      }
    }
  } catch {}

  return Response.json(out);
}

async function resumenWiki(title) {
  const sum = await fetch("https://es.wikipedia.org/api/rest_v1/page/summary/" + encodeURIComponent(title), { headers: UA });
  if (!sum.ok) return null;
  const j = await sum.json();
  if (!j.extract) return null;
  return { titulo: j.title, texto: j.extract, url: j.content_urls?.desktop?.page || `https://es.wikipedia.org/wiki/${encodeURIComponent(j.title)}`, foto: j.thumbnail?.source || null };
}

async function leerWikidata(id) {
  const qid = String(id).toUpperCase().trim();
  if (!/^Q\d+$/.test(qid)) return null;
  const res = await fetch(`https://www.wikidata.org/wiki/Special:EntityData/${qid}.json`, { headers: UA });
  if (!res.ok) return null;
  const data = await res.json();
  const ent = data.entities?.[qid];
  if (!ent) return null;
  const img = primerValor(ent, "P18");
  return {
    id: qid,
    label: ent.labels?.es?.value || ent.labels?.en?.value || null,
    desc: ent.descriptions?.es?.value || ent.descriptions?.en?.value || null,
    wikiTitle: ent.sitelinks?.eswiki?.title || ent.sitelinks?.enwiki?.title || null,
    web: primerValor(ent, "P856"),
    tel: primerValor(ent, "P1329"),
    foto: img ? "https://commons.wikimedia.org/wiki/Special:FilePath/" + encodeURIComponent(img) : null,
    url: "https://www.wikidata.org/wiki/" + qid,
  };
}

function primerValor(ent, prop) {
  const snak = ent.claims?.[prop]?.[0]?.mainsnak;
  if (!snak) return null;
  if (snak.datavalue?.type === "string") return snak.datavalue.value;
  if (snak.datavalue?.value?.text) return snak.datavalue.value.text;
  return null;
}

async function leerSitio(url) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 6000);
  try {
    const res = await fetch(url, { headers: UA, signal: ctrl.signal, redirect: "follow" });
    if (!res.ok) return null;
    const html = (await res.text()).slice(0, 80000);
    return { titulo: meta(html, "og:title") || tag(html, "title"), texto: meta(html, "og:description") || meta(html, "description"), foto: meta(html, "og:image"), url };
  } finally {
    clearTimeout(t);
  }
}

function meta(html, name) {
  const a = html.match(new RegExp(`<meta[^>]+property=["']${name}["'][^>]+content=["']([^"']+)["']`, "i"));
  if (a) return decode(a[1]);
  const b = html.match(new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+property=["']${name}["']`, "i"));
  if (b) return decode(b[1]);
  const c = html.match(new RegExp(`<meta[^>]+name=["']${name}["'][^>]+content=["']([^"']+)["']`, "i"));
  return c ? decode(c[1]) : null;
}

function tag(html, name) {
  const m = html.match(new RegExp(`<${name}[^>]*>([^<]{3,140})</${name}>`, "i"));
  return m ? decode(m[1]).trim() : null;
}

function decode(s) {
  return s.replace(/&/g, "&").replace(/"/g, '"').replace(/&#39;/g, "'").replace(/</g, "<").replace(/>/g, ">").replace(/\s+/g, " ").trim();
}

function textoClima(code, lluvia) {
  if (lluvia > 0.4) return "Está lloviendo cerca. Lleva algo para el agua.";
  if (code === 0) return "Cielo despejado esta noche.";
  if ([1, 2, 3].includes(code)) return "Algo nublado, buena noche para salir.";
  if ([45, 48].includes(code)) return "Hay neblina.";
  if ([51, 53, 55, 61, 63, 65, 80, 81, 82].includes(code)) return "Posible lluvia. Confirma terraza o interior.";
  if ([95, 96, 99].includes(code)) return "Hay tormenta en la zona.";
  return "Revisa el clima antes de salir.";
}

function textoAire(aqi) {
  if (aqi <= 50) return "Buena";
  if (aqi <= 100) return "Moderada";
  if (aqi <= 150) return "No saludable para grupos sensibles";
  if (aqi <= 200) return "No saludable";
  if (aqi <= 300) return "Muy poco saludable";
  return "Peligrosa";
}
