# NocheCerca / centrosdeentretenimiento

PWA de bares y centros nocturnos en México. Lista para Vercel.

Node: `engines.node = 24.x` en `package.json`. Next.js y React están fijados en `package-lock.json` para que la instalación en Vercel sea reproducible.

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

1. Importa el repo privado `muecojulio/centrosdeentretenimiento` en Vercel.
2. Deja el framework como **Next.js** (detección automática), el directorio raíz como `/` y el directorio de salida sin configurar.
3. Usa los comandos predeterminados o `npm ci` para instalar y `npm run build` para compilar.
4. No necesitas variables de entorno para desplegar. `INEGI_DENUE_TOKEN` es opcional.

Validación local del build: `npm ci && npm run build`.

## APIs públicas sin key

OpenStreetMap/Overpass, Nominatim, Photon, OSRM, Open-Meteo, RainViewer, Wikipedia/Wikidata, sunrise-sunset, Nager.Date.
Referencias: `rainviewer/rainviewer-api-example`, `ni-c/osm-mcp`.
