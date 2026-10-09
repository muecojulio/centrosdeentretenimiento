"use client";

export default function ContenidoPrivacidad({ headingLevel = 2 }) {
  const Heading = headingLevel === 3 ? "h3" : "h2";

  return (
    <>
      <p className="privacy-updated">
        Última actualización: 9 de octubre de 2026. Texto informativo, no es asesoría legal.
      </p>

      <p>
        <b>NocheCerca</b> es un proyecto personal para encontrar bares, antros, música en vivo, afters
        y terrazas cerca de ti en México. No hay detrás una empresa ni anunciantes: la app está
        diseñada para <b>no recolectar datos personales</b> más allá de lo estrictamente necesario
        para mostrarte el mapa y calcular rutas.
      </p>

      <Heading>🔒 Lo esencial (resumen en 4 puntos)</Heading>
      <ul>
        <li>Sin cuentas, sin registro, sin cookies de seguimiento, sin publicidad y sin analítica.</li>
        <li>
          El GPS se activa <b>solo cuando tú tocas un botón</b>; la app no te sigue en segundo plano.
        </li>
        <li>
          Tus favoritos viven únicamente en el <b>almacenamiento local de tu navegador</b>; nunca
          llegan a nuestros servidores.
        </li>
        <li>
          Los lugares salen de directorios y mapas públicos (<i>OpenStreetMap</i>, INEGI DENUE,
          Wikipedia, Wikidata, Wikivoyage).
        </li>
      </ul>

      <Heading>💾 Qué se guarda en tu dispositivo</Heading>
      <ul>
        <li>
          <b>Favoritos:</b> hasta 40 lugares (nombre, dirección, coordenadas, teléfono, horario y
          categoría) en <code>localStorage</code>. Solo tú puedes verlos.
        </li>
        <li>
          <b>Copia sin conexión (PWA):</b> el <i>service worker</i> guarda la app y las respuestas de
          tus últimas búsquedas y rutas para abrir la app sin internet. Puedes borrar estos datos
          desde los ajustes del navegador en cualquier momento.
        </li>
        <li>
          <b>Preferencias de la sesión</b> (ciudad, radio, filtros, texto grande): viven en memoria
          y se pierden al cerrar la pestaña.
        </li>
      </ul>
      <p>
        Nada de esto sale de tu dispositivo: <b>nunca recibimos tu lista de favoritos</b>. El
        identificador de instalación del navegador no se usa para rastrearte.
      </p>

      <Heading>📍 Tu ubicación</Heading>
      <p>
        El permiso de ubicación se pide únicamente cuando tocas <i>«Mi ubicación»</i> o
        <i> «Calcular ruta desde mi ubicación»</i>. Es una lectura puntual — la app <b>no</b> lee tu
        posición en segundo plano ni envía tu ubicación continuamente.
      </p>
      <p>
        Las coordenadas viajan a nuestro servidor únicamente para construir la consulta al mapa y
        calcular la ruta; se descartan al terminar la respuesta. <b>No</b> se guardan en base de
        datos, bitácora de análisis ni se asocian a ningún identificador de usuario.
      </p>
      <p>
        Puedes negar el permiso y buscar por ciudad; el navegador te permite revocarlo en cualquier
        momento desde los ajustes del sitio.
      </p>

      <Heading>🌐 Datos que salen del dispositivo</Heading>
      <p>
        <b>A nuestro servidor (alojado en Vercel, proveedor en EUA/UE):</b> latitud, longitud,
        radio, texto de búsqueda, origen/destino de la ruta y nombre del lugar del que abres la
        ficha. Como cualquier proveedor de hosting, Vercel puede registrar de forma temporal la IP,
        el <i>User-Agent</i> y la hora en sus logs de infraestructura. <b>No hay base de datos</b>:
        los resultados se cachean en memoria por pocos minutos y se borran solos.
      </p>
      <p>
        <b>A servicios públicos (consultados desde el servidor — estos ven la IP del servidor, no la
        tuya):</b>
      </p>
      <ul>
        <li><b>OpenStreetMap / Overpass</b> (tres réplicas públicas): lugares del mapa.</li>
        <li><b>INEGI DENUE:</b> directorio de establecimientos (solo si el despliegue tiene token).</li>
        <li><b>Nominatim y Photon:</b> convertir una dirección en coordenadas.</li>
        <li><b>OSRM y Valhalla:</b> calcular la ruta a pie y en auto.</li>
        <li><b>Open-Meteo:</b> clima y calidad del aire en el destino.</li>
        <li><b>RainViewer:</b> imágenes de radar de lluvia.</li>
        <li><b>Wikipedia / Wikidata / Wikivoyage:</b> resumen informativo de la ficha.</li>
        <li><b>Nager.Date</b> y <b>sunrise-sunset.org</b>: feriados y hora del atardecer.</li>
      </ul>
      <p>
        <b>Directamente desde tu navegador</b> (estos reciben tu IP y la zona del mapa que estás
        viendo): <i>tile.openstreetmap.org</i>, que entrega las imágenes del mapa. La librería del
        mapa (Leaflet) se sirve desde el mismo sitio, no desde un CDN externo.
      </p>
      <p>
        <b>Cuando tú eliges abrir otro servicio:</b> los botones de Google Maps, Uber y Llamar te
        llevan a esas apps con el destino; el botón de compartir usa el menú nativo de tu
        dispositivo. Esas empresas aplican sus propias políticas.
      </p>
      <p>
        <b>Indicaciones por voz:</b> las sintetiza el motor de voz de tu propio navegador o sistema
        operativo; el audio no se envía a nuestros servidores.
      </p>

      <Heading>🛡️ Seguridad aplicada</Heading>
      <ul>
        <li>Todo el tráfico viaja cifrado por <b>HTTPS</b> con <i>Strict-Transport-Security</i>.</li>
        <li>
          Cabeceras de seguridad: <code>Content-Security-Policy</code>, <code>X-Frame-Options: DENY</code>,
          <code>X-Content-Type-Options: nosniff</code>, <code>Referrer-Policy</code> estricto y
          <code>Permissions-Policy</code> que bloquea micrófono, cámara, pago, USB y sensores.
        </li>
        <li>
          Las entradas de la API se validan en el servidor (coordenadas numéricas en rango, radio
          acotado, longitudes máximas, URLs permitidas por lista de protocolos/dominios, IDs
          Wikidata con formato correcto) para evitar abusos.
        </li>
        <li>
          Las llamadas a sitios web externos desde la ficha se limitan a HTTP/HTTPS, bloquean hosts
          internos (localhost, IPs privadas, metadatos de nube), tienen un tiempo límite y solo
          aceptan contenido HTML.
        </li>
        <li>
          La librería del mapa (Leaflet) se distribuye junto a la app, eliminando el riesgo de
          <i>supply-chain</i> de un CDN externo.
        </li>
        <li>No se usan <i>eval</i>, plugins de terceros ni <i>iframes</i> embebidos.</li>
      </ul>

      <Heading>🍪 Cookies, analítica y publicidad</Heading>
      <p>
        No usamos cookies de sesión, cookies publicitarias, píxeles de seguimiento, <i>fingerprinting</i>
        ni herramientas de medición de audiencia (ni Google Analytics, ni Mixpanel, ni similares).
        Por eso no mostramos aviso de cookies: no hay nada que aceptar ni que rechazar.
      </p>

      <Heading>⏱️ Cuánto tiempo se conservan los datos</Heading>
      <ul>
        <li>En el servidor (caché en memoria): resultados de búsqueda por ~8 minutos; feriados hasta 12 h.</li>
        <li>En tu dispositivo: hasta que borres los datos del sitio o desinstales la PWA.</li>
        <li>Tu ubicación: no se conserva en absoluto.</li>
      </ul>

      <Heading>🔞 Menores de edad</Heading>
      <p>
        La app lista establecimientos para adultos (antros, bares, centros nocturnos), por lo que no
        está dirigida a menores de 18 años. No recopilamos datos de edad ni de identidad a sabiendas.
      </p>

      <Heading>🎮 Tus controles</Heading>
      <ul>
        <li>
          <b>Borrar favoritos y caché sin conexión:</b> desde los ajustes del navegador, borra los
          datos del sitio (o desinstala la PWA).
        </li>
        <li>
          <b>Revocar ubicación:</b> desde el permiso del sitio, en los ajustes del navegador.
        </li>
        <li>
          No existe "una cuenta" que exportar ni una baja que solicitar: al no requerir registro, no
          guardamos datos tuyos fuera de tu dispositivo.
        </li>
      </ul>

      <Heading>📝 Cambios a este texto</Heading>
      <p>
        Si cambia la forma en que la app trata tus datos, actualizamos esta página y la fecha de
        arriba. Si el cambio es importante (por ejemplo, un nuevo servicio con el que compartamos
        datos), lo avisamos dentro de la app antes de que entre en vigor.
      </p>
    </>
  );
}
