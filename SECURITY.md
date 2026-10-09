# Seguridad

## Versiones soportadas
Solo la última versión desplegada en producción (rama `main` / Vercel) recibe parches de seguridad.
No se mantienen versiones anteriores.

## Prácticas de seguridad aplicadas
- **Sin secretos en el código fuente.** El token opcional de INEGI DENUE se carga exclusivamente desde una variable de entorno (`INEGI_DENUE_TOKEN`).
- **Cabeceras de seguridad** en `next.config.mjs`:
  - `Content-Security-Policy` estricta (default-src self, sin `unsafe-eval`, sin iframes, object-src none).
  - `Strict-Transport-Security` con `preload`, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`.
  - `Referrer-Policy: strict-origin-when-cross-origin`.
  - `Permissions-Policy` que niega micrófono, cámara, pago, USB, sensores, geolocalización solo para `self`.
  - `Cross-Origin-Opener-Policy: same-origin`.
- **Sin cookies de sesión ni cuentas.** No hay autenticación ni perfiles de usuario.
- **Validación estricta en todas las rutas API**: lat/lon deben ser números finitos en rango geográfico válido (-90..90 / -180..180), el radio se acota, el texto de búsqueda se trunca y los parámetros de URL de terceros (web, wikidata, wikipedia, wikivoyage) se validan con listas blancas / regex / saneamiento antes de ser usados en peticiones externas.
- **Protección SSRF**: `leerSitio` en `/api/ficha` rechaza URLs que no sean http/https, hosts locales/IPs privadas/metadata de nube, y limita tiempo de espera, tamaño y tipo de contenido.
- **No hay `eval`, `dangerouslySetInnerHTML`, ni inyección de HTML de terceros en el cliente.** Todo el contenido de Wikipedia/Wikidata se pinta como texto React (escapado automáticamente).
- **Dependencias** revisadas con `npm audit`; Leaflet se distribuye con la app (sin CDN en runtime) para reducir riesgos de supply chain.
- **Service Worker** con ámbito limitado a `/` y solo caché de GET mismo-origen o tiles OSM; no intercepta credenciales.
- **Caché en memoria** (no persistente) con TTL corto y tamaño acotado (400 entradas máx.) para evitar fuga de memoria.
- **Robots / rate-limit**: el despliegue usa los límites por defecto de Vercel; las consultas a Overpass se reintentan en 3 servidores y se cachean para no saturarlos.

## Reporte de vulnerabilidades
Si descubres una vulnerabilidad de seguridad, **no abras un issue público**. Envía los detalles
de forma responsable al mantenedor del repositorio (vía mensaje privado o correo si está publicado
en el perfil de GitHub). Describe pasos de reproducción, impacto esperado y, si es posible, una
prueba de concepto.

Responderé en un plazo razonable y coordinaré una versión corregida antes de cualquier divulgación
pública.

## Divulgación responsable
Se agradecen reportes de:
- Inyección (SQL, NoSQL, comandos, plantillas).
- SSRF / acceso a recursos internos.
- XSS / inyección de HTML o scripts.
- CSRF / suplantación de acciones.
- Fuga de datos personales o de tokens.
- Vulnerabilidades en dependencias (CVE activos).

No se consideran vulnerabilidades:
- Falta de un encabezado de seguridad sin impacto demostrable.
- Información de versión/pila tecnológica (ya se desactiva `X-Powered-By`).
- Auto-XSS que requiere pegar código malicioso en la consola del propio usuario.
