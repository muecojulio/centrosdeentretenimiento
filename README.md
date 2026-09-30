# NocheCerca / centrosdeentretenimiento

PWA de bares y centros nocturnos en México. Lista para Vercel.

Node: `engines.node = 24.x` en package.json.

Repo privado: https://github.com/muecojulio/centrosdeentretenimiento

Privacidad: `/privacidad`

No hay base SQL. Se usó caché + índices en memoria (id, tipo, fuente).

App instalable en celular Android, iPhone, tablet y computadora (PWA a pantalla completa).

## ¿Requiere key?

**No es obligatorio.** La app funciona con OpenStreetMap sin secrets.

**Opcional — INEGI DENUE (gratis, solo e-mail):**
1. https://www.inegi.org.mx/app/api/denue/v1/tokenVerify.aspx
2. Vercel → Environment Variables → `INEGI_DENUE_TOKEN`

## Publicar en Vercel

Importa el repo privado `muecojulio/centrosdeentretenimiento` en Vercel → Deploy.

## APIs públicas sin key

OpenStreetMap/Overpass, Nominatim, Photon, OSRM, Open-Meteo, RainViewer, Wikipedia/Wikidata, sunrise-sunset, Nager.Date.
Referencias: `rainviewer/rainviewer-api-example`, `ni-c/osm-mcp`.
