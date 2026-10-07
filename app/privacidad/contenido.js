"use client";

export default function ContenidoPrivacidad({ headingLevel = 2 }) {
  const Heading = headingLevel === 3 ? "h3" : "h2";

  return (
    <>
      <p className="privacy-updated">
        Última actualización: 6 de octubre de 2026. Texto informativo, no es asesoría legal.
      </p>

      <p>
        NocheCerca es un proyecto personal para encontrar bares, antros y música en vivo cerca de ti.
        Detrás no hay empresa ni responsable identificado, ni correo de contacto: la app no conserva
        datos personales fuera de tu propio dispositivo, así que no hay nada que pedirnos ni ninguna
        baja que tramitar.
      </p>

      <Heading>Lo esencial</Heading>
      <ul>
        <li>Sin cuentas, sin registro, sin cookies, sin publicidad y sin analítica.</li>
        <li>El GPS se usa solo cuando tú tocas un botón, y no se guarda en ningún servidor.</li>
        <li>Lo único que se queda en tu dispositivo son tus favoritos y la copia sin conexión.</li>
        <li>Los lugares salen de mapas y directorios públicos.</li>
      </ul>

      <Heading>Qué se guarda en tu dispositivo</Heading>
      <ul>
        <li>
          <b>Favoritos:</b> hasta 40 lugares (nombre, dirección, coordenadas, teléfono, horario y
          categoría) en el almacenamiento local del navegador.
        </li>
        <li>
          <b>Copia sin conexión:</b> el service worker guarda la app y las respuestas de tus últimas
          búsquedas y rutas para que puedas abrirla sin internet.
        </li>
        <li>
          <b>Preferencias de la sesión</b> (ciudad, radio, filtros, texto grande): viven en memoria y
          se pierden al cerrar la pestaña.
        </li>
      </ul>
      <p>Nada de esto sale de tu dispositivo: nunca recibimos tu lista de favoritos.</p>

      <Heading>Tu ubicación</Heading>
      <p>
        El GPS se pide únicamente cuando tocas «Mi ubicación» o «Cómo llegar desde mi ubicación», y es
        una sola lectura: la app no te sigue en segundo plano. Puedes negar el permiso y buscar por
        ciudad; el navegador te deja revocarlo cuando quieras.
      </p>
      <p>
        Las coordenadas viajan a nuestro servidor solo para armar la consulta y se descartan al
        terminar. No se guardan en una base de datos ni se asocian a ningún identificador.
      </p>

      <Heading>Datos que salen del dispositivo</Heading>
      <p>
        <b>A nuestro servidor (alojado en Vercel):</b> latitud, longitud, radio, texto de búsqueda,
        origen y destino cuando pides una ruta, y el nombre del lugar del que abres la ficha. Como
        cualquier hosting, Vercel puede registrar IP, navegador y hora en sus registros de
        infraestructura. No hay base de datos: los resultados se guardan en memoria caché por poco
        tiempo.
      </p>
      <p>
        <b>A servicios públicos, consultados desde el servidor</b> (estos ven la dirección IP del
        servidor, no la tuya):
      </p>
      <ul>
        <li>OpenStreetMap / Overpass (tres servidores públicos): los lugares del mapa.</li>
        <li>INEGI DENUE: directorio de establecimientos, solo si el despliegue tiene token.</li>
        <li>Nominatim y Photon: convertir una dirección en coordenadas.</li>
        <li>OSRM y Valhalla: calcular la ruta.</li>
        <li>Open-Meteo: clima y calidad del aire.</li>
        <li>RainViewer: imágenes del radar de lluvia.</li>
        <li>Wikipedia y Wikidata: el resumen de la ficha del lugar.</li>
        <li>Nager.Date: feriados en México. sunrise-sunset.org: hora del atardecer.</li>
        <li>
          El sitio web público de un lugar, cuando el mapa lo publica, para leer su título y
          descripción.
        </li>
      </ul>
      <p>
        <b>Desde tu navegador</b> (estos sí ven tu dirección IP): unpkg.com, que entrega la librería
        del mapa, y tile.openstreetmap.org, que entrega las imágenes del mapa y por eso recibe la
        zona que estás viendo.
      </p>
      <p>
        <b>Cuando tú abres otro servicio:</b> los botones de Google Maps y Uber llevan el destino a
        esas apps, el botón de compartir usa el menú de tu celular y un teléfono se marca con tu app
        de llamadas. Esas empresas aplican sus propias políticas.
      </p>
      <p>
        <b>Indicaciones por voz:</b> las genera el motor de tu navegador o del sistema. Según el
        dispositivo, las voces pueden descargarse o generarse en los servidores del fabricante.
      </p>

      <Heading>Cookies, analítica y publicidad</Heading>
      <p>
        No usamos cookies de seguimiento, ni cuentas, ni anuncios, ni herramientas de medición de
        audiencia. Por eso tampoco pedimos un aviso de cookies: no hay nada que aceptar.
      </p>

      <Heading>Cuánto tiempo se conserva</Heading>
      <ul>
        <li>En el servidor: minutos (resultados de búsqueda) y hasta 12 horas (feriados).</li>
        <li>En tu dispositivo: hasta que borres los datos del sitio o desinstales la app.</li>
        <li>Tu ubicación: no se conserva.</li>
      </ul>

      <Heading>Menores de edad</Heading>
      <p>La app no está dirigida a menores de 18 años y no recopila datos de nadie a sabiendas.</p>

      <Heading>Seguridad</Heading>
      <p>
        Todo viaja cifrado por HTTPS y el sitio limita los permisos del navegador (ubicación solo
        cuando tú la autorizas; sin micrófono ni cámara). Aun así, ningún servicio en internet es
        infalible: evita compartir el dispositivo si guardaste lugares que no quieres mostrar.
      </p>

      <Heading>Tus controles</Heading>
      <ul>
        <li>
          Borrar favoritos y copia sin conexión: en los ajustes del navegador, borra los datos del
          sitio (o desinstala la app como PWA).
        </li>
        <li>Revocar la ubicación: en el permiso del sitio, en los ajustes del navegador.</li>
        <li>
          No hay perfil que exportar ni baja que solicitar: sin cuenta, no guardamos datos tuyos
          fuera de tu dispositivo.
        </li>
      </ul>

      <Heading>Cambios a este texto</Heading>
      <p>
        Si cambia la forma en que la app trata tus datos, actualizamos esta página y la fecha de
        arriba. Si el cambio es grande, lo avisamos dentro de la app.
      </p>
    </>
  );
}
