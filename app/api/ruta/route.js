export const dynamic = "force-dynamic";

function esCoordenadaValida(v) {
  const n = Number(v);
  return Number.isFinite(n) && n >= -180 && n <= 180;
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const fromLat = searchParams.get("fromLat");
  const fromLon = searchParams.get("fromLon");
  const toLat = searchParams.get("toLat");
  const toLon = searchParams.get("toLon");
  const rawPerfil = searchParams.get("perfil");
  const perfil = rawPerfil === "foot" ? "foot" : "driving";

  if (!esCoordenadaValida(fromLat) || !esCoordenadaValida(fromLon) ||
      !esCoordenadaValida(toLat) || !esCoordenadaValida(toLon)) {
    return Response.json({ error: "Coordenadas inválidas" }, { status: 400 });
  }

  const fLat = Number(fromLat);
  const fLon = Number(fromLon);
  const tLat = Number(toLat);
  const tLon = Number(toLon);

  try {
    const osrmProfile = perfil === "foot" ? "driving" : perfil;
    const url = `https://router.project-osrm.org/route/v1/${osrmProfile}/${fLon},${fLat};${tLon},${tLat}?overview=full&geometries=geojson&steps=true&alternatives=false`;
    const res = await fetch(url, { headers: { "User-Agent": "NocheCerca/1.0" } });
    const data = await res.json();
    const route = data.routes?.[0];
    if (route && perfil !== "foot") return normalizarOSRM(route);

    const vr = await fetch("https://valhalla1.openstreetmap.de/route", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Client-Id": "nochecerca" },
      body: JSON.stringify({
        locations: [{ lat: fLat, lon: fLon }, { lat: tLat, lon: tLon }],
        costing: perfil === "foot" ? "pedestrian" : "auto",
        units: "kilometers",
        shape_format: "geojson",
        directions_options: { units: "kilometers", language: "es-ES" },
      }),
    });
    if (!vr.ok) return Response.json({ error: "No hay ruta disponible", pasos: [] });
    const v = await vr.json();
    const trip = v.trip;
    if (!trip) return Response.json({ error: "No hay ruta", pasos: [] });
    const summary = trip.summary || {};
    const pasos = (trip.legs || []).flatMap((leg) => (leg.maneuvers || []).map((m) => ({
      texto: m.instruction || "Continúa",
      metros: Math.round((m.length || 0) * 1000),
      minutos: Math.max(1, Math.round((m.time || 0) / 60)),
    })));
    return Response.json({
      metros: Math.round((summary.length || 0) * 1000),
      minutos: Math.round((summary.time || 0) / 60),
      geometria: trip.legs?.[0]?.shape || null,
      pasos,
    });
  } catch {
    return Response.json({ error: "No se pudo calcular la ruta", pasos: [] });
  }

  function normalizarOSRM(route) {
    const pasos = [];
    for (const leg of route.legs || []) {
      for (const s of leg.steps || []) {
        const raw = s.maneuver?.instruction || s.name || "Continúa";
        pasos.push({ texto: traducirPaso(raw, s), metros: Math.round(s.distance || 0), minutos: Math.max(1, Math.round((s.duration || 0) / 60)) });
      }
    }
    return Response.json({ metros: Math.round(route.distance), minutos: Math.round(route.duration / 60), geometria: route.geometry, pasos });
  }
}

function traducirPaso(raw, step) {
  const tipo = step.maneuver?.type;
  const mod = step.maneuver?.modifier;
  const via = step.name && step.name !== "-" ? ` por ${step.name}` : "";
  const mapa = {
    depart: `Sal de tu punto de partida${via}`,
    arrive: "Has llegado al lugar",
    turn: `Gira ${lado(mod)}${via}`,
    "new name": `Sigue${via}`,
    continue: `Continúa${via}`,
    merge: `Incorpórate${via}`,
    onramp: `Toma la incorporación${via}`,
    offramp: `Toma la salida${via}`,
    fork: `En el horquilla ve ${lado(mod)}${via}`,
    end: "Has llegado",
    roundabout: `En la glorieta toma la salida${via}`,
    rotary: `En la rotonda sigue${via}`,
  };
  if (mapa[tipo]) return mapa[tipo];
  return raw || `Sigue${via}`;
}

function lado(mod) {
  if (!mod) return "adelante";
  if (mod.includes("left")) return "a la izquierda";
  if (mod.includes("right")) return "a la derecha";
  if (mod.includes("straight")) return "derecho";
  if (mod.includes("uturn")) return "en U";
  return "adelante";
}
