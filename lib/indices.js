/**
 * No hay base SQL. Los índices son mapas en memoria sobre el resultado
 * de Overpass + DENUE para filtrar/ordenar sin recorrer todo el arreglo.
 */
export function indexarLugares(lugares = []) {
  const byId = new Map();
  const byTipo = new Map();
  const byFuente = new Map();
  const byTel = [];

  for (const l of lugares) {
    if (l.id != null) byId.set(String(l.id), l);
    const tipo = l.tipo || "otro";
    if (!byTipo.has(tipo)) byTipo.set(tipo, []);
    byTipo.get(tipo).push(l);
    const fuente = l.fuente || "mapa";
    if (!byFuente.has(fuente)) byFuente.set(fuente, []);
    byFuente.get(fuente).push(l);
    if (l.telefono) byTel.push(l);
  }

  return {
    byId,
    byTipo,
    byFuente,
    byTel,
    total: lugares.length,
  };
}

export function filtrarConIndice(idx, { tipo, fuente } = {}) {
  if (tipo && tipo !== "todo" && idx.byTipo.has(tipo)) return idx.byTipo.get(tipo);
  if (fuente && idx.byFuente.has(fuente)) return idx.byFuente.get(fuente);
  return null;
}
