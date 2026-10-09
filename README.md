# NocheCerca / centrosdeentretenimiento

🌃 **PWA vibrante** para encontrar bares, antros, música en vivo, afters y terrazas en México.
Diseño neón con auroras animadas, tarjetas con gradientes, micro-interacciones y mapa
interactivo con ruta trazada. Lista para Vercel.

Node: `engines.node = 24.x` en `package.json`. Next.js 16 + React 19.

Repo: https://github.com/muecojulio/centrosdeentretenimiento

Privacidad: `/privacidad` · Seguridad: `SECURITY.md`

Sin base de datos. Caché + índices en memoria (id, tipo, fuente). PWA instalable en Android,
iPhone, tablet y escritorio (pantalla completa, soporte offline básico).

## 🛡️ Seguridad
- Cabeceras estrictas: `Content-Security-Policy`, `Strict-Transport-Security` (HSTS preload),
  `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Permissions-Policy` que bloquea
  micrófono, cámara, pago, USB y sensores.
- Validación de coordenadas en todas las rutas API y límites de tamaño en los parámetros.
- Protección SSRF en el scraping de sitios (bloqueo de localhost/IPs privadas/metadata, límite
  de tiempo, solo HTML).
- Leaflet se distribuye con la app (sin CDN en runtime) para eliminar riesgos de supply-chain.
- Sin cookies de sesión, sin cuentas, sin analítica ni publicidad. Ver `SECURITY.md`.

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
