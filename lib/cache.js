const store = new Map();

export function cacheGet(key) {
  const hit = store.get(key);
  if (!hit) return null;
  if (Date.now() > hit.exp) {
    store.delete(key);
    return null;
  }
  return hit.val;
}

export function cacheSet(key, val, ttlMs = 10 * 60 * 1000) {
  if (store.size > 400) {
    const first = store.keys().next().value;
    store.delete(first);
  }
  store.set(key, { val, exp: Date.now() + ttlMs });
  return val;
}

export function cacheKey(parts) {
  return parts.map((p) => String(p ?? "")).join("|");
}
